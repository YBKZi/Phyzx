import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { translateExercise, translateGroup, GROUP_COLOR } from '../lib/core.js';
import { exerciseSummary, trainingPeriods, todayStr, addDays } from '../lib/stats.js';
import { topSetText, makeT, dateShort, dateDay, dateMonthYear, wu, wv, unitLabelFor, num } from '../lib/i18n.js';
import { Card, Label, Stat, Delta, Segmented, Sparkline, PRBadge, Icon, COLORS } from '../ui/kit.jsx';

const RANGES = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, all: null };
const dayMs = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const STOP_FILL = { yellow: 'rgba(255,196,57,0.10)', orange: 'rgba(255,140,70,0.13)', red: 'rgba(255,79,94,0.16)' };

function ChartTip({ active, payload, label, series, unit, lang }) {
  if (!active || !payload || !payload.length) return null;
  const date = new Date(label).toISOString().slice(0, 10);
  return (
    <div className="tip">
      <div className="t-date">{dateShort(lang, date)}</div>
      {series.map(s => {
        const row = payload.find(p => p.dataKey === s.name);
        if (!row || row.value == null) return null;
        return (
          <div key={s.name} className="t-row">
            <span className="dot" style={{ background: s.color }} />
            <span className="row" style={{ gap: 8 }}>
              <b>{num(row.value, 1)}{s.bw ? '' : unitLabelFor(s.name, unit)}</b>
              {row.payload[`${s.name}__delta`] != null && <Delta v={row.payload[`${s.name}__delta`]} digits={1} />}
            </span>
          </div>
        );
      })}
      {series.length === 1 && payload[0] && payload[0].payload[`${series[0].name}__d`] ? <div className="muted mono" style={{ fontSize: 10.5, marginTop: 4 }}>{payload[0].payload[`${series[0].name}__d`]}</div> : null}
    </div>
  );
}

// Mirino: linea verticale tratteggiata + una orizzontale per ogni serie all'altezza del suo valore
function Crosshair({ points, top, height, left, width, payload, domain }) {
  if (!points || !points.length) return null;
  const x = points[0].x;
  const [d0, d1] = domain;
  const stroke = 'rgba(255,255,255,0.35)';
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={top} y2={top + height} stroke={stroke} strokeDasharray="3 3" />
      {(payload || []).filter(p => p.value != null && d1 > d0).map(p => {
        const y = top + height * (1 - (p.value - d0) / (d1 - d0));
        return <line key={p.dataKey} x1={left} x2={left + width} y1={y} y2={y} stroke={stroke} strokeDasharray="3 3" />;
      })}
    </g>
  );
}

function ProgressChart({ model, selected, lang, exLang, unit, range, bands, t }) {
  const today = todayStr();
  const series = selected.map((name, i) => ({ name, label: translateExercise(name, exLang), color: COLORS.series[i % COLORS.series.length], bw: model.history[name][0].bw && model.history[name].every(s => s.bw) }));

  const firstDate = useMemo(() => selected.reduce((m, n) => { const d = model.history[n][0].date; return !m || d < m ? d : m; }, null), [selected, model]);
  const rangeStart = RANGES[range] == null ? firstDate : addDays(today, -RANGES[range]);
  const startDate = rangeStart < firstDate ? firstDate : rangeStart;
  const d0 = dayMs(startDate), d1 = dayMs(today);

  const { data, lo, hi } = useMemo(() => {
    const byTs = new Map();
    let lo = Infinity, hi = -Infinity;
    series.forEach(s => {
      model.history[s.name].forEach(p => {
        if (p.ts < d0 - 86400000 || p.ts > d1) return;
        const v = s.bw ? p.e1rm : wv(p.e1rm, unit, s.name);
        if (!byTs.has(p.ts)) byTs.set(p.ts, { ts: p.ts });
        const row = byTs.get(p.ts);
        row[s.name] = v;
        row[`${s.name}__pr`] = p.isPR;
        row[`${s.name}__delta`] = p.deltaPct;
        row[`${s.name}__d`] = p.bw ? `${p.topReps} ${t('reps')}` : `${wu(p.topKg, unit, s.name)} × ${p.topReps}`;
        lo = Math.min(lo, v); hi = Math.max(hi, v);
      });
    });
    return { data: [...byTs.values()].sort((a, b) => a.ts - b.ts), lo, hi };
  }, [selected, model, unit, d0, d1]);

  const periods = useMemo(() => (bands ? trainingPeriods(model.raw) : []), [bands, model]);
  const span = hi - lo || hi * 0.1 || 1;
  const yDomain = data.length ? [Math.max(0, Math.floor(lo - span * 0.25)), Math.ceil(hi + span * 0.2)] : [0, 100];
  const single = series.length === 1;

  if (!data.length) return <div className="muted" style={{ padding: '60px 0', textAlign: 'center' }}>{t('empty')}</div>;

  // Tratti "spenti": più di 14 giorni tra due sessioni e prestazione peggiorata → linea quasi trasparente.
  const strokes = Object.fromEntries(series.map(s => {
    const pts = data.filter(r => r[s.name] != null);
    const t0 = pts.length ? pts[0].ts : 0, t1 = pts.length ? pts[pts.length - 1].ts : 0;
    const bad = [];
    for (let i = 1; i < pts.length; i++) {
      if ((pts[i].ts - pts[i - 1].ts) / 86400000 > 14 && pts[i][s.name] < pts[i - 1][s.name]) bad.push([pts[i - 1].ts, pts[i].ts]);
    }
    const stops = [];
    if (bad.length && t1 > t0) {
      stops.push([0, 1]);
      bad.forEach(([a, b]) => { const oa = (a - t0) / (t1 - t0), ob = (b - t0) / (t1 - t0); stops.push([oa, 1], [oa, 0.2], [ob, 0.2], [ob, 1]); });
      stops.push([1, 1]);
    }
    return [s.name, { id: `ln-${s.color.slice(1)}`, stops }];
  }));

  return (
    <div style={{ width: '100%', height: 270, marginLeft: -10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bandGood" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1FD17A" stopOpacity="0" /><stop offset="14%" stopColor="#1FD17A" stopOpacity="0.17" />
              <stop offset="86%" stopColor="#1FD17A" stopOpacity="0.17" /><stop offset="100%" stopColor="#1FD17A" stopOpacity="0" />
            </linearGradient>
            {series.filter(s => strokes[s.name].stops.length).map(s => (
              <linearGradient key={`ln-${s.name}`} id={strokes[s.name].id} x1="0" y1="0" x2="1" y2="0">
                {strokes[s.name].stops.map(([o, a], i) => <stop key={i} offset={o} stopColor={s.color} stopOpacity={a} />)}
              </linearGradient>
            ))}
            {series.map(s => (
              <linearGradient key={s.name} id={`ar-${s.color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={single ? 0.32 : 0.08} /><stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="1 5" vertical={false} />
          {bands && periods.filter(p => p.endTs >= d0 && p.startTs <= d1).map((p, i) => {
            const fill = p.type === 'stop' ? STOP_FILL[p.stopColor] : (p.quality === 'positive' ? 'url(#bandGood)' : null);
            if (!fill) return null;
            return <ReferenceArea key={i} x1={Math.max(p.startTs, d0)} x2={Math.min(p.endTs, d1)} fill={fill} stroke="none" ifOverflow="hidden" />;
          })}
          <XAxis dataKey="ts" type="number" scale="time" domain={[d0, d1]} tickCount={range === 'all' || range === '1y' ? 4 : 5} minTickGap={34} tickFormatter={ts => (range === '1m' || range === '3m' ? dateDay(lang, new Date(ts).toISOString().slice(0, 10)) : range === '6m' ? dateMonthYear(lang, ts).split(' ')[0] : dateMonthYear(lang, ts))}
            axisLine={false} tickLine={false} tickMargin={8} allowDataOverflow />
          <YAxis domain={yDomain} width={44} axisLine={false} tickLine={false} tickCount={5} allowDataOverflow />
          <Tooltip cursor={<Crosshair domain={yDomain} />} content={<ChartTip series={series} unit={unit} lang={lang} />} />
          {series.map(s => (
            <Area key={s.name} type="monotone" dataKey={s.name} stroke={strokes[s.name].stops.length ? `url(#${strokes[s.name].id})` : s.color} strokeWidth={2.2} fill={`url(#ar-${s.color.slice(1)})`}
              connectNulls isAnimationActive={false}
              dot={p => (p.payload[`${s.name}__pr`]
                ? <circle key={`${s.name}-${p.index}`} cx={p.cx} cy={p.cy} r="4" fill="#FFC439" stroke="#000000" strokeWidth="1.5" />
                : <circle key={`${s.name}-${p.index}`} cx={p.cx} cy={p.cy} r="2" fill={s.color} />)}
              activeDot={{ r: 5, stroke: '#000000', strokeWidth: 2, fill: s.color }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCard({ name, color, model, lang, exLang, unit, t }) {
  const sum = exerciseSummary(model.history[name]);
  if (!sum) return null;
  const spark = model.history[name].slice(-14).map(s => s.e1rm);
  const val = e => (sum.bw ? `${Math.round(e.e1rm)} ${t('reps')}` : wu(e.e1rm, unit, name));
  return (
    <Card>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: color }} /><span className="ex-name">{translateExercise(name, exLang)}</span></span>
        <span className="label">{translateGroup(model.groupOf[name], lang)}</span>
      </div>
      <div className="grid2" style={{ gap: 8 }}>
        <Stat value={val(sum.last)} label={t('current')} />
        <Stat value={val(sum.best)} label={t('best')} sub={dateShort(lang, sum.best.date)} />
        <Stat value={<Delta v={sum.delta30} digits={1} />} label={t('change30')} />
        <Stat value={<Delta v={sum.delta90} digits={1} />} label={t('change90')} />
      </div>
      <div style={{ marginTop: 12 }}><Sparkline values={spark} color={color} height={38} area={false} /></div>
      <div className="row between muted mono" style={{ fontSize: 11, marginTop: 8 }}>
        <span>{sum.sessions} {t('sessions').toLowerCase()}</span><span>{num(sum.perWeek, 1)} {t('perWeek')}</span>
      </div>
    </Card>
  );
}

const FAV_KEY = 'phyzx-favorites';
function loadFavs() { try { const v = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

function ExercisePicker({ list, query, setQuery, selected, colorOf, toggle, favs, toggleFav, exLang, t, onClose }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={t('exercisesTitle')}>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 className="sheet-title">{t('exercisesTitle')}</h2>
          <button className="pill sheet-done" onClick={onClose}>{t('done')}</button>
        </div>
        <div className="search" style={{ marginBottom: 6 }}>
          <Icon name="search" size={18} />
          <input className="field" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search')} inputMode="search" />
        </div>
        <div className="sheet-list">
          {list.length === 0 && <div className="muted" style={{ padding: '28px 0', textAlign: 'center' }}>{t('noMatch')}</div>}
          {list.map(e => {
            const on = selected.includes(e.name), fav = favs.includes(e.name);
            return (
              <div key={e.name} className="ex-row">
                <button className="ex-row-main" onClick={() => toggle(e.name)} aria-pressed={on}>
                  <span className="ex-check" style={on ? { background: colorOf(e.name), borderColor: colorOf(e.name) } : undefined}>{on && <Icon name="check" size={14} stroke={3} />}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="ex-row-name">{translateExercise(e.name, exLang)}</span>
                    <span className="ex-row-sub">{translateGroup(e.group, 'it')} · {t('times')(e.sessions)}</span>
                  </span>
                </button>
                <button className={`star ${fav ? 'on' : ''}`} onClick={() => toggleFav(e.name)} aria-pressed={fav} aria-label={fav ? t('favRemove') : t('favAdd')}>
                  <Icon name="star" size={22} stroke={1.8} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Progress({ model, lang, exLang, unit, onFile, importing, msg }) {
  const t = makeT(lang);
  const [selected, setSelected] = useState(() => (model.exerciseList[0] ? [model.exerciseList[0].name] : []));
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState(false);
  const [favs, setFavs] = useState(loadFavs);
  const [range, setRange] = useState('6m');
  const [bands, setBands] = useState(true);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return model.exerciseList.filter(e => !q || e.name.toLowerCase().includes(q) || translateExercise(e.name, exLang).toLowerCase().includes(q));
  }, [model, query, exLang]);

  const toggleFav = name => setFavs(prev => { const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]; try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch (e) { /* noop */ } return next; });
  // scrollina: preferiti (ordine per frequenza/recenza) + eventuali esercizi selezionati non preferiti
  const chipList = useMemo(() => {
    const byName = new Map(model.exerciseList.map(e => [e.name, e]));
    // scrollina: recenza → svolto prima nell'ultimo giorno → frequenza → alfabetico
    const byRecency = (x, y) => y.last.localeCompare(x.last) || x.lastPos - y.lastPos || y.sessions - x.sessions || x.name.localeCompare(y.name);
    const fav = model.exerciseList.filter(e => favs.includes(e.name));
    const extra = selected.filter(n => !favs.includes(n) && byName.has(n)).map(n => byName.get(n));
    return [...fav, ...extra].sort(byRecency);
  }, [model, favs, selected]);

  const toggle = name => setSelected(prev => (prev.includes(name) ? prev.filter(n => n !== name) : prev.length >= 4 ? [...prev.slice(1), name] : [...prev, name]));
  const colorOf = name => COLORS.series[Math.max(0, selected.indexOf(name)) % COLORS.series.length];
  const primary = selected[0];
  const hist = primary ? model.history[primary] : [];

  return (
    <div className="screen">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <Label>{t('est1rm')} · {[...new Set(selected.map(n => unitLabelFor(n, unit)))].join(' / ')}</Label>
          <h1 className="h1">{t('progress')}</h1>
        </div>
        <label className={`import-btn ${importing ? 'off' : ''}`} aria-label={t('importTitle')}>
          <Icon name="upload" size={18} stroke={2.2} />{importing ? t('importing') : t('importShort')}
          <input type="file" accept=".csv,text/csv" disabled={importing} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
        </label>
      </div>
      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}

      <div style={{ display: 'grid', gap: 10 }}>
        <button className="search search-btn" onClick={() => setPicker(true)} aria-haspopup="dialog">
          <Icon name="search" size={18} />
          <span className="field">{t('search')}</span>
        </button>
        <div className="chips">
          {chipList.length === 0 && <span className="muted" style={{ fontSize: 13, padding: '8px 0' }}>{t('noFavs')}</span>}
          {chipList.map(e => {
            const on = selected.includes(e.name);
            const c = on ? colorOf(e.name) : null;
            return (
              <button key={e.name} className={`chip ${on ? 'on' : ''}`} style={on ? { borderColor: c } : undefined} onClick={() => toggle(e.name)}>
                {on && <span className="dot" style={{ background: c }} />}
                {translateExercise(e.name, exLang)}
              </button>
            );
          })}
        </div>
        <div className="label" style={{ fontSize: 12 }}>{t('max4')}</div>
      </div>

      {picker && (
        <ExercisePicker list={list} query={query} setQuery={setQuery} selected={selected} colorOf={colorOf} toggle={toggle}
          favs={favs} toggleFav={toggleFav} exLang={exLang} lang={lang} t={t} onClose={() => { setPicker(false); setQuery(''); }} />
      )}

      {selected.length > 0 && (
        <Card>
          <div className="row between" style={{ marginBottom: 12 }}>
            <Label>{t('trend')}</Label>
            <Segmented small value={range} onChange={setRange} options={[
              { value: '1m', label: t('range1m') }, { value: '3m', label: t('range3m') }, { value: '6m', label: t('range6m') },
              { value: '1y', label: t('range1y') }, { value: 'all', label: t('rangeAll') },
            ]} />
          </div>
          <ProgressChart model={model} selected={selected} lang={lang} exLang={exLang} unit={unit} range={range} bands={bands} t={t} />
          <div className="hr" />
          <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
            <div className="legend">
              <span><i className="dot" style={{ background: '#1FD17A', opacity: .7 }} />{t('legendGood')}</span>
              <span><i className="dot" style={{ background: COLORS.warn, opacity: .8 }} />{t('legendPause')}</span>
              <span><i className="dot" style={{ background: COLORS.down, opacity: .8 }} />{t('legendStop')}</span>
              <span><i className="dot" style={{ background: '#FFC439' }} />{t('record')}</span>
            </div>
            <button className="pill" onClick={() => setBands(b => !b)} style={{ color: bands ? COLORS.accent : undefined, background: bands ? 'rgba(47,140,255,.16)' : undefined }}>{bands ? t('bandsOn') : t('bandsOff')}</button>
          </div>
        </Card>
      )}

      {selected.map(n => <SummaryCard key={n} name={n} color={colorOf(n)} model={model} lang={lang} exLang={exLang} unit={unit} t={t} />)}

      {primary && (
        <Card>
          <div className="card-title"><Label>{t('recentSessions')}</Label><span className="label" style={{ fontSize: 9 }}>{translateExercise(primary, exLang)}</span></div>
          <table className="table">
            <thead><tr><th>{t('date')}</th><th>{t('topSet')}</th><th>{t('est1rm')}</th></tr></thead>
            <tbody>
              {[...hist].reverse().slice(0, 10).map(s => (
                <tr key={s.date}>
                  <td>{dateShort(lang, s.date)}</td>
                  <td style={{ color: 'var(--text)', textAlign: 'left' }}>{topSetText({ name: primary, bw: s.bw, topKg: s.topKg, topReps: s.topReps }, unit, t)} {s.isPR && <PRBadge label={t('pr')} />}</td>
                  <td><span style={{ marginRight: 8 }}>{s.bw ? '' : wu(s.e1rm, unit, primary)}</span><Delta v={s.deltaPct} digits={1} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
