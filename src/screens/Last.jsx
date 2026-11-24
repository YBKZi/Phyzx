import React from 'react';
import { translateExercise, translateGroup, GROUP_COLOR } from '../lib/core.js';
import { makeT, dateLong, relativeDay, w, wu, num } from '../lib/i18n.js';
import { Card, Label, Stat, Delta, Donut, Sparkline, PRBadge, COLORS } from '../ui/kit.jsx';

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function topSetText(ex, unit, t) {
  return ex.bw ? `${ex.topReps} ${t('reps')}` : `${wu(ex.topKg, unit, ex.name)} × ${ex.topReps}`;
}

function ExerciseCard({ ex, model, lang, exLang, unit, t }) {
  const hist = model.history[ex.name];
  const idx = hist.findIndex(s => s.date === ex.date);
  const series = hist.slice(Math.max(0, idx - 11), idx + 1).map(s => s.e1rm);
  const color = GROUP_COLOR[ex.group] && !GROUP_COLOR[ex.group].startsWith('var') ? GROUP_COLOR[ex.group] : COLORS.flat;
  const topIdx = ex.sets.findIndex(s => s.kg === ex.topKg && s.reps === ex.topReps);
  return (
    <Card>
      <div className="ex">
        <div className="ex-head">
          <div>
            <div className="row" style={{ gap: 7, marginBottom: 3 }}>
              <span className="dot" style={{ background: color }} />
              <span className="label" style={{ color }}>{translateGroup(ex.group, lang)}</span>
              {ex.isPR && <PRBadge label={t('pr')} />}
            </div>
            <div className="ex-name">{translateExercise(ex.name, exLang)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ex-top">{topSetText(ex, unit, t)}</div>
            <div style={{ marginTop: 3 }}>{ex.prev ? <Delta v={ex.deltaPct} /> : <span className="label">{t('firstTime')}</span>}</div>
          </div>
        </div>
        <Sparkline values={series} color={color} height={46} />
        <div className="sets">
          {ex.sets.map((s, i) => (
            <span key={i} className={`set ${i === topIdx ? 'best' : ''}`}>{s.kg > 0 ? `${w(s.kg, unit, ex.name)}×${s.reps}` : `${s.reps} ${t('reps')}`}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function Last({ model, lang, exLang, unit }) {
  const t = makeT(lang);
  const wk = model.workouts[0];
  if (!wk) return <div className="screen"><h1 className="h1">{t('empty')}</h1></div>;

  const groups = Object.entries(wk.groupSets).sort((a, b) => b[1] - a[1]);
  const segs = groups.map(([g, n]) => ({ value: n, color: GROUP_COLOR[g] && !GROUP_COLOR[g].startsWith('var') ? GROUP_COLOR[g] : COLORS.flat, name: g, n }));

  return (
    <div className="screen">
      <div>
        <Label>{t('lastWorkout')}</Label>
        <h1 className="h1">{cap(dateLong(lang, wk.date))}</h1>
        <div className="sub">{relativeDay(lang, wk.date)}</div>
      </div>

      <div className="grid3">
        <Stat value={wk.exercises.length} label={t('exercises')} />
        <Stat value={wk.totalSets} label={t('sets')} />
        <Stat value={wk.prCount} label={t('records')} accent={wk.prCount ? '#FFC439' : undefined} />
      </div>

      <Card>
        <div className="card-title"><Label>{t('muscleSplit')}</Label></div>
        <div className="row" style={{ gap: 18 }}>
          <Donut segments={segs} size={128} thickness={13}>
            <div>
              <div className="mono" style={{ fontSize: 24, lineHeight: 1 }}>{wk.totalSets}</div>
              <div className="label" style={{ marginTop: 4 }}>{t('setsWord')}</div>
            </div>
          </Donut>
          <div style={{ flex: 1, display: 'grid', gap: 9 }}>
            {segs.map(s => (
              <div key={s.name} className="row between">
                <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: s.color }} /><span style={{ fontSize: 13 }}>{translateGroup(s.name, lang)}</span></span>
                <span className="mono muted" style={{ fontSize: 12 }}>{s.n} · {Math.round((s.n / wk.totalSets) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {wk.exercises.map(ex => <ExerciseCard key={ex.name} ex={ex} model={model} lang={lang} exLang={exLang} unit={unit} t={t} />)}
    </div>
  );
}
