import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, BellRing, CheckCheck, Inbox, Volume2, VolumeX } from 'lucide-react'
import { Link } from '../router'
import { useNotifications } from '../context/NotificationsContext'
import { NotificationItem } from './notifications'
import { Skeleton } from './ui'
import { tx } from '../i18n'

const PANEL_WIDTH = 400

/**
 * Campanita del encabezado del panel: contador en vivo, últimas notificaciones, marcar como leídas e ir a la acción
 * de cada una. El panel se pinta en un portal con posición fija (el encabezado tiene desenfoque y lo recortaría).
 */
export default function NotificationBell() {
  const { unread, recent, loading, live, ringing, sound, loadRecent, open, markRead, markAllRead, toggleSound } = useNotifications()
  const [pos, setPos] = useState(null)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const button = useRef(null)
  const panel = useRef(null)

  const place = () => {
    const r = button.current.getBoundingClientRect()
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16)
    setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)), width })
  }

  const toggle = () => {
    if (pos) return setPos(null)
    place()
    return loadRecent()
  }

  useEffect(() => {
    if (!pos) return undefined
    const close = () => setPos(null)
    const onDown = (e) => {
      if (!button.current?.contains(e.target) && !panel.current?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); button.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
    }
  }, [pos])

  const choose = (n) => {
    setPos(null)
    open(n)
  }

  const items = (recent || []).filter((n) => !onlyUnread || !n.read)
  const BellIcon = unread > 0 ? BellRing : Bell
  const label = unread > 0 ? tx('Notificaciones: {0} sin leer', unread) : tx('Notificaciones')

  return (
    <>
      <button ref={button} type="button" onClick={toggle} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={!!pos}
        className={`relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white ${pos ? 'bg-black/5 text-slate-800 dark:bg-white/10 dark:text-white' : ''}`}>
        <BellIcon className={`h-[18px] w-[18px] ${ringing ? 'animate-bell-ring' : ''}`} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-ink-950">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {pos && createPortal(
        <div ref={panel} role="dialog" aria-label={tx('Notificaciones')} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] flex max-h-[min(640px,calc(100vh-88px))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-white/[.06]">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-[17px] font-semibold">
                {tx('Notificaciones')}
                {unread > 0 && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-rose-600 dark:text-rose-300">{tx('{0} sin leer', unread)}</span>}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/.18)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                {live ? tx('En vivo') : tx('Reconectando…')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={toggleSound} className="btn-ghost btn-sm h-8 w-8 px-0"
                title={sound ? tx('Silenciar sonido') : tx('Activar sonido')} aria-label={sound ? tx('Silenciar sonido') : tx('Activar sonido')} aria-pressed={sound}>
                {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button type="button" onClick={markAllRead} disabled={unread === 0} className="btn-ghost btn-sm h-8 gap-1.5 px-2 text-xs"
                title={tx('Marcar todas como leídas')}>
                <CheckCheck className="h-4 w-4" /> <span className="hidden sm:inline">{tx('Marcar todas')}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-1 px-4 py-2.5">
            {[[false, tx('Todas')], [true, tx('Sin leer')]].map(([value, text]) => (
              <button key={text} type="button" onClick={() => setOnlyUnread(value)} aria-pressed={onlyUnread === value}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${onlyUnread === value ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>
                {text}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain dark:divide-white/[.05]">
            {recent === null && loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20">
                  <Inbox className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-[15px] font-semibold">{onlyUnread ? tx('Todo al día') : tx('Sin notificaciones')}</p>
                <p className="mt-1 max-w-[260px] text-xs text-slate-500 dark:text-slate-400">
                  {onlyUnread ? tx('No tienes notificaciones sin leer.') : tx('Aquí verás reservaciones, pagos y avisos de la operación en cuanto pasen.')}
                </p>
              </div>
            ) : (
              items.map((n) => <NotificationItem key={n.id} n={n} onOpen={choose} onMarkRead={markRead} />)
            )}
          </div>

          <Link to="/panel/notificaciones" onClick={() => setPos(null)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-[13px] font-semibold text-brand-600 transition hover:bg-slate-50 dark:border-white/[.06] dark:text-brand-300 dark:hover:bg-white/[.03]">
            {tx('Ver todas las notificaciones')}
          </Link>
        </div>,
        document.body,
      )}
    </>
  )
}
