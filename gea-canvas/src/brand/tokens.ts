/**
 * Identidad Hotel GEA · extraída del logo oficial.
 *
 * Logo: isotipo monolínea blanco puro (#FFFFFF) sobre carbón (#212121).
 * Glifos geométricos de trazo uniforme (~9 % de la altura del glifo), terminaciones rectas:
 *  - G: anillo abierto arriba a la izquierda + barra horizontal que entra desde afuera.
 *  - Ξ: tres barras; superior e inferior en trapecio (biseladas), media corta con "gota" a la derecha.
 *  - A: arco de medio punto sobre dos patas, pies hacia adentro, travesaño desde la izquierda con la misma "gota".
 * Lectura de marca: arquitectura, simetría, silencio. El neón es el acento (la noche), nunca el fondo.
 */
export const BRAND = {
  ink: '#212121', // fondo oficial del logo
  night: '#121212',
  carbon: '#1A1A1A',
  smoke: '#2B2B2B',
  paper: '#FFFFFF',
  bone: '#F3EEE8', // papel cálido para tickets impresos
} as const;

export type AccentKey = 'pink' | 'magenta' | 'cyan' | 'amber' | 'white';

export const ACCENTS: Record<AccentKey, { name: string; hex: string; glow: string; deep: string }> = {
  pink: { name: 'Rosa neón', hex: '#FF2E88', glow: 'rgba(255,46,136,0.85)', deep: '#8A0F47' },
  magenta: { name: 'Magenta', hex: '#E83CFF', glow: 'rgba(232,60,255,0.8)', deep: '#5E1170' },
  cyan: { name: 'Cyan noche', hex: '#2EF2FF', glow: 'rgba(46,242,255,0.8)', deep: '#0B5560' },
  amber: { name: 'Ámbar cálido', hex: '#FFB547', glow: 'rgba(255,181,71,0.8)', deep: '#6B4210' },
  white: { name: 'Blanco GEA', hex: '#FFFFFF', glow: 'rgba(255,255,255,0.7)', deep: '#3A3A3A' },
};

export const FONTS = {
  /** Display ancho geométrico, en sintonía con la postura horizontal del isotipo. */
  display: 'Syncopate',
  /** Técnica / etiquetas (tickets, números, tarjetas). */
  tech: 'Michroma',
  /** Lectura (frases, cuerpo). */
  body: 'Manrope',
} as const;

/** Fuentes que el canvas debe tener cargadas antes de dibujar (si no, cae a sans del sistema). */
export const CANVAS_FONT_FACES = [
  `400 40px ${FONTS.display}`,
  `700 40px ${FONTS.display}`,
  `400 40px ${FONTS.tech}`,
  `400 40px ${FONTS.body}`,
  `600 40px ${FONTS.body}`,
  `800 40px ${FONTS.body}`,
];
