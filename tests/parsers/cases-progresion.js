/* ============================================================
   CASOS · progresión de cargas entre semanas (app del alumno) y sanidad del editor del Builder
   La app del alumno compilada recibe un historial simulado (state.loads / state.rirEx) y se le pide la carga sugerida de la semana siguiente con jpSugerirCarga();
   nada se guarda. Regla de la doble progresión: si en la semana de referencia llegó al TOPE del rango de repeticiones con reservas (RIR 1 o más, o sin RIR marcado),
   la carga sube; si no llegó al tope, o marcó RIR 0 (fallo), se mantiene y se busca el tope.
   ============================================================ */
(function(){
  var B = 'bk1', E = { idx: 'e0', nombre: 'Press de banca plano con barra', reps: '5-7', rir: '2' };
  /* 4 series del ejercicio en una semana: kg x reps, hechas o en borrador */
  function serie(w, kg, reps, done, bloque, extra){
    var o = {};
    [1, 2, 3, 4].forEach(function(s){ var l = { kg: String(kg), ex: E.nombre }; if(reps != null) l.reps = String(reps); if(done) l.done = true; if(extra) Object.keys(extra).forEach(function(k){ l[k] = extra[k]; }); o[w + '|dia1|' + (bloque || B) + '|e0|' + s] = l; });
    return o;
  }
  function juntar(){ var o = {}; [].slice.call(arguments).forEach(function(x){ Object.keys(x).forEach(function(k){ o[k] = x[k]; }); }); return o; }
  function caso(id, nota, w, loads, esperado, extra){
    var c = { id: id, area: 'App del alumno · carga sugerida', fn: 'alumnoProg', input: { loads: loads, rirEx: (extra && extra.rirEx) || {}, c: { w: w, d: 'dia1', b: B }, e: (extra && extra.e) || E, setN: 1 }, expect: esperado, modo: 'subset', nota: nota };
    return c;
  }
  window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([
    caso('prog.01', 'S1: 80 kg x 7 (tope del rango 5-7) y sin RIR marcado → la Semana 2 sube a 82,5 kg', 1, serie(0, 80, 7, true), { kg: 82.5, origen: 'progresion' }),
    caso('prog.02', 'S1 al tope pero marcó RIR 0 (fallo) → mantiene 80 kg: primero reservas, después más peso', 1, serie(0, 80, 7, true), { kg: 80, origen: 'progresion' }, { rirEx: { '0|dia1|bk1|e0': 0 } }),
    caso('prog.03', 'S1 al tope con RIR 2 (reservas de sobra) → sube a 82,5 kg', 1, serie(0, 80, 7, true), { kg: 82.5 }, { rirEx: { '0|dia1|bk1|e0': 2 } }),
    caso('prog.04', 'S1 por debajo del tope (6 de 5-7) → mantiene 80 kg y busca el tope', 1, serie(0, 80, 6, true), { kg: 80 }),
    caso('prog.05', 'Lo cargado y no tildado (borrador) también sirve de referencia: antes la Semana 2 quedaba vacía si el alumno salía sin tildar ✓', 1, serie(0, 80, 7, false), { kg: 82.5 }),
    caso('prog.06', 'El bloque de la Semana 1 tiene otro ID (plan regenerado o plantilla reasignada): se encuentra por el NOMBRE del ejercicio', 1, serie(0, 80, 7, true, 'bloque_viejo'), { kg: 82.5 }),
    caso('prog.07', 'Solo kilos cargados (sin repeticiones) → la Semana 2 precarga esos kilos', 1, serie(0, 80, null, false), { kg: 80 }),
    caso('prog.08', 'S3 nunca por debajo de lo que ya hizo en S2: S1 80 x 7 y S2 90 x 7 → 92,5 kg', 2, juntar(serie(0, 80, 7, true), serie(1, 90, 7, true)), { kg: 92.5 }),
    caso('prog.09', 'S3 no pide más de lo que no pudo completar en S2: S1 80 x 7 y S2 82,5 x 4 (menos del mínimo) → mantiene 82,5 kg', 2, juntar(serie(0, 80, 7, true), serie(1, 82.5, 4, true)), { kg: 82.5 }),
    caso('prog.10', 'Semana de descarga (S4): ~85% de la base de la Semana 1 (80 kg → 67,5 kg)', 3, serie(0, 80, 7, true), { kg: 67.5, origen: 'descarga' }),
    caso('prog.11', 'Una serie desmarcada a propósito (done = false) no cuenta como registro', 1, serie(0, 80, 7, false, B, { done: false }), { origen: 'rir' }),
    caso('prog.12', 'Sin ningún registro previo no se inventa una carga', 1, {}, { kg: 0, origen: 'rir' }),
    { id: 'prog.13', area: 'App del alumno · carga sugerida', fn: 'alumno', input: { fn: 'jpProgresionCarga', args: [{ kg: 100, reps: 8 }, { min: 5, max: 8 }, null, 1.025] }, expect: { kg: 102.5, sube: true }, modo: 'subset',
      nota: 'Doble progresión pura: llegó al tope (8 de 5-8) → +2,5 kg' },
    { id: 'prog.14', area: 'App del alumno · carga sugerida', fn: 'alumno', input: { fn: 'jpProgresionCarga', args: [{ kg: 100, reps: 8 }, { min: 5, max: 8 }, 0, 1.025] }, expect: { kg: 100, sube: false, motivo: 'fallo' }, modo: 'subset',
      nota: 'Llegó al tope pero con RIR 0: mantiene la carga' },

    /* ---- sanidad del editor del Builder ---- */
    { id: 'ed.id.01', area: 'Builder · edición', fn: 'editorPlan', input: { caso: 'idValido', casos: ['dia9', ' dia 9 ', 'dia|9', '', 'dia2', 'día@3'] }, expect: ['dia9', 'dia9', 'dia9', '✗', '✗', 'da3'],
      nota: 'El ID interno del día (clave de todo lo que registra el alumno) solo acepta letras, números, guion y guion bajo; nunca queda vacío ni repetido' },
    { id: 'ed.est.01', area: 'Builder · edición', fn: 'editorPlan', input: { caso: 'validador' }, expect: { repiteDia: true, repiteBloque: true, barra: true, sinId: true, listaRota: true, sano: 0 }, modo: 'subset',
      nota: 'El validador de estructura detecta IDs de día repetidos, bloques repetidos, IDs con "|", días sin ID y listas de bloques dañadas' },
    { id: 'ed.est.02', area: 'Builder · edición', fn: 'editorPlan', input: { caso: 'plantillasSanas' }, expect: [],
      nota: 'Todas las plantillas del Banco tienen una estructura sana (IDs de día y de bloque únicos)' },
    { id: 'ed.dias.01', area: 'Builder · edición', fn: 'editorPlan', input: { caso: 'altasYBajas' }, expect: { problemas: [], cantidad: 5 }, modo: 'subset',
      nota: 'Quitar y agregar días en cualquier orden nunca repite el ID de un día (con IDs repetidos las cargas de dos días se pisan)' }
  ]);
})();
