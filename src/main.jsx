import React from 'react';
import '@fontsource-variable/figtree';
import '@fontsource-variable/instrument-sans';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './theme.css';

// Error boundary di sicurezza: senza questo, un errore JS non gestito in un ramo qualsiasi
// dell'albero (es. durante l'aggiornamento dati dopo un import CSV) fa sì che React smonti
// silenziosamente quel ramo senza mostrare nulla all'utente — l'app resta visivamente "congelata"
// sull'ultimo render valido, dando l'impressione che "non succede niente" quando in realtà è
// successo un crash. Con questo boundary, un errore del genere mostra almeno un messaggio chiaro
// invece di un fallimento silenzioso indistinguibile da un bottone che non funziona.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Errore non gestito:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#000000', color: '#FFFFFF', fontFamily: 'system-ui, sans-serif',
          padding: 24, textAlign: 'center',
        }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Si è verificato un errore imprevisto</div>
            <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 20, lineHeight: 1.5 }}>
              {this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)}
            </div>
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', background: '#2F8CFF',
              color: '#000000', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>
              Ricarica l'app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
