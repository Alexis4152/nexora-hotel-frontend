/**
 * Hotel (tenant) de la pantalla actual. Cada hotel vive en /h/<slug> (patrón /c/<slug> de Citas):
 * HotelScope fija el slug al entrar y de aquí lo toman axios (header X-Hotel), los Link/navigate de
 * router.jsx (anteponen /h/<slug>) y la sesión. Sin slug = raíz del sitio: plataforma Nexora.
 */
let currentSlug = null

export function getHotelSlug() {
  return currentSlug
}

export function setHotelSlug(slug) {
  currentSlug = slug || null
}

/** '/panel' → '/h/<slug>/panel' dentro de un hotel; en la raíz, igual. */
export function hotelPath(path) {
  if (!currentSlug || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('/h/')) return path
  return path === '/' ? `/h/${currentSlug}` : `/h/${currentSlug}${path}`
}

/** '/h/<slug>/panel/usuarios' → '/panel/usuarios' */
export function stripHotelPrefix(pathname) {
  const match = /^\/h\/[^/]+(\/.*)?$/.exec(pathname || '')
  const path = match ? match[1] || '/' : pathname
  // Solo rutas internas: nunca "//host", "/\host" ni con barras invertidas (evita redirecciones abiertas).
  return typeof path === 'string' && /^\/(?![/\\])[^\\]*$/.test(path) ? path : null
}
