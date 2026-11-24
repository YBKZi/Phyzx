import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import Papa from 'papaparse';
import phyzxLogoImg from './assets/phyzx-logo.png';

// Logo "PHYZX" (immagine, non testo): garantisce che il lettering/i colori restino identici al
// design di brand fornito, indipendentemente dai font disponibili sul dispositivo. `size` è
// l'altezza in px del logo; la larghezza segue automaticamente mantenendo le proporzioni originali.
function PhyzxLogo({ size = 28 }) {
  return (
    <img src={phyzxLogoImg} alt="PHYZX" style={{ height: size, width: 'auto', display: 'block', userSelect: 'none' }} draggable={false} />
  );
}

// L'app non ha più account né sincronizzazione remota: tutto (allenamenti importati, lingua,
// unità di misura, soglie) resta salvato solo su questo dispositivo/browser via localStorage.
const WORKOUT_DATA_KEY = 'performance-log-workout-data';
const LANG_APP_KEY = 'performance-log-lang-app';
const LANG_EXERCISE_KEY = 'performance-log-lang-exercise';
const UNITS_KEY = 'performance-log-units';

// Palette (variabili CSS) unica dell'app: solo tema scuro, nessuna scelta per l'utente.
const THEME_VARS = {
  dark: {
    '--bg-app': '#05070B',
    '--bg-app-2': '#0A0E16',
    '--bg-card': 'rgba(255, 255, 255, 0.045)',
    '--bg-card-active': 'rgba(255, 255, 255, 0.10)',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--border-strong': 'rgba(255, 255, 255, 0.16)',
    '--text-tertiary': '#5B6579',
    '--text-secondary': '#8B96A8',
    '--text-primary-dim': '#C9D1DE',
    '--text-primary': '#EEF2F8',
    '--bg-success': 'rgba(90, 224, 168, 0.08)',
    '--border-success': 'rgba(90, 224, 168, 0.28)',
    '--bg-error': 'rgba(224, 138, 138, 0.08)',
    '--border-error': 'rgba(224, 138, 138, 0.28)',
    // colore del testo/icone sopra lo sfondo turchese di brand (#5ADECD): resta uno scuro fisso.
    '--on-accent': '#04100E',
  },
};
const MIN_COUNT_KEY = 'performance-log-mincount';
const DEFAULT_MIN_COUNT = 1;

// Dizionario stringhe interfaccia: italiano e inglese
const UI_STRINGS = {
  it: {
    subtitle: 'Esplora i tuoi allenamenti',
    updateExport: 'Importa dati aggiornati',
    manage: 'Gestisci',
    settings: 'Impostazioni',
    clearData: 'Elimina dati salvati',
    clearDataConfirm: 'Vuoi eliminare definitivamente tutti i dati di allenamento salvati su questo dispositivo? Questa azione non può essere annullata.',
    clearDataConfirmFinal: 'Sei sicuro? Tutti i tuoi allenamenti salvati verranno cancellati per sempre da questo dispositivo.',
    minSetsCount: 'Numero minimo di serie',
    tapMuscleGroup: "Tocca un gruppo muscolare per vedere l'andamento",
    sessions: 'sessioni',
    sets: 'serie',
    totalVolume: 'volume tot.',
    compareOtherGroup: 'Confronta con altri esercizi',
    max: 'Max',
    last: 'Ultimo',
    strengthChartNote: 'Ogni linea mostra il livello di forza stimato (1RM) di quell\'esercizio nel tempo.',
    zoomHint: 'Trascina per spostarti, pizzica in orizzontale per zoomare il tempo e in verticale per zoomare i valori',
    resetYZoom: 'Reimposta valori',
    today: 'Oggi',
    yesterday: 'Ieri',
    range1m: '1M',
    range3m: '3M',
    range6m: '6M',
    range1y: '1A',
    rangeAll: 'Tutto',
    resetZoom: 'Reimposta',
    latestSessions: 'Ultime sessioni',
    date: 'Data',
    topSet: 'Serie top',
    value: 'Valore',
    mixedNote: 'Questo esercizio ha sia sessioni a corpo libero che con zavorra — le statistiche sopra si basano sulle sessioni con carico.',
    minCountThreshold: 'Soglia minima esecuzioni',
    hiddenAuto: 'esercizi fatti meno volte sono nascosti automaticamente',
    recencyFilter: 'Nascondi ovunque gli esercizi non svolti negli ultimi:',
    recencyAll: 'Sempre',
    recency30: '30 giorni',
    recency90: '90 giorni',
    recency180: '6 mesi',
    recency365: '1 anno',
    oneRmCalc: 'Calcolatore 1RM',
    oneRmCalcHint: 'Inserisci un peso e le ripetizioni fatte con quel peso per stimare il tuo massimale (1RM), con la tabella delle percentuali utili per programmare gli allenamenti.',
    oneRmWeightLabel: 'Peso sollevato',
    oneRmRepsLabel: 'Ripetizioni',
    oneRmHighRepsWarning: 'Oltre le 10-12 ripetizioni la stima diventa poco affidabile.',
    oneRmEstimated: 'Massimale stimato (1RM)',
    oneRmPercentTable: 'Tabella percentuali',
    unitConverter: 'Convertitore kg/lb',
    calendarToggle: 'Calendario allenamenti',
    calLegendPositive: 'Periodo in crescita (miglioramenti diffusi)',
    calLegendNegative: 'Periodo in calo',
    calLegendNeutral: 'Periodo stabile / dati insufficienti',
    calLegendShortStop: 'Stop breve (8-14gg)',
    calLegendMediumStop: 'Stop medio (15-30gg)',
    calLegendLongStop: 'Stop lungo (30+ gg)',
    allExercises: 'Tutti gli esercizi',
    tapToToggle: 'tocca per mostrare/nascondere',
    pleaseWait: 'Attendere…',
    uploadTitle: 'Importa i tuoi dati',
    uploadSubtitle: 'Non hai ancora nessun dato importato. Carica il file CSV esportato dalla tua app di allenamento per iniziare — resterà salvato solo su questo dispositivo, senza account.',
    chooseFile: 'Scegli file CSV',
    uploading: 'Caricamento…',
    appLanguage: 'Lingua app',
    exerciseLanguage: 'Lingua esercizi',
    weightUnit: 'Peso',
    importMappingTitle: 'Associa le colonne del tuo file',
    importMappingIntro: 'Abbiamo trovato queste colonne nel file: scegli quale corrisponde a ciascun campo richiesto.',
    importMappingDate: 'Colonna Data',
    importMappingExercise: 'Colonna Esercizio',
    importMappingWeight: 'Colonna Peso',
    importMappingReps: 'Colonna Reps',
    importMappingWeightUnit: 'Colonna Unità peso (opzionale)',
    importMappingNone: '(nessuna — usa unità di default)',
    importMappingConfirm: 'Applica mappatura',
    importMappingIncomplete: 'Seleziona almeno le colonne Data, Esercizio, Peso e Reps.',
    importParseError: 'Errore nella lettura del file',
    importNoValidRows: 'Nessuna riga valida trovata nel file. Controlla che il formato scelto corrisponda al file caricato.',
    close: 'Chiudi',
  },
  en: {
    subtitle: 'Explore your workouts',
    updateExport: 'Import updated data',
    manage: 'Manage',
    settings: 'Settings',
    clearData: 'Delete saved data',
    clearDataConfirm: 'Do you want to permanently delete all workout data saved on this device? This action cannot be undone.',
    clearDataConfirmFinal: 'Are you sure? All your saved workouts will be permanently deleted from this device.',
    minSetsCount: 'Minimum number of sets',
    tapMuscleGroup: 'Tap a muscle group to see progress',
    sessions: 'sessions',
    sets: 'sets',
    totalVolume: 'total volume',
    compareOtherGroup: 'Compare with other exercises',
    max: 'Max',
    last: 'Last',
    strengthChartNote: 'Each line shows the estimated strength level (1RM) of that exercise over time.',
    zoomHint: 'Drag to pan, pinch horizontally to zoom time and vertically to zoom values',
    resetYZoom: 'Reset values',
    today: 'Today',
    yesterday: 'Yesterday',
    range1m: '1M',
    range3m: '3M',
    range6m: '6M',
    range1y: '1Y',
    rangeAll: 'All',
    resetZoom: 'Reset',
    latestSessions: 'Latest sessions',
    date: 'Date',
    topSet: 'Top set',
    value: 'Value',
    mixedNote: 'This exercise has both bodyweight and weighted sessions — the stats above are based on weighted sessions.',
    minCountThreshold: 'Minimum times performed',
    hiddenAuto: 'exercises done fewer times are automatically hidden',
    recencyFilter: 'Hide everywhere exercises not done in the last:',
    recencyAll: 'Always',
    recency30: '30 days',
    recency90: '90 days',
    recency180: '6 months',
    recency365: '1 year',
    oneRmCalc: '1RM Calculator',
    oneRmCalcHint: 'Enter a weight and the reps you did with it to estimate your one-rep max (1RM), with a percentage table useful for programming your training.',
    oneRmWeightLabel: 'Weight lifted',
    oneRmRepsLabel: 'Reps',
    oneRmHighRepsWarning: 'Above 10-12 reps the estimate becomes less reliable.',
    oneRmEstimated: 'Estimated one-rep max (1RM)',
    oneRmPercentTable: 'Percentage table',
    unitConverter: 'kg/lb Converter',
    calendarToggle: 'Training calendar',
    calLegendPositive: 'Improving period (widespread gains)',
    calLegendNegative: 'Declining period',
    calLegendNeutral: 'Stable period / not enough data',
    calLegendShortStop: 'Short stop (8-14d)',
    calLegendMediumStop: 'Medium stop (15-30d)',
    calLegendLongStop: 'Long stop (30+d)',
    allExercises: 'All exercises',
    tapToToggle: 'tap to show/hide',
    pleaseWait: 'Please wait…',
    uploadTitle: 'Import your data',
    uploadSubtitle: "You don't have any imported data yet. Upload the CSV file exported from your training app to get started — it will stay saved only on this device, no account needed.",
    chooseFile: 'Choose CSV file',
    uploading: 'Uploading…',
    appLanguage: 'App language',
    exerciseLanguage: 'Exercise language',
    weightUnit: 'Weight',
    importMappingTitle: 'Map your file columns',
    importMappingIntro: 'We found these columns in the file: choose which one matches each required field.',
    importMappingDate: 'Date column',
    importMappingExercise: 'Exercise column',
    importMappingWeight: 'Weight column',
    importMappingReps: 'Reps column',
    importMappingWeightUnit: 'Weight unit column (optional)',
    importMappingNone: '(none — use default unit)',
    importMappingConfirm: 'Apply mapping',
    importMappingIncomplete: 'Select at least the Date, Exercise, Weight and Reps columns.',
    importParseError: 'Error reading the file',
    importNoValidRows: 'No valid rows found in the file. Check that the chosen format matches the uploaded file.',
    close: 'Close',
  },
};

function t(lang, key) {
  return (UI_STRINGS[lang] && UI_STRINGS[lang][key]) || UI_STRINGS.it[key] || key;
}

// Conversioni unità di misura
const KG_TO_LB = 2.20462;
function convertWeight(kg, unit) {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}
function weightUnitLabel(unit) {
  return unit === 'lb' ? 'lb' : 'kg';
}
function fmtWeight(kgValue, unit) {
  const converted = convertWeight(kgValue, unit);
  return fmtKg(converted);
}

// Fattore di conversione km -> miglia, usato per la distanza cardio quando l'utente ha impostato lb
// (si assume che chi preferisce libbre preferisca anche le miglia per la distanza).
const KM_TO_MI = 0.621371;
function convertDistanceKm(km, weightUnit) {
  return weightUnit === 'lb' ? km * KM_TO_MI : km;
}
function distanceUnitLabel(weightUnit) {
  return weightUnit === 'lb' ? 'mi' : 'km';
}

// Zone di circonferenza corporea supportate: valori esatti dell'enum measurement_type in DB,
// con relativa chiave di traduzione per l'etichetta mostrata.
const MEASUREMENT_ZONES = [
  { key: 'waist', labelKey: 'zoneWaist' },
  { key: 'chest', labelKey: 'zoneChest' },
  { key: 'hips', labelKey: 'zoneHips' },
  { key: 'biceps_left', labelKey: 'zoneBicepsLeft' },
  { key: 'biceps_right', labelKey: 'zoneBicepsRight' },
  { key: 'thigh_left', labelKey: 'zoneThighLeft' },
  { key: 'thigh_right', labelKey: 'zoneThighRight' },
  { key: 'neck', labelKey: 'zoneNeck' },
  { key: 'calf_left', labelKey: 'zoneCalfLeft' },
  { key: 'calf_right', labelKey: 'zoneCalfRight' },
];

// Attività cardio supportate, con relativa chiave di traduzione.
const CARDIO_ACTIVITIES = [
  { key: 'Corsa', labelKey: 'cardioActivityRun' },
  { key: 'Camminata', labelKey: 'cardioActivityWalk' },
  { key: 'Ciclismo', labelKey: 'cardioActivityCycle' },
  { key: 'Nuoto', labelKey: 'cardioActivitySwim' },
  { key: 'Altro', labelKey: 'cardioActivityOther' },
];

const GROUP_ORDER = ['Petto','Schiena','Spalle','Bicipiti','Tricipiti','Gambe','Addominali','Avambracci','Altro'];

const GROUP_COLOR = {
  Petto: '#5ADECD',
  Schiena: '#4FA8D8',
  Spalle: '#8B7FE8',
  Bicipiti: '#5AC9DE',
  Tricipiti: '#C77FE0',
  Gambe: '#7F8FE8',
  Addominali: '#5AE0A8',
  Avambracci: '#5AB8E0',
  Altro: 'var(--text-secondary)',
};

const LB_TO_KG = 0.453592;

const EXERCISE_TO_GROUP = {
  'Bench Press':'Petto','Dumbbell Bench Press':'Petto','Incline Dumbbell Bench Press':'Petto',
  'Incline Dumbbell Fly':'Petto','Cable Fly':'Petto','High to Low Cable Fly':'Petto',
  'Chest Press':'Petto','Smith Machine Bench Press':'Petto','Smith Machine Incline Bench Press':'Petto',
  'Dips':'Petto','Diamond Push Ups':'Petto','Supine Bench Press':'Petto',
  'Seated Cable Row':'Schiena','Dumbbell Row':'Schiena','Chest Supported Dumbbell Row':'Schiena',
  'Lat Pulldown':'Schiena','One Arm Lat Pulldown':'Schiena','Machine Row':'Schiena',
  'Bent Over Row':'Schiena','Neutral Grip Pull Ups':'Schiena','Pull Ups':'Schiena',
  'Chin Ups':'Schiena','Dead Hang':'Schiena','Back Extension':'Schiena','Deadlift':'Schiena',
  'Face Pull':'Schiena','Cable Reverse Fly':'Schiena','Dumbbell Reverse Fly':'Schiena',
  'One Arm Cable Reverse Fly':'Schiena',
  'Machine Shoulder Press':'Spalle','Seated Dumbbell Shoulder Press':'Spalle','Military Press':'Spalle',
  'Dumbbell Lateral Raise':'Spalle','Cable Lateral Raise':'Spalle','Machine Lateral Raise':'Spalle',
  'Lu Raise':'Spalle','Dumbbell Shrug':'Spalle','Cable Shrug':'Spalle','Machine Shrug':'Spalle',
  'Smith Machine Shrug':'Spalle','60\u00b0 Shrugs':'Spalle','Chest Supported Dumbbell Shrug':'Spalle',
  'EZ Bar Curl':'Bicipiti','EZ Bar Preacher Curl':'Bicipiti','Hammer Curl':'Bicipiti',
  'Incline Dumbbell Curl':'Bicipiti','Cable Hammer Curl':'Bicipiti','Dumbbell Curl':'Bicipiti',
  'Preacher Curl':'Bicipiti','Preacher Hammer Curl':'Bicipiti','Cross Body Hammer Curl':'Bicipiti',
  'Incline Hammer Curl':'Bicipiti','Dumbbell Reverse Curl':'Bicipiti',
  'Tricep Pushdown':'Tricipiti','Seated Dumbbell Tricep Extension':'Tricipiti',
  'Cable Overhead Tricep Extension':'Tricipiti','EZ Bar Lying Tricep Extension':'Tricipiti',
  'JM Press':'Tricipiti','Tricep Extension':'Tricipiti',
  'Squat':'Gambe','Smith Machine Squat':'Gambe','Hack Squat':'Gambe','Leg Extension':'Gambe',
  'Seated Leg Curl':'Gambe','Hip Thrust':'Gambe','Hip Abduction':'Gambe','Hip Adduction':'Gambe',
  "Captain's Chair Leg Raise":'Addominali',"Captain's Chair Knee Raise":'Addominali',
  'Crunches':'Addominali','Decline Crunch':'Addominali','Decline Sit-up':'Addominali','Plank':'Addominali',
  'Wrist Curl':'Avambracci','Reverse Wrist Curl':'Avambracci','Cable Wrist Curl':'Avambracci',
  'Dumbbell Reverse Wrist Curl':'Avambracci',
  'Football':'Altro','Skiers':'Altro',
};

const EXERCISE_NAME_IT = {
  'Bench Press': 'Panca piana',
  'Dumbbell Bench Press': 'Panca piana con manubri',
  'Incline Dumbbell Bench Press': 'Panca inclinata con manubri',
  'Incline Dumbbell Fly': 'Croci inclinate con manubri',
  'Cable Fly': 'Croci ai cavi',
  'High to Low Cable Fly': 'Croci ai cavi alto-basso',
  'Chest Press': 'Chest press (macchina)',
  'Smith Machine Bench Press': 'Panca piana al multipower',
  'Smith Machine Incline Bench Press': 'Panca inclinata al multipower',
  'Dips': 'Dip alle parallele',
  'Diamond Push Ups': 'Piegamenti a diamante',
  'Supine Bench Press': 'Panca presa supina',
  'Seated Cable Row': 'Rematore al cavo da seduto',
  'Dumbbell Row': 'Rematore con manubrio',
  'Chest Supported Dumbbell Row': 'Rematore con manubri su panca inclinata',
  'Lat Pulldown': 'Lat machine',
  'One Arm Lat Pulldown': 'Lat machine a un braccio',
  'Machine Row': 'Rematore alla macchina',
  'Bent Over Row': 'Rematore con bilanciere',
  'Neutral Grip Pull Ups': 'Trazioni presa neutra',
  'Pull Ups': 'Trazioni alla sbarra',
  'Chin Ups': 'Trazioni presa supina',
  'Dead Hang': 'Sospensione alla sbarra',
  'Back Extension': 'Iperestensioni lombari',
  'Deadlift': 'Stacco da terra',
  'Face Pull': 'Face pull',
  'Cable Reverse Fly': 'Aperture inverse ai cavi',
  'Dumbbell Reverse Fly': 'Aperture inverse con manubri',
  'One Arm Cable Reverse Fly': 'Apertura inversa al cavo a un braccio',
  'Machine Shoulder Press': 'Lento avanti alla macchina',
  'Seated Dumbbell Shoulder Press': 'Lento avanti con manubri da seduto',
  'Military Press': 'Military press',
  'Dumbbell Lateral Raise': 'Alzate laterali con manubri',
  'Cable Lateral Raise': 'Alzate laterali ai cavi',
  'Machine Lateral Raise': 'Alzate laterali alla macchina',
  'Lu Raise': 'Lu raise',
  'Dumbbell Shrug': 'Scrollate con manubri',
  'Cable Shrug': 'Scrollate al cavo',
  'Machine Shrug': 'Scrollate alla macchina',
  'Smith Machine Shrug': 'Scrollate al multipower',
  '60° Shrugs': 'Scrollate a 60°',
  'Chest Supported Dumbbell Shrug': 'Scrollate con manubri su panca inclinata',
  'EZ Bar Curl': 'Curl con bilanciere EZ',
  'EZ Bar Preacher Curl': 'Curl al panchetto con bilanciere EZ',
  'Hammer Curl': 'Curl a martello',
  'Incline Dumbbell Curl': 'Curl su panca inclinata',
  'Cable Hammer Curl': 'Curl a martello al cavo',
  'Dumbbell Curl': 'Curl con manubri',
  'Preacher Curl': 'Curl al panchetto Scott',
  'Preacher Hammer Curl': 'Curl a martello al panchetto Scott',
  'Cross Body Hammer Curl': 'Curl a martello incrociato',
  'Incline Hammer Curl': 'Curl a martello su panca inclinata',
  'Dumbbell Reverse Curl': 'Curl inverso con manubri',
  'Tricep Pushdown': 'Push down ai cavi',
  'Seated Dumbbell Tricep Extension': 'Estensioni tricipiti con manubrio da seduto',
  'Cable Overhead Tricep Extension': 'Estensioni tricipiti ai cavi sopra la testa',
  'EZ Bar Lying Tricep Extension': 'French press con bilanciere EZ',
  'JM Press': 'JM press',
  'Tricep Extension': 'Estensioni tricipiti',
  'Squat': 'Squat',
  'Smith Machine Squat': 'Squat al multipower',
  'Hack Squat': 'Hack squat',
  'Leg Extension': 'Leg extension',
  'Seated Leg Curl': 'Leg curl da seduto',
  'Hip Thrust': 'Hip thrust',
  'Hip Abduction': 'Abduzione anca (macchina)',
  'Hip Adduction': 'Adduzione anca (macchina)',
  'Captain\'s Chair Leg Raise': 'Sollevamento gambe alla sedia romana',
  'Captain\'s Chair Knee Raise': 'Sollevamento ginocchia alla sedia romana',
  'Crunches': 'Crunch',
  'Decline Crunch': 'Crunch su panca declinata',
  'Decline Sit-up': 'Sit-up su panca declinata',
  'Plank': 'Plank',
  'Wrist Curl': 'Curl polsi',
  'Reverse Wrist Curl': 'Curl polsi inverso',
  'Cable Wrist Curl': 'Curl polsi al cavo',
  'Dumbbell Reverse Wrist Curl': 'Curl polsi inverso con manubri',
  'Football': 'Calcio',
  'Skiers': 'Sci',
};

function translateExercise(name, lang) {
  if (lang === 'en') return name;
  return EXERCISE_NAME_IT[name] || name;
}

const GROUP_NAME_EN = {
  Petto: 'Chest', Schiena: 'Back', Spalle: 'Shoulders', Bicipiti: 'Biceps',
  Tricipiti: 'Triceps', Gambe: 'Legs', Addominali: 'Abs', Avambracci: 'Forearms', Altro: 'Other',
};
function translateGroup(name, lang) {
  if (lang === 'it') return name;
  return GROUP_NAME_EN[name] || name;
}

function guessGroup(exerciseName) {
  return EXERCISE_TO_GROUP[exerciseName] || 'Altro';
}


function fmtDate(d) {
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

function toTs(dateStr) {
  return new Date(dateStr).getTime();
}

// Formatta un numero in stile italiano: virgola come separatore decimale, niente ",0" superfluo (75.0 -> "75", 77.2 -> "77,2")
function fmtKg(n) {
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
}

// Etichette dei giorni della settimana (lun-dom, indice 0=domenica come Date.getDay()) per i
// tick "recenti" del grafico: usate solo da 2 a 6 giorni fa, dato che oltre diventa più utile
// la data secca per orientarsi (e per date lontane non è comunque leggibile "che giorno era").
const WEEKDAY_LABELS = {
  it: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fmtTick(ts, langApp = 'it') {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2,'0');
  const month = String(d.getMonth()+1).padStart(2,'0');
  const year = String(d.getFullYear()).slice(2);
  const dateStr = `${day}/${month}/${year}`;

  // "Oggi"/"Ieri"/nome del giorno solo per date recenti: oltre i 6 giorni fa (o per date future,
  // che non dovrebbero comparire ma per sicurezza) si torna al formato data secco gg/mm/aa.
  const todayStart = startOfDay(Date.now());
  const tickStart = startOfDay(ts);
  const daysAgo = Math.round((todayStart - tickStart) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return t(langApp, 'today');
  if (daysAgo === 1) return t(langApp, 'yesterday');
  if (daysAgo >= 2 && daysAgo <= 6) {
    const labels = WEEKDAY_LABELS[langApp] || WEEKDAY_LABELS.it;
    return labels[d.getDay()];
  }
  return dateStr;
}

function parseDurationIrrelevant() {} // placeholder, non serve qui

// Converte le righe grezze di un CSV Liftoff (con header Date,Duration,Workout Name,Exercise Name,Set Order,Weight,Reps,...)
// in righe [date, exercise, group, weight_kg, reps]. Assume peso in libbre come nell'export originale.
function csvRowsToRaw(rows) {
  const out = [];
  for (const r of rows) {
    const dateRaw = r['Date'];
    const exercise = r['Exercise Name'];
    const weight = parseFloat(r['Weight']);
    const reps = parseInt(r['Reps'], 10);
    if (!dateRaw || !exercise || isNaN(weight) || isNaN(reps)) continue;
    const date = dateRaw.slice(0, 10);
    const weightKg = Math.round(weight * LB_TO_KG * 10) / 10;
    out.push([date, exercise, guessGroup(exercise), weightKg, reps]);
  }
  return out;
}

// Converte un peso nell'unità indicata dalla riga stessa (colonna "Weight Unit" di Strong) in kg.
// A differenza di Liftoff, Strong indica riga per riga se il peso è già in kg o in lb, quindi
// niente conversione "a occhio": rispettiamo esattamente quello che dice l'export.
function toKgFromUnit(weight, unit) {
  const u = (unit || '').toString().trim().toLowerCase();
  if (u === 'kg') return weight;
  // lb, lbs, o assente: assumiamo libbre come da export standard Strong quando manca l'unità
  return weight * LB_TO_KG;
}

// Converte le righe di un export Strong in righe [date, exercise, group, weight_kg, reps].
// Formato reale Strong: "Date","Workout Name","Exercise Name","Set Order","Weight","Weight Unit",
// "Reps","RPE","Distance","Distance Unit","Seconds","Notes","Workout Notes","Workout Duration".
// Il separatore CSV varia tra versioni (',' o ';'): la rilevazione è demandata a Papa.parse
// (delimiter: "" per l'auto-detect), qui riceviamo già righe oggetto già parsate correttamente.
function strongRowsToRaw(rows) {
  const out = [];
  for (const r of rows) {
    const dateRaw = r['Date'];
    const exercise = r['Exercise Name'];
    const weight = parseFloat(r['Weight']);
    const reps = parseInt(r['Reps'], 10);
    if (!dateRaw || !exercise || isNaN(weight) || isNaN(reps)) continue;
    const date = dateRaw.slice(0, 10);
    const weightKg = Math.round(toKgFromUnit(weight, r['Weight Unit']) * 10) / 10;
    out.push([date, exercise, guessGroup(exercise), weightKg, reps]);
  }
  return out;
}

// Converte le righe di un export Hevy in righe [date, exercise, group, weight_kg, reps].
// Formato reale Hevy: "title","start_time","end_time","description","exercise_title","superset_id",
// "exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe".
// Hevy esporta il peso già in kg (weight_kg): a differenza di Liftoff/Strong non serve alcuna conversione.
// La data è dentro start_time (es. "8 Jan 2024, 16:00"): usiamo new Date() e teniamo solo YYYY-MM-DD.
function hevyRowsToRaw(rows) {
  const out = [];
  for (const r of rows) {
    const startTime = r['start_time'];
    const exercise = r['exercise_title'];
    const weight = parseFloat(r['weight_kg']);
    const reps = parseInt(r['reps'], 10);
    if (!startTime || !exercise || isNaN(weight) || isNaN(reps)) continue;
    const parsedDate = new Date(startTime);
    if (isNaN(parsedDate.getTime())) continue;
    const date = parsedDate.toISOString().slice(0, 10);
    const weightKg = Math.round(weight * 10) / 10;
    out.push([date, exercise, guessGroup(exercise), weightKg, reps]);
  }
  return out;
}

// Parser "best effort" per Jefit: i CSV variano molto tra versioni dell'app, quindi cerchiamo
// colonne con nomi simili case-insensitive invece di assumere intestazioni fisse. Se non troviamo
// i campi essenziali (data/esercizio/peso/reps) restituiamo un errore chiaro invece di importare
// silenziosamente dati vuoti o sbagliati — meglio bloccare che sporcare lo storico dell'utente.
function findColumnCaseInsensitive(headerKeys, candidates) {
  const lowerMap = {};
  headerKeys.forEach(k => { lowerMap[k.toLowerCase().trim()] = k; });
  for (const cand of candidates) {
    if (lowerMap[cand]) return lowerMap[cand];
    // match parziale: es. "reps" dentro "repetitions", o "lbs" dentro "weight (lbs)"
    const partial = headerKeys.find(k => k.toLowerCase().includes(cand));
    if (partial) return partial;
  }
  return null;
}

function jefitRowsToRaw(rows) {
  if (!rows.length) throw new Error('Il file è vuoto.');
  const headerKeys = Object.keys(rows[0]);
  const dateCol = findColumnCaseInsensitive(headerKeys, ['date', 'day']);
  const exerciseCol = findColumnCaseInsensitive(headerKeys, ['exercise name', 'exercise']);
  const weightCol = findColumnCaseInsensitive(headerKeys, ['weight', 'lbs', 'kg']);
  const repsCol = findColumnCaseInsensitive(headerKeys, ['reps', 'repetitions', 'rep']);
  // log chiaro in console di quali colonne sono state individuate, utile per debug su export "strani"
  console.log('[Jefit import] colonne individuate:', { dateCol, exerciseCol, weightCol, repsCol });
  if (!dateCol || !exerciseCol || !weightCol || !repsCol) {
    const missing = [
      !dateCol && 'data', !exerciseCol && 'esercizio', !weightCol && 'peso', !repsCol && 'reps',
    ].filter(Boolean).join(', ');
    throw new Error(`Impossibile riconoscere le colonne necessarie nel file Jefit (mancanti: ${missing}). Prova con "Altro formato CSV" per mappare le colonne manualmente.`);
  }
  // se la colonna peso ha nel nome "kg" assumiamo kg, altrimenti libbre (default export Jefit è in lb)
  const weightIsKg = weightCol.toLowerCase().includes('kg');
  const out = [];
  for (const r of rows) {
    const dateRaw = r[dateCol];
    const exercise = r[exerciseCol];
    const weight = parseFloat(r[weightCol]);
    const reps = parseInt(r[repsCol], 10);
    if (!dateRaw || !exercise || isNaN(weight) || isNaN(reps)) continue;
    const date = String(dateRaw).slice(0, 10);
    const weightKg = Math.round((weightIsKg ? weight : weight * LB_TO_KG) * 10) / 10;
    out.push([date, exercise, guessGroup(exercise), weightKg, reps]);
  }
  return out;
}

// Applica una mappatura manuale di colonne (scelta dall'utente per "Altro formato CSV") a tutte le righe.
// mapping = { date, exercise, weight, reps, weightUnit } dove ognuno è il nome reale della colonna nel file
// (weightUnit è opzionale: se assente si assume l'unità passata in defaultWeightUnit).
function mappedRowsToRaw(rows, mapping, defaultWeightUnit) {
  const out = [];
  for (const r of rows) {
    const dateRaw = r[mapping.date];
    const exercise = r[mapping.exercise];
    const weight = parseFloat(r[mapping.weight]);
    const reps = parseInt(r[mapping.reps], 10);
    if (!dateRaw || !exercise || isNaN(weight) || isNaN(reps)) continue;
    const date = String(dateRaw).slice(0, 10);
    const rowUnit = mapping.weightUnit ? r[mapping.weightUnit] : defaultWeightUnit;
    const weightKg = Math.round(toKgFromUnit(weight, rowUnit) * 10) / 10;
    out.push([date, exercise, guessGroup(exercise), weightKg, reps]);
  }
  return out;
}

// Elenco delle app sorgente supportate per l'import CSV, usato dal selettore mostrato prima
// della scelta del file sia nel primo upload sia nell'aggiornamento export.
const IMPORT_APPS = [
  { key: 'liftoff', labelKey: 'importAppLiftoff' },
  { key: 'strong', labelKey: 'importAppStrong' },
  { key: 'hevy', labelKey: 'importAppHevy' },
  { key: 'jefit', labelKey: 'importAppJefit' },
  { key: 'other', labelKey: 'importAppOther' },
];

// Analizza un file CSV già parsato da Papa.parse in base all'app scelta, restituendo le righe
// nel formato interno comune. Per 'other' non produce righe direttamente: segnala che serve
// una mappatura manuale (gestita da ImportMappingModal) restituendo needsMapping=true.
function rowsForImportApp(appKey, parsedRows) {
  switch (appKey) {
    case 'liftoff': return { rows: csvRowsToRaw(parsedRows), needsMapping: false };
    case 'strong': return { rows: strongRowsToRaw(parsedRows), needsMapping: false };
    case 'hevy': return { rows: hevyRowsToRaw(parsedRows), needsMapping: false };
    case 'jefit': return { rows: jefitRowsToRaw(parsedRows), needsMapping: false };
    case 'other': return { rows: [], needsMapping: true };
    default: return { rows: csvRowsToRaw(parsedRows), needsMapping: false };
  }
}

// Opzioni di Papa.parse per ciascuna app: Strong in particolare varia il separatore tra versioni
// (',' o ';'), quindi lasciamo che papaparse lo rilevi da solo (delimiter: "" attiva l'auto-detect).
function papaOptionsForImportApp(appKey) {
  if (appKey === 'strong') return { header: true, skipEmptyLines: true, delimiter: '' };
  return { header: true, skipEmptyLines: true };
}

// Modale di mappatura manuale colonne per "Altro formato CSV": mostra le intestazioni reali del file
// (lette con Papa.parse preview:1) e lascia scegliere quale colonna corrisponde a ciascun campo richiesto.
function ImportMappingModal({ headers, onConfirm, onCancel, langApp, defaultWeightUnit }) {
  const [dateCol, setDateCol] = useState('');
  const [exerciseCol, setExerciseCol] = useState('');
  const [weightCol, setWeightCol] = useState('');
  const [repsCol, setRepsCol] = useState('');
  const [weightUnitCol, setWeightUnitCol] = useState('');
  const [error, setError] = useState(null);

  function handleConfirm() {
    if (!dateCol || !exerciseCol || !weightCol || !repsCol) {
      setError(t(langApp, 'importMappingIncomplete'));
      return;
    }
    onConfirm({ date: dateCol, exercise: exerciseCol, weight: weightCol, reps: repsCol, weightUnit: weightUnitCol || null }, defaultWeightUnit);
  }

  const selectStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8, marginTop: 4, marginBottom: 10,
    background: 'var(--bg-app)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
    fontSize: 12.5, fontFamily: '"Inter", sans-serif',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="panel-anim" style={{
        width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', scrollBehavior: 'smooth',
        background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 14, padding: 16,
      }}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
          {t(langApp, 'importMappingTitle')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
          {t(langApp, 'importMappingIntro')}
        </div>

        <label style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{t(langApp, 'importMappingDate')}</label>
        <select value={dateCol} onChange={e => setDateCol(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <label style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{t(langApp, 'importMappingExercise')}</label>
        <select value={exerciseCol} onChange={e => setExerciseCol(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <label style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{t(langApp, 'importMappingWeight')}</label>
        <select value={weightCol} onChange={e => setWeightCol(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <label style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{t(langApp, 'importMappingReps')}</label>
        <select value={repsCol} onChange={e => setRepsCol(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <label style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{t(langApp, 'importMappingWeightUnit')}</label>
        <select value={weightUnitCol} onChange={e => setWeightUnitCol(e.target.value)} style={selectStyle}>
          <option value="">{t(langApp, 'importMappingNone')}</option>
          {headers.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {error && <div style={{ color: '#e08a8a', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-strong)',
            background: 'var(--bg-app)', color: 'var(--text-primary-dim)', fontSize: 12.5, fontFamily: '"Inter", sans-serif', cursor: 'pointer',
          }}>{t(langApp, 'close')}</button>
          <button onClick={handleConfirm} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10, border: 'none',
            background: '#5ADECD', color: 'var(--bg-app)', fontWeight: 600, fontSize: 12.5, fontFamily: '"Inter", sans-serif', cursor: 'pointer',
          }}>{t(langApp, 'importMappingConfirm')}</button>
        </div>
      </div>
    </div>
  );
}

// Silhouette semplificata in stile "bodygraph": fronte/retro, zone colorabili.
function BodyMap({ selected, onSelect, view, setView, availableGroups }) {
  const isAvail = (g) => availableGroups.has(g);
  const fillFor = (g) => selected === g ? GROUP_COLOR[g] : (isAvail(g) ? 'var(--bg-card-active)' : 'var(--bg-card)');
  const clickable = (g) => isAvail(g)
    ? { cursor: 'pointer', transition: 'fill 0.15s ease, opacity 0.15s ease' }
    : { cursor: 'default', opacity: 0.35, transition: 'fill 0.15s ease, opacity 0.15s ease' };
  const handle = (g) => isAvail(g) ? () => onSelect(g) : undefined;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ display:'flex', gap:8, background:'var(--bg-app)', padding:4, borderRadius:8 }}>
        <button onClick={()=>setView('front')} style={{
          padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer',
          fontFamily:'"Space Grotesk", sans-serif', fontSize:12, letterSpacing:1, textTransform:'uppercase',
          background: view==='front' ? '#5ADECD' : 'transparent',
          color: view==='front' ? 'var(--on-accent)' : 'var(--text-secondary)',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}>Fronte</button>
        <button onClick={()=>setView('back')} style={{
          padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer',
          fontFamily:'"Space Grotesk", sans-serif', fontSize:12, letterSpacing:1, textTransform:'uppercase',
          background: view==='back' ? '#5ADECD' : 'transparent',
          color: view==='back' ? 'var(--on-accent)' : 'var(--text-secondary)',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}>Retro</button>
      </div>

      <svg className="bodymap-svg" viewBox="0 0 200 320" width="180" height="288" style={{ maxWidth: '100%', maxHeight: '60vh', height: 'auto' }}>
        {/* testa: non corrisponde a nessun gruppo muscolare allenabile, resta sempre semi-trasparente e non cliccabile */}
        <circle cx="100" cy="35" r="18" fill='var(--bg-card-active)' stroke="var(--border-strong)" strokeWidth="1" opacity="0.35"/>
        {/* collo */}
        <rect x="93" y="50" width="14" height="10" fill='var(--bg-card-active)' opacity="0.35"/>

        {view === 'front' ? (
          <>
            {/* torso/petto */}
            <path d="M 65 62 Q 100 55 135 62 L 140 130 Q 100 140 60 130 Z"
              fill={fillFor('Petto')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Petto')}
              onClick={handle('Petto')} />
            {/* spalle */}
            <ellipse cx="58" cy="70" rx="14" ry="12" fill={fillFor('Spalle')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Spalle')} onClick={handle('Spalle')} />
            <ellipse cx="142" cy="70" rx="14" ry="12" fill={fillFor('Spalle')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Spalle')} onClick={handle('Spalle')} />
            {/* bicipiti (bracci sup) */}
            <rect x="42" y="82" width="16" height="45" rx="8" fill={fillFor('Bicipiti')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Bicipiti')} onClick={handle('Bicipiti')} />
            <rect x="142" y="82" width="16" height="45" rx="8" fill={fillFor('Bicipiti')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Bicipiti')} onClick={handle('Bicipiti')} />
            {/* avambracci */}
            <rect x="40" y="127" width="14" height="42" rx="7" fill={fillFor('Avambracci')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Avambracci')} onClick={handle('Avambracci')} />
            <rect x="146" y="127" width="14" height="42" rx="7" fill={fillFor('Avambracci')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Avambracci')} onClick={handle('Avambracci')} />
            {/* addominali */}
            <rect x="75" y="130" width="50" height="45" rx="6" fill={fillFor('Addominali')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Addominali')} onClick={handle('Addominali')} />
            {/* gambe */}
            <rect x="72" y="178" width="24" height="110" rx="10" fill={fillFor('Gambe')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Gambe')} onClick={handle('Gambe')} />
            <rect x="104" y="178" width="24" height="110" rx="10" fill={fillFor('Gambe')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Gambe')} onClick={handle('Gambe')} />
          </>
        ) : (
          <>
            {/* schiena */}
            <path d="M 65 62 Q 100 55 135 62 L 140 175 Q 100 185 60 175 Z"
              fill={fillFor('Schiena')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Schiena')}
              onClick={handle('Schiena')} />
            <ellipse cx="58" cy="70" rx="14" ry="12" fill={fillFor('Spalle')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Spalle')} onClick={handle('Spalle')} />
            <ellipse cx="142" cy="70" rx="14" ry="12" fill={fillFor('Spalle')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Spalle')} onClick={handle('Spalle')} />
            <rect x="42" y="82" width="16" height="45" rx="8" fill={fillFor('Tricipiti')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Tricipiti')} onClick={handle('Tricipiti')} />
            <rect x="142" y="82" width="16" height="45" rx="8" fill={fillFor('Tricipiti')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Tricipiti')} onClick={handle('Tricipiti')} />
            <rect x="40" y="127" width="14" height="42" rx="7" fill={fillFor('Avambracci')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Avambracci')} onClick={handle('Avambracci')} />
            <rect x="146" y="127" width="14" height="42" rx="7" fill={fillFor('Avambracci')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Avambracci')} onClick={handle('Avambracci')} />
            <rect x="72" y="175" width="24" height="113" rx="10" fill={fillFor('Gambe')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Gambe')} onClick={handle('Gambe')} />
            <rect x="104" y="175" width="24" height="113" rx="10" fill={fillFor('Gambe')} stroke="var(--border-strong)" strokeWidth="1" style={clickable('Gambe')} onClick={handle('Gambe')} />
          </>
        )}
      </svg>
    </div>
  );
}

// Grafico stile "trading": pan continuo trascinando, zoom con rotella/pinch, e scaletta di
// intervalli rapidi (1M/3M/6M/1A/Tutto). Sostituisce il vecchio Brush a indici discreti,
// che risultava meccanico e scattoso quando si trascinavano gli estremi verso i bordi.
function TradingStyleChart({ mergedChartData, compareExercises, colorForExercise, firstTs, todayTs, newYearTicks, viewDomain, setViewDomain, weightUnit, langExercise, langApp, raw }) {
  const containerRef = React.useRef(null);
  const dragState = React.useRef(null); // { startX, startDomain } durante un pan
  const pinchState = React.useRef(null); // distanze iniziali (X e Y separate) tra due dita durante un pinch
  const MIN_SPAN_MS = 1000 * 60 * 60 * 24 * 7; // non stringere l'intervallo sotto la settimana
  // Timestamp del punto "ancorato" con un click: la linea verticale e il tooltip restano fissi lì
  // finché non si clicca su un altro punto (o si clicca fuori), invece di seguire il trascinamento
  // del dito come faceva il cursore automatico di Recharts — è il comportamento richiesto.
  const [selectedTs, setSelectedTs] = useState(null);
  // toggle per mostrare/nascondere le bande verticali dei periodi di allenamento (attivo/stop)
  // sovrapposte allo sfondo del grafico: sostituisce il precedente pannello "calendario" separato
  // in forma di lista, che risultava poco leggibile — qui i periodi si vedono direttamente
  // allineati alle linee di forza, invece che come testo scorporato dal grafico.
  const [showCalendarOverlay, setShowCalendarOverlay] = useState(false);
  const calendarPeriods = useMemo(() => (showCalendarOverlay ? analyzeTrainingPeriods(raw) : []), [showCalendarOverlay, raw]);

  const CALENDAR_QUALITY_COLOR = { positive: '#5ADECD', negative: '#e08a8a', neutral: '#9694B0', unknown: '#6E6C8E' };
  const CALENDAR_STOP_COLOR = { yellow: '#D8B84A', orange: '#D89A4A', red: '#D85A5A' };

  // riga dati completa corrispondente al punto selezionato (o null se selectedTs non combacia con
  // nessun punto reale, es. dopo un cambio di dataset): unica fonte di verità per Tooltip+ReferenceLine
  const selectedPointPayload = useMemo(() => {
    if (selectedTs == null) return null;
    return mergedChartData.find(d => d.ts === selectedTs) || null;
  }, [selectedTs, mergedChartData]);

  // trasforma il punto selezionato nel formato {name, value, payload} atteso da Tooltip.payload,
  // una entry per ogni esercizio in confronto che ha un valore in quel punto
  const selectedTooltipPayload = useMemo(() => {
    if (!selectedPointPayload) return [];
    return compareExercises
      .filter(ex => selectedPointPayload[ex] != null)
      .map(ex => ({ name: ex, value: selectedPointPayload[ex], payload: selectedPointPayload }));
  }, [selectedPointPayload, compareExercises]);

  const rawSpan = Math.max(todayTs - firstTs, MIN_SPAN_MS);
  // piccolo margine di "respiro" ai due estremi della vista all-time di default, così il primo e
  // l'ultimo allenamento non restano incollati al bordo del grafico.
  const edgeMargin = rawSpan * 0.04;
  const fullSpan = rawSpan + edgeMargin * 2;
  const domain = viewDomain || [firstTs - edgeMargin, todayTs + edgeMargin];

  // --- Asse Y: parte sempre da 0 (mai "auto" ancorato al minimo storico, che esagererebbe
  // visivamente le variazioni), con un margine sopra il massimo visibile; zoomabile
  // indipendentemente dall'asse X (pinch verticale, o Alt+rotellina su desktop — vedi handleWheel).
  const autoYDomain = useMemo(() => {
    let max = 0;
    for (const pt of mergedChartData) {
      for (const ex of compareExercises) {
        const v = pt[ex];
        if (typeof v === 'number' && Number.isFinite(v) && v > max) max = v;
      }
    }
    if (max <= 0) max = 10;
    return [0, max * 1.15];
  }, [mergedChartData, compareExercises]);

  const [viewYDomain, setViewYDomain] = useState(null);
  // se cambia il set di esercizi confrontati la scala precedente potrebbe non avere più senso
  // (una nuova linea potrebbe uscire completamente dal range zoomato): resettiamo lo zoom verticale.
  const compareExercisesKey = compareExercises.join('|');
  useEffect(() => { setViewYDomain(null); }, [compareExercisesKey]);

  const yDomain = viewYDomain || autoYDomain;

  function clampYDomain([lo, hi]) {
    let span = hi - lo;
    const fullYSpan = autoYDomain[1] - autoYDomain[0];
    const minYSpan = Math.max(fullYSpan * 0.03, 0.5);
    if (span < minYSpan) span = minYSpan;
    if (span >= fullYSpan) return null; // torna alla vista automatica (0 → massimo + margine)
    let newLo = lo, newHi = newLo + span;
    const margin = span * 0.2;
    if (newLo < autoYDomain[0] - margin) { newLo = autoYDomain[0] - margin; newHi = newLo + span; }
    if (newHi > autoYDomain[1] + margin) { newHi = autoYDomain[1] + margin; newLo = newHi - span; }
    return [newLo, newHi];
  }

  function zoomYBy(factor, pivotRatio = 0.5) {
    // pivotRatio: 0 = valore in basso, 1 = valore in alto (coerente con l'asse Y che cresce verso l'alto)
    const [lo, hi] = yDomain;
    const span = hi - lo;
    const pivot = lo + span * pivotRatio;
    const newSpan = span * factor;
    const newLo = pivot - (pivot - lo) * factor;
    setViewYDomain(clampYDomain([newLo, newLo + newSpan]));
  }

  function clampDomain([start, end]) {
    let span = end - start;
    if (span < MIN_SPAN_MS) span = MIN_SPAN_MS;
    if (span > fullSpan) span = fullSpan;
    let newStart = start;
    let newEnd = newStart + span;
    // non lasciare che la vista esca troppo dai dati disponibili (con un piccolo margine)
    const margin = span * 0.15;
    if (newStart < firstTs - margin) { newStart = firstTs - margin; newEnd = newStart + span; }
    if (newEnd > todayTs + margin) { newEnd = todayTs + margin; newStart = newEnd - span; }
    return [newStart, newEnd];
  }

  function applyPreset(months) {
    if (months === null) { setViewDomain(null); return; }
    const end = todayTs;
    const start = new Date(end);
    start.setMonth(start.getMonth() - months);
    // se il preset copre più storico di quanto disponibile, mostra semplicemente tutto lo storico
    const clampedStart = Math.max(start.getTime(), firstTs);
    setViewDomain([clampedStart, end]);
  }

  function zoomBy(factor, pivotRatio = 0.5) {
    const [start, end] = domain;
    const span = end - start;
    const pivot = start + span * pivotRatio;
    const newSpan = span * factor;
    const newStart = pivot - (pivot - start) * factor;
    const newEnd = newStart + newSpan;
    setViewDomain(clampDomain([newStart, newEnd]));
  }

  function panBy(deltaRatio) {
    const [start, end] = domain;
    const span = end - start;
    const shift = span * deltaRatio;
    setViewDomain(clampDomain([start + shift, end + shift]));
  }

  function handleWheel(e) {
    // Sul trackpad (Mac e la maggior parte dei driver Windows Precision), il browser distingue
    // da solo i due gesti: un pinch a due dita arriva come evento "wheel" con ctrlKey impostato
    // automaticamente a true (indipendentemente dal fatto che l'utente prema davvero Ctrl); uno
    // scroll normale a due dita arriva invece con ctrlKey false e deltaX/deltaY proporzionali alla
    // direzione dello scorrimento. Su un mouse con rotellina c'è solo deltaY e nessun ctrlKey: in
    // quel caso manteniamo il vecchio comportamento (rotellina = zoom), dato che il mouse non ha
    // un gesto di pan a due dita.
    if (e.ctrlKey) {
      e.preventDefault();
      // pinch-zoom da trackpad: fattore proporzionale al deltaY ma clampato. Nota: preventDefault()
      // qui funziona SOLO perché questo handler è registrato come listener nativo non-passive (vedi
      // useEffect sotto) — se fosse ancora collegato come prop onWheel di React, verrebbe attaccato
      // come passive e la chiamata a preventDefault sarebbe silenziosamente ignorata, lasciando che
      // il browser zoomi comunque la pagina intera insieme al grafico (il bug segnalato).
      const clampedDelta = Math.max(-40, Math.min(40, e.deltaY));
      const smoothFactor = 1 + (clampedDelta / 40) * 0.55;
      const rect = containerRef.current.getBoundingClientRect();
      const pivotRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      zoomBy(smoothFactor, pivotRatio);
      return;
    }
    // Alt+rotellina (mouse) o Alt+scroll trackpad: zoom sull'asse Y (valori), indipendente dall'asse
    // X/tempo sopra — non c'è un gesto "naturale" di zoom verticale su desktop, quindi usiamo un
    // modificatore dedicato invece di sovraccaricare ulteriormente ctrlKey.
    if (e.altKey) {
      e.preventDefault();
      const clampedDelta = Math.max(-40, Math.min(40, e.deltaY));
      const smoothFactor = 1 + (clampedDelta / 40) * 0.55;
      const rect = containerRef.current.getBoundingClientRect();
      // pivotRatio 0 = in basso, 1 = in alto: l'asse Y cresce verso l'alto, ma clientY cresce verso
      // il basso, quindi va invertito rispetto alla semplice posizione del cursore nel contenitore.
      const pivotRatio = 1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      zoomYBy(smoothFactor, pivotRatio);
      return;
    }
    // scroll a due dita (o rotellina): se il movimento orizzontale prevale, pannare sinistra/destra;
    // altrimenti (movimento verticale prevalente) lasciamo che sia il browser a gestirlo come scroll
    // della pagina, così scorrere su/giù con due dita quando il cursore è sopra il grafico non
    // resta "intrappolato" qui dentro invece di far scorrere la pagina.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      panBy(e.deltaX / Math.max(rect.width, 1));
    }
  }

  // React registra onWheel/onTouchMove come passive di default (per non bloccare lo scroll della
  // pagina "di default"), il che rende preventDefault() un no-op silenzioso. Per poter davvero
  // impedire lo zoom nativo della pagina durante un pinch sul grafico, serve attaccare l'handler
  // manualmente al nodo DOM con { passive: false }.
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  });

  function handlePointerDown(e) {
    if (e.touches && e.touches.length === 2) {
      // distanze orizzontale e verticale tra le due dita registrate separatamente: un pinch a
      // dita prevalentemente allineate in orizzontale zoomerà l'asse X (tempo), uno a dita
      // allineate in verticale zoomerà l'asse Y (valori) — indipendentemente l'uno dall'altro,
      // in base a quanto ciascuna distanza cambia durante il gesto.
      pinchState.current = {
        distX: Math.max(Math.abs(e.touches[0].clientX - e.touches[1].clientX), 1),
        distY: Math.max(Math.abs(e.touches[0].clientY - e.touches[1].clientY), 1),
        domain,
        yDomain,
      };
      dragState.current = null;
      return;
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { startX: clientX, startY: clientY, startDomain: domain, startYDomain: yDomain };
  }

  function handlePointerMove(e) {
    if (e.touches && e.touches.length === 2 && pinchState.current) {
      const distX = Math.max(Math.abs(e.touches[0].clientX - e.touches[1].clientX), 1);
      const distY = Math.max(Math.abs(e.touches[0].clientY - e.touches[1].clientY), 1);
      const factorX = pinchState.current.distX / distX;
      const factorY = pinchState.current.distY / distY;
      const [start, end] = pinchState.current.domain;
      const span = end - start;
      const center = start + span / 2;
      const newSpan = span * factorX;
      setViewDomain(clampDomain([center - newSpan / 2, center + newSpan / 2]));
      const [yLo, yHi] = pinchState.current.yDomain;
      const ySpan = yHi - yLo;
      const yCenter = yLo + ySpan / 2;
      const newYSpan = ySpan * factorY;
      setViewYDomain(clampYDomain([yCenter - newYSpan / 2, yCenter + newYSpan / 2]));
      return;
    }
    if (!dragState.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const [start, end] = dragState.current.startDomain;
    const span = end - start;
    const deltaPx = clientX - dragState.current.startX;
    const deltaTs = -(deltaPx / Math.max(rect.width, 1)) * span;
    setViewDomain(clampDomain([start + deltaTs, end + deltaTs]));
    // trascinamento verticale: sposta anche la vista dell'asse Y (utile soprattutto quando è
    // zoomato in verticale), nella stessa gesture del pan orizzontale — non serve un dito separato.
    const [yStart, yEnd] = dragState.current.startYDomain;
    const ySpan = yEnd - yStart;
    const deltaPxY = clientY - dragState.current.startY;
    // "il contenuto segue il dito" (come lo scroll naturale iOS/Android): trascinando verso il
    // basso, il grafico si comporta come se lo si spostasse fisicamente verso il basso col dito,
    // rivelando la parte "sopra" — cioè valori più alti — quindi il segno è concorde con deltaPxY,
    // non invertito come per l'asse X (dove trascinare a sinistra fa avanzare nel tempo verso destra).
    const deltaTsY = (deltaPxY / Math.max(rect.height, 1)) * ySpan;
    setViewYDomain(clampYDomain([yStart + deltaTsY, yEnd + deltaTsY]));
  }

  function handlePointerUp() {
    dragState.current = null;
    pinchState.current = null;
  }

  const presets = [
    { key: 'range1m', months: 1 },
    { key: 'range3m', months: 3 },
    { key: 'range6m', months: 6 },
    { key: 'range1y', months: 12 },
    { key: 'rangeAll', months: null },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {presets.map(p => (
          <button key={p.key} onClick={() => applyPreset(p.months)} style={{
            padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border-strong)',
            background: (p.months === null ? !viewDomain : false) ? '#5ADECD' : 'var(--bg-app)',
            color: (p.months === null ? !viewDomain : false) ? 'var(--on-accent)' : 'var(--text-primary-dim)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}>
            {t(langApp, p.key)}
          </button>
        ))}
        <div style={{ width: 1, height: 18, background: 'var(--border-strong)', margin: '0 2px' }} />
        <button onClick={() => setShowCalendarOverlay(v => !v)} style={{
          padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border-strong)',
          background: showCalendarOverlay ? '#5ADECD' : 'var(--bg-app)',
          color: showCalendarOverlay ? 'var(--on-accent)' : 'var(--text-primary-dim)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}>
          {t(langApp, 'calendarToggle')}
        </button>
        {viewYDomain && (
          <button onClick={() => setViewYDomain(null)} style={{
            padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border-strong)',
            background: 'var(--bg-app)', color: 'var(--text-primary-dim)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
          }}>
            ↕ {t(langApp, 'resetYZoom')}
          </button>
        )}
      </div>

      {showCalendarOverlay && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, fontSize: 10, color: 'var(--text-tertiary)' }}>
          {[
            { color: CALENDAR_QUALITY_COLOR.positive, label: 'calLegendPositive' },
            { color: CALENDAR_QUALITY_COLOR.negative, label: 'calLegendNegative' },
            { color: CALENDAR_QUALITY_COLOR.neutral, label: 'calLegendNeutral' },
            { color: CALENDAR_STOP_COLOR.yellow, label: 'calLegendShortStop' },
            { color: CALENDAR_STOP_COLOR.orange, label: 'calLegendMediumStop' },
            { color: CALENDAR_STOP_COLOR.red, label: 'calLegendLongStop' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, opacity: 0.6, flexShrink: 0 }} />
              {t(langApp, item.label)}
            </div>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="trading-chart-container"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 12px 8px 0', height: 'clamp(220px, 45vh, 380px)', touchAction: 'none', cursor: 'grab', userSelect: 'none' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mergedChartData} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
            onClick={(chartState) => {
              // clic sull'area del grafico: ancora la linea/tooltip al punto più vicino cliccato
              // (più facile da colpire su mobile rispetto al singolo pallino). Un secondo clic sullo
              // stesso punto lo deseleziona, così si può "spegnere" la linea senza uscire dal grafico.
              if (chartState && chartState.activeLabel != null) {
                const ts = Number(chartState.activeLabel);
                setSelectedTs(prev => (prev === ts ? null : ts));
              }
            }}>
            <CartesianGrid strokeDasharray="1 5" stroke="var(--border-strong)" strokeOpacity={0.7} vertical={false} />
            {/* bande verticali dei periodi di allenamento (attivo/stop), disegnate PRIMA delle linee
                nell'albero JSX così restano visivamente dietro di esse. Solo i periodi che ricadono
                (anche parzialmente) nel domain visibile vengono renderizzati, per non appesantire
                inutilmente il grafico quando si è zoomati su un intervallo piccolo. */}
            {showCalendarOverlay && calendarPeriods
              .filter(p => p.endTs >= domain[0] && p.startTs <= domain[1])
              .map((p, idx) => {
                const color = p.type === 'stop' ? CALENDAR_STOP_COLOR[p.stopColor] : CALENDAR_QUALITY_COLOR[p.quality];
                return (
                  <ReferenceArea key={idx} x1={Math.max(p.startTs, domain[0])} x2={Math.min(p.endTs, domain[1])}
                    fill={color} fillOpacity={p.type === 'stop' ? 0.18 : 0.12} stroke="none" ifOverflow="visible" />
                );
              })}
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={domain}
              allowDataOverflow={true}
              tickFormatter={(ts) => fmtTick(ts, langApp)}
              stroke="var(--text-tertiary)" fontSize={9.5} tick={{fill:'var(--text-secondary)'}}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis stroke="var(--text-tertiary)" fontSize={9.5} tick={{fill:'var(--text-secondary)'}} width={38} domain={yDomain} allowDataOverflow={true} tickFormatter={(v) => fmtKg(v)} />
            {newYearTicks.map(ts => (
              <ReferenceLine key={ts} x={ts} stroke="var(--text-tertiary)" strokeDasharray="4 4" strokeWidth={1}
                label={{ value: String(new Date(ts).getFullYear()), position: 'top', fill: 'var(--text-tertiary)', fontSize: 9.5 }} />
            ))}
            {/* linea verticale ancorata al punto cliccato: NON si muove durante lo scorrimento/pan,
                appare solo quando si clicca su un punto e resta lì finché non se ne clicca un altro.
                Il Tooltip è controllato esplicitamente da selectedTs (active/payload/label), invece di
                affidarci solo allo stato interno di Recharts, così i due restano sempre sincronizzati:
                stessa fonte di verità per "cosa è selezionato". */}
            {selectedTs != null && (
              <ReferenceLine x={selectedTs} stroke="#5ADECD" strokeWidth={1.5} strokeDasharray="3 3" />
            )}
            <Tooltip
              trigger="click"
              active={selectedTs != null && !!selectedPointPayload}
              payload={selectedPointPayload ? selectedTooltipPayload : []}
              label={selectedTs}
              labelFormatter={(ts) => fmtTick(ts, langApp)}
              formatter={(v, name, props) => {
                const detail = props.payload[name + '__detail'];
                const hasLoad = props.payload[name + '__hasLoad'];
                const valueLabel = hasLoad ? `${fmtWeight(v, weightUnit)} ${weightUnitLabel(weightUnit)}` : `${Math.round(v)} rip.`;
                return [`${valueLabel}${detail ? ' ('+detail+')' : ''}`, translateExercise(name, langExercise)];
              }}
              contentStyle={{ background: 'rgba(10, 14, 22, 0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 11, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
              cursor={false}
            />
            {compareExercises.map(ex => (
              <Line key={ex} type="monotone" dataKey={ex} stroke={colorForExercise(ex)} strokeWidth={2}
                dot={{ r: 2.5, fill: colorForExercise(ex), style: { cursor: 'pointer' } }} activeDot={{ r: 5 }} connectNulls={true}
                isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'center' }}>
        {t(langApp, 'zoomHint')}
      </div>
    </>
  );
}

// Formula di Epley per stimare il massimale (1RM) da un peso sollevato per un certo numero di
// ripetizioni: 1RM = peso * (1 + reps/30). È la formula più diffusa e sufficientemente accurata
// per reps basse-medie (fino a circa 10-12); oltre non ha molto senso stimare un 1RM comunque.
function estimateOneRm(weight, reps) {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return weight; // già un massimale, nessuna stima necessaria
  return weight * (1 + reps / 30);
}

const GYM_GAP_DAYS = 1000 * 60 * 60 * 24;

// Segmenta la cronologia completa (raw: array di [date, exercise, group, weight_kg, reps]) in
// periodi attivi (sessioni distanziate meno di 8 giorni l'una dall'altra) e periodi di stop
// (gap ≥ 8 giorni tra una sessione e la successiva), su tutto lo storico indipendentemente da
// quali esercizi l'utente ha attualmente in confronto sul grafico.
//
// Per ogni periodo attivo, stima la "qualità" del periodo guardando quanti esercizi (tra quelli
// con almeno 2 sessioni con carico in quel periodo) hanno un 1RM stimato più alto alla fine che
// all'inizio del periodo: se la maggioranza migliora, il periodo viene marcato "positivo"
// (probabile buona gestione di alimentazione/sonno/stress intorno agli allenamenti); se la
// maggioranza peggiora o stagna, "negativo"/"neutro". Per ogni periodo di stop, il colore dipende
// dalla sua durata: 8-14 giorni giallo (pausa fisiologica), 15-30 arancione, 30+ rosso (vero
// abbandono prolungato) — così una pausa breve in mezzo a mesi di continuità non pesa come un
// abbandono lungo, restando comunque "elastico" rispetto al contesto senza serva altra logica.
function analyzeTrainingPeriods(raw) {
  if (!raw || raw.length === 0) return [];

  // date uniche allenate, ordinate
  const uniqueDates = [...new Set(raw.map(r => r[0]))].sort();
  if (uniqueDates.length === 0) return [];

  const GAP_THRESHOLD_DAYS = 8;

  // segmenta le date in blocchi consecutivi (gap < soglia tra un giorno allenato e il successivo)
  const activeBlocks = [];
  let currentBlock = [uniqueDates[0]];
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevTs = toTs(uniqueDates[i-1]);
    const curTs = toTs(uniqueDates[i]);
    const gapDays = Math.round((curTs - prevTs) / GYM_GAP_DAYS);
    if (gapDays >= GAP_THRESHOLD_DAYS) {
      activeBlocks.push(currentBlock);
      currentBlock = [uniqueDates[i]];
    } else {
      currentBlock.push(uniqueDates[i]);
    }
  }
  activeBlocks.push(currentBlock);

  // raggruppa le righe raw per esercizio, utile per calcolare il trend 1RM entro ciascun blocco
  const rowsByExercise = {};
  raw.forEach(r => {
    if (!rowsByExercise[r[1]]) rowsByExercise[r[1]] = [];
    rowsByExercise[r[1]].push(r);
  });

  function periodQuality(startDate, endDate) {
    const startTs = toTs(startDate);
    const endTs = toTs(endDate);
    let improved = 0, worsened = 0, flat = 0;
    for (const ex of Object.keys(rowsByExercise)) {
      const rowsInPeriod = rowsByExercise[ex].filter(r => {
        const ts = toTs(r[0]);
        return ts >= startTs && ts <= endTs && r[3] > 0; // solo serie con carico: senza peso il confronto 1RM non ha senso
      });
      if (rowsInPeriod.length < 2) continue; // serve almeno un "prima" e un "dopo" per parlare di trend
      // stima 1RM per ogni sessione (il massimo tra le serie di quel giorno), poi confronta la media
      // del primo terzo delle sessioni del periodo con la media dell'ultimo terzo: più robusto del
      // semplice primo-vs-ultimo punto, che sarebbe troppo sensibile a un singolo giorno anomalo.
      const byDate = {};
      rowsInPeriod.forEach(r => {
        const est = estimateOneRm(r[3], r[4]);
        if (est == null) return;
        if (!byDate[r[0]] || est > byDate[r[0]]) byDate[r[0]] = est;
      });
      const sessions = Object.keys(byDate).sort().map(d => byDate[d]);
      if (sessions.length < 2) continue;
      const third = Math.max(1, Math.floor(sessions.length / 3));
      const early = sessions.slice(0, third);
      const late = sessions.slice(-third);
      const earlyAvg = early.reduce((s,v) => s+v, 0) / early.length;
      const lateAvg = late.reduce((s,v) => s+v, 0) / late.length;
      const pctChange = (lateAvg - earlyAvg) / earlyAvg;
      // soglia del 2% per considerare un cambiamento reale e non rumore di misurazione/arrotondamento
      if (pctChange > 0.02) improved++;
      else if (pctChange < -0.02) worsened++;
      else flat++;
    }
    const total = improved + worsened + flat;
    if (total === 0) return { quality: 'unknown', improved, worsened, flat, total };
    const improvedRatio = improved / total;
    const worsenedRatio = worsened / total;
    let quality = 'neutral';
    if (improvedRatio >= 0.5 && improvedRatio > worsenedRatio) quality = 'positive';
    else if (worsenedRatio >= 0.5 && worsenedRatio > improvedRatio) quality = 'negative';
    return { quality, improved, worsened, flat, total };
  }

  function stopColorFor(gapDays) {
    if (gapDays >= 31) return 'red';
    if (gapDays >= 15) return 'orange';
    return 'yellow'; // 8-14 giorni: pausa breve/fisiologica
  }

  const periods = [];
  for (let i = 0; i < activeBlocks.length; i++) {
    const block = activeBlocks[i];
    const startDate = block[0];
    const endDate = block[block.length - 1];
    const q = periodQuality(startDate, endDate);
    periods.push({
      type: 'active',
      startDate, endDate,
      startTs: toTs(startDate), endTs: toTs(endDate),
      sessionsCount: block.length,
      ...q,
    });
    // se non è l'ultimo blocco, aggiungi il periodo di stop fino al blocco successivo
    if (i < activeBlocks.length - 1) {
      const nextStart = activeBlocks[i+1][0];
      const gapDays = Math.round((toTs(nextStart) - toTs(endDate)) / GYM_GAP_DAYS);
      periods.push({
        type: 'stop',
        startDate: endDate, endDate: nextStart,
        startTs: toTs(endDate), endTs: toTs(nextStart),
        gapDays,
        stopColor: stopColorFor(gapDays),
      });
    }
  }
  return periods;
}

// Calcolatore 1RM libero: non dipende dal dataset caricato né da alcun esercizio specifico,
// semplicemente peso sollevato + ripetizioni fatte (in kg o lb, indipendente dall'unità di
// preferenza generale dell'app) → stima del massimale, più una tabella di riferimento %1RM.
function OneRmCalculator({ langApp, defaultUnit }) {
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [unit, setUnit] = useState(defaultUnit || 'kg');

  const weight = parseFloat(weightInput.replace(',', '.'));
  const reps = parseInt(repsInput, 10);
  const oneRm = estimateOneRm(weight, reps);

  // tabella di riferimento: percentuali di 1RM più comunemente usate in programmazione della forza
  const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        {t(langApp, 'oneRmCalc')}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 14, lineHeight: 1.4 }}>
        {t(langApp, 'oneRmCalcHint')}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {t(langApp, 'oneRmWeightLabel')}
          </label>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onWheel={e => e.currentTarget.blur()} placeholder="0" style={{
              width: '100%', padding: '9px 10px', borderRadius: 8,
              background: 'var(--bg-app)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
              fontSize: 14, fontFamily: '"Inter", sans-serif',
            }} />
        </div>
        <div style={{ width: 84 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {t(langApp, 'weightUnit')}
          </label>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-app)', padding: 3, borderRadius: 8 }}>
            {['kg', 'lb'].map(u => (
              <button key={u} onClick={() => setUnit(u)} type="button" style={{
                flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: unit === u ? '#5ADECD' : 'transparent',
                color: unit === u ? 'var(--on-accent)' : 'var(--text-secondary)',
                fontSize: 11, fontWeight: 600, fontFamily: '"Inter", sans-serif',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}>{u.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ width: 84 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            {t(langApp, 'oneRmRepsLabel')}
          </label>
          <input type="number" inputMode="numeric" min="1" max="20" value={repsInput}
            onChange={e => setRepsInput(e.target.value)}
            onWheel={e => e.currentTarget.blur()} placeholder="0" style={{
              width: '100%', padding: '9px 10px', borderRadius: 8,
              background: 'var(--bg-app)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)',
              fontSize: 14, fontFamily: '"Inter", sans-serif',
            }} />
        </div>
      </div>

      {reps > 12 && (
        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 10 }}>
          {t(langApp, 'oneRmHighRepsWarning')}
        </div>
      )}

      {oneRm != null && (
        <>
          <div style={{
            background: 'var(--bg-card-active)', borderRadius: 10, padding: '14px 12px',
            textAlign: 'center', marginBottom: 12,
          }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              {t(langApp, 'oneRmEstimated')}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#5ADECD', fontFamily: '"Space Grotesk", sans-serif' }}>
              {fmtKg(oneRm)} {unit}
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {t(langApp, 'oneRmPercentTable')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 }}>
            {PERCENTAGES.map(pct => (
              <div key={pct} style={{
                background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 4px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{pct}%</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtKg(oneRm * pct / 100)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Convertitore libero kg <-> lb: campo unico bidirezionale, digitando in uno dei due l'altro si
// aggiorna automaticamente. Fattore di conversione condiviso con il resto dell'app (KG_TO_LB,
// già usato per il peso corporeo), così i risultati restano coerenti in tutta l'app.
function UnitConverterPanel({ langApp, defaultUnit }) {
  const [kgInput, setKgInput] = useState('');
  const [lbInput, setLbInput] = useState('');
  // quale campo l'utente ha digitato per ultimo, per decidere chi "guida" la conversione quando
  // entrambi i valori sono presenti (evita che i due input si rincorrano a vicenda).
  const [lastEdited, setLastEdited] = useState(defaultUnit === 'lb' ? 'lb' : 'kg');

  function handleKgChange(v) {
    setKgInput(v);
    setLastEdited('kg');
    const n = parseFloat(v.replace(',', '.'));
    setLbInput(!isNaN(n) ? fmtKg(n * KG_TO_LB) : '');
  }
  function handleLbChange(v) {
    setLbInput(v);
    setLastEdited('lb');
    const n = parseFloat(v.replace(',', '.'));
    setKgInput(!isNaN(n) ? fmtKg(n / KG_TO_LB) : '');
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
        {t(langApp, 'unitConverter')}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Kg</label>
          <input type="number" inputMode="decimal" value={kgInput} onChange={e => handleKgChange(e.target.value)}
            onWheel={e => e.currentTarget.blur()}
            placeholder="0" style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-app)', border: `1px solid ${lastEdited === 'kg' ? '#5ADECD' : 'var(--border-strong)'}`,
              color: 'var(--text-primary)', fontSize: 16, fontFamily: '"Inter", sans-serif',
            }} />
        </div>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 18, paddingTop: 14 }}>&#8646;</div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Lb</label>
          <input type="number" inputMode="decimal" value={lbInput} onChange={e => handleLbChange(e.target.value)}
            onWheel={e => e.currentTarget.blur()}
            placeholder="0" style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-app)', border: `1px solid ${lastEdited === 'lb' ? '#5ADECD' : 'var(--border-strong)'}`,
              color: 'var(--text-primary)', fontSize: 16, fontFamily: '"Inter", sans-serif',
            }} />
        </div>
      </div>
    </div>
  );
}


function WorkoutBodyExplorer({ initialRaw, onDataChange, onClearData, langApp, langExercise, weightUnit, onChangeLangApp, onChangeLangExercise, onChangeWeightUnit }) {
  const [raw, setRawState] = useState(initialRaw);

  // ogni volta che i dati grezzi cambiano (nuovo export caricato), sincronizza col backend e col parent
  function setRaw(updater) {
    setRawState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onDataChange(next);
      return next;
    });
  }

  const [hiddenExercises, setHiddenExercises] = useState(new Set());
  // soglia minima esecuzioni per mostrare un esercizio: di default 1 (mostra tutto) al primissimo accesso,
  // ma se l'utente la modifica resta salvata per sempre (persistita in localStorage) finché non la ritocca
  const [minCount, setMinCountState] = useState(() => {
    const saved = localStorage_get(MIN_COUNT_KEY);
    const parsed = saved !== null ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_COUNT;
  });
  function setMinCount(value) {
    setMinCountState(value);
    localStorage_set(MIN_COUNT_KEY, String(value));
  }
  // testo "grezzo" del campo numerico della soglia minima: separato da minCount così l'utente può
  // cancellare temporaneamente la cifra corrente (campo vuoto) per scriverne una nuova, senza che il
  // valore precedente si "riattacchi" a ogni tasto di backspace. Si risincronizza con minCount quando
  // questo cambia da altrove (es. lo slider), e viene riconciliato al blur (vedi onBlur sotto).
  const [minCountText, setMinCountText] = useState(String(minCount));
  useEffect(() => { setMinCountText(String(minCount)); }, [minCount]);
  // vista del grafico: null = tutto lo storico (auto-fit); altrimenti [startTs, endTs] in millisecondi.
  // Sostituisce il vecchio Brush a indici discreti con un pan/zoom continuo in stile trading.
  const [viewDomain, setViewDomain] = useState(null);
  const [selected, setSelected] = useState('Petto');
  const [view, setView] = useState('front');
  const [compareExercises, setCompareExercises] = useState([]); // array di nomi esercizio in confronto
  const [showManage, setShowManage] = useState(false);
  // filtro "recentezza" nella sezione Gestisci: null = nessun filtro (mostra tutti gli esercizi
  // indipendentemente da quando sono stati svolti l'ultima volta), altrimenti un numero di giorni
  // (mostra solo gli esercizi con almeno una sessione negli ultimi N giorni).
  const [manageRecencyDays, setManageRecencyDays] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompareAdd, setShowCompareAdd] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  // calcolatore 1RM libero e convertitore kg/lb: strumenti standalone, non legati al dataset caricato.
  const [showOneRmCalc, setShowOneRmCalc] = useState(false);
  const [showUnitConverter, setShowUnitConverter] = useState(false);
  // app di provenienza per l'aggiornamento export: fissa (nessun selettore visibile all'utente)
  const [updateImportApp] = useState('liftoff');
  const [updateMappingState, setUpdateMappingState] = useState(null); // { headers, rows } quando serve mappatura manuale

  function closeAllPanels() {
    setShowManage(false); setShowSettings(false);
    setShowOneRmCalc(false); setShowUnitConverter(false);
  }

  // conteggio occorrenze per esercizio sul dataset grezzo corrente
  const exerciseCounts = useMemo(() => {
    const c = {};
    raw.forEach(r => { c[r[1]] = (c[r[1]]||0) + 1; });
    return c;
  }, [raw]);

  // data dell'ultima sessione per ciascun esercizio (timestamp più recente tra le righe grezze),
  // usata dal filtro "recentezza" nella sezione Gestisci per nascondere esercizi non più svolti
  // di recente senza doverli disattivare manualmente uno per uno.
  const exerciseLastPerformedTs = useMemo(() => {
    const m = {};
    raw.forEach(r => {
      const ts = new Date(r[0]).getTime();
      if (!m[r[1]] || ts > m[r[1]]) m[r[1]] = ts;
    });
    return m;
  }, [raw]);

  const maxExerciseCount = useMemo(() => {
    const counts = Object.values(exerciseCounts);
    return counts.length ? Math.max(...counts) : 1;
  }, [exerciseCounts]);

  // dataset dopo applicazione soglia minima, nascondimenti manuali e filtro di recentezza: mentre
  // un bottone tipo "30gg" in Gestisci è attivo, gli esercizi non svolti in quella finestra vengono
  // nascosti per davvero da tutta l'app (grafico, confronto, gruppi disponibili), non solo dalla
  // lista mostrata nel pannello Gestisci — esattamente come i nascondimenti manuali/soglia minima.
  const filteredRaw = useMemo(() => {
    return raw.filter(r => {
      const ex = r[1];
      if (hiddenExercises.has(ex)) return false;
      if ((exerciseCounts[ex]||0) < minCount) return false;
      if (manageRecencyDays != null) {
        const lastTs = exerciseLastPerformedTs[ex];
        const daysSinceLast = lastTs != null ? Math.floor((Date.now() - lastTs) / (1000*60*60*24)) : null;
        if (daysSinceLast == null || daysSinceLast > manageRecencyDays) return false;
      }
      return true;
    });
  }, [raw, hiddenExercises, minCount, exerciseCounts, manageRecencyDays, exerciseLastPerformedTs]);

  const availableGroups = useMemo(() => new Set(filteredRaw.map(r => r[2])), [filteredRaw]);
  const GROUPS = useMemo(() => GROUP_ORDER.filter(g => availableGroups.has(g)), [availableGroups]);

  useEffect(() => {
    if (GROUPS.length && !GROUPS.includes(selected)) setSelected(GROUPS[0]);
  }, [GROUPS]);

  // se un esercizio attualmente in confronto sul grafico esce da filteredRaw (perché nascosto
  // manualmente, sotto soglia minima, o ora fuori dalla finestra di recentezza selezionata in
  // Gestisci), toglierlo dal confronto: altrimenti resterebbe una linea "fantasma" senza dati
  // finché l'utente non lo deseleziona manualmente.
  const filteredRawExerciseSet = useMemo(() => new Set(filteredRaw.map(r => r[1])), [filteredRaw]);
  useEffect(() => {
    setCompareExercises(prev => {
      const next = prev.filter(ex => filteredRawExerciseSet.has(ex));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredRawExerciseSet]);

  const ALL_DATES = useMemo(() => raw.map(r => r[0]), [raw]);
  const FIRST_TS = useMemo(() => {
    if (!ALL_DATES.length) return Date.now();
    return new Date(ALL_DATES.reduce((a,b) => a < b ? a : b)).getTime();
  }, [ALL_DATES]);
  const TODAY_TS = useMemo(() => new Date(new Date().toISOString().slice(0,10)).getTime(), []);

  // ogni 1 gennaio compreso tra il primo workout e oggi, per le linee verticali di riferimento
  const newYearTicks = useMemo(() => {
    const startYear = new Date(FIRST_TS).getFullYear();
    const endYear = new Date(TODAY_TS).getFullYear();
    const ticks = [];
    for (let y = startYear + 1; y <= endYear; y++) {
      const ts = new Date(`${y}-01-01`).getTime();
      if (ts > FIRST_TS && ts < TODAY_TS) ticks.push(ts);
    }
    return ticks;
  }, [FIRST_TS, TODAY_TS]);

  const groupData = useMemo(() => filteredRaw.filter(r => r[2] === selected), [filteredRaw, selected]);

  const exercisesInGroup = useMemo(() => {
    const counts = {};
    groupData.forEach(r => { counts[r[1]] = (counts[r[1]]||0) + 1; });
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
  }, [groupData]);

  // lista completa esercizi disponibili (tutti i gruppi), per il pannello di confronto cross-gruppo
  const allAvailableExercises = useMemo(() => {
    const map = {};
    const counts = {};
    filteredRaw.forEach(r => {
      map[r[1]] = r[2];
      counts[r[1]] = (counts[r[1]]||0) + 1;
    });
    return Object.entries(map)
      .map(([name, group]) => ({ name, group, count: counts[name] }))
      .sort((a,b) => a.group.localeCompare(b.group) || counts[b.name] - counts[a.name]);
  }, [filteredRaw]);

  function toggleCompareExercise(name) {
    setCompareExercises(prev => {
      if (prev.includes(name)) return prev.filter(e => e !== name);
      return [...prev, name];
    });
  }

  const COMPARE_COLORS = ['#5ADECD', '#4FA8D8', '#8B7FE8', '#5AC9DE', '#C77FE0', '#7F8FE8', '#5AE0A8', '#5AB8E0'];
  const colorForExercise = (name) => {
    const idx = compareExercises.indexOf(name);
    return COMPARE_COLORS[idx % COMPARE_COLORS.length] || 'var(--text-secondary)';
  };

  // per ogni esercizio in confronto: righe grezze + serie per sessione.
  // Un esercizio è "a corpo libero" se la maggior parte delle serie storiche ha peso 0 — serve solo per scegliere
  // come ETICHETTARE il grafico (rip. vs kg). La metrica per singola sessione invece guarda quella sessione:
  // se quel giorno c'è stata zavorra (peso > 0), la forza è il peso aggiunto stimato a 1 rep (Epley);
  // se quel giorno il peso è 0 (corpo libero puro), la forza sono le reps massime.
  // Così un Dips zavorrato un giorno e libero un altro giorno viene rappresentato correttamente in entrambi i casi,
  // invece di essere bloccato su una sola convenzione per tutto lo storico.
  const perExerciseSeries = useMemo(() => {
    return compareExercises.map(name => {
      const rows = filteredRaw.filter(r => r[1] === name);
      const isBodyweight = rows.length > 0 && rows.filter(r => r[3] === 0).length / rows.length > 0.8;
      const bySession = {};
      rows.forEach(([date, ex, grp, weight, reps]) => {
        const hasLoad = weight > 0;
        const est1RM = reps <= 1 ? weight : weight * (1 + reps / 30);
        // metrica comparabile all'interno della stessa sessione: se c'è carico usiamo il peso stimato (kg),
        // altrimenti le reps pure. Le due scale non sono equivalenti tra loro, ma per scegliere la "serie top"
        // del giorno confrontiamo solo cose omogenee: diamo priorità a una sessione con carico su una senza.
        const metric = hasLoad ? est1RM : reps;
        const key = date;
        if (!bySession[key]) bySession[key] = { date, ts: toTs(date), strength: 0, topWeight: 0, topReps: 0, hasLoad: false };
        const better = hasLoad && !bySession[key].hasLoad
          ? true // una serie con carico batte sempre una senza, quel giorno
          : (hasLoad === bySession[key].hasLoad && metric > bySession[key].strength);
        if (better) {
          bySession[key].strength = metric;
          bySession[key].topWeight = weight;
          bySession[key].topReps = reps;
          bySession[key].hasLoad = hasLoad;
        }
      });
      const points = Object.values(bySession).sort((a,b) => a.ts - b.ts);
      return { name, rows, points, color: colorForExercise(name), isBodyweight };
    });
  }, [compareExercises, filteredRaw]);

  // merge di tutte le serie su un unico asse temporale per il grafico multi-linea
  const mergedChartData = useMemo(() => {
    const byTs = {};
    perExerciseSeries.forEach(series => {
      series.points.forEach(p => {
        if (!byTs[p.ts]) byTs[p.ts] = { ts: p.ts, date: p.date };
        byTs[p.ts][series.name] = p.strength;
        byTs[p.ts][series.name + '__detail'] = p.hasLoad
          ? `${fmtWeight(p.topWeight, weightUnit)}${weightUnitLabel(weightUnit)} × ${p.topReps}`
          : `${p.topReps} rip. a corpo libero`;
        byTs[p.ts][series.name + '__hasLoad'] = p.hasLoad;
      });
    });
    return Object.values(byTs).sort((a,b) => a.ts - b.ts);
  }, [perExerciseSeries, weightUnit]);

  const statsByExercise = useMemo(() => {
    const out = {};
    perExerciseSeries.forEach(series => {
      if (series.points.length === 0) { out[series.name] = null; return; }
      const loadedPoints = series.points.filter(p => p.hasLoad);
      const bodyweightPoints = series.points.filter(p => !p.hasLoad);
      const hasMixed = loadedPoints.length > 0 && bodyweightPoints.length > 0;
      // se esistono sessioni con carico, le statistiche "di forza" si basano su quelle (più informative);
      // altrimenti si basano sulle reps a corpo libero.
      const relevantPoints = loadedPoints.length > 0 ? loadedPoints : bodyweightPoints;
      const maxStrength = Math.max(...relevantPoints.map(p => p.strength));
      const first = series.points[0].strength;
      const last = series.points[series.points.length-1].strength;
      const lastHasLoad = series.points[series.points.length-1].hasLoad;
      out[series.name] = {
        maxStrength, first, last, lastHasLoad,
        sessions: series.points.length, totalSets: series.rows.length,
        isBodyweight: series.isBodyweight,
        statsAreLoaded: loadedPoints.length > 0,
        hasMixed,
      };
    });
    return out;
  }, [perExerciseSeries]);

  const groupStats = useMemo(() => {
    const totalSets = groupData.length;
    const sessions = new Set(groupData.map(r => r[0])).size;
    const totalVolume = Math.round(groupData.reduce((s,r) => s + r[3]*r[4], 0));
    return { totalSets, sessions, totalVolume };
  }, [groupData]);

  // tutti gli esercizi mai visti nel dataset grezzo, con conteggio e stato visibilita
  const allExercisesList = useMemo(() => {
    const now = Date.now();
    const list = Object.keys(exerciseCounts).map(ex => {
      const lastTs = exerciseLastPerformedTs[ex];
      const daysSinceLast = lastTs != null ? Math.floor((now - lastTs) / (1000*60*60*24)) : null;
      return {
        name: ex,
        count: exerciseCounts[ex],
        group: guessGroup(ex),
        hidden: hiddenExercises.has(ex) || exerciseCounts[ex] < minCount,
        manuallyHidden: hiddenExercises.has(ex),
        belowThreshold: exerciseCounts[ex] < minCount,
        daysSinceLast,
      };
    });
    // il filtro recentezza agisce solo sulla LISTA mostrata in Gestisci (non nasconde l'esercizio
    // dal resto dell'app): è un modo per trovare più in fretta gli esercizi svolti di recente in
    // mezzo a una lista lunga, non un'alternativa al nascondimento manuale/soglia minima già esistenti.
    const filtered = manageRecencyDays == null
      ? list
      : list.filter(ex => ex.daysSinceLast != null && ex.daysSinceLast <= manageRecencyDays);
    return filtered.sort((a,b) => b.count - a.count);
  }, [exerciseCounts, hiddenExercises, minCount, exerciseLastPerformedTs, manageRecencyDays]);

  function toggleExercise(name) {
    setHiddenExercises(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  // unisce le nuove righe convertite nel dataset esistente, deduplicando su data+esercizio+peso+reps.
  // Il calcolo del merge resta fuori dall'updater function passata a setRaw: chiamare un altro
  // setState (setUploadMsg) da dentro l'updater di setRaw è un side-effect improprio — con
  // React.StrictMode l'updater viene invocato due volte per verificarne la purezza, e su dataset
  // grandi (migliaia di righe, decine di esercizi) questo poteva produrre un risultato incoerente
  // silenzioso: il messaggio non compariva e i dati non risultavano aggiornati, senza errori visibili.
  function mergeNewRows(newRows) {
    if (newRows.length === 0) {
      setUploadMsg({ ok: false, text: t(langApp, 'importNoValidRows') });
      return;
    }
    const seen = new Set(raw.map(r => r.join('|')));
    const merged = [...raw];
    let added = 0;
    for (const row of newRows) {
      const key = row.join('|');
      if (!seen.has(key)) { merged.push(row); seen.add(key); added++; }
    }
    setRaw(merged);
    setUploadMsg({ ok: true, text: langApp === 'en'
      ? `Updated: ${added} new sets imported (out of ${newRows.length} read from the file).`
      : `Aggiornato: ${added} nuove serie importate (su ${newRows.length} lette dal file).` });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg(null);
    // "Altro formato CSV": prima leggiamo solo l'header (preview:1) per popolare il selettore di mappatura,
    // poi applichiamo la mappatura scelta dall'utente a tutto il file in un secondo passaggio.
    if (updateImportApp === 'other') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, preview: 1,
        complete: (previewResult) => {
          const headers = previewResult.meta && previewResult.meta.fields ? previewResult.meta.fields : [];
          if (!headers.length) {
            setUploadMsg({ ok: false, text: t(langApp, 'importParseError') });
            return;
          }
          setUpdateMappingState({ headers, file });
        },
        error: (err) => {
          setUploadMsg({ ok: false, text: `${t(langApp, 'importParseError')}: ${err.message}` });
        }
      });
      e.target.value = '';
      return;
    }
    Papa.parse(file, {
      ...papaOptionsForImportApp(updateImportApp),
      complete: (results) => {
        try {
          const { rows: newRows } = rowsForImportApp(updateImportApp, results.data);
          mergeNewRows(newRows);
        } catch (err) {
          setUploadMsg({ ok: false, text: err.message || t(langApp, 'importParseError') });
        }
      },
      error: (err) => {
        setUploadMsg({ ok: false, text: `${t(langApp, 'importParseError')}: ${err.message}` });
      }
    });
    e.target.value = '';
  }

  // applica la mappatura manuale scelta dall'utente ("Altro formato CSV") a tutto il file
  function handleConfirmMapping(mapping, defaultWeightUnit) {
    const file = updateMappingState.file;
    setUpdateMappingState(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        try {
          const newRows = mappedRowsToRaw(results.data, mapping, defaultWeightUnit);
          mergeNewRows(newRows);
        } catch (err) {
          setUploadMsg({ ok: false, text: err.message || t(langApp, 'importParseError') });
        }
      },
      error: (err) => {
        setUploadMsg({ ok: false, text: `${t(langApp, 'importParseError')}: ${err.message}` });
      }
    });
  }

  return (
    <div className="wbe-root" style={{
      minHeight: '100vh',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontFamily: '"Inter", system-ui, sans-serif',
      paddingTop: 'max(16px, env(safe-area-inset-top))',
      paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(12px, env(safe-area-inset-left))',
      paddingRight: 'max(12px, env(safe-area-inset-right))',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
        .group-scroll { scroll-snap-type: x proximity; }
        input[type="file"] { display: none; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .panel-anim { animation: fadeSlideIn 0.2s ease; }
        html { scroll-behavior: smooth; }

        /* Schermi molto piccoli (iPhone SE e simili, 320-360px): il padding laterale di 12px del
           contenitore esterno lascia poco margine, riduciamo leggermente font/spaziature dei blocchi
           più affollati (barra azioni, titoli) senza toccare i valori px usati altrove per il resto. */
        @media (max-width: 360px) {
          .wbe-container { padding-left: 2px; padding-right: 2px; }
          .wbe-actionbar { gap: 4px !important; }
          .wbe-actionbar button, .wbe-actionbar label { font-size: 9.5px !important; padding-left: 2px !important; padding-right: 2px !important; }
        }

        /* Tablet/desktop: il layout resta mobile-first ma può respirare un po' di più invece di
           restare bloccato a 480px con largo spazio vuoto scuro ai lati. */
        @media (min-width: 768px) {
          .wbe-container { max-width: 600px !important; }
        }

        /* Landscape su telefono (schermo molto corto in altezza): il grafico e la BodyMap sono gli
           elementi verticalmente più ingombranti, li comprimiamo per lasciare spazio al resto senza
           forzare uno scroll eccessivo per raggiungere tabelle/legenda sottostanti. */
        @media (orientation: landscape) and (max-height: 500px) {
          .trading-chart-container { height: clamp(160px, 40vh, 240px) !important; }
          .bodymap-svg { width: 130px !important; height: 208px !important; }
        }
      `}</style>

      {/* rotellina impostazioni: fissa in alto a destra, sopra a tutto il resto (z-index alto),
          così resta sempre raggiungibile indipendentemente da scroll o pannelli aperti. */}
      <button onClick={() => { const v = !showSettings; closeAllPanels(); setShowSettings(v); }} aria-label={t(langApp, 'settings')} style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top))', right: 'max(14px, env(safe-area-inset-right))',
        zIndex: 1000,
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20,
        background: showSettings ? '#5ADECD' : 'var(--bg-card)',
        border: '1px solid var(--border-strong)', color: showSettings ? 'var(--on-accent)' : 'var(--text-primary-dim)',
        fontSize: 17, cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}>
        &#9881;
      </button>

      <div className="wbe-container" style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <PhyzxLogo size={20} />
        </div>

        {/* Barra azioni: griglia a 4 colonne uguali così i 4 tasti restano sempre su un'unica riga
            anche sugli schermi più stretti (iPhone SE incluso), invece di andare a capo come con
            un flex-wrap pensato più per desktop. Il testo dentro ogni tasto può andare su due righe
            se serve, ma la riga di tasti nel suo insieme resta sempre una sola. */}
        <div className="wbe-actionbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
          <label style={{
            textAlign: 'center', padding: '8px 4px', borderRadius: 10, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-primary-dim)',
            fontSize: 10.5, lineHeight: 1.15, fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 500,
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}>
            <span>&#8593; {t(langApp, 'updateExport')}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
          </label>
          <button onClick={() => { const v = !showManage; closeAllPanels(); setShowManage(v); }} style={{
            padding: '8px 4px', borderRadius: 10, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showManage ? '#5ADECD' : 'var(--bg-card)',
            border: '1px solid var(--border-strong)', color: showManage ? 'var(--on-accent)' : 'var(--text-primary-dim)',
            fontSize: 10.5, lineHeight: 1.15, fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 500,
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}>
            {t(langApp, 'manage')}
          </button>
          <button onClick={() => { const v = !showOneRmCalc; closeAllPanels(); setShowOneRmCalc(v); }} style={{
            padding: '8px 4px', borderRadius: 10, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showOneRmCalc ? '#5ADECD' : 'var(--bg-card)',
            border: '1px solid var(--border-strong)', color: showOneRmCalc ? 'var(--on-accent)' : 'var(--text-primary-dim)',
            fontSize: 10.5, lineHeight: 1.15, fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 500,
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}>
            {t(langApp, 'oneRmCalc')}
          </button>
          <button onClick={() => { const v = !showUnitConverter; closeAllPanels(); setShowUnitConverter(v); }} style={{
            padding: '8px 4px', borderRadius: 10, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showUnitConverter ? '#5ADECD' : 'var(--bg-card)',
            border: '1px solid var(--border-strong)', color: showUnitConverter ? 'var(--on-accent)' : 'var(--text-primary-dim)',
            fontSize: 10.5, lineHeight: 1.15, fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 500,
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}>
            {t(langApp, 'unitConverter')}
          </button>
        </div>

        {updateMappingState && (
          <ImportMappingModal
            headers={updateMappingState.headers}
            langApp={langApp}
            defaultWeightUnit={weightUnit}
            onCancel={() => setUpdateMappingState(null)}
            onConfirm={handleConfirmMapping}
          />
        )}

        {showOneRmCalc && (
          <div key="onerm-panel" className="panel-anim"><OneRmCalculator langApp={langApp} defaultUnit={weightUnit} /></div>
        )}

        {showUnitConverter && (
          <div key="unitconverter-panel" className="panel-anim"><UnitConverterPanel langApp={langApp} defaultUnit={weightUnit} /></div>
        )}

        {uploadMsg && (
          <div className="panel-anim" style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 12,
            background: uploadMsg.ok ? 'var(--bg-success)' : 'var(--bg-error)',
            color: uploadMsg.ok ? '#8fc98f' : '#e08a8a',
            border: `1px solid ${uploadMsg.ok ? 'var(--border-success)' : 'var(--border-error)'}`,
          }}>
            {uploadMsg.text}
          </div>
        )}

        {showSettings && (
          <div key="settings-panel" className="panel-anim" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              {t(langApp, 'settings')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary-dim)' }}>{t(langApp, 'appLanguage')}</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-app)', padding: 3, borderRadius: 8 }}>
                {['it', 'en'].map(l => (
                  <button key={l} onClick={() => onChangeLangApp(l)} style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: langApp === l ? '#5ADECD' : 'transparent',
                    color: langApp === l ? 'var(--on-accent)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, fontFamily: '"Inter", sans-serif',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary-dim)' }}>{t(langApp, 'exerciseLanguage')}</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-app)', padding: 3, borderRadius: 8 }}>
                {['it', 'en'].map(l => (
                  <button key={l} onClick={() => onChangeLangExercise(l)} style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: langExercise === l ? '#5ADECD' : 'transparent',
                    color: langExercise === l ? 'var(--on-accent)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, fontFamily: '"Inter", sans-serif',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary-dim)' }}>{t(langApp, 'weightUnit')}</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-app)', padding: 3, borderRadius: 8 }}>
                {['kg', 'lb'].map(u => (
                  <button key={u} onClick={() => onChangeWeightUnit(u)} style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: weightUnit === u ? '#5ADECD' : 'transparent',
                    color: weightUnit === u ? 'var(--on-accent)' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, fontFamily: '"Inter", sans-serif',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}>{u.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {/* Nessun account: i dati vivono solo su questo dispositivo (localStorage). L'unica
                azione distruttiva possibile è cancellarli per ripartire da un nuovo import. */}
            <div style={{ paddingTop: 14, marginTop: 4, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => {
                if (window.confirm(t(langApp, 'clearDataConfirm')) && window.confirm(t(langApp, 'clearDataConfirmFinal'))) {
                  onClearData();
                }
              }} style={{
                width: '100%', padding: '9px 14px', borderRadius: 10, textAlign: 'center',
                background: 'var(--bg-error)', border: '1px solid var(--border-error)', color: '#e08a8a',
                fontSize: 12, fontFamily: '"Inter", sans-serif', cursor: 'pointer', fontWeight: 500,
              }}>
                {t(langApp, 'clearData')}
              </button>
            </div>
          </div>
        )}

        {showManage && (
          <div key="manage-panel" className="panel-anim" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary-dim)', marginBottom: 10 }}>
              {t(langApp, 'minSetsCount')}: <strong style={{color:'#5ADECD'}}>{minCount}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <input type="range" min="1" max={maxExerciseCount} value={minCount}
                onChange={e => setMinCount(parseInt(e.target.value))}
                style={{ flex: 1 }} />
              <input type="number" min="1" max={maxExerciseCount} value={minCountText}
                onChange={e => {
                  // valore grezzo digitato: consentiamo esplicitamente la stringa vuota (l'utente sta
                  // cancellando la cifra corrente per scriverne una nuova), senza forzare subito un
                  // fallback numerico che "riattaccherebbe" il vecchio valore a ogni backspace.
                  const raw = e.target.value;
                  setMinCountText(raw);
                  const v = parseInt(raw, 10);
                  if (raw !== '' && !isNaN(v)) setMinCount(Math.max(1, Math.min(maxExerciseCount, v)));
                }}
                onBlur={() => {
                  // se il campo resta vuoto (o con un valore non valido) quando l'utente tocca altrove,
                  // il comportamento più prevedibile è tornare all'ultimo valore valido invece di
                  // azzerare la soglia o lasciare il campo vuoto.
                  const v = parseInt(minCountText, 10);
                  if (minCountText === '' || isNaN(v)) {
                    setMinCountText(String(minCount));
                  } else {
                    const clamped = Math.max(1, Math.min(maxExerciseCount, v));
                    setMinCount(clamped);
                    setMinCountText(String(clamped));
                  }
                }}
                onWheel={e => e.currentTarget.blur()}
                style={{
                  width: 56, padding: '5px 6px', borderRadius: 6, textAlign: 'center',
                  background: 'var(--bg-app)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 12,
                }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              {t(langApp, 'hiddenAuto')}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-primary-dim)', marginBottom: 8 }}>
              {t(langApp, 'recencyFilter')}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { key: 'all', days: null, label: 'recencyAll' },
                { key: '30', days: 30, label: 'recency30' },
                { key: '90', days: 90, label: 'recency90' },
                { key: '180', days: 180, label: 'recency180' },
                { key: '365', days: 365, label: 'recency365' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setManageRecencyDays(opt.days)} style={{
                  padding: '5px 11px', borderRadius: 8, border: '1px solid var(--border-strong)',
                  background: manageRecencyDays === opt.days ? '#5ADECD' : 'var(--bg-app)',
                  color: manageRecencyDays === opt.days ? 'var(--on-accent)' : 'var(--text-secondary)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}>
                  {t(langApp, opt.label)}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              {t(langApp, 'allExercises')} ({allExercisesList.length}) &mdash; {t(langApp, 'tapToToggle')}
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', scrollBehavior: 'smooth', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {allExercisesList.map(ex => (
                <button key={ex.name} onClick={() => toggleExercise(ex.name)}
                  disabled={ex.belowThreshold && !ex.manuallyHidden}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
                    background: ex.hidden ? 'var(--bg-app)' : 'var(--bg-card-active)',
                    color: ex.hidden ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    fontSize: 12, fontFamily: '"Inter", sans-serif',
                    cursor: (ex.belowThreshold && !ex.manuallyHidden) ? 'default' : 'pointer',
                    opacity: (ex.belowThreshold && !ex.manuallyHidden) ? 0.6 : 1,
                    textDecoration: ex.hidden ? 'line-through' : 'none',
                    transition: 'background 0.15s ease, color 0.15s ease, opacity 0.15s ease',
                  }}>
                  <span>{translateExercise(ex.name, langExercise)} <span style={{color:'var(--text-tertiary)', fontSize:10}}>&middot; {ex.group}</span></span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{ex.count}&times;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 14 }}>
          {t(langApp, 'tapMuscleGroup')}
        </div>

        {/* corpo + gruppi */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 12px', border: '1px solid var(--border)', marginBottom: 14 }}>
          <BodyMap selected={selected} onSelect={setSelected} view={view} setView={setView} availableGroups={availableGroups} />
        </div>

        <div className="group-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 18, WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
          {GROUPS.map(g => (
            <button key={g} onClick={() => setSelected(g)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: '7px 12px', borderRadius: 20, border: `1px solid ${selected===g ? GROUP_COLOR[g] : 'var(--border-strong)'}`,
                background: selected === g ? 'var(--bg-card-active)' : 'transparent',
                fontFamily: '"Inter", sans-serif', fontSize: 12.5,
                color: selected === g ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: selected === g ? 600 : 400,
                whiteSpace: 'nowrap', cursor: 'pointer',
                transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: GROUP_COLOR[g], flexShrink: 0 }} />
              {translateGroup(g, langApp)}
            </button>
          ))}
        </div>

        <div>
          <div style={{ marginBottom: 4 }}>
            <h2 style={{ fontFamily:'"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 600, margin: 0, color: GROUP_COLOR[selected] }}>
              {translateGroup(selected, langApp)}
            </h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {groupStats.sessions} {t(langApp, 'sessions')} &middot; {groupStats.totalSets} {t(langApp, 'sets')} &middot; {fmtWeight(groupStats.totalVolume, weightUnit)} {weightUnitLabel(weightUnit)} {t(langApp, 'totalVolume')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0' }}>
            {exercisesInGroup.map(ex => (
              <button key={ex} onClick={() => toggleCompareExercise(ex)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 11px', borderRadius: 20,
                  border: `1px solid ${compareExercises.includes(ex) ? colorForExercise(ex) : 'var(--border-strong)'}`,
                  background: compareExercises.includes(ex) ? 'var(--bg-card-active)' : 'transparent',
                  color: compareExercises.includes(ex) ? 'var(--text-primary)' : 'var(--text-primary-dim)',
                  fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
                  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}>
                {compareExercises.includes(ex) && <span style={{ width: 8, height: 8, borderRadius: 4, background: colorForExercise(ex), flexShrink: 0 }} />}
                {translateExercise(ex, langExercise)}
              </button>
            ))}
          </div>

          {/* aggiungi esercizi da confrontare da qualsiasi gruppo */}
          <button onClick={() => setShowCompareAdd(v => !v)} style={{
            width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 10, marginBottom: 12,
            background: showCompareAdd ? 'var(--bg-card-active)' : 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary-dim)', fontSize: 12, fontFamily: '"Inter", sans-serif', cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}>
            + {t(langApp, 'compareOtherGroup')}
          </button>

          {showCompareAdd && (
            <div key="compare-add-panel" className="panel-anim" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 16, maxHeight: 220, overflowY: 'auto', scrollBehavior: 'smooth' }}>
              {GROUPS.map(g => (
                <div key={g} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: GROUP_COLOR[g], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{translateGroup(g, langApp)}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {allAvailableExercises.filter(e => e.group === g).map(e => (
                      <button key={e.name} onClick={() => toggleCompareExercise(e.name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 9px', borderRadius: 16,
                          border: `1px solid ${compareExercises.includes(e.name) ? colorForExercise(e.name) : 'var(--border-strong)'}`,
                          background: compareExercises.includes(e.name) ? 'var(--bg-card-active)' : 'transparent',
                          color: compareExercises.includes(e.name) ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: 10.5, cursor: 'pointer', fontFamily: '"Inter", sans-serif',
                          transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        }}>
                        {compareExercises.includes(e.name) && <span style={{ width: 6, height: 6, borderRadius: 3, background: colorForExercise(e.name), flexShrink: 0 }} />}
                        {translateExercise(e.name, langExercise)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {compareExercises.length > 0 && (
            <>
              {/* statistiche per ogni esercizio in confronto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {compareExercises.map(ex => {
                  const s = statsByExercise[ex];
                  if (!s) return null;
                  return (
                    <div key={ex} style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${colorForExercise(ex)}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{translateExercise(ex, langExercise)}</span>
                        <button onClick={() => toggleCompareExercise(ex)} style={{
                          background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', padding: '6px 6px',
                        }}>&times;</button>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <span>{t(langApp,'max')}: <strong style={{color:'var(--text-primary)'}}>{s.statsAreLoaded ? fmtWeight(s.maxStrength, weightUnit) + weightUnitLabel(weightUnit) : Math.round(s.maxStrength) + ' rip.'}</strong></span>
                        <span>{t(langApp,'last')}: <strong style={{color:'var(--text-primary)'}}>{s.lastHasLoad ? fmtWeight(s.last, weightUnit) + weightUnitLabel(weightUnit) : Math.round(s.last) + ' rip.'}</strong></span>
                        <span>{t(langApp,'sessions')}: <strong style={{color:'var(--text-primary)'}}>{s.sessions}</strong></span>
                      </div>
                      {s.hasMixed && (
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6 }}>
                          {t(langApp, 'mixedNote')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                {t(langApp, 'strengthChartNote')}
              </div>

              <TradingStyleChart
                mergedChartData={mergedChartData}
                compareExercises={compareExercises}
                colorForExercise={colorForExercise}
                firstTs={FIRST_TS}
                todayTs={TODAY_TS}
                newYearTicks={newYearTicks}
                viewDomain={viewDomain}
                setViewDomain={setViewDomain}
                weightUnit={weightUnit}
                langExercise={langExercise}
                langApp={langApp}
                raw={raw}
              />

              {/* legenda colori */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0 18px' }}>
                {compareExercises.map(ex => (
                  <div key={ex} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: colorForExercise(ex) }} />
                    {translateExercise(ex, langExercise)}
                  </div>
                ))}
              </div>

              {/* tabelle dettaglio per ciascun esercizio in confronto */}
              {perExerciseSeries.map(series => (
                <div key={series.name} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: series.color }} />
                    {t(langApp, 'latestSessions')} &mdash; {translateExercise(series.name, langExercise)}
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <table style={{ width: '100%', minWidth: 280, borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card-active)', position: 'sticky', top: 0 }}>
                          <th style={{ textAlign: 'left', padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{t(langApp, 'date')}</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{t(langApp, 'topSet')}</th>
                          <th style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{t(langApp, 'value')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...series.points].reverse().map((d,i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 10px', color: 'var(--text-primary-dim)' }}>{fmtDate(d.date)}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {d.hasLoad ? `${fmtWeight(d.topWeight, weightUnit)}${weightUnitLabel(weightUnit)}×${d.topReps}` : `${d.topReps} rip. (${langApp === 'en' ? 'bodyweight' : 'corpo libero'})`}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {d.hasLoad ? `${fmtWeight(d.strength, weightUnit)}${weightUnitLabel(weightUnit)}` : Math.round(d.strength)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Schermata di richiesta primo export, dopo il login se l'utente non ha ancora dati
// Schermata di ingresso quando non c'è ancora nessun dato salvato su questo dispositivo: nessun
// login, nessun account — basta importare il file CSV esportato dalla propria app di allenamento.
function FirstUploadScreen({ onUpload, uploading, error, langApp }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'max(20px, env(safe-area-inset-top))',
      paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))',
      paddingRight: 'max(20px, env(safe-area-inset-right))',
      position: 'relative',
    }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PhyzxLogo size={30} />
        </div>
        <h1 style={{ fontFamily:'"Space Grotesk", sans-serif', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          {t(langApp, 'uploadTitle')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          {t(langApp, 'uploadSubtitle')}
        </p>
        <label style={{
          display: 'block', padding: '14px 20px', borderRadius: 10,
          background: '#5ADECD', color: 'var(--bg-app)', fontWeight: 600, fontSize: 14,
          cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1,
          fontFamily: '"Space Grotesk", sans-serif', letterSpacing: 0.5, textTransform: 'uppercase',
          transition: 'opacity 0.15s ease',
        }}>
          {uploading ? t(langApp, 'uploading') : t(langApp, 'chooseFile')}
          <input type="file" accept=".csv" onChange={onUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {error && <div style={{ color: '#e08a8a', fontSize: 12, marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}

function localStorage_get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function localStorage_set(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function localStorage_remove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

// Nessun account, nessun server: i dati (allenamenti importati, lingua, unità di misura, soglie)
// vivono solo in questo dispositivo/browser via localStorage. All'avvio si legge quello che c'è;
// se non c'è ancora nulla si mostra direttamente la richiesta di importare il CSV.
export default function App() {
  const [raw, setRaw] = useState(() => {
    const saved = localStorage_get(WORKOUT_DATA_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [uploadingFirst, setUploadingFirst] = useState(false);
  const [firstUploadError, setFirstUploadError] = useState(null);
  const [firstUploadMappingState, setFirstUploadMappingState] = useState(null); // { headers, file }
  const [langApp, setLangApp] = useState(() => localStorage_get(LANG_APP_KEY) || 'it');
  const [langExercise, setLangExercise] = useState(() => localStorage_get(LANG_EXERCISE_KEY) || 'it');
  const [weightUnit, setWeightUnit] = useState(() => localStorage_get(UNITS_KEY) || 'kg');

  // tema fisso scuro: applichiamo le variabili CSS una sola volta all'avvio.
  useEffect(() => {
    const vars = THEME_VARS.dark;
    for (const [key, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, value);
    }
    document.documentElement.style.colorScheme = 'dark';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', vars['--bg-app']);
  }, []);

  function changeLangApp(lang) {
    setLangApp(lang);
    localStorage_set(LANG_APP_KEY, lang);
  }
  function changeLangExercise(lang) {
    setLangExercise(lang);
    localStorage_set(LANG_EXERCISE_KEY, lang);
  }
  function changeWeightUnit(unit) {
    setWeightUnit(unit);
    localStorage_set(UNITS_KEY, unit);
  }

  function handleDataChange(newRaw) {
    setRaw(newRaw);
    localStorage_set(WORKOUT_DATA_KEY, JSON.stringify(newRaw));
  }

  function handleClearData() {
    localStorage_remove(WORKOUT_DATA_KEY);
    setRaw([]);
  }

  // salva localmente le righe convertite del primo import, comune a tutti i percorsi (app dirette o mappatura manuale)
  function saveFirstUploadRows(newRows) {
    if (newRows.length === 0) {
      setFirstUploadError(t(langApp, 'importNoValidRows'));
      setUploadingFirst(false);
      return;
    }
    localStorage_set(WORKOUT_DATA_KEY, JSON.stringify(newRows));
    setRaw(newRows);
    setUploadingFirst(false);
  }

  // app di provenienza per il primo import: fissa (nessun selettore visibile all'utente)
  const firstUploadImportApp = 'liftoff';

  function handleFirstUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFirstUploadError(null);
    setUploadingFirst(true);
    Papa.parse(file, {
      ...papaOptionsForImportApp(firstUploadImportApp),
      complete: (results) => {
        try {
          const { rows: newRows } = rowsForImportApp(firstUploadImportApp, results.data);
          saveFirstUploadRows(newRows);
        } catch (err) {
          setFirstUploadError(err.message || t(langApp, 'importParseError'));
          setUploadingFirst(false);
        }
      },
      error: (err) => {
        setFirstUploadError(`${t(langApp, 'importParseError')}: ${err.message}`);
        setUploadingFirst(false);
      }
    });
    e.target.value = '';
  }

  function handleConfirmFirstUploadMapping(mapping, defaultWeightUnit) {
    const file = firstUploadMappingState.file;
    setFirstUploadMappingState(null);
    setUploadingFirst(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        try {
          const newRows = mappedRowsToRaw(results.data, mapping, defaultWeightUnit);
          saveFirstUploadRows(newRows);
        } catch (err) {
          setFirstUploadError(err.message || t(langApp, 'importParseError'));
          setUploadingFirst(false);
        }
      },
      error: (err) => {
        setFirstUploadError(`${t(langApp, 'importParseError')}: ${err.message}`);
        setUploadingFirst(false);
      }
    });
  }

  if (raw.length === 0) {
    return (
      <>
        <FirstUploadScreen
          onUpload={handleFirstUpload} uploading={uploadingFirst} error={firstUploadError} langApp={langApp}
        />
        {firstUploadMappingState && (
          <ImportMappingModal
            headers={firstUploadMappingState.headers}
            langApp={langApp}
            defaultWeightUnit={weightUnit}
            onCancel={() => setFirstUploadMappingState(null)}
            onConfirm={handleConfirmFirstUploadMapping}
          />
        )}
      </>
    );
  }

  return <WorkoutBodyExplorer
    initialRaw={raw} onDataChange={handleDataChange} onClearData={handleClearData}
    langApp={langApp} langExercise={langExercise} weightUnit={weightUnit}
    onChangeLangApp={changeLangApp} onChangeLangExercise={changeLangExercise} onChangeWeightUnit={changeWeightUnit}
  />;
}
