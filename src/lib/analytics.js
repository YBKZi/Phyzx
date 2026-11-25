// Analisi aggregate sull'intero storico (nessuna statistica di volume).
import { addDays, daysBetween, weekStart, todayStr } from './stats.js';
import { trainingPeriods } from './stats.js';

const PUSH = new Set(['Petto', 'Spalle', 'Tricipiti']);
const PULL = new Set(['Schiena', 'Bicipiti']);

const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

export function buildAnalysis(model, today = todayStr()) {
  const wk = model.workouts; // più recenti prima
  if (!wk.length) return null;
  const asc = [...wk].reverse();
  const first = asc[0].date;
  const spanDays = Math.max(1, daysBetween(first, today));
  const spanWeeks = Math.max(1, spanDays / 7);

  // ── Panoramica ──
  const overview = {
    workouts: wk.length,
    sets: model.totalSets,
    exercises: model.exerciseList.length,
    spanDays,
    perWeek: wk.length / spanWeeks,
    setsPerWorkout: mean(wk.map(w => w.totalSets)),
    exPerWorkout: mean(wk.map(w => w.exercises.length)),
    biggest: wk.reduce((b, w) => (w.totalSets > b.totalSets ? w : b), wk[0]),
  };

  // ── Costanza ──
  const weekSet = new Set(wk.map(w => weekStart(w.date)));
  const perWeekMap = {};
  wk.forEach(w => { const k = weekStart(w.date); perWeekMap[k] = (perWeekMap[k] || 0) + 1; });
  let totalWeeks = 0, activeWeeks = 0, bestStreak = 0, run = 0;
  for (let d = weekStart(first); d <= today; d = addDays(d, 7)) {
    totalWeeks++;
    if (weekSet.has(d)) { activeWeeks++; run++; bestStreak = Math.max(bestStreak, run); } else if (d !== weekStart(today)) run = 0;
  }
  const bestWeek = Object.entries(perWeekMap).sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];
  const periods = trainingPeriods(model.raw);
  const stops = periods.filter(p => p.type === 'stop');
  const actives = periods.filter(p => p.type === 'active');
  const stopDays = stops.reduce((s, p) => s + p.gapDays, 0);
  const longestStop = stops.reduce((b, p) => (!b || p.gapDays > b.gapDays ? p : b), null);
  const consistency = {
    activeWeeksPct: activeWeeks / totalWeeks, activeWeeks, totalWeeks, bestStreak,
    bestWeek: bestWeek ? { start: bestWeek[0], n: bestWeek[1] } : null,
    stopsCount: stops.length, longestStop,
    stopsByColor: { yellow: stops.filter(p => p.stopColor === 'yellow').length, orange: stops.filter(p => p.stopColor === 'orange').length, red: stops.filter(p => p.stopColor === 'red').length },
    stopShare: stopDays / Math.max(1, daysBetween(actives.length ? actives[0].startDate : first, today)),
    positivePeriods: actives.filter(p => p.quality === 'positive').length,
    negativePeriods: actives.filter(p => p.quality === 'negative').length,
    activePeriods: actives.length,
  };

  // ── Mesi e giorni della settimana ──
  const months = [];
  const [ty, tm] = today.split('-').map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    months.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, month: d.getUTCMonth(), workouts: 0 });
  }
  const mIdx = new Map(months.map((m, i) => [m.key, i]));
  wk.forEach(w => { const i = mIdx.get(w.date.slice(0, 7)); if (i != null) months[i].workouts++; });
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  wk.forEach(w => { const [y, m, d] = w.date.split('-').map(Number); weekdays[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]++; });

  // ── Gruppi muscolari ──
  const sumGroups = (from) => { const o = {}; wk.forEach(w => { if (!from || w.date >= from) Object.entries(w.groupSets).forEach(([g, n]) => { o[g] = (o[g] || 0) + n; }); }); return o; };
  const g90 = sumGroups(addDays(today, -89)), gAll = sumGroups(null);
  const tot90 = Object.values(g90).reduce((s, v) => s + v, 0), totAll = Object.values(gAll).reduce((s, v) => s + v, 0);
  const groups = Object.keys(gAll).map(g => ({ group: g, sets90: g90[g] || 0, share90: tot90 ? (g90[g] || 0) / tot90 : 0, shareAll: gAll[g] / totAll, perWeek90: (g90[g] || 0) / 12.7 }))
    .sort((a, b) => b.sets90 - a.sets90 || b.shareAll - a.shareAll);
  let push = 0, pull = 0, legs = 0;
  Object.entries(g90).forEach(([g, n]) => { if (PUSH.has(g)) push += n; else if (PULL.has(g)) pull += n; else if (g === 'Gambe') legs += n; });
  const balance = { push, pull, legs, ratio: pull ? push / pull : null };

  // ── Record ──
  const prs = [];
  Object.entries(model.history).forEach(([name, h]) => h.forEach(s => { if (s.isPR) prs.push({ name, ...s }); }));
  prs.sort((a, b) => b.date.localeCompare(a.date));
  const prMonths = months.map(m => ({ ...m, workouts: 0 }));
  prs.forEach(p => { const i = mIdx.get(p.date.slice(0, 7)); if (i != null) prMonths[i].workouts++; });
  // record per mese su tutta la storia: dal primo mese con dati a oggi
  const prAll = [];
  {
    const [fy, fm] = first.split('-').map(Number);
    const n = (ty - fy) * 12 + (tm - fm);
    for (let i = 0; i <= n; i++) {
      const d = new Date(Date.UTC(fy, fm - 1 + i, 1));
      prAll.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, month: d.getUTCMonth(), year: d.getUTCFullYear(), workouts: 0 });
    }
    const idx = new Map(prAll.map((m, i) => [m.key, i]));
    prs.forEach(p => { const i = idx.get(p.date.slice(0, 7)); if (i != null) prAll[i].workouts++; });
  }
  const records = {
    total: prs.length, last90: prs.filter(p => p.date >= addDays(today, -89)).length,
    latest: prs.slice(0, 8), months: prMonths, monthsAll: prAll,
    perWorkout: prs.length / wk.length,
  };

  // ── Esercizi: classifica, stagnazione, massimali, frequenza ──
  const win = 180;
  const movers = [];
  const stagnant = [];
  const bests = [];
  Object.entries(model.history).forEach(([name, h]) => {
    const last = h[h.length - 1];
    if (last.bw) return;
    let best = h[0]; h.forEach(s => { if (s.e1rm > best.e1rm) best = s; });
    bests.push({ name, best, sessions: h.length, group: model.groupOf[name] });
    const ref = [...h].reverse().find(s => s.date <= addDays(today, -win));
    const inWin = h.filter(s => s.date > addDays(today, -win));
    const base = ref || (inWin.length > 1 ? inWin[0] : null);
    if (base && base !== last && base.e1rm > 0 && daysBetween(last.date, today) <= 45) movers.push({ name, pct: (last.e1rm - base.e1rm) / base.e1rm, last, base });
    const lastPr = [...h].reverse().find(s => s.isPR);
    const sinceRecord = lastPr ? daysBetween(lastPr.date, today) : daysBetween(h[0].date, today);
    if (h.length >= 6 && daysBetween(last.date, today) <= 30 && sinceRecord >= 60) stagnant.push({ name, days: sinceRecord, sessions: h.length });
  });
  movers.sort((a, b) => b.pct - a.pct);
  stagnant.sort((a, b) => b.days - a.days);
  bests.sort((a, b) => b.sessions - a.sessions);
  const avgChange = movers.length ? mean(movers.map(m => m.pct)) : null;
  const frequent = model.exerciseList.slice(0, 8);

  // ── Range di ripetizioni (serie con carico) ──
  const buckets = [{ k: '1–5', min: 1, max: 5, n: 0 }, { k: '6–8', min: 6, max: 8, n: 0 }, { k: '9–12', min: 9, max: 12, n: 0 }, { k: '13–20', min: 13, max: 20, n: 0 }, { k: '21+', min: 21, max: 999, n: 0 }];
  let loadedSets = 0;
  model.raw.forEach(r => { if (r[3] > 0) { loadedSets++; const b = buckets.find(x => r[4] >= x.min && r[4] <= x.max); if (b) b.n++; } });
  const reps = buckets.map(b => ({ ...b, share: loadedSets ? b.n / loadedSets : 0 }));

  return {
    overview, consistency, months, weekdays, groups, balance, records,
    movers: { top: movers.slice(0, 5), bottom: movers.slice(-5).reverse().filter(m => m.pct < 0), avg: avgChange, count: movers.length, win },
    stagnant: stagnant.slice(0, 5), bests: bests.slice(0, 8), frequent, reps, loadedSets,
  };
}
