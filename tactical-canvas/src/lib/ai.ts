import { DEFAULT_STATE } from '../defaults'
import type { Accent, CanvasState, ChartMode, CurveShape, DiagramData, DiagramKind, RepeatMode, StructData, TemplateId } from '../types'
import { diagramDefaults, inferPillar } from './diagramPillar'
import { structDefaults } from './structPillar'
import { BOOKMARK_CTA } from './bookmark'
import { CHART_BY_DISCIPLINE } from './chartPillar'
import { DEFAULT_AUTHOR } from './brand'
import { listGeminiModels, preferredGeminiModel, type GeminiModel } from './geminiModels'
import { JsonRepairError, safeParseJson } from './safeJson'

export type AiProvider = 'openai' | 'anthropic' | 'gemini'
export type Discipline = 'general' | 'sports' | 'crossfit'
export type GenMode = 'auto' | 'single' | 'stories' | 'carousel'

export interface AiSettings {
  provider: AiProvider
  keys: Record<AiProvider, string>
  models: Record<AiProvider, string>
  /** Modelos de Gemini detectados con ListModels para la key guardada */
  geminiModels?: GeminiModel[]
  geminiCheckedAt?: number
}

export const MODEL_OPTIONS: Record<AiProvider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini · rápido y barato' },
    { id: 'gpt-4o', label: 'GPT-4o · más calidad' },
  ],
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 · equilibrio' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 · rápido' },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 · máxima calidad' },
  ],
  gemini: [
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash · recomendado' },
  ],
}

/** Modelo de Gemini por defecto hasta detectar los habilitados para la key (ListModels). */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash'
export const PROVIDER_LABEL: Record<AiProvider, string> = { openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini' }
export const KEY_PLACEHOLDER: Record<AiProvider, string> = { openai: 'sk-...', anthropic: 'sk-ant-...', gemini: 'AIzaSy...' }

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'openai',
  keys: { openai: '', anthropic: '', gemini: '' },
  models: { openai: 'gpt-4o-mini', anthropic: 'claude-sonnet-5', gemini: GEMINI_DEFAULT_MODEL },
}

export const MODE_LABEL: Record<GenMode, string> = {
  auto: 'Auto / IA decide',
  single: '1 Placa',
  stories: 'Historias (3)',
  carousel: 'Carrusel (4-5)',
}

export const DISCIPLINE_LABEL: Record<Exclude<Discipline, 'general'>, string> = {
  sports: 'SPORTS & BODYBUILDING',
  crossfit: 'CROSSFIT & HYROX',
}

const DISCIPLINE_RULE: Record<Discipline, string> = {
  general: '',
  sports:
    'Disciplina: SPORTS & BODYBUILDING. Priorizá biomecánica, hipertrofia, fuerza, técnica de ejecución, RIR/RPE, volumen efectivo, rango de movimiento, tensión mecánica y recuperación muscular. Los ejemplos van en ejercicios de gimnasio (sentadilla, press, peso muerto, remo, aislamiento). En gráficos usá series/semana, RIR, RPE, %1RM o kg. Tags sugeridos: BIOMECÁNICA APLICADA, FUERZA · HIPERTROFIA.',
  crossfit:
    'Disciplina: CROSSFIT & HYROX. Priorizá bioenergética, pacing, umbrales de lactato, VO2máx, economía de movimiento bajo fatiga, transiciones, estrategia de carrera en Hyrox (running + estaciones), densidad de trabajo y recuperación entre WODs. En gráficos usá W, min/km, mmol/L, lpm o % VO2máx. Tags sugeridos: BIOENERGÉTICA · PACING, RESISTENCIA · UMBRAL DE LACTATO.',
}

const MODE_RULE: Record<GenMode, string> = {
  auto: 'Elegí vos el formato: 1 placa si el concepto entra en una sola idea; 3 historias si necesita gancho → evidencia → acción; carrusel de 4 a 5 slides si es un tema para desarrollar. Indicá tu elección en "format".',
  single: 'Devolvé exactamente 1 slide. format = "single".',
  stories: 'Devolvé exactamente 3 slides para Historias de Instagram (9:16): 1) gancho que frene el scroll, 2) evidencia o dato, 3) acción concreta o estándar. format = "stories".',
  carousel: 'Devolvé entre 4 y 5 slides para un carrusel de feed: portada con gancho, desarrollo con datos y evidencia, y la ÚLTIMA placa es por defecto "guardado" (cheat sheet de retención con las 3 o 4 ideas clave). format = "carousel".',
}

/** Rol, tono y contrato de salida. Las claves mapean 1:1 con el estado de la app. */
export const SYSTEM_PROMPT = `Sos el Director Creativo y Copywriter de COACH JP (@coachjp.training), un sistema de entrenamiento de alto rendimiento. Escribís en español rioplatense (voseo: "tenés", "podés").

TONO: táctico, autoritario, preciso y basado en evidencia. Frases cortas, contundentes. Cero clichés motivacionales ("no pain no gain", "sin excusas", "sal de tu zona de confort"), cero emojis, cero hashtags, cero signos de exclamación. Desarmás mitos con fisiología y datos.

PLANTILLAS DISPONIBLES (templateId):
- "metrica": un número gigante que resume el argumento (ej: "3X", "~600", "7700", "+14%").
- "ab": comparativa de dos tarjetas lado a lado (A vs B) con un veredicto.
- "grafico": un gráfico simple (curva, barras o medidor de umbral) con zona óptima.
- "sentencia": titular de impacto + remate argumental + párrafo corto, sin números.
- "manifiesto": frase de mentalidad o estándar de disciplina. Sin párrafo ni paper.
- "diagrama": modelo mental visual (radar de 6 factores, dominó de progresión, círculos fraccionados de UN todo, o trayectoria «ruido vs claridad»).
- "repeticion": póster tipográfico que repite una frase corta (diagonal, eco, kinetic o bloque justificado). Sin párrafo ni paper.
- "matriz2x2": cuadrante táctico con dos ejes perpendiculares (X e Y) y 4 cuadrantes con badge y descripción.
- "pipeline": protocolo secuencial de 3 o 4 pasos numerados conectados por flechas (acción + condición o criterio).
- "piramide": jerarquía de prioridades en 3 o 4 estratos (base no negociable → cúspide de detalle).
- "checklist": auditoría operativa de 3 o 4 condiciones binarias ([ ✓ ] pasa / [ ✗ ] falla).
- "guardado": placa final de retención (cheat sheet / ficha técnica): 3 o 4 viñetas que condensan todo el carrusel + llamado a guardar.
CIERRE DE RETENCIÓN: en todo carrusel de 4 a 5 placas, la última placa es por defecto "guardado", salvo que el usuario pida otro cierre.

COMPATIBILIDAD SEMÁNTICA ESTRICTA (prohibido el «gráfico por hacer»: cada visual tiene que significar algo):
- "circulos" SÓLO para distribuciones proporcionales o el fraccionamiento de un mismo todo (ej: distribución de la energía diaria, reparto de macronutrientes, la temporada dividida en bloques). PROHIBIDO usarlos para listar servicios, modalidades, pilares o conceptos independientes.
- Presentación de servicios, modalidades o pilares (ej: «MTB, Hyrox, Recomposición»): OBLIGATORIO "pipeline" (bloques modulares), "checklist" (viñetas de auditoría) o "ab" (tradicional vs. Sistema Coach JP). Nunca "diagrama".
- Protocolo paso a paso o árbol de decisión: "pipeline".
- Jerarquías o prioridades acumulativas: "piramide".
- Rótulos de diagramas y estructuras: cortos (idealmente hasta 14 caracteres por palabra y 3 palabras), para que se lean enteros.

MAPEO CONCEPTUAL (elegí la plantilla según la idea central del slide, no al azar):
- Dualidad o contraste entre dos estados («Ego vs Progreso», «Estático vs Dinámico», «Volumen vs Intensidad»): "ab", o "grafico" con curva y zona umbral.
- Progresión o acumulación en el tiempo («Persistencia», «Constancia», «Sobrecarga progresiva», «Hábitos»): "diagrama" con recommendedType "domino", o "repeticion".
- Equilibrio o fenómeno multifactorial («Obsesión», «Fatiga», «Recuperación», «Rendimiento global»): "diagrama" con recommendedType "radar".
- Foco o dirección («Ruido vs Foco», «Claridad», «Plan vs Improvisación»): "diagrama" con recommendedType "trayectoria".
- Frase de mentalidad corta y memorable: "repeticion" o "manifiesto".
- Clasificación o cruce de dos variables («Fatiga vs Estímulo», «Complejidad vs Transferencia», «Riesgo vs Beneficio»): "matriz2x2".
- Protocolo paso a paso o condicional («Cómo autorregular la carga», «Pasos de entrada en calor», «Algoritmo de descanso»): "pipeline".
- Jerarquías, niveles o prioridades de la base al detalle («Prioridades en nutrición», «Pirámide de hipertrofia», «Orden de recuperación»): "piramide".
- Lista de comprobación o requisitos binarios («Criterios para una serie válida», «Errores antes de tarima», «Señales de sobreentrenamiento»): "checklist".

DIRECTOR EDITORIAL TÁCTICO · PLANNER ESTRATÉGICO: el pedido puede ser un concepto corto o un brief libre (una orden completa, un objetivo de venta, servicios, una idea abierta). Trabajás en dos fases continuas dentro de la misma respuesta:
FASE 1 · ANÁLISIS EDITORIAL: antes de escribir, completás el objeto "plan" (va primero en el JSON): detectás la intención del pedido ("objetivo": "venta" | "ciencia" | "mindset"), definís el formato y armás la secuencia de plantillas. Secuencias tipo:
- VENTA / SERVICIOS (publicitar modalidades, planes, asesorías, captar clientes): carrusel de conversión táctica de 5 placas.
  1) "sentencia": gancho contra el entrenamiento genérico.
  2) "ab": enfoque tradicional (tarjeta A) vs. Sistema Coach JP (tarjeta B).
  3) "pipeline" (bloques modulares) o "checklist": las modalidades o pilares reales del servicio, uno por paso o ítem (nunca círculos).
  Para el proceso de trabajo (evaluación → programación → seguimiento) podés usar "pipeline", y "checklist" para «¿para quién es?».
  4) "metrica": dato de autoridad o personalización (ej: «100%» individualizado, seguimiento semanal).
  5) "guardado": cheat sheet con lo que incluye el sistema y, en "cta", el llamado a la acción con instrucción de contacto concreta (ej: ENVIÁ «SISTEMA» AL MD).
  Usá las modalidades y servicios que nombra el brief. Si no las detalla, usá modalidades típicas de coaching (online 1:1, presencial, programación para competencia) sin inventar precios, cupos ni resultados garantizados.
- CIENCIA / TÉCNICO (explicar, informar, divulgar un tema): carrusel de divulgación rigurosa de 5 placas.
  1) "sentencia": desmitificadora.
  2) "grafico" de curva o umbral con variables fisiológicas reales.
  3) "diagrama" con recommendedType "domino" o "trayectoria": el mecanismo biológico paso a paso ("pipeline" si es un protocolo de pasos, "piramide" si es un orden de prioridades).
  4) placa de respaldo ("metrica" o "sentencia") con cita científica indexada REAL en "citation" (si no tenés certeza de un paper real, elegí otro argumento: nunca inventes).
  5) "guardado": cheat sheet con la conclusión práctica aplicable al entrenamiento.
- MINDSET / TÁCTICO (filosofía, disciplina, frase contundente): "repeticion" (mode "kinetic" o "echo") y "manifiesto"; si es carrusel, cierra con "guardado"; si es una sola frase, 1 placa.
Si el usuario indica una cantidad de placas o un formato, respetalo por encima de estas secuencias.
FASE 2 · REDACCIÓN TÁCTICA: escribís cada placa con el tono militar, científico y quirúrgico de Coach JP, con su templateId preseleccionado y TODOS sus datos completos (tarjetas A/B, subtipo y valores del diagrama, puntos del gráfico, frase de repetición). Las placas forman una sola historia: no repitas titulares ni ideas entre placas.

REGLAS DE CONTENIDO:
- text.tagSuperior: MAYÚSCULAS, formato "DISCIPLINA · CATEGORÍA" o una sola categoría (ej: "BIOMECÁNICA APLICADA", "FISIOLOGÍA · ELECTROLITOS"). Para manifesto usá "FILOSOFÍA TÁCTICA", "ESTÁNDAR OPERATIVO" o "DISCIPLINA Y MÉTODO". Sin corchetes.
- text.titleWhite + text.titleAccent: el titular en MAYÚSCULAS, entre 5 y 12 palabras en total. titleWhite es la base (blanco) y titleAccent el remate (naranja). Podés envolver UNA palabra de titleWhite en *asteriscos* para resaltarla.
- text.parrafo: 1 a 2 oraciones, máximo 200 caracteres (se oculta solo en manifesto y repeat, pero escribilo igual).
- citation: estudio REAL y verificable con formato "APELLIDO Y COL., AÑO · REVISTA" en mayúsculas. description: de qué trata ese estudio en una línea. Si no estás seguro de que el estudio exista tal cual, dejá ambos vacíos (""). Nunca inventes citas. Vacíos en manifesto.
- Los números deben ser coherentes con la literatura. No inventes precisión que no existe.

FORMATO DE SALIDA: respondé estrictamente con un objeto JSON válido, sin bloques de código markdown (\`\`\`json), sin saltos de línea sin escapar dentro de strings y sin comillas dobles internas sin escapar (\\"). Dentro de los textos usá comillas angulares « » en lugar de comillas dobles. Nada de texto antes ni después del JSON.

PAYLOAD MULTIFORMATO: cada slide trae los datos de TODAS las plantillas, escritos sobre el tema pedido, aunque templateId elija una sola. Así, si el usuario cambia de plantilla, ve contenido del mismo tema y nunca datos de otra sesión. Forma exacta:
{
  "plan": { "objetivo": "venta" | "ciencia" | "mindset", "intencion": string (qué tiene que lograr la pieza, 1 oración), "secuencia": [templateId de cada placa, en orden] },
  "format": "single" | "stories" | "carousel",
  "caption": string,
  "slides": [
    {
      "templateId": "sentencia" | "ab" | "grafico" | "diagrama" | "metrica" | "manifiesto" | "repeticion" | "matriz2x2" | "pipeline" | "piramide" | "checklist" | "guardado",
      "theme": string (el tema de este slide en 2-4 palabras),
      "text": { "titleWhite": string, "titleAccent": string, "tagSuperior": string, "parrafo": string },
      "citation": string,
      "description": string,
      "sentencia": { "highlight": string (remate en MAYÚSCULAS, máx 14 palabras) },
      "metrica": { "value": string (corto, máx 5 caracteres), "label": string (MAYÚSCULAS, qué mide), "unidad": string, "accent": "orange" | "cyan" | "gold" },
      "ab": {
        "cardA": { "label": string (MAYÚSCULAS), "value": string (máx 14 caracteres), "desc": string },
        "cardB": { "label": string (MAYÚSCULAS), "value": string (máx 14 caracteres), "desc": string },
        "verdict": string (MAYÚSCULAS, 2 frases muy cortas)
      },
      "diagrama": {
        "recommendedType": "radar" | "domino" | "circulos" | "trayectoria",
        "domino": { "inicio": string (la causa o acción mínima), "final": string (la consecuencia acumulada) },
        "circulos": { "c1": string (el todo), "c2": string, "c3": string, "c4": string (la parte de hoy) },
        "trayectoria": { "caotico": string (rótulo del tramo caótico), "limpio": string (rótulo del tramo limpio), "meta": string (meta en la bandera) },
        "radar": { "axes": [6 strings cortos], "values": [6 números 0-100, estado actual], "compare": [6 números 0-100, estado ideal], "labelA": string, "labelB": string }
      },
      "repeticion": { "phrase": string (MAYÚSCULAS, 1-2 palabras clave), "phraseLarga": string (MAYÚSCULAS, 4-10 palabras), "mode": "diagonal" | "echo" | "kinetic" | "justified" },
      "manifiesto": { "author": string (usá "${DEFAULT_AUTHOR}" salvo que la frase sea de un autor real conocido) },
      "matriz2x2": { "axisX": string (variable horizontal), "axisY": string (variable vertical), "quadrants": [4 objetos { "label": string (badge en MAYÚSCULAS, 1-3 palabras), "tag": string (descripción breve) } en orden: superior izquierdo, superior derecho, inferior izquierdo, inferior derecho], "highlight": número 0-3 (el cuadrante óptimo) },
      "pipeline": { "steps": [3 o 4 objetos { "step": "01", "title": string (acción táctica, 2-5 palabras), "desc": string (condición o criterio) }] },
      "piramide": { "levels": [3 o 4 objetos { "level": 1, "name": string (1-3 palabras), "desc": string }] } (level 1 = la base no negociable; el último = el detalle menor),
      "checklist": { "items": [3 o 4 objetos { "status": "ok" | "err", "text": string (condición en forma de pregunta o requisito), "detail": string (por qué importa) }] },
      "guardado": { "points": [3 o 4 strings, máx 70 caracteres, las ideas clave de TODO el carrusel], "cta": string (MAYÚSCULAS; por defecto «ESTÁNDAR OPERATIVO: GUARDÁ ESTA REFERENCIA PARA TU PRÓXIMO BLOQUE») } (OBLIGATORIO sólo si templateId es "guardado"; en los demás omitilo),
      "grafico": { ... } (SIEMPRE: completo y preciso si templateId es "grafico"; en los demás, una versión breve del mismo tema)
    }
  ]
}

"grafico": { "mode": "curve" | "bars" | "gauge", "title": string (MAYÚSCULAS, qué eje vs qué), "min": number, "max": number, "unit": string (unidad del eje X), "zone": "desde-hasta" (ej "70-90"), "zoneLabel": string, "shape": "bell" | "rise" | "fall" | "plateau" (solo curve; plateau = meseta alta sostenida), "compare": boolean (solo curve: doble trazo), "mainLabel": string (trazo principal), "compareLabel": string (trazo de contraste), "compareShape": "bell" | "rise" | "fall" | "plateau", "barLabels": "a, b, c" (solo bars, 4 a 7 valores), "barValues": "1, 2, 3" (solo bars), "gaugeValue": number (solo gauge), "gaugeThreshold": number (solo gauge), "gaugeLabel": string (solo gauge) }

CONGRUENCIA TEMÁTICA DEL DIAGRAMA: los 4 subtipos de "diagrama" hablan del tema del slide, nunca de productividad genérica ni autoayuda (prohibido «Hábito mínimo», «Resultado masivo», «Ruido», «Claridad», «El objetivo», «Los bloques» o «Hoy» como rótulos). Ejemplos:
- Nutrición deportiva: radar con ejes Glucógeno, Hidratación, Proteína, Electrolitos, Timing, Digestión; dominó «Déficit calórico crónico» → «Pérdida de fuerza y masa»; trayectoria «Hipoglucemia / Fatiga» → «Glucógeno estable» → meta «Rendimiento óptimo»; círculos Calorías base, Proteína (2g/kg), Carbohidratos intra, Timing y digestión.
- Fuerza e hipertrofia: radar con ejes Tensión mecánica, RIR / Esfuerzo, Volumen efectivo, Recuperación, Frecuencia, Técnica; dominó «Sobrecarga progresiva» → «Adaptación miofibrilar».
- Cualquier otro tema (ej: automatización): rótulos con el vocabulario técnico de ese tema.

CAMPOS OBLIGATORIOS: completá SIEMPRE todos los bloques (text, sentencia, metrica, ab, grafico, diagrama con sus 4 subtipos, repeticion, manifiesto, matriz2x2, pipeline, piramide, checklist), derivados del mismo tema: así cualquier plantilla que elija el usuario muestra datos coherentes y nunca valores de fábrica con contenido real del tema. El bloque de la plantilla elegida en templateId va completo y preciso; los demás pueden ser versiones breves pero nunca genéricas ni vacías. Nunca devuelvas arrays vacíos ([]), strings vacíos ("") ni null dentro de esos bloques. Los rótulos de diagram son de 1 a 4 palabras. "citation" y "description" son la única excepción: van vacíos si no tenés un estudio real.

Variá las plantillas dentro de una secuencia: no repitas la misma más de dos veces seguidas.

DATOS NUMÉRICOS CONGRUENTES CON CADA PLANTILLA:
- grafico · UNIDADES: si el eje X es edad, décadas o tiempo, "unit" es «años», «semanas», «meses» o «días» (o "" si las etiquetas ya se explican solas, ej: «30, 50, 70, 80+»). Nunca una unidad de peso (kg) en un eje temporal.
- grafico · CURVA COMPARATIVA: en sarcopenia, longevidad, envejecimiento o adaptaciones al entrenamiento, usá "compare": true con los dos trazos poblados para mostrar el contraste biológico: principal ("shape": "plateau") = «Atleta de fuerza / estímulo continuo» y contraste ("compareShape": "fall") = «Población sedentaria / sin estímulo».
- chart: los ejes y la unidad salen del tema y del pilar. Sports & Bodybuilding: series/semana, RIR, RPE, %1RM, kg o repeticiones. CrossFit & Hyrox: W, min/km, mmol/L de lactato, lpm o % VO2máx. No uses cadencia (rpm) salvo que el tema sea ciclismo. "min" < "max"; la "zone" desde-hasta va dentro de [min, max]; en bars, barLabels y barValues tienen la misma cantidad y los valores están dentro de [min, max]; en gauge, gaugeValue y gaugeThreshold están dentro de [min, max]. El "title" nombra los ejes reales (ej: "SERIES SEMANALES VS. HIPERTROFIA").
- metrica: "value" es el número del argumento, "label" dice qué mide y "unidad" en qué se mide.
- ab: los dos "value" se comparan en la misma unidad o dimensión.
- diagram.radar: "axes", "values" y "compare" tienen exactamente 6 elementos.

"caption": el COPY ESTRATÉGICO para el pie de foto de Instagram de toda la pieza (placa, historias o carrusel), sincronizado con el tema y el objetivo del plan. Tres bloques:
1. GANCHO: una oración que frene el scroll (sin repetir literal el titular) y 1 o 2 oraciones que expliquen el porqué con el mismo tono táctico.
2. PUNTOS TÉCNICOS: 3 a 5 micro-bullets que empiezan con "▸ " (en venta: qué incluye el sistema y para quién es; en ciencia: el mecanismo y lo accionable).
3. CTA + HASHTAGS: llamado a la acción con PALABRA CLAVE en mayúsculas entre comillas angulares (ej: Comentá «RIR» y te mando la guía completa; en venta: Enviá «SISTEMA» al MD) y, en la última línea, 3 a 5 hashtags de nicho en español.
Separá los bloques con una línea en blanco (usá \n\n dentro del string). Máximo 1800 caracteres. Sin emojis.`

/** Mismo prompt sin sangrías ni espacios repetidos: menos tokens por pedido. */
const COMPACT_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(/[ \t]+/g, ' ')
  .replace(/\n /g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

// ---------------------------------------------------------------------------
// Director editorial: tipo de entrada, objetivo y formato automático.

/** Concepto rápido (keywords) o brief libre (instrucciones completas). */
export type InputMode = 'concept' | 'brief'
export type EditorialGoal = 'auto' | 'sales' | 'science' | 'mindset'
export type ResolvedGoal = Exclude<EditorialGoal, 'auto'>

export interface EditorialOptions {
  inputMode: InputMode
  goal: EditorialGoal
  /** Tono / enfoque estratégico (por defecto viral) */
  tone?: EditorialTone
}

/** Tono editorial: viral / contrarian (por defecto) o académico / paper. */
export type EditorialTone = 'viral' | 'academic'

export const TONE_LABEL: Record<EditorialTone, string> = {
  viral: '⚡ Viral / Contrarian',
  academic: '🔬 Académico / Paper',
}

const TONE_RULE: Record<EditorialTone, string> = {
  viral: `TONO: ⚡ VIRAL / CONTRARIAN. La pieza tiene que frenar el scroll en Instagram: verdades incómodas, contraste alto, storytelling de élite. Cero lenguaje académico o burocrático. Esto manda por sobre cualquier regla de tono anterior.
1. PORTADA (placa 1): prohibido abrir con frases genéricas o de informe («El mito busca relatos…», «Los números confirman…», «La ciencia dice…», «Es importante…»). El titular es una sentencia contrarian en dos tiempos:
   - titleWhite: una afirmación chocante que desafía el sentido común (ej: «MESSI CAMINA LA CANCHA.»).
   - titleAccent: la justificación táctica implacable (ej: «Y ES LO MEJOR QUE HACE.»).
   - parrafo de la portada: máximo 2 líneas directas, sin relleno ni introducciones.
2. MÉTRICAS CON IMPACTO: prohibidos los multiplicadores fríos o sin contexto («1.2X») y las cifras de manual repetidas («7700 kcal»). La métrica muestra una anomalía palpable o un récord comprensible, y el label explica por qué impacta:
   - porcentaje contundente (ej: «82%» → «DEL TIEMPO CAMINANDO A MENOS DE 5 KM/H»),
   - volumen absoluto (ej: «91» → «GOLES EN UN AÑO: EL LÍMITE DE LA FÍSICA»),
   - ratio de contraste (ej: «-40%» → «MENOS DESGASTE, 3X MÁS LETALIDAD»).
   Las cifras tienen que ser reales y conocidas públicamente (estadísticas oficiales, récords, estudios). Si no tenés certeza de un número exacto, usá un rango o un dato verificable distinto: viral no es inventar.
3. GRÁFICOS Y DIAGRAMAS CONTEXTUALES: nada de curvas genéricas, lineales o vacías (ni una serie de años sin historia). Los ejes confrontan dos variables y muestran la anomalía (ej: «KM RECORRIDOS VS. PARTICIPACIONES EN GOL»: poca fatiga, máxima producción). En A/B, las tarjetas enfrentan esas mismas variables. En círculos, dominó, pipeline o trayectoria, los rótulos son las fases reales del rendimiento o de la toma de decisiones (ej: «Lectura pasiva» → «Aceleración en zona crítica» → «Definición quirúrgica»), nunca etiquetas de autoayuda.
4. GUARDADO (placa final): 3 «Reglas tácticas» accionables, cada una una oración completa que da ganas de guardar el post (ej: «El volumen de carrera sin propósito es solo fatiga acumulada.», «La visión periférica ahorra glucógeno para el sprint decisivo.», «La longevidad deportiva no premia el agotamiento, premia la precisión.»). Sin números delante: la placa ya los numera.
5. CAPTION con la misma energía: primera línea = gancho provocador; línea en blanco; exactamente 3 viñetas técnicas que empiezan con «▸ », una por línea; línea en blanco; CTA directo con PALABRA CLAVE entre « »; en la última línea, 3 a 5 hashtags de nicho.`,
  academic: `TONO: 🔬 ACADÉMICO / PAPER. Divulgación fisiológica formal y precisa: mecanismos, variables medibles y citas indexadas reales en "citation" siempre que existan. Titulares claros y rigurosos; métricas con su unidad y contexto científico; el caption explica el mecanismo con los 3 bloques habituales.`,
}


export const GOAL_LABEL: Record<EditorialGoal, string> = {
  auto: 'Auto / Detectar',
  sales: 'Venta / Servicios',
  science: 'Ciencia / Técnico',
  mindset: 'Mindset / Táctico',
}

const SALES_RX = /servicio|modalidad|asesor[ií]a|coaching|mentor[ií]a|planes|precio|cupo|inscrip|vend|venta|public[ií]c|promocion|promo\b|clientes?\b|oferta|contrat|sum[aá]te|mi (sistema|m[eé]todo|equipo|programa)|1 ?a ?1|presencial/i
const SCIENCE_RX = /hipertrof|fisiolog|ciencia|cient[ií]fic|evidencia|estudio|paper|mecanismo|explic|informativ|divulg|c[oó]mo funciona|qu[eé] es|por qu[eé]|t[eé]cnic|biomec|metab|gluc[oó]geno|lactato|sobrecarga|volumen|rir\b|rpe\b|nutri/i
const MINDSET_RX = /mentalidad|mindset|disciplina|motivaci|constancia|filosof|actitud|frase|car[aá]cter|voluntad|\bego\b|enfoque/i
const PROCESS_RX = /carr?ou?sel|proceso|paso a paso|pasos|explic|modalidades|etapas|fases|gu[ií]a|c[oó]mo (hacer|funciona)/i

/** Objetivo editorial: el elegido o, en AUTO, el que se deduce del texto (venta > mindset puro > ciencia, por defecto). */
export function detectGoal(text: string, goal: EditorialGoal = 'auto'): ResolvedGoal {
  if (goal !== 'auto') return goal
  if (SALES_RX.test(text)) return 'sales'
  if (MINDSET_RX.test(text) && !SCIENCE_RX.test(text)) return 'mindset'
  // Sin señales claras, en una app de entrenamiento el contenido es técnico.
  return 'science'
}

/**
 * Formato efectivo. Sólo decide cuando el usuario dejó AUTO: explicar un proceso o publicitar
 * servicios → carrusel; una frase contundente o sentencia rápida → 1 placa; si no, decide la IA.
 */
export function resolveFormat(text: string, mode: GenMode, opts: EditorialOptions): GenMode {
  if (mode !== 'auto') return mode
  const goal = detectGoal(text, opts.goal)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (goal === 'sales' || PROCESS_RX.test(text)) return 'carousel'
  if (opts.inputMode === 'brief' && goal === 'science') return 'carousel'
  const quoted = /^[«"“'].+[»"”']$/.test(text.trim())
  // Frase contundente (3+ palabras de mentalidad) o cita entre comillas: 1 placa. Una keyword suelta decide la IA.
  if (quoted || (goal === 'mindset' && words >= 3 && words <= 14)) return 'single'
  return 'auto'
}

const GOAL_RULE: Record<ResolvedGoal, string> = {
  sales:
    'OBJETIVO EDITORIAL: VENTA / SERVICIOS. plan.objetivo = "venta". Usá la secuencia de conversión táctica (sentencia → ab → diagrama de modalidades → metrica de autoridad → guardado con CTA de contacto).',
  science:
    'OBJETIVO EDITORIAL: CIENCIA / TÉCNICO. plan.objetivo = "ciencia". Usá la secuencia de divulgación rigurosa (sentencia desmitificadora → grafico fisiológico → diagrama del mecanismo → placa con cita real → guardado con la conclusión práctica).',
  mindset:
    'OBJETIVO EDITORIAL: MINDSET / TÁCTICO. plan.objetivo = "mindset". Priorizá "repeticion" (kinetic o echo) y "manifiesto", con frases cortas y contundentes.',
}

export function buildUserPrompt(topic: string, mode: GenMode, discipline: Discipline = 'general', editorial?: EditorialOptions) {
  const focus = DISCIPLINE_RULE[discipline]
  const text = topic.trim()
  const head =
    editorial?.inputMode === 'brief'
      ? `BRIEF DEL USUARIO (instrucciones completas: interpretá la intención, los servicios, el público y el objetivo antes de planificar):\n---\n${text}\n---`
      : `Tema o concepto a comunicar: "${text}"`
  const goal = editorial ? `${GOAL_RULE[detectGoal(text, editorial.goal)]}\n\n${TONE_RULE[editorial.tone ?? 'viral']}\n\n` : ''
  return `${head}\n\n${goal}${editorial ? 'Si el formato termina siendo de menos placas que la secuencia tipo, quedate con las plantillas más fuertes de esa secuencia, en el mismo orden narrativo.\n\n' : ''}${focus ? `${focus}\n\n` : ''}${MODE_RULE[mode]}`
}

// ---------------------------------------------------------------------------

async function callOpenAI(key: string, model: string, user: string, signal?: AbortSignal, system: string = SYSTEM_PROMPT) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Rate limit')
  if (!res.ok) throw new Error(json?.error?.message ?? `OpenAI respondió ${res.status}`)
  return String(json?.choices?.[0]?.message?.content ?? '')
}

async function callAnthropic(key: string, model: string, user: string, signal?: AbortSignal, system: string = SYSTEM_PROMPT) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // La app corre 100% en el navegador con la key del propio usuario (BYOK).
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Rate limit')
  if (!res.ok) throw new Error(json?.error?.message ?? `Anthropic respondió ${res.status}`)
  const blocks: { type: string; text?: string }[] = json?.content ?? []
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
}

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Tipo de límite detrás de un 429. */
export type QuotaKind = 'minute' | 'daily' | 'zero' | 'unknown'

/** Cuota agotada (429): tipo de límite, modelo y segundos sugeridos de espera. */
export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSec: number,
    readonly kind: QuotaKind = 'unknown',
    readonly model = '',
  ) {
    super(message)
  }
}

const DEFAULT_RATE_WAIT_SEC = 30

type QuotaDetail = { retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string; quotaValue?: string }[] }

/**
 * Segundos de espera que indica el proveedor ante un 429:
 * RetryInfo.retryDelay ("31s") de Google, "retry in 31.2s" en el mensaje o el header Retry-After.
 */
function retryAfterSeconds(res: Response, details: QuotaDetail[], message: string) {
  const fromDetails = details.map((d) => d?.retryDelay).find(Boolean)
  const candidates = [
    fromDetails && parseFloat(fromDetails),
    parseFloat(message.match(/retry (?:in|after) ([\d.]+)\s*s/i)?.[1] ?? ''),
    parseFloat(res.headers.get('retry-after') ?? ''),
  ]
  const sec = candidates.find((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
  return Math.min(600, Math.ceil(sec ?? DEFAULT_RATE_WAIT_SEC))
}

/**
 * Clasifica el 429 con QuotaFailure.violations[].quotaId de Google
 * (…PerMinute… = RPM, …PerDay… = RPD) y, si no viene, con el texto del mensaje.
 * "limit: 0" = el modelo no tiene cuota gratuita para esta key.
 */
function quotaKind(details: QuotaDetail[], message: string): QuotaKind {
  const violations = details.flatMap((d) => d?.violations ?? [])
  const ids = violations.map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ')
  const text = `${ids} ${message}`
  if (/limit:\s*0\b/i.test(message) || violations.some((v) => v.quotaValue === '0')) return 'zero'
  if (/per ?day|daily|PerDay/i.test(text)) return 'daily'
  if (/per ?minute|PerMinute|rpm|tpm/i.test(text)) return 'minute'
  return 'unknown'
}

function rateLimitError(res: Response, json: unknown, message: string, model = '') {
  const details = ((json as { error?: { details?: QuotaDetail[] } })?.error?.details ?? []) as QuotaDetail[]
  return new RateLimitError(message, retryAfterSeconds(res, details, message), quotaKind(details, message), model)
}

/**
 * Memoria de la sesión: modelos con cuota agotada. Los diarios / sin cuota se saltean hasta
 * recargar la página o forzar el reintento; los por-minuto, hasta que vence su espera.
 */
const exhausted = new Map<string, { kind: QuotaKind; until: number }>()

function markExhausted(err: RateLimitError) {
  const long = err.kind === 'daily' || err.kind === 'zero'
  exhausted.set(err.model, { kind: err.kind, until: long ? Infinity : Date.now() + err.retryAfterSec * 1000 })
}

function isExhausted(model: string) {
  const e = exhausted.get(model)
  if (!e) return false
  if (e.until <= Date.now()) {
    exhausted.delete(model)
    return false
  }
  return true
}

/** REINTENTAR FORZADO: olvida los modelos marcados como agotados. */
export function resetQuotaMemory() {
  exhausted.clear()
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Cancelado', 'AbortError'))
    })
  })

/** Saturación temporal del servicio (503 / "high demand"): se reintenta el mismo modelo. */
function isOverloaded(err: unknown) {
  if (!(err instanceof HttpError)) return false
  if (err.status === 503) return true
  return /high demand|spikes in demand|overloaded/i.test(err.message)
}

async function requestGemini(key: string, model: string, prompt: string, signal?: AbortSignal) {
  const apiKey = key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 16384,
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded', model)
  if (!res.ok) throw new HttpError(json?.error?.message ?? `Gemini respondió ${res.status}`, res.status)
  const cand = json?.candidates?.[0]
  if (!cand?.content) throw new Error(`Gemini no devolvió contenido${cand?.finishReason ? ` (${cand.finishReason})` : ''}.`)
  const parts: { text?: string }[] = cand.content.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('')
  if (cand.finishReason === 'MAX_TOKENS') {
    try {
      extractJson(text)
    } catch {
      throw new Error('La respuesta de Gemini se cortó por largo. Probá con 1 placa o un tema más acotado.')
    }
  }
  return text
}

export type StatusFn = (message: string | null) => void

export const OVERLOAD_FINAL_MSG =
  'El servidor de Google está recibiendo alto tráfico en este instante. Esperá 15-30 segundos y volvé a presionar Generar.'
/** Esperas antes de cada reintento con el MISMO modelo (3 intentos en total). */
const OVERLOAD_WAITS_MS = [2500, 4000]

/** Modelo inexistente o no habilitado para esta key. */
function isModelGone(err: unknown) {
  if (!(err instanceof HttpError)) return false
  return err.status === 404 || err.status === 410 || /not found|no longer available|not supported/i.test(err.message)
}

export type ModelChangeFn = (model: string, detected: GeminiModel[]) => void

/**
 * Llamada a Gemini:
 * - Saturación (503 / "experiencing high demand"): espera 2,5 s y reintenta el mismo modelo;
 *   luego espera 4 s y reintenta. Tras 3 intentos, mensaje claro para el usuario.
 * - Modelo inexistente para esta key: consulta ListModels una vez, elige el Flash más
 *   moderno disponible, lo guarda y reintenta con él.
 */
async function callGemini(
  key: string,
  model: string,
  user: string,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
  known: GeminiModel[] = [],
  system: string = COMPACT_SYSTEM_PROMPT,
) {
  // Un solo turno con el prompt completo (sistema + pedido), sin espacios redundantes.
  const prompt = `${system}\n\n${user}`
  const selected = model.trim() || GEMINI_DEFAULT_MODEL
  let current = selected
  let retries = 0
  let redetected = false
  let switches = 0
  let candidates = known
  let lastQuota: RateLimitError | null = null

  /** Siguiente modelo habilitado para la key cuya cuota no esté agotada (cada modelo tiene cuota propia). */
  const nextModel = async () => {
    if (!candidates.length) candidates = await listGeminiModels(key, signal).catch(() => [] as GeminiModel[])
    return candidates.find((m) => m.id !== current && !isExhausted(m.id))?.id ?? null
  }

  // Si el modelo elegido ya agotó su cuota en esta sesión, se arranca directo con otro.
  if (isExhausted(current)) {
    const alt = await nextModel()
    if (alt) current = alt
  }

  for (;;) {
    try {
      const text = await requestGemini(key, current, prompt, signal)
      onStatus?.(current !== selected ? `Generado con ${current} (la cuota de ${selected} está agotada).` : null)
      return text
    } catch (err) {
      if (err instanceof RateLimitError) {
        // 429: se marca el modelo y se prueba otro habilitado (hasta 3 cambios). Recién si
        // todos están agotados se informa al usuario, con el tipo de límite (RPM / RPD).
        markExhausted(err)
        lastQuota = err
        const alt = switches < 3 ? await nextModel() : null
        if (alt) {
          switches++
          onStatus?.(`[ Cuota de ${current} agotada · probando ${alt}... ]`)
          current = alt
          continue
        }
        onStatus?.(null)
        throw lastQuota
      }
      if (isOverloaded(err)) {
        if (retries < OVERLOAD_WAITS_MS.length) {
          const wait = OVERLOAD_WAITS_MS[retries]
          retries++
          onStatus?.(`[ Servidor de Google saturado · Reintento ${retries}/${OVERLOAD_WAITS_MS.length} en ${wait / 1000} s... ]`)
          await sleep(wait, signal)
          continue
        }
        onStatus?.(null)
        throw new Error(OVERLOAD_FINAL_MSG)
      }
      if (isModelGone(err) && !redetected) {
        redetected = true
        onStatus?.('[ Modelo no disponible para tu key · Detectando modelos habilitados... ]')
        const detected = await listGeminiModels(key, signal).catch(() => [] as GeminiModel[])
        if (detected.length) candidates = detected
        const next = preferredGeminiModel(detected.filter((m) => !isExhausted(m.id)))
        if (next && next !== current) {
          onModelChange?.(next, detected)
          current = next
          continue
        }
      }
      onStatus?.(null)
      throw err
    }
  }
}

/** Extrae el primer objeto JSON de la respuesta (tolera ```json ... ``` o texto alrededor). */
export function extractJson(text: string): unknown {
  return safeParseJson(text)
}

/** Pedido de corrección sintáctica: mismo contenido, JSON válido. */
function repairPrompt(err: JsonRepairError) {
  return `Tu respuesta anterior no es JSON válido (error: ${err.message}). Devolvé EXACTAMENTE el mismo contenido corregido como un único objeto JSON válido con la misma estructura: escapá las comillas dobles internas como \\" (o reemplazalas por « »), usá \\n para los saltos de línea dentro de strings, sin comas sobrantes y sin markdown.\n\nRespuesta a corregir:\n${err.raw.slice(0, 12000)}`
}

// ---------------------------------------------------------------------------
// Normalización defensiva: la salida del modelo nunca se usa sin validar.

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : fallback)
const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback
const upper = (v: unknown, fallback = '') => str(v, fallback).toUpperCase()
const stripBrackets = (s: string) => s.replace(/^\[\s*|\s*\]$/g, '')

const TEMPLATE_MAP: Record<string, TemplateId> = {
  metric: 'metric',
  ab: 'compare',
  compare: 'compare',
  chart: 'chart',
  statement: 'statement',
  manifesto: 'manifesto',
  diagram: 'diagram',
  diagrama: 'diagram',
  repeat: 'repeat',
  repetition: 'repeat',
  repeticion: 'repeat',
  repetición: 'repeat',
  metrica: 'metric',
  métrica: 'metric',
  grafico: 'chart',
  gráfico: 'chart',
  sentencia: 'statement',
  manifiesto: 'manifesto',
  matriz2x2: 'matrix',
  matriz: 'matrix',
  matrix: 'matrix',
  pipeline: 'pipeline',
  flowchart: 'pipeline',
  piramide: 'pyramid',
  pirámide: 'pyramid',
  pyramid: 'pyramid',
  checklist: 'checklist',
  guardado: 'bookmark',
  cheatsheet: 'bookmark',
  bookmark: 'bookmark',
}
const ACCENTS: Accent[] = ['orange', 'cyan', 'gold', 'white', 'gray']
const CHART_MODES: ChartMode[] = ['curve', 'bars', 'gauge']
const SHAPES: CurveShape[] = ['bell', 'rise', 'fall', 'plateau']

const REPEAT_MODES: RepeatMode[] = ['diagonal', 'echo', 'kinetic', 'justified']
const DIAGRAM_KIND_MAP: Record<string, DiagramKind> = {
  radar: 'radar',
  domino: 'domino',
  dominó: 'domino',
  progression: 'domino',
  progresion: 'domino',
  circles: 'circles',
  circulos: 'circles',
  círculos: 'circles',
  trajectory: 'curve',
  trayectoria: 'curve',
  curve: 'curve',
}

/** Primer texto no vacío de la lista. */
const first = (...vals: unknown[]) => {
  for (const v of vals) {
    const t = str(v)
    if (t) return t
  }
  return ''
}
const list = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => str(x)).filter(Boolean)
    : str(v)
        .split(/[,\n;]+/)
        .map((x) => x.trim())
        .filter(Boolean)
const scores = (v: unknown) =>
  list(v)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.min(100, Math.max(0, Math.round(n))))

/**
 * Bloque "diagram" de la IA → datos de los 4 subtipos. Acepta el payload multiformato
 * (domino.inicio, circulos.c1, trayectoria.caotico, radar.axes) y el formato plano anterior
 * (kind + axes/start/captions/noise). Lo que falte sale del pilar del tema, nunca de otra sesión.
 */
function diagramFromAi(b: Record<string, unknown>, fb: DiagramData): DiagramData {
  const radar = obj(b.radar)
  const domino = obj(b.domino ?? b.dominó)
  const circles = obj(b.circulos ?? b.circles)
  const tray = obj(b.trayectoria ?? b.trajectory)
  const axes = list(radar.axes ?? radar.ejes ?? b.axes)
  const useAxes = axes.length >= 3 ? axes.slice(0, 8) : list(fb.radar.axes)
  const fit = (vals: number[], fallback: string) => {
    const src = vals.length ? vals : scores(fallback)
    return useAxes.map((_, i) => src[i] ?? 50).join(', ')
  }
  const cmp = scores(radar.compare ?? radar.ideal ?? b.compare)
  const capList = list(b.captions)
  const caps = [1, 2, 3, 4].map((i, j) => first(circles[`c${i}`], obj(circles.captions)[`c${i}`], list(circles.captions)[j], capList[j], fb.circles.captions.split('\n')[j]))
  const div = list(circles.divisions ?? b.divisions)
    .map((x) => Math.round(Number(x)))
    .filter((n) => Number.isFinite(n) && n > 0)
  return {
    radar: {
      axes: useAxes.join(', '),
      values: fit(scores(radar.values ?? radar.valores ?? b.values), fb.radar.values),
      compare: cmp.length ? fit(cmp, fb.radar.compare) : axes.length >= 3 ? '' : fb.radar.compare,
      // Con ejes propios de la IA, las leyendas de respaldo son neutras (no las del pilar).
      labelA: first(radar.labelA, b.labelA, axes.length >= 3 ? 'Estado actual' : fb.radar.labelA),
      labelB: first(radar.labelB, b.labelB, axes.length >= 3 ? 'Estado ideal' : fb.radar.labelB),
    },
    domino: {
      count: Math.min(9, Math.max(4, Math.round(first(domino.count, b.count) ? num(domino.count ?? b.count, fb.domino.count) : fb.domino.count))),
      start: first(domino.inicio, domino.start, b.start, b.inicio, fb.domino.start),
      end: first(domino.final, domino.end, b.end, b.final, fb.domino.end),
    },
    circles: { divisions: div.length ? div.slice(0, 3).join(', ') : fb.circles.divisions, captions: caps.join('\n') },
    trajectory: {
      noise: first(tray.caotico, tray.caótico, tray.noise, b.noise, b.ruido, fb.trajectory.noise),
      clarity: first(tray.limpio, tray.clarity, b.clarity, b.claridad, fb.trajectory.clarity),
      goal: first(tray.meta, tray.goal, b.goal, b.meta, fb.trajectory.goal),
    },
  }
}

/**
 * Árbol de decisión visual: en una pieza de venta / servicios, los círculos (que sólo
 * representan fracciones de un todo) no pueden listar modalidades: la placa pasa a pipeline.
 */
function enforceSemantics(p: Partial<CanvasState>, goal: string): Partial<CanvasState> {
  if (p.template === 'diagram' && p.diagramKind === 'circles' && /venta|sales|servicio/.test(goal)) {
    return { ...p, template: 'pipeline' }
  }
  return p
}

/** Lista de objetos de la IA (acepta array u objeto indexado). */
const objList = (v: unknown) => (Array.isArray(v) ? v : Object.values(obj(v))).map(obj).filter((o) => Object.keys(o).length)

/**
 * Bloques "matriz2x2", "pipeline", "piramide" y "checklist" de la IA → datos de las plantillas
 * 08–11. Cada uno se toma completo o, si falta o viene vacío, sale del pilar del tema.
 */
function structFromAi(s: Record<string, unknown>, fb: StructData): StructData {
  const m = obj(s.matriz2x2 ?? s.matriz ?? s.matrix)
  const quads = objList(m.quadrants ?? m.cuadrantes)
    .map((q) => ({ label: upper(first(q.label, q.badge, q.titulo, q.title)), tag: first(q.tag, q.desc, q.descripcion, q.description) }))
    .filter((q) => q.label || q.tag)
  const steps = objList(obj(s.pipeline ?? s.flowchart).steps ?? obj(s.pipeline).pasos)
    .map((x) => ({ title: first(x.title, x.titulo, x.accion), desc: first(x.desc, x.descripcion, x.condicion, x.criterio) }))
    .filter((x) => x.title)
  const levels = objList(obj(s.piramide ?? s.pyramid).levels ?? obj(s.piramide).niveles)
    .sort((a, b) => num(a.level ?? a.nivel, 0) - num(b.level ?? b.nivel, 0))
    .map((x) => ({
      // "BASE: Balance energético" → "Balance energético" (la placa ya marca base y cúspide).
      name: first(x.name, x.nombre, x.label).replace(/^(base|c[uú]spide|nivel\s*\d+|top)\s*[:·\-–]\s*/i, ''),
      desc: first(x.desc, x.descripcion, x.description),
    }))
    .filter((x) => x.name)
  const items = objList(obj(s.checklist).items ?? obj(s.checklist).checks)
    .map((x) => ({
      status: (/^(err|error|fail|falla|no|x|✗|false)$/i.test(str(x.status ?? x.estado)) ? 'err' : 'ok') as 'ok' | 'err',
      text: first(x.text, x.texto, x.condicion, x.label),
      detail: first(x.detail, x.detalle, x.desc),
    }))
    .filter((x) => x.text)
  const fit = <T,>(list: T[], fallback: T[]) => (list.length >= 3 ? list.slice(0, 4) : fallback)
  return {
    matrix:
      quads.length === 4
        ? { axisX: first(m.axisX, m.ejeX, fb.matrix.axisX), axisY: first(m.axisY, m.ejeY, fb.matrix.axisY), quadrants: quads, highlight: Math.min(3, Math.max(0, Math.round(num(m.highlight, 0)))) }
        : fb.matrix,
    pipeline: { steps: fit(steps, fb.pipeline.steps), dir: 'vertical' },
    pyramid: { levels: fit(levels, fb.pyramid.levels) },
    checklist: { items: fit(items, fb.checklist.items) },
  }
}

/** Contexto de la generación: el pilar y el tema deciden los datos de respaldo del diagrama. */
export interface SlideContext {
  discipline?: Discipline
  topic?: string
}

/**
 * Convierte un slide de la IA en un parche del estado de la app. Llena los datos de TODAS las
 * plantillas (no sólo la elegida) para que al cambiar de pestaña no aparezcan datos de otra sesión.
 */
export function slideToPatch(raw: unknown, ctx: SlideContext = {}): Partial<CanvasState> {
  const s = obj(raw)
  const d = obj(s.data)
  const t = obj(s.text ?? s.texto)
  const template = TEMPLATE_MAP[str(s.templateId).toLowerCase()] ?? 'statement'
  const base = DEFAULT_STATE
  const headlineA = upper(first(t.titleWhite, s.titleWhite))
  const headlineB = upper(first(t.titleAccent, s.titleAccent))
  const patch: Partial<CanvasState> = {
    template,
    tag: stripBrackets(upper(first(t.tagSuperior, t.tag, s.tag, base.tag))),
    headlineA,
    headlineB,
    body: first(t.parrafo, t.paragraph, s.paragraph),
    citeMain: stripBrackets(upper(s.citation)),
    citeSub: str(s.description),
  }
  const headline = `${headlineA} ${headlineB}`.replace(/\*/g, '').trim()

  // 01 · Métrica
  const m = obj(s.metrica ?? s.metric)
  const md = template === 'metric' ? d : {}
  const metricValue = first(m.value, m.valor, md.value)
  if (metricValue) {
    const label = upper(first(m.label, m.etiqueta, md.label))
    const unit = upper(first(m.unidad, m.unit))
    patch.metricValue = metricValue
    patch.metricLabel = unit && !label.includes(unit) ? `${label} · ${unit}` : label
    patch.metricAccent = oneOf(m.accent ?? md.accent, ACCENTS, 'orange')
  } else {
    // Sin bloque de métrica: el número del propio titular o párrafo, nunca el de fábrica (7700).
    const found = `${headlineA} ${headlineB} ${patch.body}`.match(/[-+~]?\d+(?:[.,]\d+)?\s?(?:%|x\b|kg\b|km\b|min\b|h\b|g\b)?/i)
    patch.metricValue = found ? found[0].replace(/\s+/g, '') : '—'
    patch.metricLabel = upper(first(t.tagSuperior, s.tag, `${headlineA} ${headlineB}`))
    patch.metricAccent = 'orange'
  }

  // 02 · A/B (mapeo tolerante: Gemini a veces usa otros nombres o pone las tarjetas fuera de "data")
  const sources = [obj(s.ab), d, s]
  const pick = (paths: string[], fallback: string) => {
    for (const src of sources) {
      for (const path of paths) {
        const text = str(path.split('.').reduce<unknown>((acc, k) => obj(acc)[k], src))
        if (text) return text
      }
    }
    return fallback
  }
  const card = (side: 'A' | 'B', accent: Accent, fbLabel: string, fbValue: string) => {
    const l = side.toLowerCase()
    const groups = [`card${side}`, `option${side}`, `tarjeta${side}`, side, l, `card_${l}`, `opcion${side}`]
    const keys = (fields: string[]) => [...fields.map((f) => `card${side}_${f}`), ...groups.flatMap((g) => fields.map((f) => `${g}.${f}`))]
    return {
      label: pick(keys(['label', 'etiqueta', 'title', 'titulo', 'name', 'nombre']), fbLabel).toUpperCase(),
      value: pick(keys(['value', 'valor', 'metric', 'metrica', 'dato']), fbValue),
      caption: pick(keys(['desc', 'description', 'descripcion', 'caption', 'detail', 'detalle', 'subtitle']), ''),
      accent,
    }
  }
  patch.cardA = card('A', 'gray', 'PARÁMETRO A', 'VALOR')
  patch.cardB = card('B', 'cyan', 'PARÁMETRO B', 'VALOR')
  patch.verdict = pick(['verdict', 'veredicto', 'conclusion', 'conclusión'], '').toUpperCase()

  // 03 · Gráfico (sólo cuando es la plantilla elegida)
  const chartBlock = obj(s.grafico ?? s.chart)
  if (template === 'chart' || Object.keys(chartBlock).length) {
    // Respaldo del pilar (nunca la curva de fábrica de otro tema).
    const c = { ...base.chart, ...CHART_BY_DISCIPLINE[ctx.discipline ?? 'general'] }
    const cd = Object.keys(chartBlock).length ? chartBlock : d
    const compare = cd.compare === true || cd.compare === 'true' || Boolean(first(cd.compareLabel))
    const csv = (v: unknown, fb: string) => (Array.isArray(v) ? v.join(', ') : first(v, fb))
    patch.chart = {
      ...c,
      mode: oneOf(cd.mode, CHART_MODES, 'curve'),
      title: upper(first(cd.title, c.title)),
      min: num(cd.min, c.min),
      max: num(cd.max, c.max),
      unit: str(cd.unit),
      zone: first(cd.zone, c.zone),
      zoneLabel: str(cd.zoneLabel),
      shape: oneOf(cd.shape, SHAPES, 'bell'),
      barLabels: csv(cd.barLabels, c.barLabels),
      barValues: csv(cd.barValues, c.barValues),
      gaugeValue: num(cd.gaugeValue, c.gaugeValue),
      gaugeThreshold: num(cd.gaugeThreshold, c.gaugeThreshold),
      gaugeLabel: str(cd.gaugeLabel),
      compare,
      mainLabel: first(cd.mainLabel, cd.labelA),
      compareLabel: first(cd.compareLabel, cd.labelB),
      compareShape: oneOf(cd.compareShape, SHAPES, 'fall'),
    }
  } else {
    patch.chart = { ...base.chart, ...CHART_BY_DISCIPLINE[ctx.discipline ?? 'general'] }
  }

  // 04 · Sentencia
  patch.kicker = upper(first(obj(s.sentencia).highlight, obj(s.statement).kicker, template === 'statement' ? d.kicker : '', s.kicker))

  // 05 · Manifiesto
  patch.manifestoAuthor = upper(first(obj(s.manifiesto ?? s.manifesto).author, template === 'manifesto' ? d.author : '', DEFAULT_AUTHOR))

  // 06 · Diagrama: siempre con datos propios del tema (IA o pilar), nunca los de otra placa.
  const db = obj(s.diagram ?? s.diagrama ?? (template === 'diagram' ? d : undefined))
  const pillar = inferPillar(ctx.discipline ?? 'general', `${ctx.topic ?? ''} ${str(s.theme)}`, `${patch.tag} ${headline}`, patch.body ?? '')
  patch.diagramData = diagramFromAi(db, diagramDefaults(pillar))
  const kind = DIAGRAM_KIND_MAP[first(db.recommendedType, db.kind, db.type).toLowerCase()]
  if (kind) patch.diagramKind = kind

  // 08–11 · Estructuras: siempre con datos propios del tema (IA o pilar), nunca los de otra placa.
  patch.structData = structFromAi(s, structDefaults(pillar))

  // 12 · Guardado: viñetas de la IA; sin ellas, la app las extrae del resto del carrusel.
  const g = obj(s.guardado ?? s.cheatsheet ?? s.bookmark)
  const gPoints = list(g.points ?? g.puntos ?? g.items).slice(0, 4)
  if (template === 'bookmark' && gPoints.length >= 3) {
    patch.bookmarkData = { points: gPoints, cta: upper(first(g.cta, BOOKMARK_CTA)), accent: 'orange' }
  }

  // 07 · Repetición
  const r = obj(s.repeticion ?? s.repeat ?? (template === 'repeat' ? d : undefined))
  const short = upper(first(r.phrase, r.frase))
  const long = upper(first(r.phraseLarga, r.phraseLong))
  const aiMode = REPEAT_MODES.find((x) => x === str(r.mode))
  const mode: RepeatMode = aiMode ?? (template === 'repeat' && short && short.split(/\s+/).length <= 2 ? 'echo' : 'diagonal')
  const wantsShort = mode === 'echo' || mode === 'kinetic'
  patch.repeatPhrase = (wantsShort ? first(short, long) : first(long, short)) || headline || base.repeatPhrase
  if (template === 'repeat' || aiMode) patch.repeatMode = mode
  return sanitizePatch(patch)
}

/** Rótulos que a veces la IA deja delante del texto («Parte 1:», «Remate:», «Titular:»…). */
const LABEL_PREFIX = /^(parte\s*\d|blanco|remate|acento|titular|t[ií]tulo|gancho|hook|p[aá]rrafo|subt[ií]tulo|label|tag)\s*[:：-]\s*/i

/** Limpia un texto de la IA: markdown en negrita, rótulos, comillas envolventes y espacios. */
export function cleanText(t: string) {
  let out = t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim()
  out = out.replace(LABEL_PREFIX, '')
  const m = out.match(/^[«"“](.+)[»"”]$/)
  return (m ? m[1] : out).trim()
}

/**
 * Saneamiento final de la placa: cada campo de texto queda limpio y sin residuos antes de
 * pasar al estado (los *asteriscos* simples del titular se conservan: marcan la palabra destacada).
 */
function sanitizePatch(patch: Partial<CanvasState>): Partial<CanvasState> {
  for (const k of ['tag', 'headlineA', 'headlineB', 'body', 'kicker', 'metricValue', 'metricLabel', 'verdict', 'repeatPhrase', 'citeSub'] as const) {
    const v = patch[k]
    if (typeof v === 'string') patch[k] = cleanText(v)
  }
  for (const k of ['cardA', 'cardB'] as const) {
    const c = patch[k]
    if (c) patch[k] = { ...c, label: cleanText(c.label), value: cleanText(c.value), caption: cleanText(c.caption) }
  }
  if (patch.bookmarkData) {
    // La placa ya numera las reglas: «01. Regla» → «Regla».
    patch.bookmarkData = { ...patch.bookmarkData, points: patch.bookmarkData.points.map((p) => cleanText(p).replace(/^(regla\s*)?\d{1,2}\s*[.)\-:·]\s*/i, '')).filter(Boolean) }
  }
  return patch
}

/**
 * Caption listo para copiar: saltos de línea normalizados, viñetas unificadas en «▸ », sin
 * espacios colgando ni más de una línea en blanco seguida.
 */
export function cleanCaption(raw: string) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, '').replace(/^\s*(?:[-•*·▪►▶]|\d+[.)])\s+/, '▸ ').replace(/\*\*(.+?)\*\*/g, '$1'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface GenerationResult {
  format: 'single' | 'stories' | 'carousel'
  slides: Partial<CanvasState>[]
  caption: string
  /** Fase 1 del planner: objetivo detectado y secuencia de plantillas */
  plan?: { goal: string; intent: string; sequence: TemplateId[] }
}

export function parseGeneration(payload: unknown, mode: GenMode, ctx: SlideContext = {}): GenerationResult {
  const root = obj(payload)
  const rawSlides = Array.isArray(root.slides) ? root.slides : Array.isArray(payload) ? payload : [payload]
  const goal = str(obj(root.plan).objetivo ?? obj(root.plan).goal).toLowerCase()
  let slides = rawSlides.map((raw) => slideToPatch(raw, ctx)).map((p) => enforceSemantics(p, goal)).filter((p) => p.headlineA || p.headlineB)
  if (!slides.length) throw new Error('La IA no devolvió slides utilizables.')
  const limit = mode === 'single' ? 1 : mode === 'stories' ? 3 : mode === 'carousel' ? 5 : 5
  slides = slides.slice(0, limit)
  const declared = oneOf(root.format, ['single', 'stories', 'carousel'] as const, 'single')
  const format = mode === 'auto' ? (slides.length === 1 ? 'single' : declared === 'single' ? 'carousel' : declared) : mode
  const caption = cleanCaption(str(root.caption))
  const rawPlan = obj(root.plan)
  const plan = Object.keys(rawPlan).length
    ? { goal: str(rawPlan.objetivo ?? rawPlan.goal), intent: str(rawPlan.intencion ?? rawPlan.intent), sequence: slides.map((sl) => sl.template ?? 'statement') }
    : undefined
  return { format, slides, caption, plan }
}

export async function generateContent(
  settings: AiSettings,
  topic: string,
  mode: GenMode,
  discipline: Discipline,
  signal?: AbortSignal,
  onStatus?: StatusFn,
  onModelChange?: ModelChangeFn,
  editorial?: EditorialOptions,
): Promise<GenerationResult> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const user = buildUserPrompt(topic, mode, discipline, editorial)
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, onModelChange, settings.geminiModels ?? [])
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal)
        : callOpenAI(key, model, prompt, signal)
  const text = await ask(user)
  try {
    return parseGeneration(safeParseJson(text), mode, { discipline, topic })
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    // Ni la limpieza local lo salvó: un único reintento pidiéndole al modelo la corrección.
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    const fixed = await ask(repairPrompt(err))
    try {
      const result = parseGeneration(safeParseJson(fixed), mode, { discipline, topic })
      onStatus?.(null)
      return result
    } catch (again) {
      onStatus?.(null)
      if (again instanceof JsonRepairError) throw new Error(`La IA devolvió un JSON inválido dos veces (${again.message}). Probá de nuevo.`)
      throw again
    }
  }
}

// ---------------------------------------------------------------------------
// Re-generación de una sola placa (usa el mismo prompt de sistema, llamadas y parser).

/** Plantillas de la app → templateId que entiende la IA. */
const AI_TEMPLATE_ID: Partial<Record<TemplateId, string>> = {
  metric: 'metrica',
  compare: 'ab',
  chart: 'grafico',
  statement: 'sentencia',
  manifesto: 'manifiesto',
  diagram: 'diagrama',
  repeat: 'repeticion',
  matrix: 'matriz2x2',
  pipeline: 'pipeline',
  pyramid: 'piramide',
  checklist: 'checklist',
  bookmark: 'guardado',
}

export interface RegenerateRequest {
  topic: string
  discipline: Discipline
  /** Placa a reformular y su posición en la secuencia */
  slide: CanvasState
  index: number
  /** Titulares del resto de las placas, para mantener la coherencia del carrusel */
  others: { index: number; title: string }[]
  /** Tono editorial elegido en el generador */
  tone?: EditorialTone
}

function regeneratePrompt(req: RegenerateRequest) {
  const base = `${buildUserPrompt(req.topic, 'single', req.discipline)}\n\n${TONE_RULE[req.tone ?? 'viral']}`
  const current = `${req.slide.headlineA} ${req.slide.headlineB}`.trim()
  const aiTemplate = AI_TEMPLATE_ID[req.slide.template]
  const context = req.others.length
    ? `Es la placa ${req.index + 1} de una secuencia de ${req.others.length + 1}. Las otras placas (no las repitas ni las contradigas):\n${req.others
        .map((o) => `- Placa ${o.index + 1}: ${o.title}`)
        .join('\n')}`
    : 'Es una placa única.'
  return `${base}

REFORMULÁ ÚNICAMENTE ESTA PLACA. ${context}
Versión actual de la placa ${req.index + 1}: "${current}".
Escribí una versión nueva y mejor (otro ángulo, otro dato o una frase más contundente), coherente con el tema principal.${
    aiTemplate
      ? ` Mantené templateId "${aiTemplate}"${
          req.slide.template === 'diagram'
            ? ` con diagrama.recommendedType "${({ radar: 'radar', domino: 'domino', circles: 'circulos', curve: 'trayectoria' } as const)[req.slide.diagramKind]}"`
            : req.slide.template === 'repeat'
              ? ` con repeticion.mode "${req.slide.repeatMode}"`
              : ''
        }.`
      : ''
  } Devolvé exactamente 1 slide y "caption": "".`
}

/** Pide a la IA una versión nueva de la placa activa, sin tocar el resto de la secuencia. */
export async function regenerateSlide(
  settings: AiSettings,
  req: RegenerateRequest,
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<Partial<CanvasState>> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave del Generador IA.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, undefined, settings.geminiModels ?? [])
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal)
        : callOpenAI(key, model, prompt, signal)
  const text = await ask(regeneratePrompt(req))
  let parsed: unknown
  try {
    parsed = safeParseJson(text)
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    onStatus?.('[ Respuesta con JSON inválido · Pidiendo corrección sintáctica... ]')
    parsed = safeParseJson(await ask(repairPrompt(err)))
  }
  onStatus?.(null)
  return parseGeneration(parsed, 'single', { discipline: req.discipline, topic: req.topic }).slides[0]
}

// ---------------------------------------------------------------------------
// Herramientas editoriales puntuales (ganchos de portada, cita científica). Usan las mismas
// llamadas a cada proveedor pero con un prompt de sistema propio y corto.

const TOOL_SYSTEM = `Sos el editor de COACH JP (@coachjp.training), sistema de entrenamiento de alto rendimiento. Español rioplatense (voseo). Tono táctico, militar, científico y quirúrgico: frases cortas, cero clichés de autoayuda, cero emojis, cero signos de exclamación. Respondé estrictamente con un objeto JSON válido con la forma pedida, sin markdown ni texto antes o después. Dentro de los textos usá « » en lugar de comillas dobles.`

/** Settings de IA guardados por el generador (BYOK), con fusión profunda sobre los defaults. */
export function loadAiSettings(): AiSettings {
  try {
    const raw = JSON.parse(localStorage.getItem('jp-tactical-canvas:ai') ?? '{}') as Partial<AiSettings>
    return { ...DEFAULT_AI_SETTINGS, ...raw, keys: { ...DEFAULT_AI_SETTINGS.keys, ...raw.keys }, models: { ...DEFAULT_AI_SETTINGS.models, ...raw.models } }
  } catch {
    return DEFAULT_AI_SETTINGS
  }
}

async function askJson(settings: AiSettings, user: string, signal?: AbortSignal, onStatus?: StatusFn): Promise<Record<string, unknown>> {
  const key = (settings.keys[settings.provider] ?? '').trim()
  if (!key) throw new Error('Falta la API Key. Configurala en el ícono de llave del Generador IA.')
  const model = (settings.models[settings.provider] ?? '').trim() || DEFAULT_AI_SETTINGS.models[settings.provider]
  const ask = (prompt: string) =>
    settings.provider === 'gemini'
      ? callGemini(key, model, prompt, signal, onStatus, undefined, settings.geminiModels ?? [], TOOL_SYSTEM)
      : settings.provider === 'anthropic'
        ? callAnthropic(key, model, prompt, signal, TOOL_SYSTEM)
        : callOpenAI(key, model, prompt, signal, TOOL_SYSTEM)
  const text = await ask(user)
  try {
    return obj(safeParseJson(text))
  } catch (err) {
    if (!(err instanceof JsonRepairError)) throw err
    return obj(safeParseJson(await ask(repairPrompt(err))))
  } finally {
    onStatus?.(null)
  }
}

export type HookAngle = 'contrarian' | 'military' | 'science'
export interface HookVariant {
  angle: HookAngle
  white: string
  accent: string
}
export const HOOK_ANGLE_LABEL: Record<HookAngle, string> = {
  contrarian: 'CONTRARIAN',
  military: 'MILITAR',
  science: 'CIENTÍFICO',
}

/** 3 variantes de titular de portada (blanco + remate) con enfoques distintos. */
export async function generateHooks(
  settings: AiSettings,
  ctx: { topic: string; discipline: Discipline; headline: string },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<HookVariant[]> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Tema del carrusel: "${ctx.topic}".
Titular actual de la portada: "${ctx.headline}".
${focus ? `${focus}\n` : ''}Escribí 3 titulares alternativos para la PLACA 1 (portada), en MAYÚSCULAS, de 5 a 12 palabras en total cada uno, partidos en "white" (base, en blanco) y "accent" (remate, en naranja). Un enfoque por titular:
1. "contrarian": desmitificador, rompe un mito común de fuerza o nutrición.
2. "military": estándar operativo, directivo, directo y riguroso.
3. "science": curiosidad científica, foco en un mecanismo fisiológico o un dato empírico real (sin inventar cifras).
Forma exacta: { "hooks": [ { "angle": "contrarian", "white": string, "accent": string }, { "angle": "military", "white": string, "accent": string }, { "angle": "science", "white": string, "accent": string } ] }`
  const res = await askJson(settings, user, signal, onStatus)
  const angles: HookAngle[] = ['contrarian', 'military', 'science']
  const hooks = (Array.isArray(res.hooks) ? res.hooks : []).map(obj)
  const out = angles
    .map((angle, i) => {
      const h = hooks.find((x) => str(x.angle).toLowerCase() === angle) ?? hooks[i] ?? {}
      return { angle, white: upper(first(h.white, h.titleWhite, h.blanco)), accent: upper(first(h.accent, h.titleAccent, h.remate)) }
    })
    .filter((h) => h.white || h.accent)
  if (!out.length) throw new Error('La IA no devolvió ganchos utilizables. Probá de nuevo.')
  return out
}

/** Paper indexado real para la placa: autor y año, journal y hallazgo en una línea. */
export async function suggestCitation(
  settings: AiSettings,
  ctx: { topic: string; discipline: Discipline; slide: string },
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<{ citeMain: string; citeSub: string }> {
  const focus = DISCIPLINE_RULE[ctx.discipline]
  const user = `Contenido de la placa: "${ctx.slide}".
Tema general: "${ctx.topic}".
${focus ? `${focus}\n` : ''}Sugerí UN estudio científico REAL, publicado en una revista indexada (ej: Journal of Strength and Conditioning Research, Sports Medicine, Medicine & Science in Sports & Exercise, British Journal of Sports Medicine, Journal of the International Society of Sports Nutrition), que respalde directamente ese contenido. Preferí revisiones sistemáticas y metaanálisis muy citados (ej: Schoenfeld y col. sobre volumen e hipertrofia, Morton y col. 2018 sobre proteína, Helms y col. 2014 sobre nutrición de culturismo). Si no tenés certeza de que el estudio exista exactamente con ese autor, año y revista, devolvé "found": false: nunca inventes una cita.
Forma exacta: { "found": boolean, "author": string (apellido del primer autor + «y col.», ej «Schoenfeld y col.»), "year": number, "journal": string (nombre completo de la revista), "finding": string (hallazgo principal en 1 línea técnica, máx 110 caracteres) }`
  const res = await askJson(settings, user, signal, onStatus)
  const author = first(res.author, res.autor)
  const year = first(res.year, res.anio, res.año)
  const journal = first(res.journal, res.revista)
  if (res.found === false || !author || !year || !journal) throw new Error('La IA no encontró un paper con certeza para esta placa. Ajustá el texto o cargalo a mano.')
  return {
    citeMain: stripBrackets(`${author}, ${year} · ${journal}`.toUpperCase()),
    citeSub: first(res.finding, res.hallazgo).slice(0, 140),
  }
}

// ---------------------------------------------------------------------------
// Video Studio · transcripción de audio con Gemini (multimodal: audio WAV en línea + prompt).

export interface TranscribedWord {
  word: string
  start: number
  end: number
}

const TRANSCRIBE_PROMPT = (duration: number) => `Transcribí el habla de este audio (español rioplatense) con marcas de tiempo a nivel PALABRA.
El audio dura ${duration.toFixed(2)} segundos. Los tiempos van en segundos con 2 decimales, relativos al inicio del audio, en orden y sin superponerse.
Es contenido de entrenamiento: respetá exactamente términos técnicos como RIR, RPE, 1RM, mTOR, excéntrico, concéntrico, isométrico, hipertrofia, sobrecarga progresiva, Hyrox, CrossFit, WOD, VO2máx, glucógeno.
Escribí cada palabra con su puntuación pegada (coma, punto, signos de pregunta). No inventes texto: si no hay habla, devolvé "words": [].
Respondé SOLO con JSON: { "words": [ { "word": string, "start": number, "end": number } ] }`

async function requestGeminiAudio(key: string, model: string, wavBase64: string, duration: number, signal?: AbortSignal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'audio/wav', data: wavBase64 } }, { text: TRANSCRIBE_PROMPT(duration) }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 16384, temperature: 0 },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 429) throw rateLimitError(res, json, json?.error?.message ?? 'Quota exceeded', model)
  if (!res.ok) throw new HttpError(json?.error?.message ?? `Gemini respondió ${res.status}`, res.status)
  const cand = json?.candidates?.[0]
  if (!cand?.content) throw new Error(`Gemini no devolvió la transcripción${cand?.finishReason ? ` (${cand.finishReason})` : ''}.`)
  return ((cand.content.parts ?? []) as { text?: string }[]).map((p) => p.text ?? '').join('')
}

/**
 * Transcribe el audio (WAV mono en base64) y devuelve palabras con tiempos relativos al inicio
 * del audio, ordenadas, dentro de la duración y sin superposiciones. Usa la key de Gemini
 * guardada; si el modelo elegido no existe o agotó la cuota, prueba con los detectados.
 */
export async function transcribeAudio(
  settings: AiSettings,
  wavBase64: string,
  duration: number,
  signal?: AbortSignal,
  onStatus?: StatusFn,
): Promise<TranscribedWord[]> {
  const key = (settings.keys.gemini ?? '').trim()
  if (!key) throw new Error('La transcripción usa Gemini: cargá tu API Key de Gemini en el Generador IA (modo placas).')
  const preferred = (settings.models.gemini ?? '').trim() || GEMINI_DEFAULT_MODEL
  const models = [preferred, ...(settings.geminiModels ?? []).map((m) => m.id).filter((id) => id !== preferred)].slice(0, 4)
  let lastErr: unknown = null
  for (const model of models) {
    if (isExhausted(model)) continue
    try {
      onStatus?.(`[ Transcribiendo con ${model}… ]`)
      const text = await requestGeminiAudio(key, model, wavBase64, duration, signal)
      const raw = obj(safeParseJson(text))
      const list = (Array.isArray(raw.words) ? raw.words : Array.isArray(raw) ? (raw as unknown[]) : []).map(obj)
      const words: TranscribedWord[] = []
      for (const w of list) {
        const word = str(w.word ?? w.text).trim()
        let start = num(w.start, NaN)
        let end = num(w.end, NaN)
        if (!word || !Number.isFinite(start)) continue
        start = Math.min(duration, Math.max(0, start))
        end = Math.min(duration, Math.max(start + 0.05, Number.isFinite(end) ? end : start + 0.3))
        words.push({ word, start, end })
      }
      words.sort((a, b) => a.start - b.start)
      for (let i = 0; i < words.length - 1; i++) if (words[i].end > words[i + 1].start) words[i].end = Math.max(words[i].start + 0.05, words[i + 1].start)
      onStatus?.(null)
      return words
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      lastErr = err
      if (err instanceof RateLimitError) {
        markExhausted(err)
        continue
      }
      if (err instanceof HttpError && (err.status === 404 || err.status === 400)) continue
      throw err
    }
  }
  onStatus?.(null)
  throw lastErr instanceof Error ? lastErr : new Error('No se pudo transcribir el audio con los modelos disponibles.')
}
