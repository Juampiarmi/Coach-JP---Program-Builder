import type { EditorialGoal, EditorialTone, GenMode } from './ai'
import type { QuoteIntent } from './quoteIntent'
import { servicePatch } from './services'
import type { CanvasState } from '../types'

/**
 * PLAN SEMANAL COACH JP (weekly pack): 7 días de contenido listos para publicar, cada uno con su tema,
 * su paper de respaldo, su estructura de placas y su prompt para re-generar con IA en 1 clic.
 *
 * - «Cargar» arma el set PRECARGADO (copy escrito a mano, sin API Key ni cuota).
 * - «Generar con IA» manda el prompt del día con el formato, objetivo y tono ya fijados.
 *
 * Las referencias son papers reales; el «finding» está redactado de forma conservadora. Igual hay que
 * abrir el paper antes de publicar (ver /assets/weekly_pack/<día>/referencia.md).
 */

export interface PaperRef {
  /** «Apellido y col., año · Revista» (formato de la placa) */
  cite: string
  /** Título original del paper */
  title: string
  /** Qué encontró, en una línea de sala */
  finding: string
}

export interface WeeklyDay {
  id: string
  /** 0 = domingo … 6 = sábado */
  weekday: number
  day: string
  pillar: string
  theme: string
  /** Estructura del set (para la tarjeta) */
  structure: string
  format: Extract<GenMode, 'single' | 'carousel'>
  /** Carpeta del pack en /public/assets/weekly_pack/ */
  folder: string
  ref: PaperRef
  /** Generación con IA: brief completo + editorial fijado */
  prompt: string
  goal: EditorialGoal
  tone: EditorialTone
  quote?: QuoteIntent
  /** Set precargado (copy final) y caption de Instagram */
  slides: Partial<CanvasState>[]
  caption: string
}

const NO_CITE = { citeMain: '', citeSub: '' }
/**
 * Carrusel: contador «01 / 05» + «DESLIZÁ →» en todas las placas. El hilo de marca del carrusel
 * continuo sólo va en el set Opus Athletic (lunes): en placas densas cruzaría el texto.
 */
const CAROUSEL = { seamlessThread: false, slideCounter: true }

const athletic = (p: Partial<CanvasState>): Partial<CanvasState> => ({ template: 'athletic', athleticTheme: 'dark', athleticBg: 'auto', athleticPos: 'none', athleticMode: 'list', athleticRows: [], athleticNr: '', athleticCta: '', body: '', ...NO_CITE, ...CAROUSEL, seamlessThread: true, ...p })
const statement = (p: Partial<CanvasState>): Partial<CanvasState> => ({ template: 'statement', ...NO_CITE, kicker: '', body: '', ...CAROUSEL, ...p })
const bookmark = (tag: string, a: string, b: string, points: string[], cta: string): Partial<CanvasState> => ({
  template: 'bookmark',
  tag,
  headlineA: a,
  headlineB: b,
  body: '',
  ...NO_CITE,
  ...CAROUSEL,
  bookmarkData: { points, cta, accent: 'orange' },
})

export const WEEKLY_PACK: WeeklyDay[] = [
  {
    id: 'lun',
    weekday: 1,
    day: 'LUN',
    pillar: 'Ciencia / Fisiología',
    theme: 'Hipertrofia y tensión mecánica',
    structure: 'Carrusel 5 · Opus Athletic dark',
    format: 'carousel',
    folder: '01_lun_ciencia_hipertrofia',
    ref: {
      cite: 'Schoenfeld, 2010 · J Strength Cond Res',
      title: 'The mechanisms of muscle hypertrophy and their application to resistance training',
      finding: 'Ubica a la tensión mecánica como estímulo central del crecimiento muscular, junto al estrés metabólico y el daño muscular.',
    },
    goal: 'science',
    tone: 'academic',
    prompt:
      'Carrusel de 5 placas sobre HIPERTROFIA Y TENSIÓN MECÁNICA con la arquitectura Opus Athletic dark. Idea central: el músculo crece por la tensión que producen sus fibras cerca del fallo, no por el ardor ni el bombeo. Explicá el principio de tamaño y la relación fuerza-velocidad en lenguaje de sala, las reglas operativas (RIR 0-3, rango de 6 a 30 reps cerca del fallo, 10-20 series semanales por músculo) y una tabla de dosis por zona de intensidad. Evidencia a citar en el caption: Schoenfeld, 2010 · J Strength Cond Res («The mechanisms of muscle hypertrophy and their application to resistance training»). No cites otros papers.',
    slides: [
      athletic({ tag: 'GUÍA DE RENDIMIENTO // COACH JP', headlineA: 'HIPERTROFIA', headlineB: 'TENSIONANTE', body: 'El ardor y el bombeo no son la señal de que creciste. La tensión sí.' }),
      athletic({
        tag: 'FISIOLOGÍA Y MECANISMO',
        athleticNr: '1',
        headlineA: 'TENSIÓN',
        headlineB: 'MECÁNICA',
        body: 'Cuando la serie se pone pesada entran tus fibras más grandes (principio de tamaño).',
        athleticRows: [
          { k: 'Fibras grandes:', v: 'entran con carga alta o cerca del fallo' },
          { k: 'Reps lentas:', v: 'la barra frena y cada fibra tira más fuerte' },
          { k: 'Pump y ardor:', v: 'acompañan, pero no prueban estímulo' },
        ],
      }),
      athletic({
        tag: 'PRINCIPIOS OPERATIVOS',
        athleticNr: '2',
        headlineA: 'REGLAS DE',
        headlineB: 'APLICACIÓN',
        athleticRows: [
          { k: 'Cerca del fallo:', v: 'terminá cada serie a 0-3 repeticiones en reserva (RIR)' },
          { k: 'Rango amplio:', v: 'de 6 a 30 reps funciona si llegás cerca del fallo' },
          { k: 'Volumen semanal:', v: '10-20 series efectivas por músculo, según tu recuperación' },
        ],
      }),
      athletic({
        tag: 'DOSIFICACIÓN Y DENSIDAD',
        athleticNr: '3',
        headlineA: 'PROTOCOLO DE',
        headlineB: 'CARGA',
        athleticMode: 'table',
        athleticHead: ['Zona / intensidad', 'Dosis'],
        athleticRows: [
          { k: '80-85 % 1RM', v: '3-4 × 5-6 · RIR 1-2 · pausa 3 min' },
          { k: '67-80 % 1RM', v: '3-4 × 8-12 · RIR 1-2 · pausa 2-3 min' },
          { k: '50-65 % 1RM', v: '2-3 × 15-25 · RIR 0-2 · pausa 2 min' },
        ],
      }),
      athletic({ tag: 'CIERRE TÁCTICO', headlineA: 'ESTÁNDAR', headlineB: 'BIOLÓGICO', body: 'Registrá carga y reps de cada serie: si la tensión no sube con las semanas, el estímulo tampoco.', athleticCta: "ENVIÁ 'HIPERTROFIA' POR DM" }),
    ],
    caption:
      'El ardor no es la señal de que creciste. La tensión sí.\n\nCuando la serie se pone pesada entran tus fibras más grandes y cada una genera más tensión. Por eso las últimas reps, las lentas, son las que más cuentan.\n\n▸ Cerca del fallo: RIR 0-3\n▸ Rango amplio: 6-30 reps si llegás cerca del fallo\n▸ 10-20 series semanales por músculo\n▸ Registrá carga y reps: si no suben, el estímulo tampoco\n\nEvidencia: Schoenfeld, 2010 · J Strength Cond Res — «The mechanisms of muscle hypertrophy and their application to resistance training».\n\nGuardalo para tu próximo bloque. Mandá HIPERTROFIA por DM para tu programa.',
  },
  {
    id: 'mar',
    weekday: 2,
    day: 'MAR',
    pillar: 'Biomecánica / Error vs Corrección',
    theme: 'Bisagra de cadera en el peso muerto',
    structure: 'Carrusel 3 · Sentencia → Error vs Corrección → Guardado',
    format: 'carousel',
    folder: '02_mar_biomecanica_peso_muerto',
    ref: {
      cite: 'Vigotsky y col., 2015 · PeerJ',
      title: 'Effects of load on good morning kinematics and EMG activity',
      finding: 'Midió cómo cambian la cinemática y la actividad muscular de la bisagra de cadera (good morning) al subir la carga.',
    },
    goal: 'science',
    tone: 'viral',
    prompt:
      'Carrusel de EXACTAMENTE 3 placas sobre la técnica del PESO MUERTO (bisagra de cadera): 1) "sentencia" de portada que rompa el mito de tirar con los brazos o con la espalda; 2) "error_correccion" con el error del despegue (cadera que sube primero, barra que se aleja de las piernas) y su corrección (dorsales tensos, barra pegada, empujar el piso, cadera y hombros subiendo juntos); 3) "guardado" con un checklist de 4 puntos de la bisagra. Rigor biomecánico: nada de «la espalda tiene que estar perfectamente recta» ni alarmismo por cualquier flexión lumbar; hablá de mantener la posición estable durante la repetición. Evidencia (caption y citation de la portada): Vigotsky y col., 2015 · PeerJ («Effects of load on good morning kinematics and EMG activity»).',
    slides: [
      statement({
        tag: 'BIOMECÁNICA · PESO MUERTO',
        headlineA: 'EL PESO MUERTO NO SE',
        headlineB: 'TIRA CON LOS BRAZOS.',
        kicker: 'SE EMPUJA EL PISO.',
        body: 'Barra pegada, cadera y hombros subiendo juntos.',
        citeMain: 'VIGOTSKY Y COL., 2015 · PEERJ',
        citeSub: 'Efectos de la carga en la cinemática y la EMG de la bisagra de cadera (good morning)',
        bgStyle: 'concrete',
      }),
      {
        template: 'fix',
        tag: 'TÉCNICA · DESPEGUE',
        headlineA: 'EL ERROR QUE TE',
        headlineB: 'FRENA EN EL DESPEGUE.',
        fixWrongLabel: 'INCORRECTO',
        fixWrongText: 'La cadera sube primero y la barra se aleja de las piernas.',
        fixRightLabel: 'CORRECCIÓN TÁCTICA',
        fixRightText: 'Dorsales tensos, barra pegada y empujá el piso: cadera y hombros suben juntos.',
        fixAccent: 'brand',
        fixLayout: 'split',
        body: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'concrete',
      },
      bookmark(
        'CHECKLIST · BISAGRA',
        'CHECKLIST DE',
        'BISAGRA.',
        ['Barra sobre el medio del pie antes de tirar', 'Dorsales tensos: la barra no se separa de las piernas', 'Cadera y hombros suben al mismo ritmo', 'Bloqueo con glúteos, sin tirarte hacia atrás'],
        'GUARDÁ ESTE CHECKLIST PARA TU PRÓXIMA SESIÓN DE PESO MUERTO',
      ),
    ],
    caption:
      'El peso muerto no se tira con los brazos. Se empuja el piso.\n\nEl error más común en el despegue: la cadera sube primero y la barra se va hacia adelante. Resultado: la palanca crece y la espalda carga lo que tendrían que mover piernas y glúteos.\n\n▸ Barra sobre el medio del pie\n▸ Dorsales tensos, barra pegada\n▸ Cadera y hombros suben juntos\n▸ Bloqueo con glúteos, sin hiperextender\n\nReferencia: Vigotsky y col., 2015 · PeerJ — «Effects of load on good morning kinematics and EMG activity».\n\nMandame tu video de peso muerto por DM con la palabra TÉCNICA y te lo analizo.',
  },
  {
    id: 'mie',
    weekday: 3,
    day: 'MIÉ',
    pillar: 'Servicios / Rutina',
    theme: 'Fuerza para MTB: sesión + ficha técnica',
    structure: 'Carrusel 3 · Sentencia → Sesión → Ficha técnica MTB',
    format: 'carousel',
    folder: '03_mie_servicios_mtb',
    ref: {
      cite: 'Rønnestad y col., 2015 · Scand J Med Sci Sports',
      title: 'Strength training improves performance and pedaling characteristics in elite cyclists',
      finding: 'En ciclistas de élite, sumar fuerza pesada al entrenamiento de ruta mejoró el rendimiento y las características del pedaleo.',
    },
    goal: 'sales',
    tone: 'viral',
    prompt:
      'Carrusel de EXACTAMENTE 3 placas para MOUNTAIN BIKE: 1) "sentencia" de portada: la subida no se gana sólo pedaleando, la fuerza pesada también suma; 2) "rutina": sesión de fuerza para MTB con 5 ejercicios (potencia, sentadilla pesada, bisagra, unilateral y core antirrotación), series × reps, RIR / RPE y pausas reales, y una nota de progresión y de frecuencia en pretemporada vs temporada; 3) "servicio" con servicio.mode "single" y servicio.sport "mtb": ficha técnica del programa MTB de Coach JP con 3-4 pilares técnicos (potencia sostenida en subida, fuerza para el control en bajada, esfuerzos intermitentes, prevención de lesiones) y CTA a DM con la palabra MTB. Evidencia para el caption: Rønnestad y col., 2015 · Scand J Med Sci Sports («Strength training improves performance and pedaling characteristics in elite cyclists»).',
    slides: [
      statement({
        tag: 'MTB · FUERZA',
        headlineA: 'LA SUBIDA NO SE GANA',
        headlineB: 'SÓLO PEDALEANDO.',
        kicker: 'TAMBIÉN SE GANA EN EL GIMNASIO.',
        body: '',
        citeMain: 'RØNNESTAD Y COL., 2015 · SCAND J MED SCI SPORTS',
        citeSub: 'Fuerza pesada en ciclistas de élite: rendimiento y pedaleo',
        bgStyle: 'blueprint',
      }),
      {
        template: 'workout',
        tag: 'SESIÓN · MTB',
        headlineA: 'FUERZA PARA MTB:',
        headlineB: 'DÍA A.',
        workoutRows: [
          { code: 'A1', name: 'Saltos al cajón', scheme: '3 × 4', intensity: 'Máx. intención', rest: '1:30' },
          { code: 'B1', name: 'Sentadilla trasera', scheme: '4 × 5', intensity: 'RIR 2', rest: '3:00' },
          { code: 'C1', name: 'Peso muerto rumano', scheme: '3 × 6', intensity: 'RIR 2', rest: '2:30' },
          { code: 'C2', name: 'Step-up con mancuernas', scheme: '3 × 6 c/p', intensity: 'RIR 2', rest: '2:00' },
          { code: 'D1', name: 'Pallof press', scheme: '3 × 10 c/l', intensity: 'RPE 7', rest: '1:00' },
        ],
        workoutNote: 'Pretemporada: 2 sesiones por semana. Temporada: 1 para mantener. Cuando completes todo con RIR 3, subí 2,5 kg.',
        body: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'blueprint',
      },
      { ...servicePatch('single', 'mtb', []), ...CAROUSEL, serviceCta: "MANDÁ 'MTB' POR DM", bgStyle: 'blueprint' },
    ],
    caption:
      'Pedalear más no te da más fuerza para la subida. Entrenarla, sí.\n\nEn ciclistas de élite, sumar fuerza pesada al entrenamiento de ruta mejoró el rendimiento y el pedaleo (Rønnestad y col., 2015 · Scand J Med Sci Sports). En MTB se suma algo más: control en bajada y tolerancia a esfuerzos cortos y repetidos.\n\n▸ Potencia sostenida en subida\n▸ Fuerza de piernas y core para el control técnico\n▸ Esfuerzos intermitentes de alta intensidad\n▸ Prevención de lesiones lumbares, de rodilla y hombro\n\nCupos limitados con evaluación de ingreso. Mandá MTB por DM y te paso el programa.',
  },
  {
    id: 'jue',
    weekday: 4,
    day: 'JUE',
    pillar: 'Mindset / Cita',
    theme: 'Disciplina y autorrespeto',
    structure: 'Carrusel 2 · Cita táctica → Manifiesto texto',
    format: 'carousel',
    folder: '04_jue_mindset_cita',
    ref: {
      cite: 'Marco Aurelio · Meditaciones, Libro X, 16',
      title: 'Meditaciones (Τὰ εἰς ἑαυτόν)',
      finding: '«No pierdas más tiempo discutiendo cómo debe ser un buen hombre. Sé uno.» (traducción al español; verificá la edición que cites).',
    },
    goal: 'mindset',
    tone: 'viral',
    quote: { author: 'Marco Aurelio', reason: 'explicit' },
    prompt:
      'Carrusel de EXACTAMENTE 2 placas sobre DISCIPLINA Y AUTORRESPETO: 1) "cita" con la frase de Marco Aurelio en Meditaciones, Libro X, 16 («No pierdas más tiempo discutiendo cómo debe ser un buen hombre. Sé uno.»), role «Emperador romano y filósofo estoico», source «Meditaciones, Libro X, 16», y un parrafo de contexto que la lleve a la sala de entrenamiento; 2) "manifiesto_texto" sobre el autorrespeto como hábito: cumplir la sesión que te prometiste aunque no tengas ganas, con situaciones reales del entrenamiento y un remate-CTA en MAYÚSCULAS que invite a guardar la placa. Cero clichés de autoayuda.',
    slides: [
      {
        template: 'quote',
        tag: 'MINDSET · ESTOICISMO',
        quoteText: 'No pierdas más tiempo discutiendo cómo debe ser un buen hombre. Sé uno.',
        quoteAuthor: 'Marco Aurelio',
        quoteRole: 'Emperador romano y filósofo estoico',
        quoteSource: 'Meditaciones, Libro X, 16',
        quoteEmphasis: 'Sé uno',
        body: 'En la sala: dejá de leer sobre disciplina. Hacé la sesión que te toca hoy y registrala.',
        headlineA: '',
        headlineB: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'radial',
      },
      {
        template: 'essay',
        tag: 'MANIFIESTO · AUTORRESPETO',
        headlineA: 'EL AUTORRESPETO',
        headlineB: 'SE ENTRENA.',
        essayParas: [
          'Cada sesión que cumplís es una prueba concreta: tu palabra vale.',
          'La motivación sube y baja. El protocolo no: la carga y las series ya están escritas.',
          'No necesitás ganas. Necesitás un plan que se cumpla en un mal día.',
          'GUARDALO PARA EL DÍA QUE NO TENGAS GANAS.',
        ],
        body: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'radial',
      },
    ],
    caption:
      '«No pierdas más tiempo discutiendo cómo debe ser un buen hombre. Sé uno.» — Marco Aurelio, Meditaciones (X, 16).\n\nEn el gimnasio pasa lo mismo: leer sobre disciplina no suma una sola repetición. Lo que construye autorrespeto es cumplir la sesión que te prometiste, sobre todo el día que no tenés ganas.\n\n▸ El plan está escrito antes de que llegue el mal día\n▸ La carga y las series no dependen del ánimo\n▸ Cada sesión cumplida es una prueba de que tu palabra vale\n\nGuardalo para el próximo día que no tengas ganas.',
  },
  {
    id: 'vie',
    weekday: 5,
    day: 'VIE',
    pillar: 'Performance / CrossFit & Hyrox',
    theme: 'Potencia glútea y transferencia unilateral',
    structure: 'Carrusel 4 · Sentencia → A/B → Sesión → Guardado',
    format: 'carousel',
    folder: '05_vie_performance_unilateral',
    ref: {
      cite: 'Speirs y col., 2016 · J Strength Cond Res',
      title: 'Unilateral vs. bilateral squat training for strength, sprints, and agility in academy rugby players',
      finding: 'En 5 semanas, la sentadilla unilateral (búlgara) mejoró fuerza, sprint y cambio de dirección en forma similar a la sentadilla bilateral.',
    },
    goal: 'science',
    tone: 'viral',
    prompt:
      'Carrusel de EXACTAMENTE 4 placas para atletas de CROSSFIT y HYROX sobre POTENCIA GLÚTEA Y TRANSFERENCIA UNILATERAL: 1) "sentencia" de portada (en la carrera y en los lunges una sola cadera sostiene y empuja); 2) "ab" bilateral vs unilateral con veredicto «usá las dos»; 3) "rutina" con hip thrust, sentadilla búlgara, saltos a una pierna y sled push, con series × reps, RIR / RPE y pausas reales; 4) "guardado" con 4 claves. Evidencia (citation de la portada y caption): Speirs y col., 2016 · J Strength Cond Res («Unilateral vs. bilateral squat training for strength, sprints, and agility in academy rugby players»).',
    slides: [
      statement({
        tag: 'PERFORMANCE · CROSSFIT & HYROX',
        headlineA: 'CORRÉS, SALTÁS Y EMPUJÁS',
        headlineB: 'SOBRE UNA PIERNA.',
        kicker: 'ENTRENALA.',
        body: 'En Hyrox y en cada lunge, una sola cadera sostiene y empuja.',
        citeMain: 'SPEIRS Y COL., 2016 · J STRENGTH COND RES',
        citeSub: 'Sentadilla unilateral vs bilateral: fuerza, sprint y agilidad en jugadores de rugby',
        bgStyle: 'concrete',
      }),
      {
        template: 'compare',
        tag: 'BILATERAL VS UNILATERAL',
        headlineA: 'BILATERAL VS',
        headlineB: 'UNILATERAL.',
        cardA: { label: 'BILATERAL', value: 'Más carga', caption: 'Sentadilla trasera · fuerza máxima', accent: 'gray' },
        cardB: { label: 'UNILATERAL', value: 'Transferencia', caption: 'Búlgara · estabilidad de cadera', accent: 'orange' },
        verdict: 'NO ELIJAS: USÁ LAS DOS.',
        body: 'En 5 semanas, la búlgara mejoró fuerza, sprint y cambio de dirección en forma similar a la sentadilla bilateral.',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'concrete',
      },
      {
        template: 'workout',
        tag: 'SESIÓN · POTENCIA GLÚTEA',
        headlineA: 'POTENCIA GLÚTEA:',
        headlineB: 'SESIÓN.',
        workoutRows: [
          { code: 'A1', name: 'Saltos a una pierna al cajón', scheme: '3 × 3 c/p', intensity: 'Máx. intención', rest: '1:30' },
          { code: 'B1', name: 'Hip thrust con barra', scheme: '4 × 6', intensity: 'RIR 2', rest: '2:30' },
          { code: 'C1', name: 'Sentadilla búlgara', scheme: '3 × 6 c/p', intensity: 'RIR 2', rest: '2:00' },
          { code: 'D1', name: 'Sled push', scheme: '4 × 15 m', intensity: 'RPE 8', rest: '2:00' },
        ],
        workoutNote: 'En lo unilateral empezá por la pierna más débil y repetí esas reps con la otra. Subí carga cuando completes todo con RIR 3.',
        body: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'concrete',
      },
      bookmark(
        'CLAVES · UNILATERAL',
        'GUARDÁ',
        'EL PROTOCOLO.',
        ['Hip thrust: fuerza de extensión de cadera con carga alta', 'Búlgara: fuerza y control de una sola cadera', 'Saltos a una pierna: potencia que se transfiere a la zancada', 'Sled: empuje horizontal con mecánica de carrera'],
        'GUARDALO Y SUMALO A TU PRÓXIMO BLOQUE DE HYROX O CROSSFIT',
      ),
    ],
    caption:
      'En Hyrox corrés 8 km y hacés lunges con carga. Todo sobre una pierna por vez.\n\nLa sentadilla bilateral te da fuerza máxima, pero no entrena a una sola cadera a sostener y empujar. En jugadores de rugby, 5 semanas de búlgara mejoraron fuerza, sprint y cambio de dirección en forma similar a la bilateral (Speirs y col., 2016 · J Strength Cond Res).\n\n▸ Saltos a una pierna: 3 × 3 c/p\n▸ Hip thrust: 4 × 6 · RIR 2\n▸ Búlgara: 3 × 6 c/p · RIR 2\n▸ Sled push: 4 × 15 m\n\nGuardalo y probalo en tu próximo bloque.',
  },
  {
    id: 'sab',
    weekday: 6,
    day: 'SÁB',
    pillar: 'Cuestión Táctica',
    theme: 'Sobrecarga progresiva real vs repeticiones basura',
    structure: 'Carrusel 3 · Sentencia → A/B → Regla de progresión',
    format: 'carousel',
    folder: '06_sab_sobrecarga_progresiva',
    ref: {
      cite: 'Plotkin y col., 2022 · PeerJ',
      title: 'Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations',
      finding: 'En 8 semanas, progresar sumando repeticiones o sumando carga produjo un crecimiento muscular similar.',
    },
    goal: 'science',
    tone: 'viral',
    prompt:
      'Carrusel de EXACTAMENTE 3 placas sobre SOBRECARGA PROGRESIVA REAL vs REPETICIONES BASURA: 1) "sentencia" de portada contrarian (sumar series lejos del fallo no es progresar, es acumular cansancio); 2) "ab": serie basura (lejos del fallo, técnica que se rompe) vs serie efectiva (RIR 0-3, carga o reps que suben y se registran) con veredicto; 3) "guardado" con la regla de doble progresión en 4 pasos. Evidencia (caption y citation de la portada): Plotkin y col., 2022 · PeerJ («Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations»).',
    slides: [
      statement({
        tag: 'CUESTIÓN TÁCTICA',
        headlineA: 'SUMAR SERIES NO ES',
        headlineB: 'SOBRECARGA PROGRESIVA.',
        kicker: 'ES ACUMULAR CANSANCIO.',
        body: 'Progresar es más carga o más reps con la misma calidad.',
        citeMain: 'PLOTKIN Y COL., 2022 · PEERJ',
        citeSub: 'Progresar carga o repeticiones: efectos sobre la fuerza y la hipertrofia',
        bgStyle: 'blueprint',
      }),
      {
        template: 'compare',
        tag: 'SERIE BASURA VS SERIE EFECTIVA',
        headlineA: 'REAL VS',
        headlineB: 'BASURA.',
        cardA: { label: 'SERIE BASURA', value: 'RIR 5+', caption: 'Lejos del fallo, técnica que se rompe', accent: 'gray' },
        cardB: { label: 'SERIE EFECTIVA', value: 'RIR 0-3', caption: 'Carga o reps que suben, registradas', accent: 'orange' },
        verdict: 'MENOS SERIES, MEJOR HECHAS.',
        body: 'En 8 semanas, progresar sumando reps o sumando kilos dio un crecimiento similar: lo que cuenta es que algo suba.',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'blueprint',
      },
      bookmark(
        'REGLA · DOBLE PROGRESIÓN',
        'REGLA DE',
        'PROGRESIÓN.',
        ['Elegí un rango: ej. 3 × 8-12 con RIR 1-2', 'Cuando completes 12 en todas las series, subí 2,5-5 %', 'Si las reps caen 2 sesiones seguidas, revisá sueño y volumen', 'Registrá carga, reps y RIR de cada serie'],
        'GUARDÁ LA REGLA Y APLICALA DESDE TU PRÓXIMA SESIÓN',
      ),
    ],
    caption:
      'Sumar series no es sobrecarga progresiva. Si están lejos del fallo y con la técnica rota, es cansancio acumulado.\n\nProgresar es que algo suba con la misma calidad: la carga o las reps. En 8 semanas, progresar sumando reps o sumando kilos dio un crecimiento muscular similar (Plotkin y col., 2022 · PeerJ).\n\nRegla de doble progresión:\n▸ Rango fijo, ej. 3 × 8-12 con RIR 1-2\n▸ Llegás a 12 en todas las series → subí 2,5-5 %\n▸ Las reps caen 2 sesiones seguidas → revisá sueño y volumen\n▸ Registrá todo\n\nGuardala y aplicala desde tu próxima sesión.',
  },
  {
    id: 'dom',
    weekday: 0,
    day: 'DOM',
    pillar: 'Recuperación / Fisiología',
    theme: 'Fatiga del SNC y descanso activo',
    structure: 'Carrusel 3 · Sentencia → Bloques Opus → Señales',
    format: 'carousel',
    folder: '07_dom_recuperacion_snc',
    ref: {
      cite: 'Carroll y col., 2017 · J Appl Physiol',
      title: 'Recovery of central and peripheral neuromuscular fatigue after exercise',
      finding: 'La fatiga central se recupera rápido después del ejercicio; lo que dura días es sobre todo fatiga periférica (del propio músculo).',
    },
    goal: 'science',
    tone: 'viral',
    prompt:
      'Carrusel de EXACTAMENTE 3 placas sobre FATIGA DEL SISTEMA NERVIOSO Y DESCANSO ACTIVO: 1) "sentencia" de portada que desarme el mito del «SNC frito» (la fatiga central se recupera rápido; la que dura días es sobre todo muscular), sin hipérboles; 2) "opus" con 4 bloques de descanso activo con dosis concretas (caminata, movilidad, sueño, proteína); 3) "guardado" con 4 señales medibles de fatiga real y un CTA que indique bajar el volumen 30-50 % esa semana si aparecen 2. Evidencia (caption y citation de la portada): Carroll y col., 2017 · J Appl Physiol («Recovery of central and peripheral neuromuscular fatigue after exercise»).',
    slides: [
      statement({
        tag: 'RECUPERACIÓN · FISIOLOGÍA',
        headlineA: 'TU SISTEMA NERVIOSO',
        headlineB: 'NO ESTÁ «FRITO».',
        kicker: 'TUS MÚSCULOS ESTÁN CANSADOS.',
        body: 'Lo que dura días es, sobre todo, fatiga muscular.',
        citeMain: 'CARROLL Y COL., 2017 · J APPL PHYSIOL',
        citeSub: 'Recuperación de la fatiga neuromuscular central y periférica después del ejercicio',
        bgStyle: 'radial',
      }),
      {
        template: 'opus',
        tag: 'DESCANSO ACTIVO · DOMINGO',
        headlineA: 'DESCANSO',
        headlineB: 'ACTIVO.',
        opusBlocks: [
          { num: '00001', text: 'Caminá 30-45 minutos a ritmo de conversación.' },
          { num: '00002', text: 'Movilidad suave de cadera y columna: 10 minutos.' },
          { num: '00003', text: 'Dormí 7-9 horas: es la herramienta que más rinde.' },
          { num: '00004', text: 'Comé proteína suficiente también el día libre.' },
        ],
        body: '',
        ...NO_CITE,
        ...CAROUSEL,
        bgStyle: 'radial',
      },
      bookmark(
        'SEÑALES · FATIGA REAL',
        'SEÑALES DE',
        'FATIGA REAL.',
        ['Tus cargas habituales se sienten 1-2 puntos de RPE más pesadas', 'El rendimiento cae 2 sesiones seguidas', 'Dormís peor o tu pulso en reposo está más alto de lo normal', 'Un dolor muscular que no baja en 72 h'],
        'SI APARECEN 2: BAJÁ EL VOLUMEN 30-50 % ESA SEMANA',
      ),
    ],
    caption:
      'Tu sistema nervioso no está «frito». Tus músculos están cansados.\n\nDespués de entrenar, la fatiga central se recupera rápido; la que dura días es sobre todo periférica, del propio músculo (Carroll y col., 2017 · J Appl Physiol). Por eso el domingo no se trata de quedarte quieto, sino de recuperar bien.\n\n▸ Caminata de 30-45 min suave\n▸ 10 min de movilidad\n▸ 7-9 h de sueño\n▸ Proteína suficiente\n\nSi aparecen 2 señales de fatiga real, bajá el volumen 30-50 % esa semana. Guardalo.',
  },
]

/** Día del pack para una fecha (por defecto hoy). */
export function packDayFor(date = new Date()): WeeklyDay {
  return WEEKLY_PACK.find((d) => d.weekday === date.getDay()) ?? WEEKLY_PACK[0]
}

/** Fondo táctico vectorial del día (se publica con la app desde /public/assets/weekly_pack/). */
export const packBackgroundUrl = (d: WeeklyDay) => `./assets/weekly_pack/${d.folder}/fondo-tactico.svg`

/**
 * Set completo y diseñado del día, listo para exportar: plantilla exacta de cada placa, titulares en
 * Chakra Petch, formato Feed 4:5 y el fondo táctico del pack (grilla, anillos y acentos naranja) en
 * todas las placas que dibujan fondo propio. Opus Athletic usa su composición dark y no lleva foto.
 */
export function buildPackSlides(d: WeeklyDay, base: CanvasState, bgImageId: string | null): CanvasState[] {
  return d.slides.map((p) => {
    const s: CanvasState = { ...base, aspect: 'feed', headlineFont: 'chakra', typePreset: 'none', contentAlign: 'auto', nudge: undefined, storySticker: 'none', ...p } as CanvasState
    if (s.template === 'athletic' || !bgImageId) return { ...s, bgImageId: null }
    // Fondo del pack: a color (el naranja no se pasa a B/N), velo medio y viñeta para la lectura.
    return { ...s, bgImageId, bgStyle: 'photo', bgMono: false, bgOverlay: 12, bgGradient: false, bgVignette: 30, bgZoom: 100, bgX: 0, bgY: 0, floatingPlate: false }
  })
}
