/* ============================================================
   CASOS · Planificaciones femeninas del Banco de Rutinas: protagonismo del glúteo y del tren inferior, reparto por grupo y textos
   El adaptador bancoFemenino (runner.html) arma las plantillas del sistema con el código real y cuenta las series efectivas por grupo muscular con el mismo cálculo que el panel de volumen
   del Builder (PB.EST.volumen: rangos por nivel y género). Las pirámides de un básico ("1x10 + 1x8 + 2x8 + 1x12") cuentan sus series efectivas, sin la de aclimatación.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'fem.01', area: 'Femenino · volumen', fn: 'bancoFemenino', input: { caso: 'pirámide' },
    expect: { efectivas: 4, sinContarAclimatacion: true, normalNoCambia: true }, modo: 'subset',
    nota: 'El panel de volumen cuenta las series efectivas de un básico en pirámide (aclimatación + carga alta + top set + back-off): antes contaba una sola y los Full-Body parecían tener 4 series de glúteo cuando el hip thrust ya sumaba 4; una dosis común no cambia' },
  { id: 'fem.02', area: 'Femenino · Bodybuilding', fn: 'bancoFemenino', input: { caso: 'bodybuilding' },
    expect: { seis: true, gluteoEnRango: true, gluteoEsElMayor: true, piernaEnRango: true, cuadricepsNoSePasa: true, tren_inferior_protagonista: true, brazosEnRango: true, pechoEnRango: true, textoCoincide: true }, modo: 'subset',
    nota: 'Bodybuilding femenino (3, 4 y 5 días, intermedio y avanzado): el glúteo es el grupo con más series de la semana y está dentro de su rango, el cuádriceps, los isquios y el gemelo no quedan por debajo (el gemelo faltaba en el split de 3 días), el cuádriceps no pasa su techo, el tren inferior tiene al menos el 90 % de las series del superior, el pecho no pasa su techo y los brazos no quedan cortos; el texto de cada plantilla dice los mismos números que mide el panel' },
  { id: 'fem.03', area: 'Femenino · Full-Body', fn: 'bancoFemenino', input: { caso: 'fullbody' },
    expect: { cuatro: true, gluteoEnRango: true, gluteoMayorQueCuadriceps: true, cuadricepsEnRango: true, isquiosEnRango: true, gemeloPresente: true, espaldaEnRango: true, textoDiceGluteo: true, textoCoincide: true }, modo: 'subset',
    nota: 'Full-Body mujer (3 y 4 días, avanzado y élite): tenían 4 a 8 series de glúteo contra 20 a 36 del rango y 14 a 24 de cuádriceps; ahora el glúteo llega a su rango (hip thrust de cinco series, bisets de patada en polea y abducción, hip thrust a una pierna), supera al cuádriceps, que baja a su rango, hay isquios y gemelo en rango, la espalda no pasa su techo y la descripción de cada plantilla dice lo mismo que el panel' },
  { id: 'fem.04', area: 'Femenino · deportes', fn: 'bancoFemenino', input: { caso: 'deportes' },
    expect: { recomposicion: true, recomposicionGlutealMayor: true, mtb: true, hyrox: true, hyroxCorrePrincipal: true, textosMujer: true }, modo: 'subset',
    nota: 'Versiones mujer de Recomposición (6), MTB (2) y Hyrox (9): el glúteo llega a su rango en Recomposición, MTB suma glúteo medio y gemelo, Hyrox suma glúteo directo (que tenía 0 series en 3 y 4 días) sin sacar la carrera, los intervalos ni las estaciones del trabajo principal, y cada descripción explica qué cambia en la distribución' },
  { id: 'fem.05', area: 'Femenino · Banco Pro', fn: 'bancoFemenino', input: { caso: 'pro' },
    expect: { glúteoEnRango: true, gemelo: true, textoDiceGluteo: true }, modo: 'subset',
    nota: 'Recomposición Femenina del Banco Pro (3 días inicial y 4 días intermedio): tenían 6 y 4 series de glúteo; ahora 16 y 14 (dentro del rango de cada nivel), con gemelo en ambas, y la descripción lo dice' },
  { id: 'bis.01', area: 'Banco · series rectas y bisets', fn: 'bancoFemenino', input: { caso: 'bisets' },
    expect: { fuerzaRecta: true, hayFuerza: true, masBisets: true, mismasSeries: true, noDosGuiados: true, mismaEstacion: true, cadaDiaConBiset: true, descansoDeRonda: true, funcionPura: true }, modo: 'subset',
    nota: 'Lógica del Banco: la fuerza principal va en series rectas (una sola estación, descanso completo) y la hipertrofia y los accesorios se agrupan en bisets lógicos por grupo muscular (pecho con espalda, hombro con tríceps, espalda con bíceps, cuádriceps con isquios, glúteo con cuádriceps o isquios); en los bisets las dos estaciones tienen las mismas series, nunca se juntan dos máquinas o poleas, comparten estación (mancuernas con mancuernas, torre con torre), cada día conserva al menos un biset, el descanso de la ronda queda entre 45 y 150 s y los compuestos pesados (rumano de 150 s) quedan rectos; la hipertrofia en bisets sube de 27 % a más de 35 %' }
]);
