// Analisi dei workout: tutto ciò che le schermate mostrano deriva da qui.
// Riga grezza = [data 'YYYY-MM-DD', esercizio, gruppo, kg, reps]; kg = 0 → corpo libero.
import { estimateOneRm, toTs, analyzeTrainingPeriods, LB_TO_KG, KG_TO_LB, guessGroup } from './core.js';

const DAY = 86400000;

// ── Normalizzazione e migrazione ───────────────────────────────────────────────

// Il vecchio import arrotondava i kg a 0,1: 135 lb diventavano 61,2 kg e tornavano come 134,9 lb.
// Qui riportiamo ogni peso alla libbra "pulita" (multipli di 0,25 lb) e lo riconvertiamo senza perdite.
export function snapKg(kg) {
  if (!kg) return 0;
  const lb = Math.round((kg / LB_TO_KG) * 4) / 4;
  return Math.round(lb * LB_TO_KG * 1000) / 1000;
}

export function normalizeRows(raw) {
  return raw
    .filter(r => Array.isArray(r) && r.length >= 5 && r[0] && r[1])
    .map(r => [String(r[0]).slice(0, 10), r[1], guessGroup(r[1]) !== 'Altro' ? guessGroup(r[1]) : (r[2] || 'Altro'), Number(r[3]) || 0, Number(r[4]) || 0]);
}

// Import Liftoff: il peso nel CSV è sempre in libbre; nessun arrotondamento a 0,1 kg.
export function liftoffRowsToRaw(rows) {
  const out = [];
  for (const r of rows) {
    const dateRaw = r['Date'];
    const exercise = r['Exercise Name'];
    const lb = parseFloat(r['Weight']);
    const reps = parseInt(r['Reps'], 10);
    if (!dateRaw || !exercise || isNaN(lb) || isNaN(reps)) continue;
    out.push([String(dateRaw).slice(0, 10), exercise, guessGroup(exercise), Math.round(lb * LB_TO_KG * 1000) / 1000, reps]);
  }
  return out;
}

const rowKey = r => `${r[0]}|${r[1]}|${(r[3] || 0).toFixed(3)}|${r[4]}`;

// Unisce nuove righe ai dati esistenti. Serie identiche nello stesso giorno (3×8 a 60 kg) sono
// legittime: aggiungiamo solo la differenza di conteggio per ciascuna chiave.
export function mergeRows(existing, incoming) {
  const have = new Map();
  existing.forEach(r => have.set(rowKey(r), (have.get(rowKey(r)) || 0) + 1));
  const inc = new Map();
  incoming.forEach(r => { const k = rowKey(r); if (!inc.has(k)) inc.set(k, []); inc.get(k).push(r); });
  const merged = [...existing];
  let added = 0;
  inc.forEach((list, k) => {
    const missing = list.length - (have.get(k) || 0);
    for (let i = 0; i < missing; i++) { merged.push(list[i]); added++; }
  });
  return { merged, added, read: incoming.length };
}

// Import che sostituisce: il CSV di Liftoff è lo storico completo, quindi per ogni giorno presente nel file
// le righe già salvate vengono rimpiazzate (così modifiche ai carichi, serie cancellate e CSV con
// precisioni diverse non lasciano righe doppie o vecchie). I giorni assenti dal file restano intatti.
// `added` conta le serie davvero nuove, ignorando differenze di arrotondamento sotto 0,25 kg.
const looseKey = r => `${r[0]}|${r[1]}|${Math.round((r[3] || 0) / 0.25)}|${r[4]}`;
export function replaceByDate(existing, incoming) {
  const dates = new Set(incoming.map(r => r[0]));
  const have = new Map();
  existing.forEach(r => have.set(looseKey(r), (have.get(looseKey(r)) || 0) + 1));
  let added = 0;
  incoming.forEach(r => { const k = looseKey(r); const n = have.get(k) || 0; if (n > 0) have.set(k, n - 1); else added++; });
  const kept = existing.filter(r => !dates.has(r[0]));
  return { merged: [...kept, ...incoming], added, read: incoming.length, dropped: existing.length - kept.length };
}

// ── Date ──────────────────────────────────────────────────────────────────────

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayTs = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((dayTs(b) - dayTs(a)) / DAY);
export const addDays = (s, n) => new Date(dayTs(s) + n * DAY).toISOString().slice(0, 10);
// Lunedì della settimana che contiene la data
export const weekStart = s => { const t = new Date(dayTs(s)); const dow = (t.getUTCDay() + 6) % 7; return addDays(s, -dow); };

// ── Modello ───────────────────────────────────────────────────────────────────

function sessionMetric(sets) {
  // serie top del giorno: con carico vince il massimo 1RM stimato, altrimenti le reps
  const loaded = sets.filter(s => s.kg > 0);
  if (loaded.length) {
    let best = null;
    loaded.forEach(s => { const e = estimateOneRm(s.kg, s.reps) || 0; if (!best || e > best.e) best = { e, kg: s.kg, reps: s.reps }; });
    return { bw: false, e1rm: best.e, topKg: best.kg, topReps: best.reps };
  }
  const bestReps = Math.max(0, ...sets.map(s => s.reps));
  return { bw: true, e1rm: bestReps, topKg: 0, topReps: bestReps };
}

export function buildModel(rawIn) {
  const raw = normalizeRows(rawIn);
  // sessioni per esercizio
  const byEx = new Map();   // nome → Map(data → sets)
  const order = new Map();  // data → [nomi in ordine di comparsa]
  const groupOf = {};
  raw.forEach(([date, ex, grp, kg, reps]) => {
    groupOf[ex] = grp;
    if (!byEx.has(ex)) byEx.set(ex, new Map());
    const m = byEx.get(ex);
    if (!m.has(date)) m.set(date, []);
    m.get(date).push({ kg, reps });
    if (!order.has(date)) order.set(date, []);
    if (!order.get(date).includes(ex)) order.get(date).push(ex);
  });

  // storico per esercizio con PR e variazione rispetto alla volta prima
  const history = {};
  byEx.forEach((dates, ex) => {
    const rows = [...dates.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, sets]) => ({ date, ts: dayTs(date), sets, ...sessionMetric(sets) }));
    let best = -Infinity;
    rows.forEach((s, i) => {
      s.prev = i > 0 ? rows[i - 1] : null;
      s.deltaPct = s.prev && s.prev.e1rm > 0 && s.prev.bw === s.bw ? (s.e1rm - s.prev.e1rm) / s.prev.e1rm : null;
      s.isPR = i > 0 && s.e1rm > best + 1e-9;
      if (s.e1rm > best) best = s.e1rm;
    });
    history[ex] = rows;
  });

  // workout = tutti gli esercizi di un giorno
  const workouts = [...order.entries()].map(([date, names]) => {
    const exercises = names.map(name => {
      const h = history[name].find(s => s.date === date);
      return { name, group: groupOf[name], ...h };
    });
    const groupSets = {};
    exercises.forEach(e => { groupSets[e.group] = (groupSets[e.group] || 0) + e.sets.length; });
    return {
      date, ts: dayTs(date), exercises, groupSets,
      totalSets: exercises.reduce((s, e) => s + e.sets.length, 0),
      prCount: exercises.filter(e => e.isPR).length,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Ordine: più frequente → più recente → svolto prima nell'ultimo giorno → alfabetico
  const exerciseList = Object.keys(history).map(name => {
    const last = history[name][history[name].length - 1].date;
    return { name, group: groupOf[name], sessions: history[name].length, last, lastPos: order.get(last).indexOf(name) };
  }).sort((a, b) => b.sessions - a.sessions || b.last.localeCompare(a.last) || a.lastPos - b.lastPos || a.name.localeCompare(b.name));

  return { raw, workouts, history, exerciseList, groupOf, totalSets: raw.length };
}

// ── Aggregati ─────────────────────────────────────────────────────────────────

export function weeklyCounts(workouts, nWeeks = 12, today = todayStr()) {
  const thisWeek = weekStart(today);
  const weeks = [];
  for (let i = nWeeks - 1; i >= 0; i--) weeks.push({ start: addDays(thisWeek, -7 * i), workouts: 0, sets: 0 });
  const idx = new Map(weeks.map((w, i) => [w.start, i]));
  workouts.forEach(w => {
    const i = idx.get(weekStart(w.date));
    if (i != null) { weeks[i].workouts += 1; weeks[i].sets += w.totalSets; }
  });
  return weeks;
}

// Griglia calendario (colonne = settimane, righe = lun…dom) con le serie di ogni giorno
export function heatmap(workouts, nWeeks = 16, today = todayStr()) {
  const bySet = new Map(workouts.map(w => [w.date, w.totalSets]));
  const first = addDays(weekStart(today), -7 * (nWeeks - 1));
  const cols = [];
  for (let c = 0; c < nWeeks; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = addDays(first, c * 7 + r);
      col.push({ date: d, sets: bySet.get(d) || 0, future: d > today });
    }
    cols.push(col);
  }
  return cols;
}

// Settimane consecutive con almeno un allenamento (la settimana in corso non spezza la serie)
export function weekStreak(workouts, today = todayStr()) {
  const weeks = new Set(workouts.map(w => weekStart(w.date)));
  let cur = weekStart(today);
  if (!weeks.has(cur)) cur = addDays(cur, -7);
  let n = 0;
  while (weeks.has(cur)) { n++; cur = addDays(cur, -7); }
  return n;
}

// Serie per gruppo muscolare in una finestra [da, a)
export function groupSetsBetween(workouts, fromStr, toStr) {
  const out = {};
  workouts.forEach(w => {
    if (w.date >= fromStr && w.date < toStr) Object.entries(w.groupSets).forEach(([g, n]) => { out[g] = (out[g] || 0) + n; });
  });
  return out;
}

export function exerciseSummary(hist, today = todayStr()) {
  if (!hist || !hist.length) return null;
  const last = hist[hist.length - 1];
  let best = hist[0];
  hist.forEach(s => { if (s.e1rm > best.e1rm) best = s; });
  const ref = days => {
    const limit = addDays(today, -days);
    const past = hist.filter(s => s.date <= limit);
    return past.length ? past[past.length - 1] : null;
  };
  const pct = r => (r && r.e1rm > 0 && r.bw === last.bw ? (last.e1rm - r.e1rm) / r.e1rm : null);
  const span = Math.max(1, daysBetween(hist[0].date, today) / 7);
  const recent = hist.filter(s => s.date >= addDays(today, -90)).length;
  return {
    last, best, sessions: hist.length,
    delta30: pct(ref(30)), delta90: pct(ref(90)),
    perWeek: recent / Math.min(13, span),
    bw: last.bw,
  };
}

// ── Verso il prime ───────────────────────────────────────────────────────────
// Recuperare un prime già avuto è più veloce che raggiungerlo la prima volta. Quindi:
//  1) se in passato hai già ripreso un tuo picco dopo un calo, partendo dal livello di oggi,
//     la stima usa quei recuperi reali (mediana degli ultimi 3);
//  2) altrimenti prende il tempo della prima salita al record e lo accorcia in base a quanto
//     tempo fa hai avuto il prime (da ~45% del tempo se è recente, fino al 100% dopo 2 anni).

// Giorni "di allenamento" tra due sedute: ogni pausa più lunga di 3 settimane conta come 21 giorni,
// così un periodo di stop non gonfia il tempo che serve per risalire.
const GAP_CAP = 21;
function activeDays(hist, i, j) {
  let d = 0;
  for (let k = i + 1; k <= j; k++) d += Math.min(GAP_CAP, Math.max(0, daysBetween(hist[k - 1].date, hist[k].date)));
  return Math.max(1, d);
}

// Tra le sedute della risalita [i0, i1) sceglie quella più vicina al livello di oggi
// (a parità la prima): se in passato hai fatto proprio la stessa prestazione, è quella.
function closestIdx(hist, i0, i1, target) {
  let c = i0;
  for (let k = i0 + 1; k < i1; k++) if (Math.abs(hist[k].e1rm - target) < Math.abs(hist[c].e1rm - target) - 1e-9) c = k;
  return c;
}

const median = a => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

// Un recupero: calo di almeno 8% da un picco P, poi ritorno a ≥ P (−2%). Misura il tratto che parte
// dall'ultima risalita al livello `lam` (frazione del picco) fino al ritorno al picco.
function reattainments(hist, lam, bw) {
  const tol = bw ? 0 : 0.02;
  const out = [];
  let peak = hist[0].e1rm, fall = -1;
  for (let i = 1; i < hist.length; i++) {
    const e = hist[i].e1rm;
    if (e >= peak * (1 - tol)) {
      if (fall >= 0) { const ep = recovery(hist, fall, i, peak, lam, bw); if (ep) out.push(ep); fall = -1; }
      if (e > peak) peak = e;
    } else if (fall < 0 && e < peak * 0.92) fall = i;
  }
  return out;
}

function recovery(hist, f, q, P, lam, bw) {
  let am = f;
  for (let j = f; j < q; j++) if (hist[j].e1rm < hist[am].e1rm) am = j;
  const tgt = P * lam;
  if (hist[am].e1rm > tgt) return null; // il calo non è mai arrivato al livello di oggi
  const level = tgt - (bw ? Math.max(1, Math.round(tgt * 0.05)) : tgt * 0.05);
  const floor = tgt - (bw ? Math.max(3, Math.round(tgt * 0.12)) : tgt * 0.1);
  let li = -1, below = true;
  for (let j = am; j < q; j++) {
    const e = hist[j].e1rm;
    if (below && e >= level) { li = j; below = false; } else if (e < floor) { below = true; li = -1; }
  }
  if (li < 0) return null; // la risalita è arrivata con un salto, senza passare dal livello di oggi
  li = closestIdx(hist, li, q, tgt);
  return { from: hist[li], to: hist[q], days: activeDays(hist, li, q), sessions: q - li };
}

export function primeEstimate(hist, today = todayStr()) {
  if (!hist || hist.length < 2) return null;
  const last = hist[hist.length - 1];
  let bi = 0;
  hist.forEach((s, i) => { if (s.e1rm > hist[bi].e1rm) bi = i; });
  const best = hist[bi];
  if (!(best.e1rm > 0)) return null;
  const tol = last.bw ? 0 : 0.02;
  const ratio = last.e1rm / best.e1rm;
  if (bi === hist.length - 1 || last.e1rm >= best.e1rm * (1 - tol)) return { prime: true, last, best, ratio: Math.min(1, ratio) };

  // 1) recuperi reali già avvenuti partendo da questo livello
  const eps = reattainments(hist, ratio, last.bw).slice(-3);
  if (eps.length) {
    const days = Math.max(1, Math.round(median(eps.map(e => e.days))));
    const sessions = Math.max(1, Math.round(median(eps.map(e => e.sessions))));
    return { prime: false, kind: 'reattain', last, best, ratio, n: eps.length, from: eps[eps.length - 1].from, days, sessions };
  }

  // 2) prima salita al record, accorciata perché il prime è già stato avuto
  const band = last.bw ? Math.max(1, Math.round(last.e1rm * 0.05)) : last.e1rm * 0.05;
  const level = last.e1rm - band;
  const floor = last.bw ? last.e1rm - Math.max(3, Math.round(last.e1rm * 0.12)) : last.e1rm * 0.9;
  let li = -1, below = true;
  for (let i = 0; i < bi; i++) {
    const e = hist[i].e1rm;
    if (below && e >= level) { li = i; below = false; } else if (e < floor) { below = true; li = -1; }
  }
  if (li < 0) return { prime: false, last, best, ratio, noPrecedent: true };
  li = closestIdx(hist, li, bi, last.e1rm);
  const from = hist[li];
  const firstDays = activeDays(hist, li, bi), firstSessions = bi - li;
  const age = Math.max(0, daysBetween(best.date, today));
  const factor = 0.45 + 0.55 * Math.min(1, age / 730);
  const days = Math.max(1, Math.round(firstDays * factor)), sessions = Math.max(1, Math.round(firstSessions * factor));
  return { prime: false, kind: 'model', last, best, ratio, from, days, sessions, firstDays, firstSessions, factor, age };
}

export const trainingPeriods = raw => analyzeTrainingPeriods(raw);
export { KG_TO_LB };
