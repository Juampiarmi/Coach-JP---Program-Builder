import type { Discipline } from './ai'
import type { CanvasState, StructData } from '../types'
import { inferPillar, slideText, type DiagramPillar } from './diagramPillar'

/** Contenido por defecto de las plantillas 08–11 según el pilar del tema (nunca placeholders vacíos). */
const SETS: Record<DiagramPillar, StructData> = {
  strength: {
    matrix: {
      axisX: 'Fatiga sistémica',
      axisY: 'Estímulo de hipertrofia',
      quadrants: [
        { label: 'ÓPTIMO', tag: 'Máquinas y poleas cerca del fallo' },
        { label: 'CARO', tag: 'Básicos pesados: dosificar' },
        { label: 'RELLENO', tag: 'Series lejos del fallo' },
        { label: 'VOLUMEN BASURA', tag: 'Fatiga sin estímulo real' },
      ],
      highlight: 0,
    },
    pipeline: {
      steps: [
        { title: 'Serie de aproximación', desc: 'Medí la velocidad y el RIR real' },
        { title: 'Primera serie efectiva', desc: 'Si RIR > 2: subí 2,5–5 %' },
        { title: 'Ajuste serie a serie', desc: 'Si cae la técnica: bajá la carga' },
        { title: 'Registro', desc: 'Anotá carga, reps y RIR' },
      ],
      dir: 'vertical',
    },
    pyramid: {
      levels: [
        { name: 'Adherencia', desc: 'Entrenar semanas seguidas sin cortar' },
        { name: 'Volumen y esfuerzo', desc: '10–20 series por músculo a RIR 0–3' },
        { name: 'Progresión de carga', desc: 'Más reps o más kilos cada semana' },
        { name: 'Técnicas avanzadas', desc: 'Drop sets, rest-pause: el último 5 %' },
      ],
    },
    checklist: {
      items: [
        { status: 'ok', text: '¿Terminaste a RIR 0–2?', detail: 'Si te sobraban 5 reps, no contó' },
        { status: 'ok', text: '¿El rango de movimiento fue completo?', detail: 'Media repetición = medio estímulo' },
        { status: 'err', text: '¿Cambiaste de ejercicio sin progresar?', detail: 'Sin repetición no hay progresión medible' },
        { status: 'err', text: '¿Descansaste menos de 90 segundos?', detail: 'La próxima serie pierde reps' },
      ],
    },
  },
  nutrition: {
    matrix: {
      axisX: 'Densidad calórica',
      axisY: 'Saciedad',
      quadrants: [
        { label: 'BASE DIARIA', tag: 'Verduras, frutas y proteína magra' },
        { label: 'ESTRATÉGICO', tag: 'Arroz, avena y papa alrededor del entreno' },
        { label: 'NEUTRO', tag: 'Caldos y bebidas sin azúcar' },
        { label: 'TRAMPA', tag: 'Ultraprocesados: mucha energía, poca saciedad' },
      ],
      highlight: 0,
    },
    pipeline: {
      steps: [
        { title: 'Calorías de mantenimiento', desc: 'Registrá 14 días y promediá' },
        { title: 'Proteína fija', desc: '1,6–2,2 g/kg todos los días' },
        { title: 'Carbohidratos según la carga', desc: 'Más en días de volumen alto' },
        { title: 'Ajuste semanal', desc: 'Si el peso no se mueve: ±150 kcal' },
      ],
      dir: 'vertical',
    },
    pyramid: {
      levels: [
        { name: 'Balance energético', desc: 'Calorías totales: no negociable' },
        { name: 'Macronutrientes', desc: 'Proteína 2 g/kg y carbohidratos suficientes' },
        { name: 'Timing y digestión', desc: 'Carbohidratos alrededor del entreno' },
        { name: 'Suplementación', desc: 'Creatina y cafeína: el último detalle' },
      ],
    },
    checklist: {
      items: [
        { status: 'ok', text: '¿Llegaste a tu proteína diaria?', detail: '1,6–2,2 g por kilo de peso' },
        { status: 'ok', text: '¿Comiste carbohidratos antes de entrenar?', detail: 'Glucógeno disponible para las series' },
        { status: 'err', text: '¿Entrenaste en ayunas una sesión de volumen?', detail: 'Menos reps, menos estímulo' },
        { status: 'err', text: '¿Te hidrataste menos de 30 ml/kg?', detail: 'La deshidratación baja el rendimiento' },
      ],
    },
  },
  crossfit: {
    matrix: {
      axisX: 'Intensidad',
      axisY: 'Duración',
      quadrants: [
        { label: 'BASE AERÓBICA', tag: 'Zona 2: larga y controlada' },
        { label: 'ZONA GRIS', tag: 'Ni recuperás ni progresás' },
        { label: 'RECUPERACIÓN', tag: 'Movilidad y trote suave' },
        { label: 'POTENCIA', tag: 'Intervalos cortos al máximo' },
      ],
      highlight: 0,
    },
    pipeline: {
      steps: [
        { title: 'Salida controlada', desc: 'Primer km 5 % más lento que tu ritmo' },
        { title: 'Estación', desc: 'Respiración por la nariz en las transiciones' },
        { title: 'Mitad de carrera', desc: 'Si el pulso pasa el umbral: bajá el ritmo' },
        { title: 'Último tramo', desc: 'Recién ahí vaciá el tanque' },
      ],
      dir: 'vertical',
    },
    pyramid: {
      levels: [
        { name: 'Base aeróbica', desc: 'El motor que sostiene todo' },
        { name: 'Umbral de lactato', desc: 'Ritmo sostenible más alto' },
        { name: 'Fuerza y técnica', desc: 'Estaciones eficientes bajo fatiga' },
        { name: 'Potencia máxima', desc: 'Sprints finales: el detalle' },
      ],
    },
    checklist: {
      items: [
        { status: 'ok', text: '¿El primer km fue más lento que el último?', detail: 'Pacing negativo = carrera inteligente' },
        { status: 'ok', text: '¿Las transiciones fueron de menos de 30 segundos?', detail: 'El tiempo se pierde fuera de las estaciones' },
        { status: 'err', text: '¿Saliste a fondo en el primer tramo?', detail: 'El lactato te cobra en la segunda mitad' },
        { status: 'err', text: '¿Llegaste sin plan de hidratación?', detail: 'Sin plan, improvisás bajo fatiga' },
      ],
    },
  },
}

/** Copia nueva (cada placa edita la suya). */
export function structDefaults(pillar: DiagramPillar): StructData {
  const s = SETS[pillar]
  return {
    matrix: { ...s.matrix, quadrants: s.matrix.quadrants.map((q) => ({ ...q })) },
    pipeline: { ...s.pipeline, steps: s.pipeline.steps.map((x) => ({ ...x })) },
    pyramid: { levels: s.pyramid.levels.map((x) => ({ ...x })) },
    checklist: { items: s.checklist.items.map((x) => ({ ...x })) },
  }
}

/** Datos que dibujan las plantillas 08–11: los de la placa o, si nunca se cargaron, los del pilar del tema. */
export function resolveStructData(state: CanvasState, discipline: Discipline = 'general'): StructData {
  return state.structData ?? structDefaults(inferPillar(discipline, ...slideText(state)))
}

export const STRUCT_TEMPLATES = ['matrix', 'pipeline', 'pyramid', 'checklist'] as const
