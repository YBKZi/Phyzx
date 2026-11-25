import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './kit.jsx';
import { NAME_MAX, workoutCount } from '../lib/profiles.js';

export function Avatar({ p, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: p.color, fontSize: Math.round(size * 0.44) }} aria-hidden="true">
      {p.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ProfileButton({ profile, onClick }) {
  return (
    <button className="avatar-btn" onClick={onClick} aria-haspopup="dialog" aria-label={`Profilo: ${profile.name}. Cambia profilo`}>
      <Avatar p={profile} size={34} />
    </button>
  );
}

export function ProfileSheet({ profiles, activeId, onSwitch, onAdd, onRename, onDelete, onClose }) {
  const [editing, setEditing] = useState(null);   // { id, value }
  const [confirm, setConfirm] = useState(null);   // id da eliminare
  const [name, setName] = useState('');
  const counts = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, workoutCount(p.id)])), [profiles]);
  const last = profiles.length === 1;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);

  const commitRename = () => { if (editing) { onRename(editing.id, editing.value); setEditing(null); } };
  const submitAdd = e => { e.preventDefault(); onAdd(name); setName(''); onClose(); };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Profili">
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet auto">
        <div className="sheet-grab" />
        <div className="row between" style={{ marginBottom: 6 }}>
          <h2 className="sheet-title">Profili</h2>
          <button className="btn sheet-done" style={{ width: 'auto', padding: '9px 20px' }} onClick={onClose}>Fatto</button>
        </div>
        <div className="sheet-sub">I dati di ogni persona restano separati, solo su questo telefono.</div>

        <div className="sheet-list" style={{ flex: 'none' }}>
          {profiles.map(p => {
            const on = p.id === activeId;
            const n = counts[p.id] || 0;
            if (confirm === p.id) {
              return (
                <div key={p.id} className="prof-confirm">
                  <div className="prof-confirm-text">
                    {last ? <>Cancellare tutti i dati di <b>{p.name}</b>?</> : <>Eliminare <b>{p.name}</b> e tutti i suoi dati?</>}
                    <span>Non si può annullare.</span>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn ghost" style={{ padding: '11px 14px', fontSize: 14 }} onClick={() => setConfirm(null)}>Annulla</button>
                    <button className="btn danger-solid" style={{ padding: '11px 14px', fontSize: 14 }} onClick={() => { onDelete(p.id); setConfirm(null); if (!last) { /* resta aperto per altri profili */ } else onClose(); }}>{last ? 'Cancella' : 'Elimina'}</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={p.id} className="ex-row prof-row">
                {editing && editing.id === p.id ? (
                  <form className="row" style={{ flex: 1, gap: 8, padding: '8px 0' }} onSubmit={e => { e.preventDefault(); commitRename(); }}>
                    <Avatar p={{ ...p, name: editing.value || p.name }} />
                    <input className="field" style={{ padding: '10px 14px' }} autoFocus maxLength={NAME_MAX} value={editing.value}
                      onChange={e => setEditing({ id: p.id, value: e.target.value })} aria-label="Nome del profilo" />
                    <button className="btn" type="submit" style={{ width: 'auto', padding: '10px 16px', fontSize: 14 }}>Ok</button>
                  </form>
                ) : (
                  <>
                    <button className="ex-row-main" onClick={() => { onSwitch(p.id); onClose(); }} aria-pressed={on}>
                      <Avatar p={p} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="ex-row-name">{p.name}</span>
                        <span className="ex-row-sub">{n ? `${n} allenamenti` : 'Nessun dato'}{on ? ' · in uso' : ''}</span>
                      </span>
                      {on && <span className="prof-check"><Icon name="check" size={16} stroke={3} /></span>}
                    </button>
                    <button className="star" aria-label={`Rinomina ${p.name}`} onClick={() => setEditing({ id: p.id, value: p.name })}><Icon name="pencil" size={18} /></button>
                    <button className="star del" aria-label={`Elimina ${p.name}`} onClick={() => setConfirm(p.id)}><Icon name="trash" size={18} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <form className="prof-add" onSubmit={submitAdd}>
          <input className="field" placeholder="Nuovo profilo" maxLength={NAME_MAX} value={name} onChange={e => setName(e.target.value)} aria-label="Nome del nuovo profilo" />
          <button className="btn" type="submit" style={{ width: 'auto', padding: '13px 18px', flexShrink: 0 }}><Icon name="plus" size={18} stroke={2.4} />Aggiungi</button>
        </form>
      </div>
    </div>
  );
}
