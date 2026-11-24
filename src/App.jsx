import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import logo from './assets/phyzx-logo.png';
import { WORKOUT_DATA_KEY, UNITS_KEY } from './lib/core.js';
import { buildModel, liftoffRowsToRaw, mergeRows, normalizeRows, snapKg } from './lib/stats.js';
import { makeT } from './lib/i18n.js';
import { Icon, Label } from './ui/kit.jsx';
import Recent from './screens/Recent.jsx';
import Analysis from './screens/Analysis.jsx';
import Progress from './screens/Progress.jsx';

const MIGRATION_KEY = 'phyzx-data-v2';

const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };

// Carica i dati salvati; la prima volta riporta i pesi dei vecchi import (arrotondati a 0,1 kg) alle libbre esatte.
function loadRaw() {
  const saved = read(WORKOUT_DATA_KEY);
  if (!saved) return [];
  try {
    let rows = JSON.parse(saved);
    if (!Array.isArray(rows)) return [];
    rows = normalizeRows(rows);
    if (!read(MIGRATION_KEY)) {
      rows = rows.map(r => [r[0], r[1], r[2], snapKg(r[3]), r[4]]);
      write(WORKOUT_DATA_KEY, JSON.stringify(rows));
      write(MIGRATION_KEY, '1');
    }
    return rows;
  } catch (e) { return []; }
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => resolve(r.data), error: reject });
  });
}

function FirstUpload({ onFile, importing, msg, t }) {
  return (
    <div className="app">
      <div className="screen" style={{ minHeight: '82vh', justifyContent: 'center', gap: 22 }}>
        <img src={logo} alt="Phyzx" style={{ height: 30, alignSelf: 'flex-start' }} />
        <div>
          <Label>CSV · Liftoff</Label>
          <h1 className="h1">{t('firstTitle')}</h1>
          <div className="sub" style={{ fontSize: 14 }}>{t('firstSub')}</div>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {['step1', 'step2', 'step3'].map((k, i) => (
            <div key={k} className="card row" style={{ padding: 14, gap: 14 }}>
              <span className="mono" style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: '#fff', fontSize: 12 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5 }}>{t(k)}</span>
            </div>
          ))}
        </div>
        <label className={`btn ${importing ? 'off' : ''}`}>
          <Icon name="upload" size={18} stroke={2} />{importing ? t('importing') : t('chooseCsv')}
          <input type="file" accept=".csv,text/csv" disabled={importing} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
        </label>
        {msg && !msg.ok && <div className="msg err">{msg.text}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [raw, setRaw] = useState(loadRaw);
  const lang = 'it';
  const exLang = 'en';
  const [unit] = useState(() => read(UNITS_KEY) || 'kg');
  const [tab, setTab] = useState('progress');
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState(null);

  const t = makeT(lang);
  const model = useMemo(() => buildModel(raw), [raw]);

  
  const go = next => { setTab(next); setMsg(null); try { window.scrollTo(0, 0); } catch (e) { /* noop */ } };

  async function onFile(file) {
    setImporting(true); setMsg(null);
    try {
      const rows = liftoffRowsToRaw(await parseCsv(file));
      if (!rows.length) { setMsg({ ok: false, text: t('importNone') }); return; }
      const { merged, added, read: n } = mergeRows(raw, rows);
      write(WORKOUT_DATA_KEY, JSON.stringify(merged));
      write(MIGRATION_KEY, '1');
      setRaw(merged);
      setMsg({ ok: true, text: t('imported')(added, n) });
    } catch (e) {
      setMsg({ ok: false, text: t('importError') });
    } finally { setImporting(false); }
  }

  if (!raw.length) return <FirstUpload onFile={onFile} importing={importing} msg={msg} t={t} />;

  const props = { model, lang, exLang, unit, onFile, importing, msg };
  const items = [
    { key: 'progress', label: t('navProgress'), icon: 'progress' },
    { key: 'recent', label: t('navRecent'), icon: 'recent' },
    { key: 'analysis', label: 'Analisi', icon: 'analysis' },
  ];

  return (
    <>
      <div className="app">
        {tab === 'recent' && <Recent key="recent" {...props} />}
        {tab === 'progress' && <Progress key="progress" {...props} />}
        {tab === 'analysis' && <Analysis key="analysis" {...props} />}
      </div>
      <nav className="nav" aria-label="Navigazione">
        <div className="nav-in">
          {items.map(i => (
            <button key={i.key} className={tab === i.key ? 'on' : ''} aria-current={tab === i.key ? 'page' : undefined} onClick={() => go(i.key)}>
              <Icon name={i.icon} size={22} />{i.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
