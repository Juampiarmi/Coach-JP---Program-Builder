/**
 * DETECCIÓN DE CITAS CÉLEBRES: si el concepto / brief nombra a una figura icónica (atleta, coach,
 * filósofo) o pide explícitamente una cita, la pieza va a la plantilla 14 · Cita táctica. Nunca a
 * Manifiesto (texto en párrafos) ni a Sentencia.
 */

/** Figuras icónicas (deporte, entrenamiento, estoicos y estrategas). Se comparan sin tildes ni mayúsculas. */
const ICONIC = [
  'Michael Jordan', 'Kobe Bryant', 'LeBron James', 'Magic Johnson', 'Larry Bird', 'Stephen Curry', 'Manu Ginóbili',
  'Muhammad Ali', 'Mike Tyson', 'Bruce Lee', 'Conor McGregor', 'Georges St-Pierre', 'Khabib Nurmagomedov',
  'Arnold Schwarzenegger', 'Ronnie Coleman', 'Dorian Yates', 'Lee Haney',
  'Eliud Kipchoge', 'Usain Bolt', 'Michael Phelps', 'Simone Biles', 'Carl Lewis', 'Kilian Jornet', 'Emil Zátopek', 'Steve Prefontaine', 'Bill Bowerman',
  'Rafael Nadal', 'Roger Federer', 'Novak Djokovic', 'Serena Williams', 'Andre Agassi',
  'Cristiano Ronaldo', 'Lionel Messi', 'Diego Maradona', 'Pelé', 'Zinedine Zidane', 'Johan Cruyff', 'Marcelo Bielsa', 'Pep Guardiola', 'Carlo Ancelotti', 'Diego Simeone',
  'Tom Brady', 'Vince Lombardi', 'John Wooden', 'Phil Jackson', 'Wayne Gretzky', 'Babe Ruth', 'Tiger Woods', 'Ayrton Senna', 'Juan Manuel Fangio', 'Lewis Hamilton',
  'David Goggins', 'Jocko Willink', 'Dan Gable',
  'Marco Aurelio', 'Marcus Aurelius', 'Séneca', 'Seneca', 'Epicteto', 'Epictetus', 'Sun Tzu', 'Miyamoto Musashi', 'Aristóteles', 'Aristotle', 'Sócrates', 'Platón', 'Nietzsche', 'Confucio', 'Lao Tse', 'Heráclito',
  'Winston Churchill', 'Theodore Roosevelt', 'Nelson Mandela', 'Abraham Lincoln', 'Steve Jobs',
]

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const ICONIC_FOLDED = ICONIC.map((name) => ({ name, key: fold(name) }))
/** Apellidos inconfundibles que alcanzan solos («una frase de Kobe», «como dice Séneca»). */
const SOLO = new Map(
  [['kobe', 'Kobe Bryant'], ['jordan', 'Michael Jordan'], ['seneca', 'Séneca'], ['epicteto', 'Epicteto'], ['kipchoge', 'Eliud Kipchoge'], ['goggins', 'David Goggins'], ['musashi', 'Miyamoto Musashi'], ['nadal', 'Rafael Nadal'], ['federer', 'Roger Federer'], ['bielsa', 'Marcelo Bielsa'], ['schwarzenegger', 'Arnold Schwarzenegger'], ['phelps', 'Michael Phelps']],
)

/** Pedido explícito de cita: «cita de X», «frase célebre», «como dijo X», «según X». */
const ASK_RX = /\b(cita(?:s)?\s+c[eé]lebre|frase\s+c[eé]lebre|cita\s+(?:de|t[aá]ctica)|frase\s+de|como\s+(?:dijo|dec[ií]a|dice)|seg[uú]n\s+(?=[A-ZÁÉÍÓÚ]))/i
/** Nombre propio que sigue al pedido («frase de Michael Jordan») */
// Palabras clave sin distinguir mayúsculas a mano ([Cc]): el nombre sí tiene que ir con mayúscula inicial.
const NAME_AFTER_RX = /(?:[Cc]ita(?:s)?\s+c[eé]lebre\s+de|[Ff]rase\s+c[eé]lebre\s+de|[Cc]ita\s+de|[Ff]rase\s+de|[Cc]omo\s+(?:dijo|dec[ií]a|dice)|[Ss]eg[uú]n)\s+((?:[A-ZÁÉÍÓÚÑ][\p{L}'’.-]+)(?:\s+(?:de\s+)?[A-ZÁÉÍÓÚÑ][\p{L}'’.-]+){0,3})/u

export interface QuoteIntent {
  /** Autor detectado (nombre canónico) o '' si se pidió una cita sin nombrar a nadie */
  author: string
  /** Cómo se detectó: figura icónica nombrada o pedido explícito */
  reason: 'iconic' | 'explicit'
}

/** ¿El texto pide una cita célebre? Devuelve el autor si lo nombra. */
export function detectQuoteIntent(text: string): QuoteIntent | null {
  const t = text.trim()
  if (!t) return null
  const f = ` ${fold(t).replace(/[^a-z0-9ñ\s-]/g, ' ').replace(/\s+/g, ' ')} `
  const iconic = ICONIC_FOLDED.find((p) => f.includes(` ${p.key} `))
  if (iconic) return { author: iconic.name, reason: 'iconic' }
  const asked = ASK_RX.test(t)
  const named = t.match(NAME_AFTER_RX)?.[1]?.trim()
  if (asked) {
    const solo = named ? SOLO.get(fold(named.split(/\s+/).pop() ?? '')) : undefined
    return { author: solo ?? named ?? '', reason: 'explicit' }
  }
  for (const [k, name] of SOLO) if (f.includes(` ${k} `)) return { author: name, reason: 'iconic' }
  return null
}

/**
 * Remate de énfasis de la cita (va en naranja): la última cláusula tras una coma / punto y coma /
 * dos puntos / punto si es corta, o si no las últimas 3 palabras. Nunca toda la frase.
 */
export function autoEmphasis(quote: string): string {
  const t = quote.trim().replace(/[.!…]+$/u, '')
  const ws = t.split(/\s+/).filter(Boolean)
  if (ws.length < 4) return ''
  const cut = Math.max(t.lastIndexOf(', '), t.lastIndexOf('; '), t.lastIndexOf(': '), t.lastIndexOf('. '))
  if (cut > 0) {
    const tail = t.slice(cut + 2).trim()
    const n = tail.split(/\s+/).length
    if (n >= 2 && n <= 7 && n < ws.length) return tail
  }
  return ws.slice(-Math.min(3, ws.length - 1)).join(' ')
}
