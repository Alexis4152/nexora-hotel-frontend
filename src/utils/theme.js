/**
 * A partir de UN color de marca genera la rampa 50–950 y la aplica como variables CSS (patrón DemoPV/Citas).
 * Todo el sistema usa clases brand-*, así el color del hotel cambia sin recompilar ni tocar componentes.
 * Solo acepta #RRGGBB: nunca CSS arbitrario.
 */
export const DEFAULT_BRAND = '#0d9488'

const KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LIGHTNESS = { 50: 96, 100: 91, 200: 83, 300: 72, 400: 60, 500: 48, 600: 40, 700: 33, 800: 27, 900: 22, 950: 13 }

export const isHex = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255))
}

export function applyBrand(hex) {
  const base = isHex(hex) ? hex : DEFAULT_BRAND
  const { h, s } = hexToHsl(base)
  const sat = Math.max(35, Math.min(s, 85))
  const root = document.documentElement
  for (const key of KEYS) {
    const [r, g, b] = hslToRgb(h, sat, LIGHTNESS[key])
    root.style.setProperty(`--brand-${key}`, `${r} ${g} ${b}`)
  }
}

/** Contraste WCAG entre dos colores hex (para validar combinaciones antes de guardarlas). */
export function contrastRatio(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const DEFAULT_THEME = { primary: DEFAULT_BRAND, accent: '#c8a24a', sidebar: '#0a0f1c', defaultMode: 'system' }

function hexToTriplet(hex) {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`
}

/** Tema completo del hotel: rampa de marca (principal), acento y menú lateral. El modo lo aplica ThemeContext. */
export function applyTheme(theme) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) }
  applyBrand(t.primary)
  const root = document.documentElement
  const accent = isHex(t.accent) ? t.accent : DEFAULT_THEME.accent
  const { h, s } = hexToHsl(accent)
  const accentL = { 300: 80, 400: 68, 500: hexToHsl(accent).l, 600: Math.max(hexToHsl(accent).l - 10, 20) }
  for (const [k, l] of Object.entries(accentL)) {
    const [r, g, b] = hslToRgb(h, s, l)
    root.style.setProperty(`--accent-${k}`, `${r} ${g} ${b}`)
  }
  root.style.setProperty('--sidebar', hexToTriplet(isHex(t.sidebar) ? t.sidebar : DEFAULT_THEME.sidebar))
}
