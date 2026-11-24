// Livello dati di Phyzx: conversioni, gruppi muscolari, import Liftoff e analisi dei periodi.
// Tutti i pesi sono memorizzati in kg internamente; riga grezza = [data, esercizio, gruppo, kg, reps].


export const WORKOUT_DATA_KEY = 'performance-log-workout-data';
export const LANG_APP_KEY = 'performance-log-lang-app';
export const LANG_EXERCISE_KEY = 'performance-log-lang-exercise';
export const UNITS_KEY = 'performance-log-units';

// Conversioni unità di misura
export const KG_TO_LB = 2.20462;
export function convertWeight(kg, unit) {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}
export function weightUnitLabel(unit) {
  return unit === 'lb' ? 'lb' : 'kg';
}
export function fmtWeight(kgValue, unit) {
  const converted = convertWeight(kgValue, unit);
  return fmtKg(converted);
}

// Fattore di conversione km -> miglia, usato per la distanza cardio quando l'utente ha impostato lb
// (si assume che chi preferisce libbre preferisca anche le miglia per la distanza).

export const GROUP_ORDER = ['Petto','Schiena','Spalle','Bicipiti','Tricipiti','Gambe','Addominali','Avambracci','Altro'];

export const GROUP_COLOR = {
  Petto: '#2F8CFF',
  Schiena: '#5CC8FF',
  Spalle: '#A78BFA',
  Bicipiti: '#FFC439',
  Tricipiti: '#FF7A59',
  Gambe: '#1FD17A',
  Addominali: '#F472B6',
  Avambracci: '#94A3B8',
  Altro: '#6B7280',
};

export const LB_TO_KG = 0.453592;

export const EXERCISE_TO_GROUP = {
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

export const EXERCISE_NAME_IT = {
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

// I nomi degli esercizi sono sempre e solo in inglese (nessuna traduzione).
export function translateExercise(name) {
  return name;
}

// Esercizi il cui peso è calcolato e mostrato sempre in libbre, a prescindere dalle preferenze.
const LB_ONLY = /^(chest press|cable overhead tricep extensions?)$/i;
export const isLbOnly = name => LB_ONLY.test(String(name || '').trim());
export const unitFor = (name, unit) => (isLbOnly(name) ? 'lb' : unit);

export const GROUP_NAME_EN = {
  Petto: 'Chest', Schiena: 'Back', Spalle: 'Shoulders', Bicipiti: 'Biceps',
  Tricipiti: 'Triceps', Gambe: 'Legs', Addominali: 'Abs', Avambracci: 'Forearms', Altro: 'Other',
};
export function translateGroup(name, lang) {
  if (lang === 'it') return name;
  return GROUP_NAME_EN[name] || name;
}

export function guessGroup(exerciseName) {
  return EXERCISE_TO_GROUP[exerciseName] || 'Altro';
}


export function fmtDate(d) {
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

export function toTs(dateStr) {
  return new Date(dateStr).getTime();
}

// Formatta un numero in stile italiano: virgola come separatore decimale, niente ",0" superfluo (75.0 -> "75", 77.2 -> "77,2")

// Formatta un numero in stile italiano: virgola come separatore decimale, niente ",0" superfluo (75.0 -> "75", 77.2 -> "77,2")
export function fmtKg(n) {
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace('.', ',');
}

export function csvRowsToRaw(rows) {
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

// Formula di Epley per stimare il massimale (1RM) da un peso sollevato per un certo numero di
// ripetizioni: 1RM = peso * (1 + reps/30). È la formula più diffusa e sufficientemente accurata
// per reps basse-medie (fino a circa 10-12); oltre non ha molto senso stimare un 1RM comunque.
export function estimateOneRm(weight, reps) {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return weight; // già un massimale, nessuna stima necessaria
  return weight * (1 + reps / 30);
}

export const GYM_GAP_DAYS = 1000 * 60 * 60 * 24;

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
export function analyzeTrainingPeriods(raw) {
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
