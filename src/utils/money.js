import { LOCALE } from '../i18n'
/** Importes siempre como texto/decimal del backend (BigDecimal); aquí solo se formatean para mostrarse. */
export function money(value, currency = 'MXN') {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(Number(value))
}

/** Normaliza lo que se teclea en un campo de dinero: dígitos y hasta 2 decimales. */
export function moneyInput(value) {
  const clean = value.replace(/[^\d.]/g, '')
  const [int, ...rest] = clean.split('.')
  return rest.length ? `${int.slice(0, 10)}.${rest.join('').slice(0, 2)}` : int.slice(0, 10)
}
