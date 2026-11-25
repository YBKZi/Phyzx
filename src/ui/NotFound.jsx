import React from 'react';

export function NotFound() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: '#000' }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(84px, 30vw, 132px)', letterSpacing: '-0.05em', lineHeight: 1, color: '#2a2a2e' }}>404</div>
        <h1 style={{ margin: '14px 0 6px', fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Pagina non trovata</h1>
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 14, lineHeight: 1.45 }}>L'indirizzo che hai aperto non esiste<br />o è stato spostato.</p>
      </div>
    </main>
  );
}

export function Offline() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: '#000' }}>
      <div>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Nessuna connessione</h1>
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 14, lineHeight: 1.45 }}>Riapri il link quando sei di nuovo online.</p>
      </div>
    </main>
  );
}
