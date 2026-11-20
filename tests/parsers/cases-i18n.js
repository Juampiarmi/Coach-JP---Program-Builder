/* ============================================================
   CASOS · Dosis por lado, vocabulario rioplatense, biblioteca ampliada e i18n (base para el inglés)
   El adaptador i18nBib (runner.html) usa el Builder cargado: motor de textos (conLado / esUnilateral), diccionarios JP_I18N, biblioteca de ejercicios (seedExercises, alias),
   catálogo y familias de swaps del plan élite, y las plantillas del Banco ya hidratadas.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  /* ---- 1. dosis unilaterales: siempre "por lado" y sin volumen inflado ---- */
  { id: 'uni.01', area: 'Dosis · por lado', fn: 'i18nBib', input: { caso: 'conLado' },
    expect: { bulgara: '10-12 por lado', yaDice: '10-12 por lado', bilateral: '10-12', pistol: '8 por lado', plancha: '30s por lado', pallof: '12 por lado', lateralPolea: '12-20 por lado', vacio: '' }, modo: 'subset',
    nota: 'Todo ejercicio que se hace de a un lado por vez muestra su dosis con «por lado» (sentadilla búlgara, pistol, plancha lateral, Pallof, elevación lateral en polea); si ya lo dice no se duplica y los bilaterales no se tocan' },
  { id: 'uni.02', area: 'Dosis · por lado', fn: 'i18nBib', input: { caso: 'textoLado' },
    expect: { lineaConLado: true, seriesPorLado: true, sinInflar: true }, modo: 'subset',
    nota: 'El texto del bloque de una búlgara 3 series de 10-12 dice «por lado», aclara que cada serie es un lado y el otro y NO duplica las series (las series efectivas siguen siendo 3)' },
  { id: 'uni.03', area: 'Dosis · por lado', fn: 'i18nBib', input: { caso: 'plantillasLado' }, expect: [],
    nota: 'En las 12 plantillas Bodybuilding (intermedio y avanzado) ningún ejercicio unilateral queda sin aclaración por lado y ningún grupo muscular de las 6 plantillas avanzadas se sale de su rango semanal de series (la dosis por lado no infla el volumen)' },

  /* ---- 2. vocabulario argentino ---- */
  { id: 'voc.01', area: 'Vocabulario rioplatense', fn: 'i18nBib', input: { caso: 'vocabulario' }, expect: [],
    nota: 'Ni las plantillas del Banco, ni sus pautas, ni la biblioteca de ejercicios, ni los diccionarios dicen «tumbado», «espinillas» ni «tumbada»: se usa «acostado» y «tibias»' },
  { id: 'voc.02', area: 'Vocabulario rioplatense', fn: 'i18nBib', input: { caso: 'alias' },
    expect: { renombra: true, aliasViejo: true, resuelveViejo: true, resuelveNuevo: true, idempotente: true }, modo: 'subset',
    nota: 'El curl femoral «tumbado» pasa a «acostado» pero el nombre viejo queda como alias: un plan ya armado con el nombre anterior sigue encontrando el ejercicio, su video y sus avisos, y la migración se puede correr dos veces sin efecto' },

  /* ---- 3. biblioteca ampliada ---- */
  { id: 'lib.01', area: 'Biblioteca de ejercicios', fn: 'i18nBib', input: { caso: 'integridad' }, expect: [],
    nota: 'Cada ejercicio de la biblioteca tiene nombre en español, nombre en inglés, grupo y patrón válidos, equipo y aviso de seguridad, y no hay nombres repetidos (ni contra los alias)' },
  { id: 'lib.02', area: 'Biblioteca de ejercicios', fn: 'i18nBib', input: { caso: 'cobertura' }, expect: [],
    nota: 'La biblioteca ofrece opciones completas por zona: pectoral, espalda, hombros, brazos, piernas, glúteos, gemelos y abdomen (mínimos por grupo y por tipo de movimiento)' },
  { id: 'lib.03', area: 'Biblioteca de ejercicios', fn: 'i18nBib', input: { caso: 'catalogoElite' }, expect: [],
    nota: 'Todo ejercicio del catálogo y de las familias de swaps del plan élite existe en la biblioteca, y cambiar cualquiera de esos ejercicios ofrece al menos 3 opciones (para alumnos y alumnas)' },
  { id: 'lib.04', area: 'Biblioteca · alumnas', fn: 'i18nBib', input: { caso: 'alumnas' }, expect: [],
    nota: 'Las plantillas femeninas no incluyen los movimientos restringidos y el swap no se los ofrece a las alumnas; los ejercicios nuevos mantienen las mismas reglas (sin curl femoral sentado, plancha lateral en un solo día)' },

  /* ---- 4. nombres en español + i18n ---- */
  { id: 'i18n.01', area: 'i18n · runtime', fn: 'i18nBib', input: { caso: 'runtime' },
    expect: { base: true, interpola: true, plural: true, respaldo: true, claveSinTraducir: true, vuelve: true }, modo: 'subset',
    nota: 'jpT devuelve el español por defecto, reemplaza {marcadores}, elige .one/.other por cantidad, cae al español si falta la clave en inglés y nunca muestra la clave; al volver a español todo vuelve' },
  { id: 'i18n.02', area: 'i18n · diccionarios', fn: 'i18nBib', input: { caso: 'diccionarios' }, expect: [],
    nota: 'Los diccionarios en inglés no tienen claves huérfanas ni marcadores {x} distintos al español; la pedagogía, los roles y las técnicas del motor y los rótulos de la tarjeta están traducidos al 100%' },
  { id: 'i18n.03', area: 'i18n · pautas en inglés', fn: 'i18nBib', input: { caso: 'pautasEn' },
    expect: { rotulos: true, sinEspanol: true, dosisIntacta: true, vuelveEs: true }, modo: 'subset',
    nota: 'Con el idioma en inglés, las pautas del bloque salen con rótulos y frases en inglés (WARM-UP SETS, WHY THIS MANY SETS, LOAD TARGET), la dosis «3x8-10» queda idéntica y al volver a español el texto es el original' },
  { id: 'i18n.04', area: 'i18n · nombres de video', fn: 'i18nBib', input: { caso: 'nombres' },
    expect: { siempreEs: true, conIngles: true, vacio: true, enInglesNoCambia: true }, modo: 'subset',
    nota: 'Aunque la app esté en inglés, el nombre del ejercicio y del video se muestra siempre en español; el inglés es solo una etiqueta secundaria entre paréntesis' },
  { id: 'i18n.05', area: 'i18n · app del alumno', fn: 'i18nBib', input: { caso: 'alumno' }, expect: { runtime: true, es: true, en: true, tarjeta: true }, modo: 'subset',
    nota: 'La app del alumno trae el runtime y los diccionarios, y los rótulos de la tarjeta del bloque salen del diccionario en español (idénticos a los de siempre) y en inglés' }
]);
