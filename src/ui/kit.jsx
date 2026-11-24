import React from 'react';
import { pct, num } from '../lib/i18n.js';

export const COLORS = {
  accent: '#2F8CFF', up: '#1FD17A', down: '#FF4F5E', flat: '#8E8E93', warn: '#FFC439',
  series: ['#2F8CFF', '#FFC439', '#A78BFA', '#FF7A59'],
};

export function Card({ children, className = '', style, onClick, as: Tag = 'div', ...rest }) {
  return <Tag className={`card ${onClick ? 'tap' : ''} ${className}`} style={style} onClick={onClick} {...rest}>{children}</Tag>;
}

export const Label = ({ children, style }) => <div className="label" style={style}>{children}</div>;

export function Stat({ value, label, accent, sub }) {
  return (
    <div className="stat">
      <div className="stat-v" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="label">{label}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

// ▲ / ▼ con colore semantico; null → trattino
export function Delta({ v, digits = 1, compact }) {
  if (v == null) return <span className="delta flat">—</span>;
  const dir = Math.abs(v) < 0.005 ? 'flat' : v > 0 ? 'up' : 'down';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•';
  return <span className={`delta ${dir}`}>{arrow}{compact ? '' : ' '}{pct(Math.abs(v) < 0.005 ? 0 : v, digits).replace(/^\+/, '')}</span>;
}

// Pillola con variazione percentuale (▲ verde / ▼ rosso)
export function DeltaPill({ v, label, digits = 1 }) {
  if (v == null) return null;
  const dir = Math.abs(v) < 0.005 ? 'flat' : v > 0 ? 'up' : 'down';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•';
  return <span className={`dpill ${dir}`}>{arrow} {pct(Math.abs(v) < 0.005 ? 0 : v, digits).replace(/^\+/, '')}{label ? <em>{label}</em> : null}</span>;
}

// Scheda di apertura di ogni schermata: gradiente colorato, numero gigante
export function Hero({ tone = 'blue', eyebrow, tag, value, unit, pills, children, foot }) {
  return (
    <div className={`hero ${tone}`}>
      <div className="hero-grain" aria-hidden="true" />
      <div className="row between"><span className="hero-eyebrow">{eyebrow}</span>{tag ? <span className="hero-tag">{tag}</span> : null}</div>
      <div className="hero-num">{value}{unit ? <small>{unit}</small> : null}</div>
      {pills ? <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{pills}</div> : null}
      {children ? <div style={{ margin: '14px -6px -4px' }}>{children}</div> : null}
      {foot ? <div className="hero-foot">{foot}</div> : null}
    </div>
  );
}

export function Segmented({ options, value, onChange, small }) {
  return (
    <div className={`seg ${small ? 'small' : ''}`} role="tablist">
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Grafici SVG leggeri ───────────────────────────────────────────────────────

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

let uid = 0;

// misura la larghezza disponibile, così i grafici SVG riempiono sempre la card
export function useWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(Math.round(el.clientWidth));
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(es => setW(Math.round(es[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function Sparkline({ values, color = COLORS.accent, height = 44, area = true }) {
  const id = React.useMemo(() => `sp${++uid}`, []);
  const [ref, width] = useWidth();
  const body = (() => {
    if (!width) return null;
    if (!values || values.length < 2) {
      return <svg width={width} height={height} aria-hidden="true"><line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.14)" strokeDasharray="2 4" /></svg>;
    }
    const min0 = Math.min(...values), max0 = Math.max(...values);
    const mid = (min0 + max0) / 2, span = Math.max(max0 - min0, Math.abs(max0) * 0.12, 1e-6);
    const min = mid - span / 2;
    const pad = 5;
    const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)]);
    const line = smoothPath(pts);
    const last = pts[pts.length - 1];
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={`${line} L ${last[0]} ${height} L ${pts[0][0]} ${height} Z`} fill={`url(#${id})`} />}
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r="6" fill={color} opacity="0.18" />
        <circle cx={last[0]} cy={last[1]} r="2.8" fill={color} />
      </svg>
    );
  })();
  return <div ref={ref} style={{ width: '100%', height }}>{body}</div>;
}

export function Donut({ segments, size = 132, thickness = 14, children }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  const gap = segments.length > 1 ? 3 : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = Math.max(0, (s.value / total) * c - gap);
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc}  />
          );
          acc += (s.value / total) * c;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

// ── Icone (linea, 24px) ───────────────────────────────────────────────────────
const P = {
  last: <><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  recent: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  progress: <><path d="M3 3v18h18" /><path d="m7 15 4-5 3 3 5-7" /></>,
  analysis: <><rect x="4" y="12" width="4" height="8" rx="1.2" /><rect x="10" y="4" width="4" height="16" rx="1.2" /><rect x="16" y="9" width="4" height="11" rx="1.2" /></>,
  more: <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a2 2 0 0 0 0 4h3M16 6h3a2 2 0 0 1 0 4h-3M12 13v4M8.5 20h7" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  flame: <><path d="M12 3c.6 3.2-2.4 4.6-2.4 7.4 0 1.4 1 2.4 2.4 2.4s2.4-1 2.4-2.4c0-.7-.2-1.2-.5-1.7 2.4 1.2 4.6 3.5 4.6 6.6A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.5C5.5 10 9.5 8 12 3z" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  pulse: <><path d="M3 12h4l2.5-6.5 4 13L16 12h5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  dumbbell: <><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  bars: <><path d="M6 20v-8M12 20V4M18 20v-12" /></>,
  scale: <><path d="M12 4v16M7 20h10M5 7h14" /><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></>,
  trend: <><path d="m3.5 17 5.5-6 4 3 7-8" /><path d="M15 6h5.5v5.5" /></>,
  star: <><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8z" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
};
export function Icon({ name, size = 22, stroke = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;
}

// Icone della barra in basso: contorno da inattive, riempite da attive
export function DockIcon({ name, active, size = 24 }) {
  const f = active ? 'currentColor' : 'none';
  const sw = active ? 2.1 : 1.8;
  const shapes = {
    progress: <>
      <path d="M3.5 17.5 9 11.5l3.8 3L20.5 6.5V20h-17z" fill={f} fillOpacity={active ? 0.22 : 0} stroke="none" />
      <path d="M3.5 17.5 9 11.5l3.8 3 7.7-8" />
      <path d="M3.5 20.5h17" opacity={active ? 1 : 0.55} />
    </>,
    recent: <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="4" fill={f} fillOpacity={active ? 0.22 : 0} />
      <path d="M8 3v3.6M16 3v3.6M3.5 10.5h17" />
      <circle cx="8.5" cy="14.8" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14.8" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="14.8" r="1" fill="currentColor" stroke="none" />
    </>,
    analysis: <>
      <rect x="4" y="11.5" width="4.4" height="8.5" rx="1.6" fill={f} stroke={active ? 'none' : 'currentColor'} />
      <rect x="9.8" y="4" width="4.4" height="16" rx="1.6" fill={f} stroke={active ? 'none' : 'currentColor'} />
      <rect x="15.6" y="8.5" width="4.4" height="11.5" rx="1.6" fill={f} stroke={active ? 'none' : 'currentColor'} />
    </>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

// Titolo di card con icona colorata
export function CardTitle({ icon, tone = '#2F8CFF', children, sub }) {
  return (
    <div className="card-title">
      <div className="row" style={{ gap: 10 }}>
        {icon && <span className="ichip" style={{ '--c': tone }}><Icon name={icon} size={16} stroke={2} /></span>}
        <span className="ct">{children}</span>
      </div>
      {sub ? <span className="ct-sub">{sub}</span> : null}
    </div>
  );
}

// Anello di avanzamento animato
export function Ring({ value, size = 104, thickness = 11, color = COLORS.up, children }) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  const [v, setV] = React.useState(0);
  React.useEffect(() => { const id = requestAnimationFrame(() => setV(Math.max(0, Math.min(1, value)))); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 8px ${color}77)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

// Numero che sale da zero al valore (rispetta "riduci animazioni")
export function CountUp({ to, decimals = 0, ms = 900 }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return undefined; }
    let raf; const t0 = performance.now();
    const tick = now => { const p = Math.min(1, (now - t0) / ms); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{num(v, decimals)}</>;
}

export function PRBadge({ label = 'PR' }) {
  return <span className="prbadge"><Icon name="trophy" size={11} stroke={2} />{label}</span>;
}
