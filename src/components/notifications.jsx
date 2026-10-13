import {
  AlertTriangle, BedDouble, CalendarCheck2, CalendarClock, CalendarPlus, CalendarX2, Check, CreditCard, Hourglass, LogIn,
  LogOut, RotateCcw, ShieldAlert, UserX,
} from 'lucide-react'
import { METHODS } from './payments'
import { fmtDate } from './reservations'
import { money } from '../utils/money'
import { formatDateTime, timeAgo } from '../utils/format'
import { tx } from '../i18n'

/**
 * Cómo se ve cada aviso de la campanita. El servidor manda solo el tipo y sus valores; aquí se redacta el texto en
 * el idioma de quien lo lee (así un aviso creado en español se lee en inglés si la persona usa inglés).
 */

export const CATEGORIES = {
  RESERVATIONS: tx('Reservaciones'),
  PAYMENTS: tx('Pagos'),
  OPERATIONS: tx('Operación'),
  CUSTOMERS: tx('Clientes'),
}

const DATA_REQUEST_TYPES = {
  ACCESS: tx('Acceso'),
  RECTIFICATION: tx('Rectificación'),
  DELETION: tx('Cancelación'),
  OPPOSITION: tx('Oposición'),
}

/** Tile del ícono por tono (claro y oscuro). */
export const TONE_TILE = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-500/15 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber: 'bg-amber-50 text-amber-600 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  red: 'bg-rose-50 text-rose-600 ring-rose-500/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
}

const range = (p) => (p.checkIn && p.checkOut ? `${fmtDate(p.checkIn, { day: 'numeric', month: 'short' })} – ${fmtDate(p.checkOut, { day: 'numeric', month: 'short' })}` : '')
const join = (...parts) => parts.filter(Boolean).join(' · ')
const amount = (p) => (p.amount ? money(p.amount, p.currency || 'MXN') : '')

/** { title, body, detail, icon, tone } de un aviso. */
export function describe(n) {
  const p = n.params || {}
  switch (n.type) {
    case 'RESERVATION_CREATED': {
      const title = p.channel === 'WEB'
        ? tx('Nueva solicitud en línea por confirmar')
        : p.status === 'CONFIRMED' ? tx('Nueva reservación confirmada') : tx('Nueva reservación por confirmar')
      return { title, body: join(p.guest, range(p), p.roomType), detail: p.folio, icon: CalendarPlus, tone: 'brand' }
    }
    case 'RESERVATION_CONFIRMED':
      return { title: tx('Reservación confirmada'), body: join(p.guest, range(p)), detail: p.folio, icon: CalendarCheck2, tone: 'green' }
    case 'RESERVATION_MODIFIED':
      return {
        title: tx('Reservación modificada'), body: join(p.guest, range(p)),
        detail: join(p.folio, p.reason && tx('Motivo: {0}', p.reason)), icon: CalendarClock, tone: 'brand',
      }
    case 'RESERVATION_CANCELLED':
      return {
        title: p.by === 'GUEST' ? tx('El huésped canceló su reservación') : tx('Reservación cancelada'),
        body: join(p.guest, range(p)),
        detail: join(p.folio, p.reason, p.penalty && tx('Penalización: {0}', money(p.penalty, p.currency || 'MXN'))),
        icon: CalendarX2, tone: 'amber',
      }
    case 'RESERVATION_EXPIRED':
      return {
        title: tx('Solicitud expirada sin confirmar'), body: join(p.guest, range(p)),
        detail: join(p.folio, tx('Nadie la confirmó a tiempo y las fechas quedaron libres.')), icon: Hourglass, tone: 'amber',
      }
    case 'PAYMENT_RECEIVED':
      return {
        title: p.confirmed === 'true' ? tx('Pago en línea recibido: reservación confirmada') : tx('Pago en línea recibido'),
        body: join(amount(p), p.guest), detail: join(p.folio, range(p)), icon: CreditCard, tone: 'green',
      }
    case 'PAYMENT_FAILED':
      return {
        title: p.kind === 'MISMATCH' ? tx('Pago en línea con importe u orden distintos') : tx('Pago en línea rechazado'),
        body: join(amount(p), p.guest),
        detail: join(p.folio, p.kind === 'MISMATCH' ? tx('Revisa el cargo en la pasarela antes de dar el pago por bueno.') : p.detail),
        icon: AlertTriangle, tone: 'red',
      }
    case 'REFUND_ISSUED':
      return {
        title: p.external === 'true' ? tx('Reembolso hecho desde la pasarela')
          : p.extraordinary === 'true' ? tx('Reembolso extraordinario emitido') : tx('Reembolso emitido'),
        body: join(amount(p), METHODS[p.method]?.label, p.guest), detail: join(p.folio, p.reason), icon: RotateCcw, tone: 'slate',
      }
    case 'ARRIVALS_TODAY': {
      const count = Number(p.count || 0)
      return {
        title: count === 1 ? tx('Hoy llega 1 reservación') : tx('Hoy llegan {0} reservaciones', count),
        body: tx('Revisa las llegadas y ten listas las habitaciones.'), icon: LogIn, tone: 'brand',
      }
    }
    case 'ROOM_READY':
      return { title: tx('Habitación {0} lista', p.room), body: tx('{0} llega hoy', p.guest), detail: p.folio, icon: BedDouble, tone: 'green' }
    case 'LATE_CHECKOUT':
      return {
        title: p.room ? tx('Salida pendiente: habitación {0}', p.room) : tx('Salida pendiente'),
        body: tx('{0} debía salir el {1} a las {2}', p.guest, fmtDate(p.checkOut, { day: 'numeric', month: 'short' }), (p.time || '').slice(0, 5)),
        detail: p.folio, icon: LogOut, tone: 'amber',
      }
    case 'NO_SHOW_CANDIDATE':
      return {
        title: tx('¿No se presentó? {0}', p.guest),
        body: tx('Llegaba el {0}. Registra su llegada o márcala como no presentada.', fmtDate(p.checkIn, { weekday: 'short', day: 'numeric', month: 'short' })),
        detail: p.folio, icon: UserX, tone: 'amber',
      }
    case 'DATA_REQUEST_CREATED':
      return {
        title: tx('Nueva solicitud de datos personales'),
        body: join(p.guest, DATA_REQUEST_TYPES[p.requestType]),
        detail: tx('La ley establece plazos de respuesta.'), icon: ShieldAlert, tone: 'amber',
      }
    default:
      return { title: tx('Notificación'), body: '', icon: Check, tone: 'slate' }
  }
}

/** Solo rutas del panel: el enlace viene del servidor, pero nunca se navega a otro sitio. */
export function safeLink(link) {
  return typeof link === 'string' && /^\/panel(\/|\?|$)/.test(link) ? link : null
}

/** Fila de un aviso (campanita y página de notificaciones). */
export function NotificationItem({ n, onOpen, onMarkRead, roomy = false }) {
  const d = describe(n)
  const Icon = d.icon
  return (
    <div className={`group relative flex gap-3 transition ${roomy ? 'px-5 py-4' : 'px-4 py-3'} ${n.read ? '' : 'bg-brand-50/40 dark:bg-brand-500/[.05]'} hover:bg-slate-50 dark:hover:bg-white/[.03]`}>
      <button type="button" onClick={() => onOpen(n)} className="absolute inset-0 rounded-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        aria-label={d.title} />
      <span className={`relative mt-0.5 grid ${roomy ? 'h-10 w-10' : 'h-9 w-9'} shrink-0 place-items-center rounded-xl ring-1 ${TONE_TILE[d.tone]}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className={`text-[13.5px] leading-snug ${n.read ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`}>
          {d.title}
        </p>
        {d.body && <p className="mt-0.5 truncate text-[13px] text-slate-600 dark:text-slate-400">{d.body}</p>}
        {d.detail && <p className={`mt-0.5 text-xs text-slate-500 dark:text-slate-500 ${roomy ? '' : 'line-clamp-2'}`}>{d.detail}</p>}
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span>{CATEGORIES[n.category] || ''}</span>
          <span aria-hidden>·</span>
          <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time>
        </p>
      </div>
      {!n.read && (
        <div className="relative flex shrink-0 flex-col items-end gap-2">
          <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_0_3px_rgb(var(--brand-500)/.15)]" aria-label={tx('Sin leer')} />
          {onMarkRead && (
            <button type="button" onClick={() => onMarkRead(n)} title={tx('Marcar como leída')} aria-label={tx('Marcar como leída')}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-200/70 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white">
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
