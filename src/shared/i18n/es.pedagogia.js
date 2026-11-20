/* Diccionario base (español rioplatense) · pautas pedagógicas de cada bloque: series de aproximación, por qué esa cantidad de series y objetivo de carga.
   Los {marcadores} los completa el generador con los números reales del bloque (series, repeticiones, RIR). */
JP_I18N.add('es', {
  /* rótulos de la pauta: el generador y las listas de exclusión los reconocen */
  'motor.lbl.aprox': 'SERIES DE APROXIMACIÓN',
  'motor.lbl.porque': 'POR QUÉ ESTA CANTIDAD DE SERIES',
  'motor.lbl.carga': 'OBJETIVO DE CARGA',

  'motor.ped.rango': '{lo} a {hi}',
  'motor.ped.entre': 'entre {lo} y {hi}',
  'motor.ped.lado.sufijo': ' por lado',
  'motor.ped.rir.def': 'una o dos repeticiones en reserva',
  'motor.ped.rir.r0': 'ninguna repetición en reserva (pero con la técnica intacta)',
  'motor.ped.rir.r01': 'una repetición en reserva como mucho (o ninguna, siempre con la técnica intacta)',
  'motor.ped.rir.r1': 'una repetición en reserva',
  'motor.ped.rir.r2': 'dos repeticiones en reserva',
  'motor.ped.rir.rn': '{n} repeticiones en reserva',
  'motor.ped.rir.rango': 'entre {lo} y {hi} repeticiones en reserva',
  'motor.ped.serie.efectiva.one': '{n} serie efectiva',
  'motor.ped.serie.efectiva.other': '{n} series efectivas',
  'motor.ped.dosis.reps': '{sets} series de {rango} repeticiones{lado}',
  'motor.ped.dosis.tiempo': '{sets} series de {rango} segundos',
  'motor.ped.efectivas': 'Las series efectivas son solo las {dosis} que pide este bloque, con {rir} al terminar cada una.',
  'motor.ped.efectivas.lado': ' La cifra es POR LADO: hacés las repeticiones con un lado, cambiás y hacés las mismas con el otro, y eso cuenta como una serie. El volumen no se duplica: cada lado recibe esas {sets} series.',

  'motor.ped.aprox.lado': ' En ejercicios por lado, hacé las aproximaciones con cada pierna o brazo.',
  'motor.ped.aprox.F': 'son tu calentamiento específico, van ANTES de las series efectivas y son siempre livianas. Hacé 3: la primera con la mitad del peso de trabajo y 8 repeticiones fáciles, la segunda con el 70% y 5 repeticiones, la tercera con el 85% y 2 o 3 repeticiones. Descansá 1 minuto entre ellas y no te acerques nunca al fallo: tienen que dejarte listo, no cansado. No se anotan ni cuentan como volumen. {efectivas}{lado}',
  'motor.ped.aprox.H': 'son calentamiento específico y van ANTES de las series efectivas. Hacé 2: la primera con el 60% del peso de trabajo y 6 repeticiones, la segunda con el 80% y 3 repeticiones, descansando un minuto entre ellas. Si recién hiciste otro ejercicio que trabaja el mismo músculo, alcanza con una sola al 80%. No se anotan ni cuentan como volumen. {efectivas}{lado}',
  'motor.ped.aprox.A': 'acá casi no hacen falta porque el músculo ya está caliente de los ejercicios anteriores. Si es el primer ejercicio que hacés para ese grupo, hacé una serie liviana con la mitad del peso y 10 repeticiones antes de empezar. {efectivas}',

  'motor.ped.musculo.piernas': 'tren inferior',
  'motor.ped.musculo.def': 'el músculo',
  'motor.ped.porque.F': '{series}: es el ejercicio donde más peso movés y donde se gana la fuerza que sostiene el resto de la sesión. Esa cantidad alcanza para estimular las fibras más grandes con la mejor calidad posible; sumar más series acá solo traería fatiga que te quitaría rendimiento en los bloques que siguen, y el resto del volumen de la semana lo ponen los otros ejercicios.',
  'motor.ped.porque.H': '{series} para {musculo}: este bloque aporta el volumen principal del día con carga seria y un recorrido largo. Sumado a los demás ejercicios del grupo, esa cantidad te lleva al volumen semanal que hace crecer el músculo (más o menos de 10 a 20 series por semana) sin pasarte de lo que podés recuperar entre sesiones.',
  'motor.ped.porque.A': '{series}: es un aislamiento, así que cada serie es corta en esfuerzo total pero muy exigente para el músculo puntual. Suma volumen donde los ejercicios compuestos ya no llegan, casi sin fatiga general; por eso se hacen pocas series, bien cerca del fallo, en vez de muchas "de relleno".',
  'motor.ped.porque.BT': '{sets} rondas: cada ronda encadena {estaciones} sin pausa, así que cada estación suma {sets} series efectivas en pocos minutos. Es un cierre de congestión: con esa cantidad el músculo recibe volumen extra y no se acumula fatiga que te arruine la próxima sesión.',
  'motor.ped.porque.estaciones.2': 'los dos ejercicios',
  'motor.ped.porque.estaciones.n': 'los {n} ejercicios',
  'motor.ped.porque.C': '{series}: el abdomen se recupera rápido, pero lo que importa es la calidad. Con esas series bien hechas, con el tronco firme, alcanza para fortalecerlo y marcarlo sin cargar la zona lumbar.',

  'motor.ped.carga.core.tiempo': 'los {rango} segundos',
  'motor.ped.carga.core.reps': 'las {rango} repeticiones',
  'motor.ped.carga.core': 'elegí la variante más difícil con la que puedas sostener {que} sin arquear la zona lumbar ni perder la posición, y terminar con {rir}. Si te sobra mucho, sumá palanca o peso; si se rompe la técnica antes, pasá a una versión más fácil.',
  'motor.ped.carga.multi': 'en cada estación elegí un peso con el que llegues al techo de las repeticiones ({rango}) con la técnica limpia y termines la ronda con {rir}. Como no hay descanso entre estaciones, arrancá un poco más liviano que si hicieras el ejercicio solo y ajustá desde la segunda ronda.',
  'motor.ped.carga.single': 'buscá un peso exigente pero técnico: el que te permite hacer {entre} repeticiones{lado} con el movimiento completo y que al terminar cada serie te deje con {rir}. RIR es la cantidad de repeticiones que todavía podrías hacer. Si en la primera serie hacés {sube} repeticiones o más, el peso es liviano: subí 2,5 kg (1 kg en brazos y hombros). Si no llegás a {lo} repeticiones, bajá entre 5 y 10%. Cuando completás todas las series en el techo del rango ({hi}), sumá peso y volvé al piso.'
});
