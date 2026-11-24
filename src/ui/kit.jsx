import React from 'react';
import { pct } from '../lib/i18n.js';

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
  star: <><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8z" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7.5" /></>,
};
export function Icon({ name, size = 22, stroke = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;
}

export function PRBadge({ label = 'PR' }) {
  return <span className="prbadge"><Icon name="trophy" size={11} stroke={2} />{label}</span>;
}
