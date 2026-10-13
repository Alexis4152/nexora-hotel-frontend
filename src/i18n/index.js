/**
 * Idioma de la interfaz (ES | EN), estilo gettext: el texto en español ES la clave y {@link tx} busca su
 * traducción. Si una frase no está en el diccionario se muestra en español (nunca se rompe la pantalla).
 *
 * Cambiar de idioma recarga la página: así todo (menús, constantes, fechas, moneda) se evalúa de nuevo en el
 * idioma elegido. La sesión se conserva con la cookie del refresh token.
 */
const STORAGE_KEY = 'nx-lang'
export const LANGUAGES = ['es', 'en']

function initial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.includes(saved)) return saved
  } catch { /* almacenamiento no disponible: español */ }
  return 'es'
}

export const LANG = initial()
/** Configuración regional para Intl (fechas, números, moneda). */
export const LOCALE = LANG === 'en' ? 'en-US' : 'es-MX'

if (typeof document !== 'undefined') document.documentElement.lang = LANG

/** Diccionario del idioma activo. El inglés se descarga solo si se eligió (no pesa para quien usa español). */
let dictionary = {}

/** Se llama antes de cargar la app (main.jsx): las constantes de cada pantalla se traducen al importarse. */
export async function loadLanguage() {
  if (LANG === 'en') dictionary = (await import('./en.json')).default
}

export function setLang(lang) {
  if (!LANGUAGES.includes(lang) || lang === LANG) return
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* sin almacenamiento: solo esta carga */ }
  window.location.reload()
}

/**
 * Traduce un texto. Los valores variables van como {0}, {1}…: tx('Hola, {0}', nombre).
 */
export function tx(text, ...args) {
  let s = Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : text
  args.forEach((a, i) => { s = s.split(`{${i}}`).join(a ?? '') })
  return s
}
