// Notifiche push: iscrizione di questo dispositivo e avviso agli altri dopo un aggiornamento dei dati.
import { SUPABASE_URL, SUPABASE_KEY, VAPID_PUBLIC } from './config.js';
import { storedKey } from './sync.js';

const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const b64ToBytes = s => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const bytesToB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSub() {
  const reg = await navigator.serviceWorker.ready;
  return { reg, sub: await reg.pushManager.getSubscription() };
}

// 'on' | 'off' | 'blocked' | 'unsupported'
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try { const { sub } = await currentSub(); return sub && Notification.permission === 'granted' ? 'on' : 'off'; } catch (e) { return 'off'; }
}

export async function enablePush() {
  const key = storedKey();
  if (!key || !pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'off';
  const { reg, sub: old } = await currentSub();
  const sub = old || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
  const j = sub.toJSON();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/phyzx_sub`, {
    method: 'POST', headers,
    body: JSON.stringify({ p_key: key, p_endpoint: sub.endpoint, p_p256dh: j.keys?.p256dh || bytesToB64(sub.getKey('p256dh')), p_auth: j.keys?.auth || bytesToB64(sub.getKey('auth')) }),
  });
  const res = r.ok ? await r.json() : null;
  if (!res || !res.ok) { try { await sub.unsubscribe(); } catch (e) { /* noop */ } throw new Error('iscrizione non riuscita'); }
  return 'on';
}

export async function disablePush() {
  const key = storedKey();
  const { sub } = await currentSub();
  if (sub) {
    if (key) { try { await fetch(`${SUPABASE_URL}/rest/v1/rpc/phyzx_unsub`, { method: 'POST', headers, body: JSON.stringify({ p_key: key, p_endpoint: sub.endpoint }) }); } catch (e) { /* noop */ } }
    await sub.unsubscribe();
  }
  return 'off';
}

// Avvisa gli altri dispositivi (non questo) che ci sono dati nuovi. Non blocca mai l'app.
export async function notifyOthers(name, added) {
  const key = storedKey();
  if (!key) return;
  try {
    let from = '';
    if (pushSupported()) { const { sub } = await currentSub(); from = sub ? sub.endpoint : ''; }
    await fetch(`${SUPABASE_URL}/functions/v1/phyzx-notify`, { method: 'POST', headers, body: JSON.stringify({ key, from, name, added }) });
  } catch (e) { /* offline: pazienza */ }
}
