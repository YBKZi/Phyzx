import React, { useEffect, useMemo, useRef, useState } from 'react';
import { translateExercise, GROUP_COLOR } from '../lib/core.js';
import { todayStr } from '../lib/stats.js';
import { buildAnalysis } from '../lib/analytics.js';
import { dateShort, dateDay, wu, num, pct } from '../lib/i18n.js';
import { Card, Label, Stat, Delta, DeltaPill, Hero, CardTitle, Ring, CountUp, PRBadge, Donut, Segmented, COLORS } from '../ui/kit.jsx';
import PageHeader from '../ui/PageHeader.jsx';
import { makeT } from '../lib/i18n.js';

const gColor = g => GROUP_COLOR[g] || COLORS.flat;
const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function Title({ children, sub, icon, tone }) {
  return <CardTitle icon={icon} tone={tone} sub={sub}>{children}</CardTitle>;
}

function HBar({ label, value, frac, color = COLORS.accent, dot, mark }) {
  return (
    <div>
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className="row" style={{ gap: 8, fontSize: 14, minWidth: 0 }}>{dot && <span className="dot" style={{ background: dot }} />}<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span></span>
        <span className="mono" style={{ fontSize: 13, flexShrink: 0 }}>{value}</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-2)' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, Math.max(1.5, frac * 100))}%`, borderRadius: 4, background: color }} />
        {mark != null && <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${Math.min(99, mark * 100)}%`, width: 2, borderRadius: 1, background: '#fff' }} />}
      </div>
    </div>
  );
}

function Columns({ items, highlightLast }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div>
      <div style={{ height: 96, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {items.map((it, i) => (
          <div key={it.key} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
            {it.value > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>{it.value}</span>}
            <div style={{ width: '100%', height: `${Math.max((it.value / max) * 100, it.value ? 5 : 2)}%`, borderRadius: 6, background: it.value ? (highlightLast && i === items.length - 1 ? COLORS.accent : 'rgba(47,140,255,.45)') : 'var(--surface-2)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {items.map(it => <div key={it.key} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: 'var(--text-3)', minWidth: 0 }}>{it.label}</div>)}
      </div>
    </div>
  );
}

// Colonne scorrevoli per storie lunghe: parte dal mese più recente, gennaio mostra l'anno
function ScrollColumns({ items }) {
  const ref = useRef(null);
  const max = Math.max(1, ...items.map(i => i.value));
  useEffect(() => { if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth; }, [items.length]);
  const W = 26;
  return (
    <div ref={ref} style={{ overflowX: 'auto', margin: '0 -4px', padding: '0 4px', scrollbarWidth: 'none' }}>
      <div style={{ width: items.length * (W + 4), minWidth: '100%' }}>
        <div style={{ height: 96, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {items.map((it, i) => (
            <div key={it.key} style={{ width: W, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {it.value > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>{it.value}</span>}
              <div style={{ width: '100%', height: `${Math.max((it.value / max) * 100, it.value ? 5 : 2)}%`, borderRadius: 6, background: it.value ? (i === items.length - 1 ? COLORS.accent : 'rgba(47,140,255,.45)') : 'var(--surface-2)' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {items.map(it => (
            <div key={it.key} style={{ width: W, flexShrink: 0, textAlign: 'center', fontSize: 9.5, color: 'var(--text-3)', lineHeight: 1.25 }}>
              {it.label}
              <div style={{ height: 11, color: 'var(--text-2)', fontWeight: 600 }}>{it.month === 0 ? `'${String(it.year).slice(2)}` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ left, right, sub }) {
  return (
    <div className="row between" style={{ padding: '11px 0', borderTop: '1px solid var(--line)', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{left}</div>
        {sub && <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>{right}</div>
    </div>
  );
}

const fmtSpan = days => (days >= 365 ? `${num(days / 365, 1)} anni` : days >= 60 ? `${Math.round(days / 30.4)} mesi` : `${days} giorni`);

export default function Analysis({ model, unit, onFile, importing, msg, profile, onProfiles }) {
  const [recRange, setRecRange] = useState('12m');
  const [monRange, setMonRange] = useState('12m');
  const t = makeT('it');
  const a = useMemo(() => buildAnalysis(model, todayStr()), [model]);
  if (!a) return null;
  const { overview: o, consistency: c, balance: b } = a;
  const ex = n => translateExercise(n);
  const total90 = a.groups.reduce((s, g) => s + g.sets90, 0);
  const bTot = Math.max(1, b.push + b.pull + b.legs);

  return (
    <div className="screen">
      <PageHeader title="Analisi" t={t} onFile={onFile} importing={importing} msg={msg} profile={profile} onProfiles={onProfiles} />

      <Hero tone="violet" eyebrow="Allenamenti totali" tag={`da ${fmtSpan(o.spanDays)}`} value={<CountUp to={o.workouts} />}
        pills={<><span className="dpill">{num(o.perWeek, 1)} a settimana</span><span className="dpill">{a.records.total} record</span></>}
        foot={<><span>{o.sets} serie</span><span>{o.exercises} esercizi diversi</span></>} />

      <div className="grid2">
        <Stat value={num(o.setsPerWorkout, 1)} label="Serie per allenamento" />
        <Stat value={num(o.exPerWorkout, 1)} label="Esercizi per allenamento" />
      </div>

      <Card>
        <Title icon="bars" tone="#2F8CFF" sub={monRange === 'all' && a.monthsAll.length > 12 ? `${a.monthsAll.length} mesi · scorri` : 'ultimi 12 mesi'}>Allenamenti al mese</Title>
        {a.monthsAll.length > 12 && (
          <div style={{ marginBottom: 12 }}><Segmented small value={monRange} onChange={setMonRange} options={[{ value: '12m', label: '12 mesi' }, { value: 'all', label: 'Tutta la storia' }]} /></div>
        )}
        {monRange === 'all' && a.monthsAll.length > 12
          ? <ScrollColumns items={a.monthsAll.map(m => ({ key: m.key, label: MONTHS[m.month], month: m.month, year: m.year, value: m.workouts }))} />
          : <Columns highlightLast items={a.months.map(m => ({ key: m.key, label: MONTHS[m.month], value: m.workouts }))} />}
      </Card>

      <Card>
        <Title icon="flame" tone="#FF8C46">Costanza</Title>
        <div className="row" style={{ gap: 18, marginBottom: 14 }}>
          <Ring value={c.activeWeeksPct} size={108} thickness={12} color={c.activeWeeksPct >= 0.8 ? COLORS.up : COLORS.warn}>
            <div><div className="mono" style={{ fontSize: 24, letterSpacing: '-0.03em' }}><CountUp to={Math.round(c.activeWeeksPct * 100)} />%</div><div className="label" style={{ fontSize: 11 }}>attive</div></div>
          </Ring>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{c.activeWeeks} settimane su {c.totalWeeks} con almeno un allenamento</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{Math.round(c.stopShare * 100)}% del tempo in pausa · {c.stopsCount} {c.stopsCount === 1 ? 'pausa lunga' : 'pause lunghe'}</div>
          </div>
        </div>
        <div className="grid2" style={{ gap: 8, marginBottom: 6 }}>
          <Stat value={c.bestStreak} label="Record settimane di fila" />
          <Stat value={c.bestWeek ? c.bestWeek.n : '–'} label="Settimana migliore" sub={c.bestWeek ? `dal ${dateDay('it', c.bestWeek.start)}` : ''} />
        </div>
        <div className="hr" />
        <div className="legend" style={{ gap: '8px 18px' }}>
          <span><i className="dot" style={{ background: COLORS.warn }} />{c.stopsByColor.yellow} {c.stopsByColor.yellow === 1 ? "pausa breve" : "pause brevi"}</span>
          <span><i className="dot" style={{ background: '#FF8C46' }} />{c.stopsByColor.orange} {c.stopsByColor.orange === 1 ? "media" : "medie"}</span>
          <span><i className="dot" style={{ background: COLORS.down }} />{c.stopsByColor.red} {c.stopsByColor.red === 1 ? "stop lungo" : "stop lunghi"}</span>
        </div>
        {c.longestStop && <div className="sub" style={{ marginTop: 10 }}>Pausa più lunga: {c.longestStop.gapDays} giorni, dal {dateShort('it', c.longestStop.startDate)} al {dateShort('it', c.longestStop.endDate)}.</div>}
        <div className="sub">Periodi di allenamento: {c.activePeriods}, di cui {c.positivePeriods} proficui e {c.negativePeriods} in calo.</div>
      </Card>

      <Card>
        <Title icon="recent" tone="#A78BFA" sub="quando ti alleni">Giorni della settimana</Title>
        <Columns items={a.weekdays.map((n, i) => ({ key: i, label: DAYS[i], value: n }))} />
      </Card>

      <Card>
        <Title icon="dumbbell" tone="#5CC8FF" sub="ultimi 90 giorni">Gruppi muscolari</Title>
        <div className="row" style={{ gap: 18, marginBottom: 16 }}>
          <Donut size={116} thickness={13} segments={a.groups.filter(g => g.sets90 > 0).map(g => ({ value: g.sets90, color: gColor(g.group) }))}>
            <div><div className="mono" style={{ fontSize: 20 }}>{total90}</div><div className="label" style={{ fontSize: 11 }}>serie</div></div>
          </Donut>
          <div className="muted" style={{ fontSize: 12.5 }}>La barra mostra la quota negli ultimi 90 giorni, il segno bianco la tua quota storica.</div>
        </div>
        <div style={{ display: 'grid', gap: 13 }}>
          {a.groups.map(g => (
            <HBar key={g.group} dot={gColor(g.group)} color={gColor(g.group)} label={g.group} frac={g.share90} mark={g.shareAll}
              value={`${Math.round(g.share90 * 100)}% · ${num(g.perWeek90, 1)}/sett.`} />
          ))}
        </div>
      </Card>

      <Card>
        <Title icon="scale" tone="#1FD17A" sub="serie · 90 giorni">Spinta, trazione, gambe</Title>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3, marginBottom: 12 }}>
          <div style={{ flex: b.push / bTot || 0.001, background: '#2F8CFF' }} /><div style={{ flex: b.pull / bTot || 0.001, background: '#FFC439' }} /><div style={{ flex: b.legs / bTot || 0.001, background: '#1FD17A' }} />
        </div>
        <div className="legend" style={{ gap: '8px 18px' }}>
          <span><i className="dot" style={{ background: '#2F8CFF' }} />Spinta {b.push}</span>
          <span><i className="dot" style={{ background: '#FFC439' }} />Trazione {b.pull}</span>
          <span><i className="dot" style={{ background: '#1FD17A' }} />Gambe {b.legs}</span>
        </div>
        {b.ratio != null && <div className="sub" style={{ marginTop: 10 }}>Rapporto spinta/trazione {num(b.ratio, 2)}: {b.ratio > 1.25 ? 'più spinta che trazione.' : b.ratio < 0.8 ? 'più trazione che spinta.' : 'bilanciato.'}</div>}
      </Card>

      <Card>
        <Title icon="pulse" tone="#A78BFA" sub="serie con carico">Range di ripetizioni</Title>
        <div style={{ display: 'grid', gap: 13 }}>
          {a.reps.map(r => <HBar key={r.k} label={`${r.k} rip.`} frac={r.share} value={`${Math.round(r.share * 100)}%`} color="#A78BFA" />)}
        </div>
      </Card>

      <div className="grid2">
        <Stat value={a.records.total} label="Record totali" sub={`${num(a.records.perWorkout, 2)} per allenamento`} accent={COLORS.warn} />
        <Stat value={a.records.last90} label="Record · 90 giorni" accent={a.records.last90 ? COLORS.warn : undefined} />
      </div>

      <Card>
        <Title icon="trophy" tone="#FFC439" sub={recRange === 'all' ? `${a.records.monthsAll.length} mesi · scorri` : 'ultimi 12 mesi'}>Record per mese</Title>
        {a.records.monthsAll.length > 12 && (
          <div style={{ marginBottom: 12 }}><Segmented small value={recRange} onChange={setRecRange} options={[{ value: '12m', label: '12 mesi' }, { value: 'all', label: 'Tutta la storia' }]} /></div>
        )}
        {recRange === 'all' && a.records.monthsAll.length > 12
          ? <ScrollColumns items={a.records.monthsAll.map(m => ({ key: m.key, label: MONTHS[m.month], month: m.month, year: m.year, value: m.workouts }))} />
          : <Columns highlightLast items={a.records.months.map(m => ({ key: m.key, label: MONTHS[m.month], value: m.workouts }))} />}
      </Card>

      <Card>
        <Title icon="trophy" tone="#FFC439">Ultimi record</Title>
        {a.records.latest.map(p => (
          <Row key={`${p.name}${p.date}`} left={ex(p.name)} sub={dateShort('it', p.date)} right={<span className="row" style={{ gap: 8 }}><span className="mono" style={{ fontSize: 13 }}>{p.bw ? `${p.topReps} rip.` : wu(p.e1rm, unit, p.name)}</span><PRBadge label="PR" /></span>} />
        ))}
      </Card>

      <Card>
        <Title icon="trend" tone="#1FD17A" sub={`1RM · ${a.movers.win} giorni`}>Chi sta migliorando</Title>
        {a.movers.avg != null && <div className="sub" style={{ margin: '-6px 0 8px' }}>Variazione media: <b style={{ color: a.movers.avg >= 0 ? COLORS.up : COLORS.down }}>{pct(a.movers.avg, 1)}</b> su {a.movers.count} esercizi.</div>}
        {a.movers.top.map(m => <Row key={m.name} left={ex(m.name)} sub={`${wu(m.base.e1rm, unit, m.name)} → ${wu(m.last.e1rm, unit, m.name)}`} right={<Delta v={m.pct} digits={1} />} />)}
        {a.movers.bottom.length > 0 && <>
          <div className="label" style={{ margin: '16px 0 2px' }}>In calo</div>
          {a.movers.bottom.map(m => <Row key={m.name} left={ex(m.name)} sub={`${wu(m.base.e1rm, unit, m.name)} → ${wu(m.last.e1rm, unit, m.name)}`} right={<Delta v={m.pct} digits={1} />} />)}
        </>}
      </Card>

      {a.stagnant.length > 0 && (
        <Card>
          <Title icon="clock" tone="#FF8C46" sub="almeno 6 sessioni">Fermi da un po'</Title>
          {a.stagnant.map(s => <Row key={s.name} left={ex(s.name)} sub={`${s.sessions} sessioni`} right={<span className="mono" style={{ fontSize: 13 }}>{s.days} giorni senza record</span>} />)}
        </Card>
      )}

      <Card>
        <Title icon="bars" tone="#2F8CFF" sub="per numero di allenamenti">Esercizi più frequenti</Title>
        <div style={{ display: 'grid', gap: 13 }}>
          {a.frequent.map(e => <HBar key={e.name} dot={gColor(e.group)} color={gColor(e.group)} label={ex(e.name)} value={e.sessions} frac={e.sessions / a.frequent[0].sessions} />)}
        </div>
      </Card>

      <Card>
        <Title icon="target" tone="#FF4F5E" sub="1RM stimato">Massimali</Title>
        {a.bests.map(e => <Row key={e.name} left={ex(e.name)} sub={dateShort('it', e.best.date)} right={<span className="mono" style={{ fontSize: 14 }}>{wu(e.best.e1rm, unit, e.name)}</span>} />)}
      </Card>
    </div>
  );
}
