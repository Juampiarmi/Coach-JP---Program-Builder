import type { Supplement } from './types';

export interface Citation {
  label: string;
  doi?: string;
}

/** Bitácora de evidencia citada en el Builder, la PWA y la Story Card. */
export const CITES = {
  katch: { label: 'KATCH & McARDLE · NUTRITION, WEIGHT CONTROL & EXERCISE' },
  kliszczewicz: { label: 'KLISZCZEWICZ ET AL., 2016 · J SPORTS SCI MED' },
  ea: { label: 'LOUCKS ET AL., 2011 · J SPORTS SCI', doi: '10.1080/02640414.2011.588958' },
  reds: { label: 'MOUNTJOY ET AL., 2023 · BR J SPORTS MED', doi: '10.1136/bjsports-2023-106994' },
  morton: { label: 'MORTON ET AL., 2018 · BR J SPORTS MED', doi: '10.1136/bjsports-2017-097608' },
  protein: { label: 'JÄGER ET AL., 2017 · J INT SOC SPORTS NUTR', doi: '10.1186/s12970-017-0177-8' },
  aragon: { label: 'SCHOENFELD & ARAGON, 2018 · J INT SOC SPORTS NUTR', doi: '10.1186/s12970-018-0215-1' },
  leucine: { label: 'NORTON & LAYMAN, 2006 · J NUTR', doi: '10.1093/jn/136.2.533S' },
  carbs: { label: 'THOMAS, ERDMAN & BURKE, 2016 · MED SCI SPORTS EXERC', doi: '10.1249/MSS.0000000000000852' },
  matador: { label: 'BYRNE ET AL., 2018 · INT J OBES (MATADOR)', doi: '10.1038/ijo.2017.206' },
} satisfies Record<string, Citation>;

export function doiUrl(doi: string) {
  return `https://doi.org/${doi}`;
}

/** Protocolo AIS Grupo A escalado al peso corporal. */
export function aisGroupA(weightKg: number): Supplement[] {
  const w = weightKg;
  return [
    {
      id: 'creatina',
      name: 'Creatina monohidrato',
      dose: `${(0.04 * w).toFixed(1).replace('.', ',')} g/día (0,04 g/kg)`,
      timing: 'Diario, con cualquier comida. Sin fase de carga.',
      evidence: 'KREIDER ET AL., 2017 · J INT SOC SPORTS NUTR',
      doi: '10.1186/s12970-017-0173-z',
      enabled: true,
    },
    {
      id: 'cafeina',
      name: 'Cafeína anhidra',
      dose: `${Math.round(3 * w)}–${Math.round(6 * w)} mg (3–6 mg/kg)`,
      timing: '45–60 min pre-sesión. Evitar después de las 16:00 h.',
      evidence: 'GUEST ET AL., 2021 · J INT SOC SPORTS NUTR',
      doi: '10.1186/s12970-020-00383-4',
      enabled: true,
    },
    {
      id: 'beta-alanina',
      name: 'Beta-Alanina',
      dose: `${((65 * w) / 1000).toFixed(1).replace('.', ',')} g/día (65 mg/kg) en 4 tomas`,
      timing: 'Fraccionada con comidas (≤1,6 g por toma). 10–12 semanas.',
      evidence: 'TREXLER ET AL., 2015 · J INT SOC SPORTS NUTR',
      doi: '10.1186/s12970-015-0090-y',
      enabled: true,
    },
    {
      id: 'bicarbonato',
      name: 'Bicarbonato de sodio',
      dose: `${Math.round(0.3 * w)} g (0,3 g/kg)`,
      timing: '60–180 min pre-competencia. Probar tolerancia GI en entrenamiento.',
      evidence: 'GRGIC ET AL., 2021 · J INT SOC SPORTS NUTR',
      doi: '10.1186/s12970-021-00458-w',
      enabled: false,
    },
    {
      id: 'nitrato',
      name: 'Nitrato dietario (jugo de remolacha)',
      dose: '6–8 mmol NO₃⁻ (~500 ml jugo)',
      timing: '2–3 h pre-sesión de alta demanda aeróbica.',
      evidence: 'JONES, 2014 · SPORTS MED',
      doi: '10.1007/s40279-014-0149-y',
      enabled: false,
    },
  ];
}
