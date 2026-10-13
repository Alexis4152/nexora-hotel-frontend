import { LOCALE, tx } from '../i18n'
/** Formatos en español de México, siempre en la zona horaria del hotel cuando se conoce. */

export function formatDateTime(iso, timeZone) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone || undefined,
  }).format(new Date(iso))
}

export function timeAgo(iso) {
  if (!iso) return tx('Nunca')
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(-Math.round(seconds / size), unit)
  }
  return tx('hace un momento')
}

export function initials(first = '', last = '') {
  return `${first.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || '?'
}

/** Color estable por texto, para avatares. */
export function hueFor(text = '') {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export const TIMEZONES = [
  ['America/Mexico_City', tx('Centro (CDMX, Guadalajara, Monterrey)')],
  ['America/Cancun', tx('Sureste (Cancún, Quintana Roo)')],
  ['America/Merida', tx('Mérida')],
  ['America/Chihuahua', tx('Chihuahua')],
  ['America/Mazatlan', tx('Pacífico (Mazatlán, La Paz)')],
  ['America/Hermosillo', tx('Sonora')],
  ['America/Tijuana', tx('Noroeste (Tijuana)')],
]
