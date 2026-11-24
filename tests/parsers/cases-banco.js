/* ============================================================
   CASOS · Banco de Rutinas (plantillas del sistema Bodybuilding y Hyrox) y bloques libres (finisher / cardio)
   Los adaptadores bancoBB / bancoHyx / bancoNombres / bancoEditor viven en runner.html: devuelven la lista de problemas (lo esperado es []).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'bank.bb.01', area: 'Banco · Bodybuilding (12 plantillas)', fn: 'bancoBB', input: '', expect: [],
    nota: 'Cada día: entrada en calor primero, ejercicio principal de fuerza, 2+ bloques de hipertrofia, biset/triset, core, finisher o cardio; objetivo y 3+ pautas por bloque; foco de 200+ caracteres; volumen mínimo (24 series intermedio / 28 avanzado)' },
  { id: 'bank.bb.02', area: 'Banco · Bodybuilding (12 plantillas)', fn: 'bancoNombres', input: '', expect: [],
    nota: 'Todos los ejercicios de las sesiones (BB, Hyrox y entradas en calor) existen en la biblioteca: el video se vincula solo' },
  { id: 'bank.hyx.01', area: 'Banco · Hyrox (18 plantillas)', fn: 'bancoHyx', input: '', expect: [],
    nota: 'Mismas reglas de estructura que Bodybuilding (con volumen mínimo menor) en las 18 plantillas Hyrox (3 niveles x 2 géneros x 3 frecuencias)' },
  { id: 'bank.bb.03', area: 'Banco · Bodybuilding (12 plantillas)', fn: 'bancoSplit3', input: '', expect: [],
    nota: 'Frecuencia 3: hombre = Push / Pull / Pierna completa; mujer = Pierna A / Push, Pull y Brazos / Pierna B. Ningún día es Full Body, en intermedio y en avanzado' },
  { id: 'bank.rope.01', area: 'Banco · Bodybuilding (12 plantillas)', fn: 'bancoSinRopes', input: '', expect: [],
    nota: 'Ningún battle rope en ninguna plantilla del Banco (Bodybuilding, Hyrox, recomposición, Banco Pro ni copias guardadas): se reemplazan por slam ball, SkiErg o remo' },
  { id: 'bank.rec.01', area: 'Banco · Recomposición femenina', fn: 'bancoRecFem', input: '', expect: [],
    nota: 'Las 8 plantillas de recomposición femenina abren con 8 a 12 minutos de cardio suave en una máquina que cambia según el día (cinta con pendiente, elíptico o bicicleta; el día de densidad no lleva) y cierran con una máquina de cardio cuyo formato también rota, con un solo cierre al fallo por semana y todo de bajo impacto' },
  { id: 'bank.edit.01', area: 'Banco · editor', fn: 'bancoEditor', input: '', expect: [],
    nota: 'Existe la API de edición y las plantillas del sistema están hidratadas' },

  /* ---- bloques libres: el importador no los convierte en series de fuerza ---- */
  { id: 'imp.sb.13', area: 'Importador Sports · bloques libres', fn: 'importSB',
    nota: 'Un finisher con rondas y estaciones conserva sus líneas tal cual (no se vuelve dosis de fuerza) y su modalidad es metcon',
    input: '=== DÍA 1: Test ===\n[BLOQUE 1] [FINISHER] Cierre metabólico · Trineo y bicicleta (8 MIN)\n5 rondas: pasás de una estación a la otra sin pausa y descansás 90 segundos al cerrar cada ronda.\n- Sled push / Trineo x 20 m con una carga que te permita caminar firme\n- Bicicleta / Assault bike x 30 s a ritmo fuerte',
    expect: { itemsContienen: ['5 rondas: pasás de una estación', '- Sled push / Trineo x 20 m', '- Bicicleta / Assault bike x 30 s'], itemsNoContienen: ['Tempo', 'RIR'] }, modo: 'proyeccionItems' },
  { id: 'imp.sb.14', area: 'Importador Sports · bloques libres', fn: 'importSB',
    nota: 'Un bloque de cardio con minutos y un tip multilínea: las pautas con etiqueta propia (POR QUÉ ESTÁ ACÁ, PROGRESIÓN, SENSACIÓN OBJETIVO) quedan en tips',
    input: '=== DÍA 1: Test ===\n[BLOQUE 1] [CARDIO] Cardio · Zona 2 de carrera (45 MIN)\n45 min Carrera suave\n[OBJETIVO FISIOLÓGICO]\nBase aeróbica.\n[COACHING TIPS & ESTRATEGIA]\nPOR QUÉ ESTÁ ACÁ: construye la base.\nINTENSIDAD: tenés que poder hablar frases completas.\nSENSACIÓN OBJETIVO: terminar con ganas de seguir.',
    expect: { dias: [{ bloques: [{ fase: 'cardio', items: ['45 min Carrera suave'], cierre: { objetivo: 'Base aeróbica.', tips: 'POR QUÉ ESTÁ ACÁ: construye la base.\nINTENSIDAD: tenés que poder hablar frases completas.\nSENSACIÓN OBJETIVO: terminar con ganas de seguir.' } }] }], sinAvisos: /fase conocida/ }, modo: 'proyeccion' },
  { id: 'imp.sb.15', area: 'Importador Sports · bloques libres', fn: 'importSB',
    nota: 'Un bloque de fuerza con las pautas nuevas (POR QUÉ ESTÁ ACÁ / NOTA DEL DÍA / PROGRESIÓN / SENSACIÓN OBJETIVO) las deja todas en tips, ninguna entre los ejercicios',
    input: '=== DÍA 1: Test ===\n[BLOQUE 1] [FUERZA] Fuerza principal – Sentadilla con barra (23 MIN)\nSentadilla con barra\n5x4-6 | Tempo 3010 | RIR 1\nRest 240s\n[OBJETIVO FISIOLÓGICO]\nFuerza de pierna.\n[COACHING TIPS & ESTRATEGIA]\nPOR QUÉ ESTÁ ACÁ: es el ejercicio que ordena la sesión.\nNOTA DEL DÍA: profundidad pareja en todas las series.\nSET-UP: barra firme.\nPROGRESIÓN: top set y back-off.\nSENSACIÓN OBJETIVO: pesado y afilado.',
    expect: { itemsNoContienen: ['POR QUÉ', 'NOTA DEL DÍA', 'PROGRESIÓN', 'SENSACIÓN'], cantBloques: 1 }, modo: 'proyeccionItems' }
]);
