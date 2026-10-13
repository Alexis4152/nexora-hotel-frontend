import { tx } from '../i18n'
const COMMON = ['password', tx('contraseña'), 'contrasena', '123456', 'qwerty', 'hotel', 'admin', 'nexora', 'abc123']

/**
 * Fortaleza 0–4 para el medidor visual. Es orientativa: la regla obligatoria es la del backend
 * (10+ caracteres, mayúscula, minúscula y número).
 */
export function passwordStrength(value) {
  if (!value) return { score: 0, label: '', checks: checks('') }
  const c = checks(value)
  let score = [c.length, c.upper, c.lower, c.digit].filter(Boolean).length
  if (c.symbol) score += 1
  if (value.length >= 14) score += 1
  if (COMMON.some((w) => value.toLowerCase().includes(w))) score -= 2
  if (/(.)\1{2,}/.test(value)) score -= 1
  score = Math.max(0, Math.min(4, Math.round((score / 6) * 4)))
  const labels = [tx('Muy débil'), tx('Débil'), tx('Aceptable'), tx('Fuerte'), tx('Excelente')]
  return { score, label: labels[score], checks: c }
}

function checks(v) {
  return {
    length: v.length >= 10,
    upper: /\p{Lu}/u.test(v),
    lower: /\p{Ll}/u.test(v),
    digit: /\d/.test(v),
    symbol: /[^\p{L}\d]/u.test(v),
  }
}
