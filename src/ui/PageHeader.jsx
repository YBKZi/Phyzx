import React from 'react';
import { Icon } from './kit.jsx';
import { ProfileButton } from './Profiles.jsx';

// Intestazione comune alle tre sezioni: titolo a sinistra, "Aggiorna" (import CSV) e profilo a destra.
export default function PageHeader({ title, t, onFile, importing, msg, profile, onProfiles }) {
  return (
    <>
      <div className="row between">
        <h1 className="h1">{title}</h1>
        <div className="head-actions">
          <label className={`import-btn ${importing ? 'off' : ''}`} aria-label={t('importTitle')}>
            <Icon name="upload" size={16} stroke={2.4} />{importing ? t('importing') : t('importShort')}
            <input type="file" accept=".csv,text/csv" disabled={importing} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
          </label>
          {profile && <ProfileButton profile={profile} onClick={onProfiles} />}
        </div>
      </div>
      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
    </>
  );
}
