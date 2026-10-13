import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { notificationsApi } from '../api'
import { API_BASE, getAccessToken, refreshSession } from '../api/client'
import { getHotelSlug } from '../tenant'
import { LANG } from '../i18n'
import { useNavigate } from '../router'
import { useToast } from './ToastContext'
import { TONE_TILE, describe, safeLink } from '../components/notifications'
import { readEventStream } from '../utils/eventStream'

const NotificationsContext = createContext(null)
const SOUND_KEY = 'nx-notif-sound'
const RECENT_SIZE = 15

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * Notificaciones del panel en vivo. Abre UNA conexión SSE por pestaña (fetch con el token en el encabezado) y la
 * mantiene: el servidor la cierra cada 10 minutos y aquí se vuelve a abrir con el token vigente; si se cae la red,
 * se reintenta con espera creciente. Al reconectar, el primer evento trae el contador, así que nada se pierde.
 */
export function NotificationsProvider({ children }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [recent, setRecent] = useState(null) // null = aún no se pide (se carga al abrir la campanita)
  const [loading, setLoading] = useState(false)
  const [sound, setSound] = useState(readSoundPref)
  const [live, setLive] = useState(false)
  const [version, setVersion] = useState(0) // cambia con cada aviso nuevo: la página de notificaciones se refresca
  const [ringing, setRinging] = useState(false)
  const recentLoaded = useRef(false)
  const soundRef = useRef(sound)
  soundRef.current = sound

  const loadRecent = useCallback(async () => {
    setLoading(true)
    try {
      const page = await notificationsApi.list({ size: RECENT_SIZE })
      setRecent(page.content)
      recentLoaded.current = true
    } catch {
      /* la campanita muestra lo que ya tenía */
    } finally {
      setLoading(false)
    }
  }, [])

  const open = useCallback((n) => {
    if (!n.read) {
      notificationsApi.markRead(n.id).then((r) => setUnread(r.unread)).catch(() => {})
      setRecent((list) => list && list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }
    const link = safeLink(n.link)
    if (link) navigate(link)
  }, [navigate])

  // ── Conexión en vivo ──────────────────────────────────────────────────────────
  const onEvent = useRef(null)
  onEvent.current = (name, data) => {
    if (name === 'ready') {
      setUnread(data.unread ?? 0)
      setLive(true)
      if (recentLoaded.current) loadRecent()
    } else if (name === 'unread') {
      setUnread(data.unread ?? 0)
      if (recentLoaded.current) loadRecent()
      setVersion((v) => v + 1)
    } else if (name === 'notification' && data?.notification) {
      const n = data.notification
      setUnread(data.unread ?? 0)
      setRecent((list) => (list ? [n, ...list.filter((x) => x.id !== n.id)].slice(0, RECENT_SIZE) : list))
      setVersion((v) => v + 1)
      setRinging(true)
      setTimeout(() => setRinging(false), 1200)
      const d = describe(n)
      toast.notice({ title: d.title, message: d.body, icon: d.icon, tile: TONE_TILE[d.tone], onClick: () => open(n) })
      if (soundRef.current) chime(n.id)
    }
  }

  useEffect(() => {
    let stopped = false
    let controller = null
    let timer = null
    let failures = 0

    const request = (token) => fetch(`${API_BASE}/notifications/stream`, {
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        'X-Hotel': getHotelSlug() || '',
        'Accept-Language': LANG,
      },
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })

    const schedule = (ms) => {
      if (!stopped) timer = setTimeout(connect, ms)
    }

    async function connect() {
      controller = new AbortController()
      try {
        let res = await request(getAccessToken())
        if (res.status === 401) {
          await refreshSession(true) // si la sesión ya no existe, falla y la app la cierra por su lado
          res = await request(getAccessToken())
        }
        if (res.status === 401 || res.status === 403) return // sin sesión o sin acceso: no se insiste
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)
        failures = 0
        await readEventStream(res.body, (name, data) => onEvent.current(name, data))
        setLive(false)
        schedule(300) // cierre normal del servidor: reconecta de inmediato con el token vigente
      } catch (err) {
        if (stopped || err?.name === 'AbortError') return
        setLive(false)
        failures += 1
        schedule(Math.min(30_000, 1000 * 2 ** Math.min(failures, 5)) + Math.random() * 1000)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      controller?.abort()
    }
  }, [])

  // Pestaña: "(3) Gran Hotel Nexora"
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, '')
    document.title = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ${base}` : base
  }, [unread])
  useEffect(() => () => {
    document.title = document.title.replace(/^\(\d+\+?\) /, '')
  }, [])

  const value = useMemo(() => ({
    unread,
    recent,
    loading,
    live,
    version,
    ringing,
    sound,
    loadRecent,
    open,
    toggleSound: () => setSound((s) => {
      try { localStorage.setItem(SOUND_KEY, s ? 'off' : 'on') } catch { /* solo esta visita */ }
      if (!s) chime(null, true)
      return !s
    }),
    markRead: async (n) => {
      if (n.read) return
      setRecent((list) => list && list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      try { setUnread((await notificationsApi.markRead(n.id)).unread) } catch { /* se corrige con el siguiente evento */ }
    },
    markAllRead: async () => {
      setRecent((list) => list && list.map((x) => ({ ...x, read: true })))
      try { setUnread((await notificationsApi.markAllRead()).unread) } catch { /* idem */ }
    },
  }), [unread, recent, loading, live, version, ringing, sound, loadRecent, open])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)

/* ── Sonido ──────────────────────────────────────────────────────────────────── */

let audio = null

/**
 * "Ding" corto de dos notas generado al momento (sin archivos). Con varias pestañas abiertas suena una sola vez por
 * aviso. Si el navegador aún no permite audio (nadie ha hecho clic en la página), simplemente no suena.
 */
function chime(id, force = false) {
  try {
    if (!force) {
      const key = 'nx-notif-last-chime'
      if (localStorage.getItem(key) === String(id)) return
      localStorage.setItem(key, String(id))
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    audio = audio || new Ctx()
    if (audio.state === 'suspended') audio.resume()
    const now = audio.currentTime
    ;[[880, 0], [1318.5, 0.13]].forEach(([freq, at]) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(0.09, now + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.7)
      osc.connect(gain).connect(audio.destination)
      osc.start(now + at)
      osc.stop(now + at + 0.75)
    })
  } catch {
    /* sin audio */
  }
}
