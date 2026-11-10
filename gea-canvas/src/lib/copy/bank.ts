/**
 * Banco de copys de Hotel GEA. Regla de voz: sofisticado, sugerente, moderno, discreto, cómplice.
 * Nada explícito ni vulgar, nada de clichés ("nidito de amor", "pasión desenfrenada", emojis de fuego en serie).
 * Español rioplatense (vos), frases cortas, ritmo de lectura en pantalla de celular.
 */
import type { PillarKey, ToneKey } from '@/lib/types';

export const TONES: Record<ToneKey, { name: string; desc: string }> = {
  sofisticado: { name: 'Sofisticado', desc: 'Elegante, pausado, de hotel boutique.' },
  sugerente: { name: 'Sugerente', desc: 'Insinúa sin decir. Deja la imagen al lector.' },
  complice: { name: 'Cómplice', desc: 'Guiño entre adultos que se entienden.' },
  directo: { name: 'Directo', desc: 'Claro y útil, sin perder estilo.' },
};

export interface Objective {
  id: string;
  name: string;
  pillar: PillarKey;
  /** Dirección visual por formato. */
  visual: { reel: string[]; story: string[]; feed: string[]; carousel: string[] };
  bodies: string[];
  /** Hashtags específicos del objetivo. */
  tags: string[];
}

export const OBJECTIVES: Objective[] = [
  // ───────── EXPERIENCIA & ATMÓSFERA
  {
    id: 'suite-jacuzzi',
    name: 'Mostrar la suite con jacuzzi',
    pillar: 'experiencia',
    visual: {
      reel: [
        'Plano detalle del agua llenando el jacuzzi a contraluz magenta; corte a paneo lento de la suite con la tira LED encendiéndose. Ritmo pausado, 7–9 s, sin personas, cámara en gimbal a 30 cm del agua.',
        'Apertura en negro, se enciende el neón del respaldo; travelling lateral de la cama al jacuzzi con vapor visible. Música downtempo, cortes en el beat cada 1,5 s.',
      ],
      story: [
        'Foto vertical del jacuzzi con burbujas en primer plano y la suite desenfocada detrás. Encuadre 9:16 con el borde del jacuzzi en el tercio inferior, por encima de la zona de respuestas.',
      ],
      feed: [
        'Foto 4:5 cenital del jacuzzi con dos copas apoyadas en el borde; luz rosa rasante, sombras profundas, sin rostros.',
      ],
      carousel: [
        'Carrusel continuo de 3 slides: panorámica de la suite que se recorre al deslizar (cama → iluminación → jacuzzi). Las costuras caen sobre columnas o cortinas para que el corte no se note.',
      ],
    },
    bodies: [
      'Agua tibia, luz baja y una puerta que se cierra detrás de ustedes. La suite con jacuzzi está pensada para que el tiempo pase más lento.',
      'Burbujas, sábanas recién planchadas y un neón que hace el resto. Todo listo antes de que lleguen.',
      'Hay lugares que se describen. Este conviene comprobarlo. Suite con jacuzzi, climatización individual y diseño que invita a quedarse.',
    ],
    tags: ['#SuiteConJacuzzi', '#Jacuzzi', '#DiseñoInterior'],
  },
  {
    id: 'ambientacion-neon',
    name: 'Posicionar la ambientación neón',
    pillar: 'experiencia',
    visual: {
      reel: [
        'Secuencia de luces: interruptor, el neón rosa parpadea y se estabiliza, reflejo en el espejo. Planos de 1 s sincronizados con un bajo profundo. Cierre con el isotipo GEA en neón.',
      ],
      story: ['Video corto en loop del cartel neón reflejado en el piso pulido; encuadre centrado, cámara fija.'],
      feed: ['Foto del pasillo con neón en perspectiva de fuga, filtro Magenta neón al 70 %, grano sutil.'],
      carousel: ['3 slides: detalle de luz → reflejo en vidrio → suite completa iluminada. Mismo filtro en las tres para continuidad.'],
    },
    bodies: [
      'La luz cambia todo. En GEA cada suite tiene su propia atmósfera: neón, penumbra y el clima justo para desconectar.',
      'Diseñamos la luz para que no tengas que pensar en nada más. Solo en quién tenés al lado.',
      'Rosa, cian o penumbra total. Elegí el clima y nosotros nos ocupamos del resto.',
    ],
    tags: ['#LuzNeón', '#DiseñoDeVanguardia', '#Atmósfera'],
  },
  {
    id: 'amenities',
    name: 'Destacar amenities y confort',
    pillar: 'experiencia',
    visual: {
      reel: ['Flat-lay animado: batas, toallas dobladas, kit de amenities y control de luces apareciendo en stop-motion. 6 s, fondo carbón.'],
      story: ['Foto de producto de los amenities sobre mármol, luz ámbar lateral, mucho aire arriba para el sticker.'],
      feed: ['Bodegón 4:5: bata, copa y llave magnética sobre sábana blanca. Paleta carbón + ámbar.'],
      carousel: ['Carrusel de detalles: un amenity por slide con su píldora explicativa.'],
    },
    bodies: [
      'Batas suaves, amenities de calidad, colchones que no quieren que te vayas. El confort está en los detalles.',
      'Todo lo que necesitás ya está en la suite. Lo único que tienen que traer es ganas de pasarla bien.',
    ],
    tags: ['#Amenities', '#Confort', '#HotelBoutique'],
  },
  // ───────── COMPLICIDAD & OCASIÓN
  {
    id: 'romper-rutina',
    name: 'Escapada para romper la rutina',
    pillar: 'complicidad',
    visual: {
      reel: [
        'Contraste en dos actos: planos rápidos y desaturados de oficina, tráfico y mails (filtro Dark mood) → corte seco a la suite en Magenta neón, ritmo lento. Texto en pantalla: "Martes, 20:47".',
      ],
      story: ['Encuesta en story: "¿Hace cuánto no se escapan un martes?" sobre foto de la llave magnética en una mano.'],
      feed: ['Foto de dos manos con la llave GEA, fondo desenfocado de pasillo neón. Sin rostros.'],
      carousel: ['Slide 1 rutina (gris) → slide 2 la puerta → slide 3 la suite encendida. El color narra el cambio.'],
    },
    bodies: [
      'La semana tiene sus horarios. Esta noche, no. Una escapada a mitad de semana puede cambiarles el ánimo hasta el viernes.',
      'No hace falta un viaje para salir de la rutina. Hace falta una puerta que se cierre y nadie que pregunte.',
      'El mejor plan de la semana queda a unas cuadras y no necesita valija.',
    ],
    tags: ['#RomperLaRutina', '#EscapadaEnPareja', '#PlanDePareja'],
  },
  {
    id: 'fecha-calendario',
    name: 'Guiño de calendario (21 de septiembre, 14 de febrero…)',
    pillar: 'complicidad',
    visual: {
      reel: ['Close-up de un calendario de papel donde una mano marca el día con labial; corte a la suite iluminada. 5 s, loop perfecto.'],
      story: ['Sticker ticket de fecha sobre foto de la suite con filtro Warm amber; cuenta regresiva de Instagram al pie (fuera de la zona de respuestas).'],
      feed: ['Composición con ticket impreso de fecha inclinado sobre sábanas, luz cálida, sombra marcada.'],
      carousel: ['3 slides: la fecha → la propuesta (suite + trago) → información clara de turnos y pernocte.'],
    },
    bodies: [
      'Hay fechas que se festejan en público y otras que se festejan como corresponde. Este año, que la celebración sea solo de ustedes.',
      'Flores, chocolates… o una noche que no se olvida. Ya saben cuál elegimos.',
      'El calendario dice que es una fecha especial. Ustedes deciden qué tan especial.',
    ],
    tags: ['#NocheEspecial', '#Aniversario', '#FechaEspecial'],
  },
  {
    id: 'celebracion',
    name: 'Celebraciones y aniversarios',
    pillar: 'complicidad',
    visual: {
      reel: ['Brindis en cámara lenta: dos copas chocan, burbujas en macro, neón de fondo. Cierre con el tag de regalo "Un regalo que no se envuelve".'],
      story: ['Tag colgante de regalo sobre foto de la cama con pétalos discretos (sin exceso), filtro Magenta neón suave.'],
      feed: ['Foto 1:1 de dos copas y la cubitera sobre la mesa de la suite, luz rosa a contraluz.'],
      carousel: ['Carrusel "plan perfecto": cena → GEA → brindis. Una frase corta por slide.'],
    },
    bodies: [
      'Un año más juntos merece algo más que una foto. Brindis, suite y toda la noche por delante.',
      'Celebrar también es regalarse tiempo. El nuestro corre a otro ritmo.',
    ],
    tags: ['#Aniversario', '#Celebración', '#RegaloDePareja'],
  },
  // ───────── CALIDAD & SERVICIO 24 HS
  {
    id: 'carta-tragos',
    name: 'Promocionar la carta de tragos',
    pillar: 'calidad',
    visual: {
      reel: ['Coctelería en macro: hielo cayendo, twist de naranja, humo de romero. Iluminación ámbar lateral, 3 planos de 2 s y cierre con la carta en la mano.'],
      story: ['Foto del trago estrella sobre la mesa de luz con la suite desenfocada; píldora "Pedilo a la habitación".'],
      feed: ['Bodegón 4:5 de dos tragos de autor con gotas de condensación, fondo carbón y filtro Warm amber.'],
      carousel: ['Un trago por slide con nombre, ingredientes clave y una línea sugerente.'],
    },
    bodies: [
      'Nuestra carta de tragos llega a la habitación en minutos. Clásicos bien hechos y versiones de autor para brindar sin salir.',
      'Gin tonic, espumante o algo más audaz. Pedilo desde la suite y nosotros lo llevamos.',
      'Un buen trago cambia el ritmo de la noche. La carta está en la suite; el resto lo deciden ustedes.',
    ],
    tags: ['#CocteleríaDeAutor', '#Tragos', '#BarALaHabitación'],
  },
  {
    id: 'snackeria',
    name: 'Snackería rápida de calidad',
    pillar: 'calidad',
    visual: {
      reel: ['Bandeja que entra por la ventanilla de servicio en un solo plano, sin mostrar al personal. Énfasis en la rapidez: reloj en pantalla 00:00 → 00:12.'],
      story: ['Foto cenital de la tabla de snacks sobre la cama, luz cálida, píldora con el horario 24 hs.'],
      feed: ['Composición de snacks y tragos en mesa baja, estilo editorial gastronómico, 4:5.'],
      carousel: ['Menú visual: dulce → salado → para compartir.'],
    },
    bodies: [
      'Hambre a las 3 de la mañana también es una ocasión. Snacks frescos y rápidos, a cualquier hora.',
      'Tablas, sándwiches y algo dulce para el final. Pedís, llega, y nadie golpea dos veces.',
    ],
    tags: ['#Snacks', '#Servicio24hs', '#RoomService'],
  },
  {
    id: 'privacidad',
    name: 'Privacidad total y atención discreta',
    pillar: 'calidad',
    visual: {
      reel: ['POV de un auto entrando a la cochera cubierta, el portón se cierra; corte a una puerta con el número de la suite. Sin rostros, sin patentes.'],
      story: ['Foto del ingreso con cochera individual, filtro Cyan noche, píldora "Ingreso discreto".'],
      feed: ['Plano de la puerta de la suite entreabierta con luz rosa saliendo, pasillo en penumbra.'],
      carousel: ['"Cómo es llegar a GEA" en 3 pasos: cochera → ingreso → suite. Claro y sin exponer a nadie.'],
    },
    bodies: [
      'Cochera cubierta, ingreso directo y un equipo que sabe que lo mejor es no estar a la vista. Acá la discreción no es un extra: es la regla.',
      'Nadie pregunta, nadie mira, nadie se entera. Así trabajamos desde el primer día.',
      'Tu privacidad la cuidamos como cuidamos la higiene: de manera impecable y sin excepciones.',
    ],
    tags: ['#Privacidad', '#Discreción', '#IngresoDiscreto'],
  },
  // ───────── CLARIDAD DE INFORMACIÓN
  {
    id: 'turnos-pernocte',
    name: 'Explicar turnos, extendidos y pernocte',
    pillar: 'claridad',
    visual: {
      reel: ['Texto cinético sobre la suite: "Turno", "Turno extendido", "Pernocte" aparecen como píldoras al ritmo; cierre con "Sin reservas. Llegás y listo".'],
      story: ['Placa informativa limpia: tres píldoras apiladas con cada modalidad sobre fondo carbón con halo rosa; logo al pie, dentro de la zona segura.'],
      feed: ['Infografía 4:5 sobria: tres columnas con íconos lineales, tipografía Syncopate para títulos.'],
      carousel: ['Slide 1 la pregunta ("¿Turno o pernocte?") → slide 2 turnos → slide 3 pernocte → slide 4 medios de pago.'],
    },
    bodies: [
      'Turno estándar, turno extendido o pernocte: elegí cuánto tiempo necesitan. Sin reservas previas, llegás y te atendemos.',
      'Para una pausa o para la noche entera. Turnos y pernoctes todos los días, a cualquier hora.',
      'El pernocte es para los que no quieren mirar el reloj. Entran a la noche y salen con el desayuno en el cuerpo.',
    ],
    tags: ['#Pernocte', '#Turnos', '#SinReservas'],
  },
  {
    id: 'horarios',
    name: 'Abierto 24 hs, 365 días',
    pillar: 'claridad',
    visual: {
      reel: ['Time-lapse del frente iluminado de día a noche, reloj en pantalla girando; cierre en la cinta "Abierto 24 hs · 365 días".'],
      story: ['Cinta diagonal sobre foto del frente de noche, filtro Cyan noche.'],
      feed: ['Foto del cartel GEA encendido en la madrugada, composición centrada, mucho negro.'],
      carousel: ['Lunes a domingo en 7 mini-placas: siempre abierto.'],
    },
    bodies: [
      'No cerramos. Ni feriados, ni domingos, ni a las 4 de la mañana. Cuando sea el momento, acá estamos.',
      '24 horas, 365 días. La única agenda que importa es la de ustedes.',
    ],
    tags: ['#Abierto24hs', '#365Días', '#TodoElAño'],
  },
  {
    id: 'medios-pago',
    name: 'Medios de pago',
    pillar: 'claridad',
    visual: {
      reel: ['Mano apoyando el celular en el posnet (sin mostrar datos), corte a la suite. Texto: "Efectivo · Débito · Crédito · QR".'],
      story: ['Placa con cuatro píldoras de medios de pago, fondo carbón, isotipo GEA en neón.'],
      feed: ['Diseño tipográfico limpio con los medios de pago y la frase "Pagás como quieras".'],
      carousel: ['Slide de pagos al final de un carrusel de producto, como cierre práctico.'],
    },
    bodies: [
      'Efectivo, débito, crédito o QR: pagás como te quede cómodo. El resumen dice "GEA", nada más.',
      'Sin vueltas a la hora de pagar. Aceptamos todos los medios y la facturación es discreta.',
    ],
    tags: ['#MediosDePago', '#PagoConQR', '#Discreción'],
  },
];

/** Ganchos por pilar y tono. */
export const HOOKS: Record<PillarKey, Record<ToneKey, string[]>> = {
  experiencia: {
    sofisticado: ['Diseñada para que el tiempo se detenga.', 'La luz justa. La temperatura justa. La compañía, la suya.', 'Algunas noches merecen un escenario a la altura.'],
    sugerente: ['Imaginá esta luz… y ahora imaginá lo que no se ve.', 'Lo que pasa después de apagar la luz principal.', 'El agua ya está tibia.'],
    complice: ['Ustedes ponen las ganas. Nosotros, el jacuzzi.', 'Spoiler: no van a mirar el celular.', 'Esta suite no sale en las fotos de nadie. Mejor.'],
    directo: ['Suites con jacuzzi, neón y climatización individual.', 'Así son nuestras suites.', 'Confort premium, a minutos del centro.'],
  },
  complicidad: {
    sofisticado: ['Hay planes que no se cuentan. Se viven.', 'El lujo de desaparecer un rato.', 'Una pausa elegante en medio de la semana.'],
    sugerente: ['Lo que empieza con un mensaje a las 19:00…', 'Nadie tiene que saber dónde estuvieron.', 'Esa mirada que dice "¿vamos?".'],
    complice: ['Ustedes ya saben. Nosotros también.', 'Mandale esto. No hace falta explicar nada.', 'Martes, pero con otra actitud.'],
    directo: ['¿Hace cuánto no se escapan?', 'El plan para esta semana, resuelto.', 'Sorprendé sin reservar.'],
  },
  calidad: {
    sofisticado: ['Servicio impecable, a cualquier hora.', 'La discreción también es un servicio de excelencia.', 'Detalles que se notan. Personal que no.'],
    sugerente: ['Pedís desde la cama. Llega sin que nadie los vea.', 'Un trago frío en el momento justo.', 'Lo único que se escucha es el hielo en el vaso.'],
    complice: ['Nadie pregunta, todos imaginan.', 'El room service más discreto de Tucumán.', 'Sí, a las 4 de la mañana también.'],
    directo: ['Carta de tragos y snacks, 24 hs.', 'Privacidad total: cochera cubierta e ingreso directo.', 'Limpieza impecable en cada suite, siempre.'],
  },
  claridad: {
    sofisticado: ['Todo lo que necesitan saber, sin letra chica.', 'Simple, claro y a su medida.', 'Su tiempo, sus reglas.'],
    sugerente: ['¿Un rato o toda la noche?', 'El reloj lo eligen ustedes.', 'Llegan cuando quieren. Se van cuando quieren.'],
    complice: ['Sin reservas, sin preguntas, sin vueltas.', 'Respuesta corta: sí, estamos abiertos.', 'Guardalo para cuando lo necesites.'],
    directo: ['Turnos, extendidos y pernoctes: así funciona.', 'Abiertos 24 hs, los 365 días.', 'Medios de pago: efectivo, débito, crédito y QR.'],
  },
};

export const CTAS: Record<ToneKey, string[]> = {
  sofisticado: [
    'Sin reservas previas: los esperamos a cualquier hora. Consultas por mensaje directo.',
    'Abiertos 24 hs. Para cualquier consulta, escribinos por DM.',
  ],
  sugerente: ['No hace falta reservar. Solo vengan. Dudas, por DM.', 'La puerta está abierta las 24 hs. Lo demás, por mensaje privado.'],
  complice: [
    'Guardá este post para cuando sea el momento. Consultas por DM 🔒',
    'Etiquetá a quien tiene que verlo (o mandáselo por privado). Sin reservas, llegás y listo.',
    'Escribinos por DM: respondemos rápido y con discreción.',
  ],
  directo: ['Sin reserva previa. Llegás y te atendemos. Consultas por DM.', 'Escribinos por mensaje directo y te pasamos tarifas del día.'],
};

export const BASE_TAGS = ['#HotelGEA', '#GEASuites', '#Tucumán', '#SanMiguelDeTucumán', '#TucumánDeNoche'];
export const PILLAR_TAGS: Record<PillarKey, string[]> = {
  experiencia: ['#HotelBoutique', '#ExperienciaGEA', '#NocheDePareja'],
  complicidad: ['#PlanDePareja', '#EscapadaEnPareja', '#NocheDePareja'],
  calidad: ['#Servicio24hs', '#Privacidad', '#AtenciónPremium'],
  claridad: ['#Abierto24hs', '#SinReservas', '#InfoGEA'],
};

export const OCCASIONS = [
  { id: 'none', name: 'Sin ocasión' },
  { id: '21sep', name: '21 de septiembre', line: 'El 21 ya se sabe cómo se festeja.', tag: '#21DeSeptiembre' },
  { id: '14feb', name: '14 de febrero', line: 'San Valentín, pero sin cliché.', tag: '#SanValentín' },
  { id: 'aniv', name: 'Aniversario', line: 'Un año más merece una noche aparte.', tag: '#Aniversario' },
  { id: 'viernes', name: 'Viernes a la noche', line: 'Viernes: la semana terminó, la noche no.', tag: '#ViernesDeNoche' },
  { id: 'invierno', name: 'Noches de frío', line: 'Afuera el frío, adentro otra cosa.', tag: '#NochesDeInvierno' },
  { id: 'vuelta', name: 'Vuelta al trabajo', line: 'Después de la vuelta al trabajo, esto.', tag: '#VueltaALaRutina' },
  { id: 'fin-anio', name: 'Fiestas de fin de año', line: 'Brindemos donde nadie mira.', tag: '#FinDeAño' },
] as const;

export type OccasionId = (typeof OCCASIONS)[number]['id'];
