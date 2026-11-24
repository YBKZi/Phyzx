import React, { useState } from 'react';
import { translateExercise, translateGroup, GROUP_COLOR } from '../lib/core.js';
import { weeklyCounts, heatmap, weekStreak, groupSetsBetween, addDays, daysBetween, todayStr } from '../lib/stats.js';
import { makeT, dateDay, dateWeekday, relativeDay, num } from '../lib/i18n.js';
import { Card, Label, Stat, Delta, PRBadge, Icon, COLORS } from '../ui/kit.jsx';
import { topSetText } from './Last.jsx';

const gColor = g => (GROUP_COLOR[g] && !GROUP_COLOR[g].startsWith('var') ? GROUP_COLOR[g] : COLORS.flat);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function WeeklyBars({ weeks, lang, t }) {
  const max = Math.max(3, ...weeks.map(w => w.workouts));
  const avg = weeks.reduce((s, w) => s + w.workouts, 0) / weeks.length;
  return (
    <div>
      <div style={{ position: 'relative', height: 110, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(avg / max) * 100}%`, borderTop: '1px dashed rgba(255,255,255,0.22)' }}>
          <span className="mono" style={{ position: 'absolute', right: 0, top: -15, fontSize: 9.5, color: 'var(--text-2)' }}>{num(avg, 1)}</span>
        </div>
        {weeks.map((w, i) => {
          const last = i === weeks.length - 1;
          const h = (w.workouts / max) * 100;
          return (
            <div key={w.start} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              {w.workouts > 0 && <span className="mono" style={{ fontSize: 9.5, color: last ? COLORS.accent : 'var(--text-2)' }}>{w.workouts}</span>}
              <div style={{
                width: '100%', height: `${Math.max(h, w.workouts ? 5 : 2)}%`, borderRadius: 7,
                background: w.workouts ? (last ? 'linear-gradient(180deg,#5ADECD,#2fa898)' : 'linear-gradient(180deg,rgba(90,222,205,.55),rgba(90,222,205,.18))') : 'rgba(255,255,255,0.06)',
                boxShadow: last && w.workouts ? '0 0 18px rgba(90,222,205,.45)' : 'none',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {weeks.map((w, i) => (
          <div key={w.start} className="mono" style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'visible', minWidth: 0 }}>
            {i % 3 === 0 ? dateDay(lang, w.start) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ cols, lang, t }) {
  const level = n => (n === 0 ? 0 : n <= 8 ? 1 : n <= 16 ? 2 : n <= 24 ? 3 : 4);
  const bg = ['rgba(255,255,255,0.05)', 'rgba(90,222,205,0.22)', 'rgba(90,222,205,0.42)', 'rgba(90,222,205,0.68)', '#5ADECD'];
  const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const dayEn = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const lab = lang === 'en' ? dayEn : days;
  return (
    <div>
      <div style={{ display: 'flex', gap: 5 }}>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 4, paddingRight: 2 }}>
          {lab.map((d, i) => <span key={i} className="mono" style={{ fontSize: 8.5, color: 'var(--text-3)', display: 'grid', alignItems: 'center' }}>{i % 2 === 0 ? d : ''}</span>)}
        </div>
        <div style={{ flex: 1, display: 'grid', gridAutoFlow: 'column', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gridTemplateRows: 'repeat(7, auto)', gap: 4 }}>
          {cols.map(col => col.map(c => (
            <div key={c.date} title={c.date} style={{
              aspectRatio: '1', borderRadius: 5, background: c.future ? 'transparent' : bg[level(c.sets)],
              border: c.future ? '1px dashed rgba(255,255,255,0.05)' : 'none',
              boxShadow: level(c.sets) === 4 ? '0 0 10px rgba(90,222,205,.5)' : 'none',
            }} />
          )))}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 5, marginTop: 10 }}>
        <span className="label" style={{ fontSize: 9 }}>{t('lessLbl')}</span>
        {bg.map((b, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 4, background: b }} />)}
        <span className="label" style={{ fontSize: 9 }}>{t('moreLbl')}</span>
      </div>
    </div>
  );
}

function Balance({ model, lang, t, today }) {
  const cur = groupSetsBetween(model.workouts, addDays(today, -29), addDays(today, 1));
  const prev = groupSetsBetween(model.workouts, addDays(today, -59), addDays(today, -29));
  const keys = [...new Set([...Object.keys(cur), ...Object.keys(prev)])].sort((a, b) => (cur[b] || 0) - (cur[a] || 0));
  const max = Math.max(1, ...keys.map(k => cur[k] || 0), ...keys.map(k => prev[k] || 0));
  if (!keys.length) return null;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {keys.map(g => {
        const c = cur[g] || 0, p = prev[g] || 0, d = c - p;
        return (
          <div key={g}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="row" style={{ gap: 8, fontSize: 13 }}><span className="dot" style={{ background: gColor(g) }} />{translateGroup(g, lang)}</span>
              <span className="mono" style={{ fontSize: 12 }}>{c} <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`} style={{ marginLeft: 4 }}>{d > 0 ? '+' : ''}{d}</span></span>
            </div>
            <div style={{ position: 'relative', height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${(c / max) * 100}%`, borderRadius: 4, background: gColor(g), boxShadow: `0 0 12px ${gColor(g)}66` }} />
              <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${(p / max) * 100}%`, width: 2, borderRadius: 1, background: 'rgba(255,255,255,0.55)' }} />
            </div>
          </div>
        );
      })}
      <div className="label" style={{ fontSize: 9 }}>▍ {t('vsPrev30')}</div>
    </div>
  );
}

function WorkoutRow({ wk, lang, exLang, unit, t, open, onToggle }) {
  const groups = Object.entries(wk.groupSets).sort((a, b) => b[1] - a[1]);
  return (
    <Card onClick={onToggle} style={{ padding: 14 }}>
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <div style={{ width: 46, textAlign: 'center', padding: '6px 0', borderRadius: 14, background: 'var(--glass)', border: '1px solid var(--line)' }}>
            <div className="label" style={{ fontSize: 9 }}>{dateWeekday(lang, wk.date)}</div>
            <div className="mono" style={{ fontSize: 17, lineHeight: 1.15 }}>{wk.date.slice(8)}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{cap(dateDay(lang, wk.date))} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {relativeDay(lang, wk.date)}</span></div>
            <div className="row" style={{ gap: 5, marginTop: 6 }}>
              {groups.slice(0, 6).map(([g]) => <span key={g} className="dot" style={{ background: gColor(g), width: 7, height: 7, borderRadius: 3 }} />)}
              <span className="mono muted" style={{ fontSize: 11, marginLeft: 3 }}>{wk.exercises.length} {t('exercises').toLowerCase()} · {wk.totalSets} {t('setsWord')}</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {wk.prCount > 0 && <PRBadge label={`${wk.prCount}`} />}
          <span style={{ color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'grid' }}><Icon name="chevron" size={18} /></span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 14, display: 'grid', gap: 0 }}>
          {wk.exercises.map(ex => (
            <div key={ex.name} className="row between" style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
              <span className="row" style={{ gap: 8, minWidth: 0 }}>
                <span className="dot" style={{ background: gColor(ex.group) }} />
                <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translateExercise(ex.name, exLang)}</span>
                {ex.isPR && <PRBadge label={t('pr')} />}
              </span>
              <span className="row" style={{ gap: 10, flexShrink: 0 }}>
                <span className="mono" style={{ fontSize: 12 }}>{ex.sets.length}× · {topSetText(ex, unit, t)}</span>
                <Delta v={ex.deltaPct} digits={0} compact />
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Recent({ model, lang, exLang, unit }) {
  const t = makeT(lang);
  const today = todayStr();
  const [open, setOpen] = useState(null);
  const weeks = weeklyCounts(model.workouts, 12, today);
  const cols = heatmap(model.workouts, 16, today);
  const last30 = model.workouts.filter(w => daysBetween(w.date, today) < 30);
  const streak = weekStreak(model.workouts, today);
  const since = model.workouts.length ? daysBetween(model.workouts[0].date, today) : 0;
  const avg = weeks.reduce((s, w) => s + w.workouts, 0) / weeks.length;

  return (
    <div className="screen">
      <div>
        <Label>{t('last30')}</Label>
        <h1 className="h1">{t('navRecent')}</h1>
      </div>

      <div className="grid3">
        <Stat value={last30.length} label={t('workoutsWord')} sub={t('last30')} />
        <Stat value={num(avg, 1)} label={t('avgPerWeek')} sub={t('last12w')} />
        <Stat value={streak} label={t('weeks')} sub={t('streak')} accent={streak >= 4 ? COLORS.up : undefined} />
      </div>

      <Card>
        <div className="card-title"><Label>{t('workoutsPerWeek')}</Label><span className="label" style={{ fontSize: 9 }}>{t('last12w')}</span></div>
        <WeeklyBars weeks={weeks} lang={lang} t={t} />
      </Card>

      <Card>
        <div className="card-title"><Label>{t('consistency')}</Label><span className="label" style={{ fontSize: 9 }}>{t('last16w')}</span></div>
        <Heatmap cols={cols} lang={lang} t={t} />
      </Card>

      <Card>
        <div className="card-title"><Label>{t('balance')}</Label><span className="label" style={{ fontSize: 9 }}>{t('setsWord')} · 30g</span></div>
        <Balance model={model} lang={lang} t={t} today={today} />
      </Card>

      <div className="row between" style={{ marginTop: 6 }}><Label>{t('timeline')}</Label><span className="label" style={{ fontSize: 9 }}>{t('tapToOpen')}</span></div>
      {model.workouts.slice(0, 14).map(wk => (
        <WorkoutRow key={wk.date} wk={wk} lang={lang} exLang={exLang} unit={unit} t={t} open={open === wk.date} onToggle={() => setOpen(open === wk.date ? null : wk.date)} />
      ))}
    </div>
  );
}
