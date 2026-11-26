// Curve di tendenza per periodo di allenamento continuo.
//
// Un periodo = sessioni consecutive senza pause oltre 14 giorni. Su ogni periodo (≥ 3 sessioni) si stima
// una regressione locale lineare (LOESS) nel TEMPO: ogni punto della curva è una retta pesata sulle sessioni
// vicine in giorni (pesi tricubici), quindi conta il ritmo reale e non il numero di sessioni.
// - La larghezza della finestra non è fissa: si sceglie per validazione incrociata leave-one-out,
//   cioè quella che prevede meglio ogni sessione tolta dal calcolo. A parità (entro il 3%) vince la più
//   larga, così la curva mostra l'andamento e non il rumore di giornata.
// - Due passaggi robusti (bisquare) tolgono peso alle sessioni anomale.
// - La pendenza locale (unità a settimana) è il coefficiente della retta locale: serve per il colore
//   della curva e per il ritmo mostrato nel tooltip.

const DAY = 86400000;
const GAP = 14;
const BANDS = [14, 21, 28, 42, 56, 84, 120, 180, Infinity];

const median = a => { const v = [...a].sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };

// Retta locale in x0 con finestra h (giorni). skip = indice da escludere (per la validazione).
function localFit(xs, ys, rw, x0, h, skip = -1) {
  const n = xs.length;
  // la finestra deve contenere almeno 3 sessioni: se no si allarga fino alla terza più vicina
  const d = xs.map(x => Math.abs(x - x0));
  const near = d.filter((_, i) => i !== skip).sort((a, b) => a - b);
  const hh = Math.max(h, (near[Math.min(2, near.length - 1)] || 1) * 1.2, 1);
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    if (i === skip) continue;
    const u = hh === Infinity ? 0 : d[i] / hh;
    if (u >= 1) continue;
    const w = (1 - u ** 3) ** 3 * rw[i];
    if (w <= 0) continue;
    sw += w; sx += w * xs[i]; sy += w * ys[i]; sxx += w * xs[i] * xs[i]; sxy += w * xs[i] * ys[i];
  }
  if (!sw) return null;
  const mx = sx / sw, my = sy / sw;
  const vx = sxx / sw - mx * mx;
  const b = vx > 1e-9 ? (sxy / sw - mx * my) / vx : 0;
  return { v: my + b * (x0 - mx), b };
}

function cvError(xs, ys, rw, h) {
  let e = 0, k = 0;
  for (let i = 0; i < xs.length; i++) {
    const f = localFit(xs, ys, rw, xs[i], h, i);
    if (!f) continue;
    e += Math.abs(ys[i] - f.v) * rw[i]; k += rw[i];
  }
  return k ? e / k : Infinity;
}

// xs in giorni dall'inizio del periodo (crescenti), ys valori
export function fitPeriod(xs, ys) {
  const n = xs.length;
  let rw = new Array(n).fill(1);
  const dur = xs[n - 1] - xs[0];
  const choose = () => {
    if (n < 5) return Infinity; // 3–4 sessioni: solo una retta, di più sarebbe rumore
    const cands = BANDS.filter(h => h === Infinity || h < dur * 1.5);
    const errs = cands.map(h => cvError(xs, ys, rw, h));
    const best = Math.min(...errs);
    let pick = cands[errs.indexOf(best)];
    cands.forEach((h, i) => { if (errs[i] <= best * 1.03 && h > pick) pick = h; });
    return pick;
  };
  let h = choose();
  for (let it = 0; it < 2 && n >= 5; it++) {
    const res = xs.map((x, i) => ys[i] - (localFit(xs, ys, rw, x, h)?.v ?? ys[i]));
    const s6 = 6 * median(res.map(Math.abs));
    if (!s6) break;
    rw = res.map(r => { const u = Math.abs(r) / s6; return u >= 1 ? 0.02 : (1 - u * u) ** 2; });
    h = choose();
  }
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.05;
  const at = x => {
    const f = localFit(xs, ys, rw, x, h) || { v: ys[0], b: 0 };
    return { v: Math.min(hi + pad, Math.max(lo - pad, f.v)), b: f.b };
  };
  return { h, at, dur };
}

// hist: storico di un esercizio; valueOf(sessione) → valore nel grafico.
// Ritorna i periodi con la curva campionata (ts, y, pendenza/settimana) e la pendenza in ogni sessione.
export function trendsFor(hist, valueOf) {
  const groups = [];
  hist.forEach((p, i) => {
    if (i === 0 || (p.ts - hist[i - 1].ts) / DAY > GAP) groups.push([]);
    groups[groups.length - 1].push(p);
  });
  const periods = [];
  const slopeAt = {};
  groups.forEach(g => {
    if (g.length < 3) return;
    const t0 = g[0].ts;
    const xs = g.map(p => (p.ts - t0) / DAY), ys = g.map(valueOf);
    const fit = fitPeriod(xs, ys);
    const steps = Math.max(12, Math.min(120, Math.round(fit.dur) + 1));
    const pts = [];
    for (let k = 0; k <= steps; k++) {
      const x = (fit.dur * k) / steps;
      const f = fit.at(x);
      pts.push({ ts: t0 + x * DAY, y: f.v, wk: f.b * 7 });
    }
    g.forEach((p, i) => { slopeAt[p.ts] = { wk: fit.at(xs[i]).b * 7, ref: fit.at(xs[i]).v }; });
    periods.push({ t0, t1: g[g.length - 1].ts, pts, h: fit.h, n: g.length });
  });
  return { periods, slopeAt };
}

// Classe della pendenza: oltre ±0,4% a settimana del livello è salita/calo, sotto è stabile
export function slopeClass(wk, ref) {
  const r = ref > 0 ? wk / ref : 0;
  return r > 0.004 ? 'up' : r < -0.004 ? 'down' : 'flat';
}
