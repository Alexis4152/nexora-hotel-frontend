import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import { tx } from '../i18n'

const SRC = join(__dirname, '..')

function sources(dir) {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f)
    if (statSync(full).isDirectory()) return f === 'test' || f === 'i18n' ? [] : sources(full)
    return /\.(jsx?)$/.test(f) ? [full] : []
  })
}

/** Claves usadas en tx('...') en todo el código (el texto en español es la clave). */
function usedKeys() {
  const keys = new Map()
  const re = /\btx\(\s*'((?:[^'\\]|\\.)*)'/g
  for (const file of sources(SRC)) {
    for (const m of readFileSync(file, 'utf8').matchAll(re)) {
      const key = m[1].replace(/\\n/g, '\n').replace(/\\(['\\])/g, '$1')
      if (!keys.has(key)) keys.set(key, file.slice(SRC.length + 1))
    }
  }
  return keys
}

describe('idiomas', () => {
  it('todo texto de la interfaz tiene traducción al inglés', () => {
    const missing = [...usedKeys()].filter(([k]) => !(k in en)).map(([k, f]) => `${f}: ${k}`)
    expect(missing, 'agrega estas frases a src/i18n/en.json').toEqual([])
  })

  it('las traducciones conservan los mismos marcadores {0}, {1}…', () => {
    const bad = Object.entries(en).filter(([es, eng]) => {
      const marks = (s) => (s.match(/\{\d+\}/g) || []).sort().join()
      return marks(es) !== marks(eng)
    }).map(([es]) => es)
    expect(bad).toEqual([])
  })

  it('en español devuelve el texto tal cual y sustituye los valores', () => {
    expect(tx('Guardar')).toBe('Guardar')
    expect(tx('Habitación {0} lista', '101')).toBe('Habitación 101 lista')
    expect(tx('Frase sin traducir')).toBe('Frase sin traducir')
  })
})
