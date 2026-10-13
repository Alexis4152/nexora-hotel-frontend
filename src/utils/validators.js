import { tx } from '../i18n'
/**
 * Espejo de las reglas del backend (validation/ValidationPatterns.java). Si cambian allá, cambian aquí.
 * El backend vuelve a validar todo: esto solo da retroalimentación inmediata debajo de cada campo.
 */
export const PATTERNS = {
  mxPhone: /^\d{10}$/,
  postalCode: /^\d{5}$/,
  personName: /^[\p{L}\p{M}]+(?:[ '’.\-][\p{L}\p{M}]+)*\.?$/u,
  hexColor: /^#[0-9A-Fa-f]{6}$/,
  slug: /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
}

export const required = (label) => (v) => (v == null || String(v).trim() === '' ? tx('Escribe {0}', label) : null)

export const email = (v) => (v && !PATTERNS.email.test(v.trim()) ? tx('El correo no es válido') : null)

export const mxPhone = (v) => (v && !PATTERNS.mxPhone.test(v) ? tx('El teléfono debe tener exactamente 10 dígitos') : null)

export const personName = (v) =>
  v && !PATTERNS.personName.test(v.trim()) ? tx('Solo letras, espacios, apóstrofos, guiones y puntos') : null

export const slug = (v) =>
  v && !PATTERNS.slug.test(v) ? tx('Solo minúsculas, números y guiones (3 a 60, sin guion al inicio o final)') : null

export const maxLength = (n) => (v) => (v && v.length > n ? tx('Máximo {0} caracteres', n) : null)

export function strongPassword(v) {
  if (!v) return null
  if (v.length < 10) return tx('Mínimo 10 caracteres')
  if (v.length > 72) return tx('Máximo 72 caracteres')
  if (!/\p{Ll}/u.test(v) || !/\p{Lu}/u.test(v) || !/\d/.test(v)) return tx('Incluye mayúscula, minúscula y número')
  return null
}

/** Aplica validadores en orden y devuelve {campo: primer error}. */
export function validate(values, rules) {
  const errors = {}
  for (const [field, validators] of Object.entries(rules)) {
    for (const fn of validators) {
      const error = fn(values[field], values)
      if (error) {
        errors[field] = error
        break
      }
    }
  }
  return errors
}

/** Deja solo dígitos y corta a 10: el campo no permite capturar más de lo válido. */
export const onlyDigits = (value, max = 10) => value.replace(/\D/g, '').slice(0, max)

/** "Gran Hotel Señorial" → "gran-hotel-senorial" */
export function toSlug(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
