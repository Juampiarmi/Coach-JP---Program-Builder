/** El JSON no se pudo recuperar ni con la limpieza: guarda el texto para pedir corrección. */
export class JsonRepairError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message)
  }
}

/** Quita ```json … ``` y BOM del inicio/fin. */
function stripFences(text: string) {
  return text
    .replace(/^﻿/, '')
    .trim()
    .replace(/^```(?:json|JSON)?\s*/, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

/** Primer bloque { … } si vino texto extra alrededor. */
function extractBlock(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start !== -1 && end > start ? text.slice(start, end + 1) : text
}

/**
 * Repara los errores típicos de un LLM recorriendo el texto con una máquina de estados:
 * - comillas dobles internas sin escapar ("Comentá "RIR" y…"): si después de la comilla no
 *   viene un carácter estructural (, } ] :), se escapa como \".
 * - saltos de línea / tabs crudos dentro de strings → \n / \t.
 * - caracteres de control invisibles → se eliminan.
 * - comas sobrantes antes de } o ] → se eliminan.
 */
export function repairJson(text: string) {
  let out = ''
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') {
        out += ch + (text[i + 1] ?? '')
        i++
        continue
      }
      if (ch === '"') {
        let j = i + 1
        while (j < text.length && /\s/.test(text[j])) j++
        const next = text[j]
        if (next === undefined || next === ',' || next === '}' || next === ']' || next === ':') {
          inString = false
          out += ch
        } else {
          out += '\\"'
        }
        continue
      }
      if (ch === '\n') out += '\\n'
      else if (ch === '\r') continue
      else if (ch === '\t') out += '\\t'
      else if (ch < ' ' || ch === ' ' || ch === ' ') continue
      else out += ch
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      continue
    }
    if (ch < ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') continue
    if (ch === ',') {
      // Coma colgante (sólo fuera de strings): se omite si lo próximo es } o ].
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) j++
      if (text[j] === '}' || text[j] === ']') continue
    }
    out += ch
  }
  return out
}

/**
 * Parser seguro: intenta JSON.parse directo; si falla, limpia markdown, extrae el bloque
 * { … } y repara comillas / control / comas. Si nada funciona, lanza JsonRepairError.
 */
export function safeParseJson(text: string): unknown {
  const cleaned = stripFences(text)
  const attempts = [cleaned, extractBlock(cleaned)]
  attempts.push(repairJson(attempts[1]))
  let lastError: unknown
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate)
    } catch (err) {
      lastError = err
    }
  }
  if (!cleaned.includes('{')) throw new JsonRepairError('La IA no devolvió JSON.', text)
  throw new JsonRepairError(lastError instanceof Error ? lastError.message : 'JSON inválido', text)
}
