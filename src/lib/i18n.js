import { fmtWeight, weightUnitLabel, convertWeight, unitFor } from './core.js';
import { daysBetween, todayStr } from './stats.js';

const STR = {
  it: {
    navLast: 'Ultimo', navRecent: 'Recenti', navProgress: 'Progressi', navMore: 'Altro',
    lastWorkout: 'Ultimo workout', today: 'Oggi', yesterday: 'Ieri', daysAgo: n => `${n} giorni fa`,
    exercises: 'Esercizi', sets: 'Serie', records: 'Record', record: 'Record',
    muscleSplit: 'Distribuzione muscolare', setsWord: 'serie', topSet: 'Serie top', est1rm: '1RM stimato',
    vsPrev: 'vs volta scorsa', firstTime: 'Prima volta', trend: 'Andamento',
    thisWeek: 'Questa settimana', workoutsPerWeek: 'Allenamenti a settimana', last12w: 'Ultime 12 settimane',
    consistency: 'Costanza', last16w: 'Ultime 16 settimane', lessLbl: 'meno', moreLbl: 'più',
    streak: 'Serie di settimane', weeks: 'settimane', last30: 'Ultimi 30 giorni', workoutsWord: 'allenamenti',
    avgPerWeek: 'media a settimana', daysSince: 'dall\'ultimo', balance: 'Bilanciamento muscolare',
    vsPrev30: 'vs 30 giorni precedenti', timeline: 'Cronologia', tapToOpen: 'Tocca per i dettagli',
    progress: 'Progressi', pickExercise: 'Scegli gli esercizi', search: 'Cerca esercizio', compare: 'Confronto',
    max4: 'Massimo 4 esercizi', importShort: 'Aggiorna', exercisesTitle: 'Esercizi', done: 'Fatto', times: n => `${n} ${n === 1 ? 'volta' : 'volte'}`, noFavs: 'Aggiungi i preferiti con la stella', noMatch: 'Nessun esercizio trovato', favAdd: 'Aggiungi ai preferiti', favRemove: 'Rimuovi dai preferiti', range1m: '1M', range3m: '3M', range6m: '6M', range1y: '1A', rangeAll: 'Tutto',
    current: 'Attuale', best: 'Massimo', change30: 'Var. 30 gg', change90: 'Var. 90 gg', sessions: 'Sessioni',
    perWeek: 'a settimana', bands: 'Fasce periodo', bandsOn: 'Fasce attive', bandsOff: 'Fasce spente',
    legendGood: 'Periodo proficuo', legendPause: 'Pausa breve', legendStop: 'Stop lungo',
    recentSessions: 'Ultime sessioni', date: 'Data', value: 'Valore', reps: 'rip.', bodyweight: 'corpo libero',
    data: 'Dati', importTitle: 'Aggiorna da Liftoff', importHint: 'Carica il CSV esportato da Liftoff: le serie già presenti non vengono duplicate.',
    chooseCsv: 'Scegli file CSV', importing: 'Importazione…', imported: (a, n) => `${a} nuove serie importate su ${n} lette.`,
    importNone: 'Nessuna riga valida nel file.', importError: 'Impossibile leggere il file.',
    tools: 'Strumenti', oneRm: 'Calcolatore 1RM', oneRmHint: 'Peso e ripetizioni → massimale stimato (formula di Epley).',
    weightLifted: 'Peso', repsDone: 'Ripetizioni', convert: 'Convertitore kg ↔ lb',
    prefs: 'Preferenze', appLang: 'Lingua app', exLang: 'Lingua esercizi', unit: 'Unità di peso',
    danger: 'Dati sul dispositivo', clearData: 'Elimina tutti i dati', clearConfirm: 'Eliminare tutti i dati salvati su questo dispositivo? Non si può annullare.',
    summary: (w, s) => `${w} allenamenti · ${s} serie`, firstTitle: 'Importa i tuoi allenamenti',
    firstSub: 'Esporta il CSV da Liftoff e caricalo qui. I dati restano solo su questo telefono, senza account.',
    step1: 'Apri Liftoff → Impostazioni → Esporta dati', step2: 'Salva il file CSV', step3: 'Caricalo qui sotto',
    empty: 'Nessun dato', pr: 'PR', since: 'dal',
  },
  en: {
    navLast: 'Latest', navRecent: 'Recent', navProgress: 'Progress', navMore: 'More',
    lastWorkout: 'Last workout', today: 'Today', yesterday: 'Yesterday', daysAgo: n => `${n} days ago`,
    exercises: 'Exercises', sets: 'Sets', records: 'Records', record: 'Record',
    muscleSplit: 'Muscle split', setsWord: 'sets', topSet: 'Top set', est1rm: 'Est. 1RM',
    vsPrev: 'vs last time', firstTime: 'First time', trend: 'Trend',
    thisWeek: 'This week', workoutsPerWeek: 'Workouts per week', last12w: 'Last 12 weeks',
    consistency: 'Consistency', last16w: 'Last 16 weeks', lessLbl: 'less', moreLbl: 'more',
    streak: 'Week streak', weeks: 'weeks', last30: 'Last 30 days', workoutsWord: 'workouts',
    avgPerWeek: 'avg per week', daysSince: 'since last', balance: 'Muscle balance',
    vsPrev30: 'vs previous 30 days', timeline: 'History', tapToOpen: 'Tap for details',
    progress: 'Progress', pickExercise: 'Pick exercises', search: 'Search exercise', compare: 'Compare',
    max4: 'Up to 4 exercises', importShort: 'Update', exercisesTitle: 'Exercises', done: 'Done', times: n => `${n} ${n === 1 ? 'time' : 'times'}`, noFavs: 'Add favourites with the star', noMatch: 'No exercise found', favAdd: 'Add to favourites', favRemove: 'Remove from favourites', range1m: '1M', range3m: '3M', range6m: '6M', range1y: '1Y', rangeAll: 'All',
    current: 'Current', best: 'Best', change30: '30d change', change90: '90d change', sessions: 'Sessions',
    perWeek: 'per week', bands: 'Period bands', bandsOn: 'Bands on', bandsOff: 'Bands off',
    legendGood: 'Productive period', legendPause: 'Short break', legendStop: 'Long stop',
    recentSessions: 'Recent sessions', date: 'Date', value: 'Value', reps: 'reps', bodyweight: 'bodyweight',
    data: 'Data', importTitle: 'Update from Liftoff', importHint: 'Upload the CSV exported from Liftoff: sets already stored are not duplicated.',
    chooseCsv: 'Choose CSV file', importing: 'Importing…', imported: (a, n) => `${a} new sets imported out of ${n} read.`,
    importNone: 'No valid rows in the file.', importError: 'Could not read the file.',
    tools: 'Tools', oneRm: '1RM calculator', oneRmHint: 'Weight and reps → estimated max (Epley formula).',
    weightLifted: 'Weight', repsDone: 'Reps', convert: 'kg ↔ lb converter',
    prefs: 'Preferences', appLang: 'App language', exLang: 'Exercise language', unit: 'Weight unit',
    danger: 'Data on this device', clearData: 'Delete all data', clearConfirm: 'Delete all data stored on this device? This cannot be undone.',
    summary: (w, s) => `${w} workouts · ${s} sets`, firstTitle: 'Import your workouts',
    firstSub: 'Export the CSV from Liftoff and upload it here. Data stays on this phone only, no account.',
    step1: 'Open Liftoff → Settings → Export data', step2: 'Save the CSV file', step3: 'Upload it below',
    empty: 'No data', pr: 'PR', since: 'since',
  },
};

export const makeT = lang => key => {
  const v = (STR[lang] || STR.it)[key];
  return v === undefined ? key : v;
};

const LOCALE = { it: 'it-IT', en: 'en-GB' };
const asDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const fmt = (lang, opts) => new Intl.DateTimeFormat(LOCALE[lang] || 'it-IT', { timeZone: 'UTC', ...opts });

export const dateShort = (lang, s) => fmt(lang, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(asDate(s));
export const dateDay = (lang, s) => fmt(lang, { day: 'numeric', month: 'short' }).format(asDate(s)).replace('.', '');
export const dateLong = (lang, s) => fmt(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(s));
export const dateWeekday = (lang, s) => fmt(lang, { weekday: 'short' }).format(asDate(s)).replace('.', '');
export const dateMonthYear = (lang, ts) => fmt(lang, { month: 'short', year: '2-digit' }).format(new Date(ts)).replace('.', '');

export const dateMedium = (lang, s) => fmt(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(asDate(s)).replace(/\./g, '');

// "3 mesi fa", "1 anno e 2 mesi fa": distanza leggibile per eventi lontani
export function agoLong(lang, s, today = todayStr()) {
  const it = lang !== 'en';
  const n = Math.max(0, daysBetween(s, today));
  if (n < 2) return n === 0 ? (it ? 'oggi' : 'today') : (it ? 'ieri' : 'yesterday');
  if (n < 45) return it ? `${n} giorni fa` : `${n} days ago`;
  const months = Math.round(n / 30.44);
  if (months < 12) return it ? `${months} mesi fa` : `${months} months ago`;
  const y = Math.floor(months / 12), m = months % 12;
  const ys = it ? (y === 1 ? '1 anno' : `${y} anni`) : (y === 1 ? '1 year' : `${y} years`);
  if (!m) return it ? `${ys} fa` : `${ys} ago`;
  const ms = it ? (m === 1 ? '1 mese' : `${m} mesi`) : (m === 1 ? '1 month' : `${m} months`);
  return it ? `${ys} e ${ms} fa` : `${ys} ${m ? 'and ' + ms : ''} ago`;
}

// Durata leggibile: "12 giorni", "5 mesi", "1 anno e 2 mesi"
export function durLong(lang, n) {
  const it = lang !== 'en';
  if (n < 45) return it ? `${n} ${n === 1 ? 'giorno' : 'giorni'}` : `${n} ${n === 1 ? 'day' : 'days'}`;
  const months = Math.round(n / 30.44);
  if (months < 12) return it ? `${months} mesi` : `${months} months`;
  const y = Math.floor(months / 12), m = months % 12;
  const ys = it ? (y === 1 ? '1 anno' : `${y} anni`) : (y === 1 ? '1 year' : `${y} years`);
  if (!m) return ys;
  const ms = it ? (m === 1 ? '1 mese' : `${m} mesi`) : (m === 1 ? '1 month' : `${m} months`);
  return `${ys}${it ? ' e ' : ' and '}${ms}`;
}
export const monthYearLong = (lang, s) => fmt(lang, { month: 'long', year: 'numeric' }).format(asDate(s));

export function relativeDay(lang, s, today = todayStr()) {
  const t = makeT(lang);
  const n = daysBetween(s, today);
  if (n <= 0) return t('today');
  if (n === 1) return t('yesterday');
  return t('daysAgo')(n);
}

// Numeri in stile italiano (virgola decimale) anche per l'inglese: coerente con il resto dell'app
export function num(n, digits = 1) {
  if (n == null || !isFinite(n)) return '–';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', ',');
}
export const pct = (v, digits = 1) => (v == null ? '–' : `${v > 0 ? '+' : ''}${num(v * 100, digits)}%`);

// peso in kg interni → stringa con unità scelta
export const w = (kg, unit, name) => fmtWeight(kg, unitFor(name, unit));
export const wu = (kg, unit, name) => { const u = unitFor(name, unit); return `${fmtWeight(kg, u)}${weightUnitLabel(u)}`; };
export const wv = (kg, unit, name) => Math.round(convertWeight(kg, unitFor(name, unit)) * 10) / 10;
export const unitLabelFor = (name, unit) => weightUnitLabel(unitFor(name, unit));

export function topSetText(ex, unit, t) {
  return ex.bw ? `${ex.topReps} ${t('reps')}` : `${wu(ex.topKg, unit, ex.name)} × ${ex.topReps}`;
}
