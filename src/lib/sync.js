// Sincronizzazione con Supabase tramite chiave segreta nel link (#k=...).
// Il database è chiuso: si può solo chiamare phyzx_pull / phyzx_push con la chiave giusta (il server ne salva solo l'impronta).
import { WORKOUT_DATA_KEY } from './core.js';
import { mergeRows, normalizeRows } from './stats.js';
import { keyFor, FAV_BASE, loadProfiles, saveProfiles, PROFILES_KEY, ACTIVE_KEY } from './profiles.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const KEY_STORE = 'phyzx-key';
export const DEL_KEY = 'phyzx-deleted';

const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } };
const del = k => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } };

// ── Chiave ────────────────────────────────────────────────────────────────────
export function readKeyFromUrl() {
  try {
    const m = /(?:^#|&)k=([A-Za-z0-9_-]{32,128})/.exec(window.location.hash);
    if (!m) return null;
    history.replaceState(null, '', window.location.pathname + window.location.search);   // la chiave non resta nella barra degli indirizzi
    return m[1];
  } catch (e) { return null; }
}
export const storedKey = () => get(KEY_STORE);
export const storeKey = k => set(KEY_STORE, k);
export const clearKey = () => del(KEY_STORE);

// ── Rete ──────────────────────────────────────────────────────────────────────
async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// 'ok' | 'invalid' | 'offline'
export async function verifyKey(key) {
  try { const res = await rpc('phyzx_pull', { p_key: key }); return res && res.found ? 'ok' : 'invalid'; } catch (e) { return 'offline'; }
}

// ── Istantanea dei dati locali ────────────────────────────────────────────────
const parseJson = (s, d) => { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } };
export const deletedIds = () => { const v = parseJson(get(DEL_KEY), []); return Array.isArray(v) ? v : []; };
export function addDeleted(id) { const d = new Set(deletedIds()); d.add(id); set(DEL_KEY, JSON.stringify([...d])); }

export function snapshot() {
  const profiles = loadProfiles();
  const rows = {}, favs = {};
  profiles.forEach(p => {
    const r = parseJson(get(keyFor(WORKOUT_DATA_KEY, p.id)), []);
    rows[p.id] = Array.isArray(r) ? normalizeRows(r) : [];
    const f = parseJson(get(keyFor(FAV_BASE, p.id)), []);
    favs[p.id] = Array.isArray(f) ? f : [];
  });
  return { profiles, rows, favs, del: deletedIds() };
}

export function applySnapshot(s) {
  saveProfiles(s.profiles);
  set(DEL_KEY, JSON.stringify(s.del));
  const keep = new Set(s.profiles.map(p => p.id));
  s.profiles.forEach(p => {
    set(keyFor(WORKOUT_DATA_KEY, p.id), JSON.stringify(s.rows[p.id] || []));
    set(keyFor(FAV_BASE, p.id), JSON.stringify(s.favs[p.id] || []));
  });
  s.del.forEach(id => { if (!keep.has(id)) { del(keyFor(WORKOUT_DATA_KEY, id)); del(keyFor(FAV_BASE, id)); } });
}

export function resetLocal() {
  const ids = new Set(loadProfiles().map(p => p.id));
  ids.forEach(id => { del(keyFor(WORKOUT_DATA_KEY, id)); del(keyFor(FAV_BASE, id)); });
  [PROFILES_KEY, ACTIVE_KEY, DEL_KEY].forEach(del);
}

// ── Unione di due istantanee (a vince a parità) ───────────────────────────────
export function merge(a, b) {
  const gone = new Set([...(a.del || []), ...(b.del || [])]);
  const byId = new Map();
  [...(a.profiles || []), ...(b.profiles || [])].forEach(p => {
    if (gone.has(p.id)) return;
    const cur = byId.get(p.id);
    if (!cur || (p.u || 0) > (cur.u || 0)) byId.set(p.id, p);
  });
  const profiles = [...byId.values()];
  const rows = {}, favs = {};
  profiles.forEach(p => {
    rows[p.id] = mergeRows((a.rows || {})[p.id] || [], (b.rows || {})[p.id] || []).merged;
    favs[p.id] = [...new Set([...((a.favs || {})[p.id] || []), ...((b.favs || {})[p.id] || [])])];
  });
  return { profiles: profiles.length ? profiles : loadProfiles(), rows, favs, del: [...gone] };
}

const canon = s => JSON.stringify({
  p: [...s.profiles].sort((x, y) => x.id.localeCompare(y.id)).map(p => [p.id, p.name, p.color, p.u || 0]),
  r: Object.keys(s.rows).sort().map(id => [id, s.rows[id].map(r => JSON.stringify(r)).sort()]),
  f: Object.keys(s.favs).sort().map(id => [id, [...s.favs[id]].sort()]),
  d: [...s.del].sort(),
});
const same = (a, b) => canon(a) === canon(b);

// ── Sincronizzazione ──────────────────────────────────────────────────────────
// Ritorna { status: 'ok'|'invalid'|'offline', changed }  — changed: i dati locali sono cambiati per via di quelli remoti.
export async function syncNow(key) {
  let changed = false;
  try {
    for (let i = 0; i < 3; i++) {
      const res = await rpc('phyzx_pull', { p_key: key });
      if (!res || !res.found) return { status: 'invalid', changed };
      const local = snapshot();
      const remote = res.data && res.data.profiles ? res.data : { profiles: [], rows: {}, favs: {}, del: [] };
      const merged = merge(remote, local);
      if (!same(merged, local)) { applySnapshot(merged); changed = true; }
      if (same(merged, remote)) return { status: 'ok', changed };
      const push = await rpc('phyzx_push', { p_key: key, p_data: merged, p_base: res.version });
      if (push && push.ok) return { status: 'ok', changed };
      if (push && push.found === false) return { status: 'invalid', changed };
      // conflitto: qualcun altro ha scritto nel frattempo → ripetiamo
    }
    return { status: 'offline', changed };
  } catch (e) { return { status: 'offline', changed }; }
}

// Chiamata dopo ogni modifica locale: sincronizza dopo una breve pausa.
let timer = null, listener = null;
export const setSyncListener = fn => { listener = fn; };
export function touch() {
  const key = storedKey();
  if (!key) return;
  if (listener) listener({ state: 'pending' });
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (listener) listener({ state: 'syncing' });
    const r = await syncNow(key);
    if (listener) listener({ state: r.status === 'ok' ? 'ok' : r.status === 'invalid' ? 'invalid' : 'offline', changed: r.changed });
  }, 1200);
}
