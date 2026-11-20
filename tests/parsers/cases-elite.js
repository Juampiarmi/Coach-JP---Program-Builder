/* ============================================================
   CASOS · Bodybuilding avanzado / élite integrado al Builder (6 plantillas: 3, 4 y 5 días · hombres y mujeres) y editor estructurado del Banco
   Los adaptadores eliteBB / eliteEd viven en runner.html. eliteBB devuelve la lista de problemas (lo esperado es []); eliteEd devuelve lo observado tras editar.
   Edición: swap de ejercicio, series / RIR / descanso, agregar y quitar ejercicios, alertas automáticas, volumen semanal y asignación al alumno.
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'elite.bb.01', area: 'Builder · Bodybuilding élite (6 plantillas)', fn: 'eliteBB', input: { caso: 'criterios' }, expect: [],
    nota: 'Las 6 plantillas avanzadas cumplen los criterios de élite: sin guiados seguidos en un biset, bisets de una misma estación, 1 patrón axial por día como máximo, RIR 0-1 en toda serie efectiva, nada de core repetido en 3 o más días, volumen semanal dentro del rango de cada grupo y nombres en español con el inglés entre paréntesis' },
  { id: 'elite.bb.02', area: 'Builder · Bodybuilding élite (6 plantillas)', fn: 'eliteBB', input: { caso: 'mujeres' }, expect: [],
    nota: 'Mujeres: hip thrust en 2 días y glúteo con 6+ series en 2 días (3 en el plan de 5), plancha lateral no en todos los días, brazos con curl inclinado y extensión sobre la cabeza, y los planes de 4 y 5 días no comparten ningún día' },
  { id: 'elite.bb.03', area: 'Builder · Bodybuilding élite (6 plantillas)', fn: 'eliteBB', input: { caso: 'hombres' }, expect: [],
    nota: 'Hombres: deltoide lateral en 2 (3 días) o 3 días (4 y 5), posterior en 2 o más, brazos con trabajo elongado, remo con el pecho apoyado y sin ancla de remo con barra libre' },
  { id: 'elite.bb.04', area: 'Builder · Bodybuilding élite (6 plantillas)', fn: 'eliteBB', input: { caso: 'intermedio' }, expect: [],
    nota: 'El nivel intermedio conserva sus sesiones de siempre y el avanzado usa solo sesiones élite (E_*)' },

  { id: 'elite.ed.01', area: 'Builder · editor estructurado', fn: 'eliteEd', input: { caso: 'swap' },
    expect: { id: true, titulo: true, nombre: 'Peso muerto rumano con déficit', hibrido: true, serie: '4x6-8', rir: '1', objetivoNuevo: true, ramp: true, minutos: true }, modo: 'subset',
    nota: 'Cambiar el ejercicio de un bloque con el desplegable regenera título, objetivo, pautas y tempo del ejercicio nuevo, conserva el id del bloque y la dosis (4x6-8, RIR 1) y mantiene las series de aproximación del primer ejercicio de fuerza' },
  { id: 'elite.ed.02', area: 'Builder · editor estructurado', fn: 'eliteEd', input: { caso: 'dosis' },
    expect: { items: ['5x4-6 | Tempo 3010 | RIR 0', 'Rest 210s'], rest: 210, titulo: true, pautasIntactas: true, nombre: 'Press de banca plano con barra' }, modo: 'subset',
    nota: 'Editar series, repeticiones, RIR y descanso reescribe las líneas, recalcula los minutos del título (5 series con 210 s = 23 min) y no toca el objetivo ni las pautas' },
  { id: 'elite.ed.03', area: 'Builder · editor estructurado', fn: 'eliteEd', input: { caso: 'bisets' },
    expect: { antes: 2, sigue: true, ahora: 1, sinA1: true, rol: true, ultimo: 'bloque' }, modo: 'subset',
    nota: 'Quitar un ejercicio de un biset lo deja como ejercicio suelto (Accesorios, sin A1/A2); quitar el último pide borrar el bloque' },
  { id: 'elite.ed.04', area: 'Builder · editor estructurado', fn: 'eliteEd', input: { caso: 'agregar' },
    expect: { antes: 8, despues: 11, ejercicio: 'Curl martillo', dosis: '3x12-15/0', antesDelCore: true }, modo: 'subset',
    nota: 'Agregar un ejercicio crea un bloque con la dosis por defecto del nivel, lo ubica antes del core / finisher y suma sus series al volumen del grupo' },
  { id: 'elite.ed.05', area: 'Builder · alertas automáticas', fn: 'eliteEd', input: { caso: 'alertas' },
    expect: { base: '', conPoleas: 'guiados', conAxial: 'axial,guiados', conRir: 'axial,guiados,rir', rirInter: 0 }, modo: 'subset',
    nota: 'Las alertas se encienden y apagan con el contenido: dos poleas seguidas en un biset, dos patrones axiales en un día y RIR 2 en el nivel élite (RIR 2 en intermedio no avisa)' },
  { id: 'elite.ed.06', area: 'Builder · alertas automáticas', fn: 'eliteEd', input: { caso: 'estacion' }, expect: ['«Curl de bíceps tras la espalda» y «Curl martillo» se hacen en estaciones distintas (la torre de poleas y la zona de mancuernas): el biset obliga a cruzar el gimnasio.'],
    nota: 'Un biset que mezcla una polea con mancuernas avisa que obliga a cruzar el gimnasio (logística de salón)' },
  { id: 'elite.ed.07', area: 'Builder · alertas automáticas', fn: 'eliteEd', input: { caso: 'core' }, expect: ['core'],
    nota: 'La misma plancha lateral en los 3 días del plan dispara el aviso de core repetido' },
  { id: 'elite.ed.08', area: 'Builder · editor estructurado', fn: 'eliteEd', input: { caso: 'alternativas' },
    expect: { hip: true, sinSiMismo: true, sinAvanzadosEnMujeres: true, conAvanzadosEnHombres: true, respaldo: true }, modo: 'subset',
    nota: 'Las alternativas salen de la familia del ejercicio (sin repetirlo), no ofrecen rueda / colgado / dominadas lastradas a la base de alumnas y, si no hay familia, se arman con la biblioteca (mismo grupo y patrón)' },
  { id: 'elite.ed.09', area: 'Builder · volumen semanal', fn: 'eliteEd', input: { caso: 'volumen' },
    expect: { pecho: 4, lateral: 5, gluteo: 3, core: 3, rangoInter: '14-25' }, modo: 'subset',
    nota: 'El volumen suma las series de cada ejercicio en su grupo muscular y el intermedio usa los rangos al 70%' },
  { id: 'elite.ed.10', area: 'Builder · asignación', fn: 'eliteEd', input: { caso: 'asignar' },
    expect: { asignada: true, dias: 4, conCambio: true, sinOriginal: true, semanas: true, otroIntacto: true, barra: true, filas: 12 }, modo: 'subset',
    nota: 'Una plantilla élite editada en el Banco se asigna con sus cambios (4 semanas proyectadas), el plan de otro alumno no se toca y el Builder muestra la barra de control con las 12 filas de volumen semanal' }
]);
