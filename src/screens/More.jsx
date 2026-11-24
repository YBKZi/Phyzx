import React, { useState } from 'react';
import { estimateOneRm } from '../lib/core.js';
import { makeT, dateShort, num } from '../lib/i18n.js';
import { Card, Label, Segmented, Icon, COLORS } from '../ui/kit.jsx';

const parse = s => parseFloat(String(s).replace(',', '.'));

function OneRm({ unit, t }) {
  const [wt, setWt] = useState('');
  const [reps, setReps] = useState('');
  const w = parse(wt), r = parseInt(reps, 10);
  const e = w > 0 && r > 0 ? estimateOneRm(w, r) : null;
  return (
    <Card>
      <div className="card-title"><Label>{t('oneRm')}</Label><span className="label" style={{ fontSize: 9 }}>{unit}</span></div>
      <div className="sub" style={{ margin: '-4px 0 12px' }}>{t('oneRmHint')}</div>
      <div className="grid2">
        <div><div className="label" style={{ marginBottom: 6 }}>{t('weightLifted')}</div><input className="field" inputMode="decimal" value={wt} onChange={ev => setWt(ev.target.value)} placeholder="0" /></div>
        <div><div className="label" style={{ marginBottom: 6 }}>{t('repsDone')}</div><input className="field" inputMode="numeric" value={reps} onChange={ev => setReps(ev.target.value)} placeholder="0" /></div>
      </div>
      {e && (
        <div style={{ marginTop: 16 }}>
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <span className="label">{t('est1rm')}</span>
            <span className="mono" style={{ fontSize: 30, color: COLORS.accent }}>{num(e, 1)}<span className="muted" style={{ fontSize: 14 }}> {unit}</span></span>
          </div>
          <div className="hr" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[95, 90, 85, 80, 75, 70, 65, 60, 50].map(p => (
              <div key={p} className="stat" style={{ padding: '8px 10px' }}>
                <div className="label" style={{ fontSize: 9 }}>{p}%</div>
                <div className="mono" style={{ fontSize: 15, marginTop: 3 }}>{num(Math.round((e * p) / 100 * 2) / 2, 1)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Converter({ t }) {
  const [kg, setKg] = useState('');
  const [lb, setLb] = useState('');
  const fromKg = v => { setKg(v); const n = parse(v); setLb(n >= 0 ? String(Math.round(n * 2.20462 * 100) / 100) : ''); };
  const fromLb = v => { setLb(v); const n = parse(v); setKg(n >= 0 ? String(Math.round((n / 2.20462) * 100) / 100) : ''); };
  return (
    <Card>
      <div className="card-title"><Label>{t('convert')}</Label></div>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>kg</div><input className="field" inputMode="decimal" value={kg} onChange={ev => fromKg(ev.target.value)} placeholder="0" /></div>
        <span className="muted" style={{ marginTop: 22 }}>⇄</span>
        <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>lb</div><input className="field" inputMode="decimal" value={lb} onChange={ev => fromLb(ev.target.value)} placeholder="0" /></div>
      </div>
    </Card>
  );
}

export default function More({ model, lang, exLang, unit, setLang, setExLang, setUnit, onFile, importing, msg, onClear }) {
  const t = makeT(lang);
  const first = model.workouts.length ? model.workouts[model.workouts.length - 1].date : null;
  return (
    <div className="screen">
      <div>
        <Label>{t('data')}</Label>
        <h1 className="h1">{t('navMore')}</h1>
        <div className="sub">{t('summary')(model.workouts.length, model.totalSets)}{first ? ` · ${t('since')} ${dateShort(lang, first)}` : ''}</div>
      </div>

      <Card>
        <div className="card-title"><Label>{t('importTitle')}</Label></div>
        <div className="sub" style={{ margin: '-4px 0 14px' }}>{t('importHint')}</div>
        <label className={`btn ${importing ? 'off' : ''}`}>
          <Icon name="upload" size={18} stroke={2} />{importing ? t('importing') : t('chooseCsv')}
          <input type="file" accept=".csv,text/csv" disabled={importing} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
        </label>
        {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`} style={{ marginTop: 12 }}>{msg.text}</div>}
      </Card>

      <OneRm unit={unit} t={t} />
      <Converter t={t} />

      <Card>
        <div className="card-title"><Label>{t('prefs')}</Label></div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="row between"><span>{t('appLang')}</span><Segmented small value={lang} onChange={setLang} options={[{ value: 'it', label: 'IT' }, { value: 'en', label: 'EN' }]} /></div>
          <div className="row between"><span>{t('exLang')}</span><Segmented small value={exLang} onChange={setExLang} options={[{ value: 'it', label: 'IT' }, { value: 'en', label: 'EN' }]} /></div>
          <div className="row between"><span>{t('unit')}</span><Segmented small value={unit} onChange={setUnit} options={[{ value: 'kg', label: 'KG' }, { value: 'lb', label: 'LB' }]} /></div>
        </div>
      </Card>

      <Card>
        <div className="card-title"><Label>{t('danger')}</Label></div>
        <button className="btn danger" onClick={() => { if (window.confirm(t('clearConfirm'))) onClear(); }}>{t('clearData')}</button>
      </Card>
    </div>
  );
}
