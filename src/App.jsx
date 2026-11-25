import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import logo from './assets/phyzx-icon.png';
import { WORKOUT_DATA_KEY, UNITS_KEY } from './lib/core.js';
import { buildModel, liftoffRowsToRaw, mergeRows, replaceByDate, fixRaw, normalizeRows, snapKg } from './lib/stats.js';
import { makeT } from './lib/i18n.js';
import { Icon, DockIcon, Label } from './ui/kit.jsx';
import { ProfileButton, ProfileSheet } from './ui/Profiles.jsx';
import { keyFor, loadProfiles, saveProfiles, loadActive, saveActive, newProfile, cleanName, wipeProfileData } from './lib/profiles.js';
import { readKeyFromUrl, storedKey, storeKey, clearKey, verifyKey, resetLocal, syncNow, touch, addDeleted, setSyncListener } from './lib/sync.js';
import { NotFound, Offline } from './ui/NotFound.jsx';
import { notifyOthers } from './lib/push.js';
import Recent from './screens/Recent.jsx';
import Analysis from './screens/Analysis.jsx';
import Progress from './screens/Progress.jsx';

const MIGRATION_KEY = 'phyzx-data-v2';

const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };

// Carica i dati salvati; la prima volta riporta i pesi dei vecchi import (arrotondati a 0,1 kg) alle libbre esatte.
function loadRaw(id = 'main') {
  const key = keyFor(WORKOUT_DATA_KEY, id);
  const saved = read(key);
  if (!saved) return [];
  try {
    let rows = JSON.parse(saved);
    if (!Array.isArray(rows)) return [];
    rows = normalizeRows(rows);
    if (id === 'main' && !read(MIGRATION_KEY)) {
      rows = rows.map(r => [r[0], r[1], r[2], snapKg(r[3]), r[4]]);
      write(key, JSON.stringify(rows));
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

function FirstUpload({ onFile, importing, msg, t, profile, multi, onProfiles }) {
  return (
    <div className="app">
      <div className="screen" style={{ minHeight: '82vh', justifyContent: 'center', gap: 22 }}>
        <div className="row between">
          <img src={logo} alt="Phyzx" width="56" height="56" style={{ borderRadius: 14, boxShadow: '0 0 0 1px rgba(255,255,255,.08), 0 8px 24px rgba(31,107,255,.28)' }} />
          <ProfileButton profile={profile} onClick={onProfiles} />
        </div>
        <div>
          <Label>{multi ? `CSV · Liftoff · ${profile.name}` : 'CSV · Liftoff'}</Label>
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

function Main({ syncKey, onInvalid }) {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [activeId, setActiveId] = useState(() => loadActive(loadProfiles()));
  const [raw, setRaw] = useState(() => loadRaw(loadActive(loadProfiles())));
  const [profOpen, setProfOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const [syncState, setSyncState] = useState('syncing');
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const profile = profiles.find(p => p.id === activeId) || profiles[0];
  const lang = 'it';
  const exLang = 'en';
  const [unit] = useState(() => read(UNITS_KEY) || 'kg');
  const [tab, setTab] = useState('progress');
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState(null);

  const t = makeT(lang);
  const model = useMemo(() => buildModel(fixRaw(activeId, raw)), [raw, activeId]);

  
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 90); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  const go = next => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* noop */ } setTab(next); setMsg(null); try { window.scrollTo(0, 0); } catch (e) { /* noop */ } };

  // ricarica lo stato dopo che la sincronizzazione ha cambiato i dati locali
  const reload = () => {
    const list = loadProfiles();
    const id = list.some(p => p.id === activeRef.current) ? activeRef.current : list[0].id;
    saveActive(id); setProfiles(list); setActiveId(id); setRaw(loadRaw(id)); setRev(r => r + 1);
  };
  const runSync = async () => {
    setSyncState('syncing');
    const r = await syncNow(syncKey);
    if (r.status === 'invalid') { onInvalid(); return; }
    setSyncState(r.status === 'ok' ? 'ok' : 'offline');
    if (r.changed) reload();
  };
  useEffect(() => {
    setSyncListener(ev => {
      if (ev.state === 'invalid') { onInvalid(); return; }
      setSyncState(ev.state);
      if (ev.changed) reload();
    });
    runSync();
    const vis = () => { if (document.visibilityState === 'visible') runSync(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); setSyncListener(null); };
  }, []);

  const switchTo = (id, list = profiles) => {
    saveActive(id); setActiveId(id); setRaw(loadRaw(id)); setTab('progress'); setMsg(null);
    try { window.scrollTo(0, 0); } catch (e) { /* noop */ }
    return list;
  };
  const addProfile = name => {
    const p = newProfile(profiles, name);
    const next = [...profiles, p];
    saveProfiles(next); setProfiles(next); switchTo(p.id); touch();
  };
  const renameProfile = (id, name) => {
    const next = profiles.map(p => (p.id === id ? { ...p, name: cleanName(name, p.name), u: Date.now() } : p));
    saveProfiles(next); setProfiles(next); touch();
  };
  const deleteProfile = id => {
    wipeProfileData(id);
    addDeleted(id);                                   // lapide: così la cancellazione arriva anche agli altri dispositivi
    if (profiles.length === 1) {                      // l'ultimo profilo resta, ma vuoto (nuovo id)
      const fresh = { ...newProfile([], profile.name), color: profile.color };
      saveProfiles([fresh]); setProfiles([fresh]); switchTo(fresh.id); touch(); return;
    }
    const next = profiles.filter(p => p.id !== id);
    saveProfiles(next); setProfiles(next);
    if (id === activeId) switchTo(next[0].id);
    touch();
  };

  async function onFile(file) {
    setImporting(true); setMsg(null);
    try {
      const rows = liftoffRowsToRaw(await parseCsv(file));
      if (!rows.length) { setMsg({ ok: false, text: t('importNone') }); return; }
      const { merged, added, read: n } = replaceByDate(raw, rows);
      // da ora i dati di questo profilo sono quelli del file: gli altri dispositivi devono adottarli, non unirli ai vecchi
      const now = Date.now();
      const list = loadProfiles().map(p => (p.id === activeId ? { ...p, u: now, re: now } : p));
      saveProfiles(list); setProfiles(list);
      write(keyFor(WORKOUT_DATA_KEY, activeId), JSON.stringify(merged));
      write(MIGRATION_KEY, '1');
      setRaw(merged);
      setMsg({ ok: true, text: t('imported')(added, n) });
      touch();
      if (added > 0) setTimeout(() => notifyOthers(profile.name, added), 2500);   // dopo la sincronizzazione, così chi apre trova già i dati
    } catch (e) {
      setMsg({ ok: false, text: t('importError') });
    } finally { setImporting(false); }
  }

  const sheet = profOpen && (
    <ProfileSheet profiles={profiles} activeId={activeId} onSwitch={id => switchTo(id)} onAdd={addProfile}
      onRename={renameProfile} onDelete={deleteProfile} sync={syncState} onClose={() => setProfOpen(false)} />
  );

  if (!raw.length) return <><FirstUpload key={`${activeId}-${rev}`} onFile={onFile} importing={importing} msg={msg} t={t} profile={profile} multi={profiles.length > 1} onProfiles={() => setProfOpen(true)} />{sheet}</>;

  const props = { model, lang, exLang, unit, onFile, importing, msg, profile, profileId: activeId, onProfiles: () => setProfOpen(true) };
  const items = [
    { key: 'progress', label: t('navProgress'), icon: 'progress' },
    { key: 'recent', label: t('navRecent'), icon: 'recent' },
    { key: 'analysis', label: 'Analisi', icon: 'analysis' },
  ];

  return (
    <>
      <div className={`topbar ${scrolled ? 'on' : ''}`} aria-hidden="true">{items.find(i => i.key === tab).label}</div>
      <div className="app">
        {tab === 'recent' && <Recent key={`recent-${activeId}-${rev}`} {...props} />}
        {tab === 'progress' && <Progress key={`progress-${activeId}-${rev}`} {...props} />}
        {tab === 'analysis' && <Analysis key={`analysis-${activeId}-${rev}`} {...props} />}
      </div>
      <nav className="dock" aria-label="Navigazione">
        <div className="dock-in">
          {items.map(i => (
            <button key={i.key} className={tab === i.key ? 'on' : ''} aria-label={i.label} aria-current={tab === i.key ? 'page' : undefined} onClick={() => go(i.key)}>
              <DockIcon name={i.icon} active={tab === i.key} />
              <span className="lbl"><span>{i.label}</span></span>
            </button>
          ))}
        </div>
      </nav>
      {sheet}
    </>
  );
}

// Accesso: senza una chiave valida l'app mostra una normale pagina 404.
export default function App() {
  const [gate, setGate] = useState(() => {
    const urlKey = readKeyFromUrl();
    const stored = storedKey();
    if (urlKey) return { state: 'checking', key: urlKey, prev: stored };
    if (stored) return { state: 'ok', key: stored };
    return { state: 'denied' };
  });
  useEffect(() => {
    if (gate.state !== 'checking') return;
    (async () => {
      const v = await verifyKey(gate.key);
      if (v === 'ok') {
        if (gate.prev && gate.prev !== gate.key) resetLocal();   // altra chiave su questo browser: niente mescolanze
        storeKey(gate.key);
        setGate({ state: 'ok', key: gate.key });
      } else setGate({ state: v === 'offline' ? 'offline' : 'denied' });
    })();
  }, []);
  useEffect(() => { document.title = gate.state === 'denied' ? '404 · Pagina non trovata' : 'Phyzx'; }, [gate.state]);

  if (gate.state === 'denied') return <NotFound />;
  if (gate.state === 'offline') return <Offline />;
  if (gate.state === 'checking') return <div style={{ minHeight: '100dvh', background: '#000' }} />;
  return <Main syncKey={gate.key} onInvalid={() => { clearKey(); setGate({ state: 'denied' }); }} />;
}
