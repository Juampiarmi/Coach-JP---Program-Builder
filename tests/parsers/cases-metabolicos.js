/* ============================================================
   CASOS · bloques metabólicos / de cierre (perfil Hyrox · CrossFit · HIIT) alineados al día, y layout de las estaciones en la app del alumno
   Adaptadores (runner.html): bancoMetabolicos (audita el Banco) y alumnoEstaciones (limpieza de nombres y consignas de formato).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'met.banco.01', area: 'Banco · cierres metabólicos', fn: 'bancoMetabolicos', input: '', expect: [],
    nota: 'Los cierres metabólicos de las 12 plantillas de Bodybuilding usan estaciones y formato de competición (SkiErg, trineo, wall balls, bici, remo, burpee broad jump; EMOM, AMRAP, For Time o intervalos) y están alineados al día: empuje sin press ni slam, tracción sin remo ni SkiErg, pierna y glúteo sin trineo de empuje ni escaladora ni zancadas, torso con piernas y cardio' },

  { id: 'met.est.01', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'nombre', nm: '- Sled push / Trineo x' }, expect: 'Sled push / Trineo',
    nota: 'El nombre de la estación llega sin el guion de viñeta ni la "x" que queda colgando cuando la cantidad pasó a la pastilla' },
  { id: 'met.est.02', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'nombre', nm: '- Ski erg x' }, expect: 'Ski erg', nota: 'Idem con un nombre corto' },
  { id: 'met.fmt.01', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'formato', txt: 'Cuatro rondas: sin pausa entre estaciones y 90 segundos de descanso al cerrar cada ronda', pill: false }, expect: true,
    nota: 'La línea de rondas es una consigna de formato: va en una banda, no como una estación numerada' },
  { id: 'met.fmt.02', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'formato', txt: 'AMRAP 8 minutos', pill: false }, expect: true, nota: 'AMRAP, EMOM, For Time e intervalos también son consignas' },
  { id: 'met.fmt.03', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'formato', txt: 'Sled push / Trineo', pill: true }, expect: false, nota: 'Una estación con su cantidad en la pastilla es una estación, no una consigna' },
  { id: 'met.fmt.04', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'formato', txt: 'Wall balls', pill: false }, expect: false, nota: 'Un nombre corto sin cantidad sigue siendo una estación' },
  { id: 'met.css.01', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'css' }, expect: { grid: true, fmt: true }, modo: 'subset',
    nota: 'En los tres estilos las estaciones se acomodan en una grilla (nombre arriba, cantidad abajo) y la consigna de formato en una banda: los nombres largos fluyen completos, nunca se parten verticalmente' },
  { id: 'met.est.03', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'partir', txt: 'Assault bike x 40 s a un ritmo que puedas sostener las cuatro rondas' }, expect: { nm: 'Assault bike', qty: '40 S', nota: 'A un ritmo que puedas sostener las cuatro rondas' }, modo: 'subset',
    nota: 'Una estación larga se parte en nombre corto, cantidad (para su pastilla) y aclaración en su propia línea' },
  { id: 'met.est.04', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'partir', txt: 'Sled push / Trineo x 20 m con una carga que te permita caminar firme' }, expect: { nm: 'Sled push / Trineo', qty: '20 M' }, modo: 'subset',
    nota: 'Metros, calorías y minutos también se leen como cantidad' },
  { id: 'met.est.05', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'partir', txt: 'Wall balls' }, expect: null,
    nota: 'Un nombre sin cantidad no se parte' },
  { id: 'met.est.06', area: 'App del alumno · estaciones', fn: 'alumnoEstaciones', input: { caso: 'consigna', txt: 'HIIT por intervalos: 4 rondas de tres estaciones, 40 segundos de trabajo' }, expect: true,
    nota: 'La consigna de formato se reconoce por cómo arranca (HIIT, rondas, AMRAP, EMOM)' },
  { id: 'met.circ.01', area: 'App del alumno · estaciones', fn: 'alumnoCircuitos', input: {}, expect: [],
    nota: 'En todos los cierres metabólicos del Banco el circuito se dibuja igual: una sola banda de formato arriba y todas las estaciones con número, nombre corto, cantidad en su pastilla y aclaración (sin mezclar filas numeradas con filas de cronómetro), con objetivo fisiológico y pautas del bloque con contenido' }
]);
