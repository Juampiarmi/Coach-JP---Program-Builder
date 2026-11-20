/* ============================================================
   CASOS · Bodybuilding de 3, 4 y 5 días (hombres y mujeres, intermedio y avanzado): claridad pedagógica y criterios de evidencia
   El adaptador pedagogiaBB (runner.html) lee las 12 plantillas del Banco ya hidratadas.
   Cubre: series de aproximación explicadas (cuántas, con qué porcentaje, que no cuentan y cuáles son las efectivas), por qué esa cantidad de series, objetivo de carga con el rango
   y el RIR reales, y la selección de ejercicios (brazos estirados, remo con pecho apoyado, deltoide lateral en frecuencia 2, sin curl femoral sentado para ellas, core variado).
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'ped.01', area: 'Banco · pautas pedagógicas', fn: 'pedagogiaBB', input: { caso: 'pautas' }, expect: [],
    nota: 'Todos los bloques de trabajo de las 12 plantillas traen «POR QUÉ ESTA CANTIDAD DE SERIES» (arranca con la cantidad real) y «OBJETIVO DE CARGA»; los ejercicios principales, de hipertrofia y aislamientos traen «SERIES DE APROXIMACIÓN», que aclara que van antes, que no se anotan ni cuentan y cuáles son las series efectivas; los bisets no llevan aproximación' },
  { id: 'ped.02', area: 'Banco · pautas pedagógicas', fn: 'pedagogiaBB', input: { caso: 'carga' },
    expect: { rango: true, rir: true, techo: true, sube: true, baja: true, aproxSeries: true, efectivas: true, sinDosis: true }, modo: 'subset',
    nota: 'Press inclinado 3 series de 8 a 10 con RIR 0-1: el objetivo de carga habla del rango, de «una repetición en reserva como mucho», de cuándo subir (13 repeticiones o más) y bajar (menos de 8) y del techo; la aproximación da el 60% y el 80% y nombra las 3 series efectivas; el texto no lleva dosis «NxM» que el importador pueda leer como series' },
  { id: 'ped.03', area: 'Banco · Bodybuilding mujeres', fn: 'pedagogiaBB', input: { caso: 'mujeres' }, expect: [],
    nota: 'Las 6 plantillas femeninas no usan curl femoral sentado (no hay en todos los gimnasios) y el swap no se lo ofrece a las alumnas, la plancha lateral está en un solo día, el core no repite bloque y los brazos trabajan estirados (curl inclinado y extensión sobre la cabeza)' },
  { id: 'ped.04', area: 'Banco · Bodybuilding hombres', fn: 'pedagogiaBB', input: { caso: 'hombres' }, expect: [],
    nota: 'Las 6 plantillas masculinas: brazos estirados, remo con el pecho apoyado (sin remo libre con barra), deltoide lateral en 2 o más días, deltoide posterior presente y nunca sentadilla, rumano y hip thrust pesados el mismo día' }
]);
