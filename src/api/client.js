import axios from 'axios'
import { getHotelSlug } from '../tenant'
import { LANG, tx } from '../i18n'

/**
 * Cliente HTTP único. El access token vive SOLO en memoria (nunca en localStorage): reduce el robo por XSS.
 * Al recargar la página se recupera con /auth/refresh usando la cookie httpOnly (patrón de Citas).
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

let accessToken = null
let onSessionExpired = null

export const setAccessToken = (token) => {
  accessToken = token
}
/** Para conexiones que no pasan por axios (la conexión en vivo de notificaciones). */
export const getAccessToken = () => accessToken
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  const slug = getHotelSlug()
  if (slug) config.headers['X-Hotel'] = slug
  // Requerido por /auth/refresh y /auth/logout (protección CSRF del backend).
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  // El servidor responde sus mensajes (errores, validaciones, reportes, PDF) en el idioma elegido.
  config.headers['Accept-Language'] = LANG
  return config
})

/*
 * Refresh de vuelo único: si varios requests reciben 401 a la vez, todos esperan la MISMA renovación. Es
 * obligatorio: el refresh token es de un solo uso y dos renovaciones con la misma cookie cerrarían la sesión.
 * Si otra pestaña ya rotó la cookie, se reintenta una vez tras una pausa (la cookie nueva ya está guardada).
 */
let refreshPromise = null

async function doRefresh(retryOnce) {
  try {
    return await api.post('/auth/refresh')
  } catch (err) {
    if (retryOnce && err.response?.status === 401) {
      await new Promise((r) => setTimeout(r, 900))
      return api.post('/auth/refresh')
    }
    throw err
  }
}

/** @param retryOnce true cuando ya había sesión (otra pestaña pudo rotar la cookie); false al restaurar. */
export function refreshSession(retryOnce = false) {
  if (!refreshPromise) {
    refreshPromise = doRefresh(retryOnce)
      .then((res) => {
        setAccessToken(res.data.data.accessToken)
        return res.data.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.includes(p))
    if (err.response?.status === 401 && !isAuthCall && !original._retried && accessToken) {
      original._retried = true
      try {
        const { accessToken: fresh } = await refreshSession(true)
        original.headers.Authorization = `Bearer ${fresh}`
        return api(original)
      } catch (refreshError) {
        setAccessToken(null)
        onSessionExpired?.()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(err)
  },
)

/** Mensaje legible para el usuario a partir de un error de la API (nunca detalles técnicos). */
export function errorMessage(err, fallback = tx('Ocurrió un error. Intenta de nuevo.')) {
  if (!err?.response) return tx('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.')
  if (err.response.status === 429) return tx('Demasiados intentos. Espera unos minutos.')
  return err.response.data?.message || fallback
}

/** Errores por campo devueltos por el backend ({campo: mensaje}). */
export function fieldErrors(err) {
  return err?.response?.data?.errors || {}
}

export default api
