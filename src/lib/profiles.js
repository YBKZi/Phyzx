// Profili: ognuno ha i suoi dati (allenamenti) e i suoi preferiti, tutto nel localStorage di questo telefono.
// Il profilo "main" usa le chiavi storiche, così chi aveva già importato i dati non perde nulla.
import { WORKOUT_DATA_KEY } from './core.js';

export const PROFILES_KEY = 'phyzx-profiles';
export const ACTIVE_KEY = 'phyzx-profile-active';
export const FAV_BASE = 'phyzx-favorites';
export const PROFILE_COLORS = ['#2F8CFF', '#FFC439', '#A78BFA', '#FF7A59', '#1FD17A', '#F472B6'];
export const NAME_MAX = 16;

const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };
const del = k => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } };

export const keyFor = (base, id) => (id === 'main' ? base : `${base}::${id}`);

export function loadProfiles() {
  try {
    const v = JSON.parse(get(PROFILES_KEY) || 'null');
    if (Array.isArray(v) && v.length && v.every(p => p && p.id && p.name)) return v;
  } catch (e) { /* ripartiamo dal profilo base */ }
  return [{ id: 'main', name: 'Io', color: PROFILE_COLORS[0] }];
}
export const saveProfiles = list => set(PROFILES_KEY, JSON.stringify(list));

export function loadActive(list) {
  const id = get(ACTIVE_KEY);
  return list.some(p => p.id === id) ? id : list[0].id;
}
export const saveActive = id => set(ACTIVE_KEY, id);

export function cleanName(s, fallback) {
  const n = (s || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n || fallback;
}

export function newProfile(list, name) {
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const used = new Set(list.map(p => p.color));
  const color = PROFILE_COLORS.find(c => !used.has(c)) || PROFILE_COLORS[list.length % PROFILE_COLORS.length];
  return { id, name: cleanName(name, `Profilo ${list.length + 1}`), color };
}

// numero di allenamenti (giorni distinti) salvati per un profilo
export function workoutCount(id) {
  try {
    const rows = JSON.parse(get(keyFor(WORKOUT_DATA_KEY, id)) || '[]');
    return Array.isArray(rows) ? new Set(rows.map(r => r[0])).size : 0;
  } catch (e) { return 0; }
}

export function wipeProfileData(id) {
  del(keyFor(WORKOUT_DATA_KEY, id));
  del(keyFor(FAV_BASE, id));
}
