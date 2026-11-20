/* English dictionary · coaching cues for each block: warm-up (approach) sets, why this many sets and how to choose the load.
   Same keys and {placeholders} as es.pedagogia.js. Missing keys fall back to Spanish. */
JP_I18N.add('en', {
  'motor.lbl.aprox': 'WARM-UP SETS',
  'motor.lbl.porque': 'WHY THIS MANY SETS',
  'motor.lbl.carga': 'LOAD TARGET',

  'motor.ped.rango': '{lo} to {hi}',
  'motor.ped.entre': 'between {lo} and {hi}',
  'motor.ped.lado.sufijo': ' per side',
  'motor.ped.rir.def': 'one or two reps in reserve',
  'motor.ped.rir.r0': 'no reps in reserve (but with your technique intact)',
  'motor.ped.rir.r01': 'one rep in reserve at most (or none, always with your technique intact)',
  'motor.ped.rir.r1': 'one rep in reserve',
  'motor.ped.rir.r2': 'two reps in reserve',
  'motor.ped.rir.rn': '{n} reps in reserve',
  'motor.ped.rir.rango': 'between {lo} and {hi} reps in reserve',
  'motor.ped.serie.efectiva.one': '{n} working set',
  'motor.ped.serie.efectiva.other': '{n} working sets',
  'motor.ped.dosis.reps': '{sets} sets of {rango} reps{lado}',
  'motor.ped.dosis.tiempo': '{sets} sets of {rango} seconds',
  'motor.ped.efectivas': 'Your working sets are only the {dosis} this block asks for, finishing each one with {rir}.',
  'motor.ped.efectivas.lado': ' The number is PER SIDE: do the reps on one side, switch, and do the same on the other; that counts as one set. Volume is not doubled: each side gets those {sets} sets.',

  'motor.ped.aprox.lado': ' For one-sided exercises, do the warm-up sets with each leg or arm.',
  'motor.ped.aprox.F': 'these are your specific warm-up sets: they go BEFORE the working sets and are always light. Do 3: the first with half of your working weight for 8 easy reps, the second with 70% for 5 reps, the third with 85% for 2 or 3 reps. Rest 1 minute between them and never get close to failure: they should leave you ready, not tired. They are not logged and do not count as volume. {efectivas}{lado}',
  'motor.ped.aprox.H': 'these are specific warm-up sets and go BEFORE the working sets. Do 2: the first with 60% of your working weight for 6 reps, the second with 80% for 3 reps, resting a minute between them. If you just did another exercise for the same muscle, a single set at 80% is enough. They are not logged and do not count as volume. {efectivas}{lado}',
  'motor.ped.aprox.A': 'you barely need them here because the muscle is already warm from the previous exercises. If this is the first exercise you do for that muscle group, do one light set with half the weight for 10 reps before starting. {efectivas}',

  'motor.ped.musculo.piernas': 'lower body',
  'motor.ped.musculo.def': 'the muscle',
  'motor.ped.porque.F': '{series}: this is the exercise where you move the most weight and where you build the strength that supports the rest of the session. That amount is enough to stimulate the biggest fibers with the best possible quality; adding more sets here would only bring fatigue that costs you performance in the blocks that follow, and the rest of the weekly volume comes from the other exercises.',
  'motor.ped.porque.H': '{series} for {musculo}: this block provides the main volume of the day with serious load and a long range of motion. Added to the other exercises for the same muscle group, that amount takes you to the weekly volume that makes the muscle grow (roughly 10 to 20 sets per week) without going past what you can recover between sessions.',
  'motor.ped.porque.A': '{series}: it is an isolation exercise, so each set is short in total effort but very demanding for the specific muscle. It adds volume where the compound lifts no longer reach, with almost no general fatigue; that is why you do few sets, close to failure, instead of many "filler" sets.',
  'motor.ped.porque.BT': '{sets} rounds: each round chains {estaciones} with no rest, so every station adds {sets} working sets in a few minutes. It is a pump finisher: with that amount the muscle gets extra volume without building fatigue that ruins your next session.',
  'motor.ped.porque.estaciones.2': 'both exercises',
  'motor.ped.porque.estaciones.n': 'all {n} exercises',
  'motor.ped.porque.C': '{series}: abs recover quickly, but quality is what matters. With those sets done well, with a firm trunk, it is enough to strengthen and define them without loading the lower back.',

  'motor.ped.carga.core.tiempo': 'the {rango} seconds',
  'motor.ped.carga.core.reps': 'the {rango} reps',
  'motor.ped.carga.core': 'choose the hardest variation you can hold {que} without arching your lower back or losing position, and finish with {rir}. If it feels too easy, add leverage or weight; if your form breaks earlier, switch to an easier version.',
  'motor.ped.carga.multi': 'at each station choose a weight that lets you reach the top of the rep range ({rango}) with clean technique and finish the round with {rir}. Since there is no rest between stations, start a bit lighter than you would for the exercise on its own and adjust from the second round.',
  'motor.ped.carga.single': 'look for a challenging but technical weight: one that lets you do {entre} reps{lado} through the full range of motion and leaves you with {rir} at the end of each set. RIR is the number of reps you could still do. If you get {sube} reps or more on your first set, the weight is too light: add 2.5 kg (1 kg for arms and shoulders). If you cannot reach {lo} reps, drop it by 5 to 10%. When you complete every set at the top of the range ({hi}), add weight and go back to the bottom.'
});
