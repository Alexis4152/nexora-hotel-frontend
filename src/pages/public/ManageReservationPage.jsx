import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CalendarRange, CheckCircle2, Clock, Copy, CreditCard, Download, Lock, PartyPopper, Printer, ShieldCheck, Users, XCircle } from 'lucide-react'
import PublicShell from './PublicShell'
import { Link } from '../../router'
import { bookingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { Button, Modal, Skeleton } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { PriceBreakdown, StatusBadge, downloadBlob, fmtDate } from '../../components/reservations'
import { formatDateTime } from '../../utils/format'
import { money } from '../../utils/money'
import LookupForm from './LookupForm'
import { rememberReturn } from './PaymentReturnPage'
import { tx } from '../../i18n'

const STATUS_COPY = {
  PENDING: [tx('Solicitud recibida'), tx('El hotel revisará tu solicitud y te confirmará por correo.')],
  PENDING_PAYMENT: [tx('Pendiente de pago'), tx('Tu habitación está apartada mientras se completa el pago.')],
  CONFIRMED: [tx('¡Reservación confirmada!'), tx('Te esperamos. Guarda tu folio para cualquier aclaración.')],
  IN_HOUSE: [tx('Disfruta tu estancia'), tx('Si necesitas algo, la recepción está para ayudarte.')],
  CHECKED_OUT: [tx('Gracias por tu visita'), tx('Esperamos verte pronto de nuevo.')],
  CANCELLED: [tx('Reservación cancelada'), tx('Esta reservación ya no está activa.')],
  EXPIRED: [tx('Solicitud expirada'), tx('No se confirmó a tiempo y la habitación se liberó. Puedes reservar de nuevo.')],
  NO_SHOW: [tx('No presentado'), tx('La reservación se cerró porque no se registró la llegada.')],
}

/**
 * Consulta de una reservación por el huésped. El token viaja en el fragmento (#) de la URL: el navegador nunca lo
 * manda al servidor en la petición de la página ni en el Referer; aquí se envía solo en un header a la API.
 */
export default function ManageReservationPage() {
  const { folio } = useParams()
  const { hash, state } = useLocation()
  const token = decodeURIComponent(hash.replace(/^#/, ''))
  const [r, setR] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    bookingApi.view(folio, token).then(setR).catch((e) => setError(errorMessage(e)))
  }, [folio, token])

  if (!token || error) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md">
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold">{tx('Consulta tu reservación')}</h1>
            <p className="mt-1 text-sm text-slate-500">{error ? tx('El enlace no es válido o ya expiró. ') : ''}{tx('Escribe tu folio y el correo con que reservaste: te enviaremos un enlace seguro.')}</p>
            <div className="mt-6"><LookupForm initialFolio={folio} /></div>
          </div>
        </div>
      </PublicShell>
    )
  }

  if (!r) return <PublicShell><div className="mx-auto max-w-4xl space-y-4"><Skeleton className="h-40" /><Skeleton className="h-72" /></div></PublicShell>

  const actions = {
    pay: (purpose) => bookingApi.pay(folio, token, purpose),
    cancel: (payload) => bookingApi.cancel(folio, token, payload),
  }
  return <PublicShell><GuestReservationView r={r} setR={setR} actions={actions} created={state?.created} /></PublicShell>
}

/**
 * Cuerpo de la reservación para el huésped: lo usan el enlace seguro (token) y "Mi cuenta". Las acciones (pagar,
 * cancelar y comprobante) llegan por props para que cada origen use su propia autorización.
 */
export function GuestReservationView({ r, setR, actions, created, back }) {
  const { hotel } = useHotel()
  const toast = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [title, subtitle] = STATUS_COPY[r.status] || [r.status, '']
  const good = ['PENDING', 'CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT', 'PENDING_PAYMENT'].includes(r.status)
  const HeroIcon = created ? PartyPopper : good ? CheckCircle2 : XCircle

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
        <section className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-xl ${good ? 'bg-gradient-to-br from-brand-600 to-brand-800' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-gold-400/20" />
          <HeroIcon className="h-10 w-10 text-gold-300" />
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{created ? tx('¡Gracias! Recibimos tu solicitud') : title}</h1>
          <p className="mt-2 max-w-xl text-white/80">{created ? tx('Te enviamos los detalles a tu correo. {0}', STATUS_COPY.PENDING[1]) : subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-white/15 px-4 py-2 font-mono text-lg font-semibold tracking-wider ring-1 ring-white/20">{r.folio}</span>
            <button className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/20 transition hover:bg-white/20 print:hidden" aria-label={tx('Copiar folio')}
              onClick={() => navigator.clipboard?.writeText(r.folio).then(() => toast.success(tx('Folio copiado')))}><Copy className="h-4 w-4" /></button>
            <button className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/20 transition hover:bg-white/20 print:hidden" aria-label={tx('Imprimir')}
              onClick={() => window.print()}><Printer className="h-4 w-4" /></button>
            {actions.receipt && (
              <button className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20 print:hidden"
                onClick={async () => { try { downloadBlob(await actions.receipt(), `${r.folio}.pdf`) } catch (e) { toast.error(errorMessage(e)) } }}>
                <Download className="mr-1 inline h-4 w-4" />{tx('Comprobante PDF')}
              </button>
            )}
          </div>
        </section>

        {created && (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20 print:hidden">
            {tx('Guarda esta página en favoritos: el enlace es personal y te permite consultar o cancelar tu reservación.')}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <section className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Tu estancia')}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="font-display text-2xl font-semibold">{r.roomTypeName}</p>
            <div className="space-y-3 text-sm">
              <Line icon={CalendarRange} label={tx('Llegada')} value={`${fmtDate(r.checkIn, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${r.policy?.checkInTime ? tx(' · desde {0}', r.policy.checkInTime.slice(0, 5)) : ''}`} />
              <Line icon={CalendarRange} label={tx('Salida')} value={`${fmtDate(r.checkOut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${r.policy?.checkOutTime ? tx(' · hasta {0}', r.policy.checkOutTime.slice(0, 5)) : ''}`} />
              <Line icon={Users} label={tx('Huéspedes')} value={`${r.guestName} · ${r.adults} adulto(s)${r.children ? `, ${r.children} menor(es)` : ''}`} />
              {r.expiresAt && ['PENDING', 'PENDING_PAYMENT'].includes(r.status) && (
                <Line icon={Clock} label={tx('Respuesta del hotel')} value={tx('a más tardar {0}', formatDateTime(r.expiresAt, hotel.timezone))} />
              )}
            </div>
            {r.cancellation && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/[.03]">
                <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-brand-600" /> {tx('Cancelación')}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {r.cancellation.outcome === 'FREE' ? (r.cancellation.freeUntil ? tx('Sin costo hasta el {0}.', formatDateTime(r.cancellation.freeUntil, hotel.timezone)) : tx('Hoy puedes cancelar sin costo.'))
                    : r.cancellation.outcome === 'WITH_PENALTY' ? tx('Si cancelas hoy se aplica una penalización de {0}.', money(r.cancellation.penalty, r.currency))
                      : tx('Ya pasó la hora de llegada: comunícate con el hotel.')}
                </p>
              </div>
            )}
            {r.canCancel && <Button variant="danger" className="w-full print:hidden" onClick={() => setCancelling(true)}><XCircle className="h-4 w-4" /> {tx('Cancelar reservación')}</Button>}
          </section>
          <section className="card p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Desglose')}</p>
            <PriceBreakdown lines={r.priceLines} total={r.total} currency={r.currency} />
          </section>
        </div>
        <PaymentPanel r={r} startPayment={actions.pay} />
        {r.payment?.transferInstructions && Number(r.balance) > 0 && !['CANCELLED', 'EXPIRED', 'NO_SHOW', 'CHECKED_OUT'].includes(r.status) && (
          <section className="card p-6 print:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Pago por transferencia')}</p>
            <p className="whitespace-pre-wrap text-sm">{r.payment.transferInstructions}</p>
            <p className="mt-2 text-xs text-slate-500">{tx('Usa tu folio')} <b>{r.folio}</b> {tx('como referencia. El hotel registrará tu pago al recibirlo.')}</p>
          </section>
        )}
        <p className="text-center text-sm text-slate-500 print:hidden">
          {back || <Link to="/" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{tx('Volver al inicio de')} {hotel.name}</Link>}
        </p>
      </div>
      {cancelling && <CancelModal r={r} cancel={actions.cancel} onClose={() => setCancelling(false)} onDone={(v) => { setR(v); setCancelling(false); toast.success(tx('Tu reservación fue cancelada')) }} />}
    </>
  )
}

function PaymentPanel({ r, startPayment }) {
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const balance = Number(r.balance)
  const deposit = Number(r.depositPending)
  const open = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_HOUSE'].includes(r.status)
  const canPay = open && r.payment?.online && balance > 0

  const pay = async (purpose) => {
    setBusy(purpose)
    try {
      const start = await startPayment(purpose)
      rememberReturn()
      window.location.assign(start.url)
    } catch (e) {
      toast.error(errorMessage(e))
      setBusy('')
    }
  }

  if (Number(r.paid) === 0 && !canPay) return null
  return (
    <section className="card p-6 print:hidden">
      <div className="flex flex-wrap items-center gap-6">
        <div><p className="text-xs text-slate-500">{tx('Pagado')}</p><p className="font-display text-2xl font-semibold tabular-nums text-emerald-600">{money(r.paid, r.currency)}</p></div>
        <div><p className="text-xs text-slate-500">{balance < 0 ? tx('Saldo a tu favor') : tx('Saldo pendiente')}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{money(Math.abs(balance), r.currency)}</p></div>
        {canPay && (
          <div className="ml-auto flex flex-wrap gap-2">
            {deposit > 0 && deposit < balance && (
              <Button loading={busy === 'DEPOSIT'} disabled={!!busy} onClick={() => pay('DEPOSIT')}><CreditCard className="h-4 w-4" /> {tx('Pagar anticipo')} {money(deposit, r.currency)}</Button>
            )}
            <Button variant={deposit > 0 && deposit < balance ? 'secondary' : 'primary'} loading={busy === 'BALANCE'} disabled={!!busy} onClick={() => pay('BALANCE')}>
              <CreditCard className="h-4 w-4" /> {tx('Pagar')} {money(balance, r.currency)}
            </Button>
          </div>
        )}
      </div>
      {r.status === 'PENDING_PAYMENT' && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {tx('Tu habitación está apartada mientras completas el anticipo')}{r.expiresAt ? ` (hasta ${formatDateTime(r.expiresAt)})` : ''}{tx('. Se confirma en cuanto la pasarela verifique el pago.')}
        </p>
      )}
      {canPay && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />
          {tx('Pagarás en la página segura de Openpay')}{r.payment.sandbox ? tx(' (modo de pruebas: no se cobra dinero real)') : ''}{tx('. Nunca te pediremos datos de tarjeta por otro medio.')}</p>
      )}
    </section>
  )
}

function Line({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div><p className="text-xs text-slate-500">{label}</p><p className="font-medium first-letter:uppercase">{value}</p></div>
    </div>
  )
}

function CancelModal({ r, cancel, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [accept, setAccept] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const penalty = Number(r.cancellation?.penalty || 0)

  const submit = async () => {
    if (penalty > 0 && !accept) { setError(tx('Confirma que aceptas la penalización')); return }
    setSaving(true)
    try {
      onDone(await cancel({ reason: reason.trim() || null, acceptPenalty: accept }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('¿Cancelar tu reservación?')} icon={XCircle}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Conservarla')}</Button><Button variant="danger" loading={saving} onClick={submit}>{tx('Sí, cancelar')}</Button></>}>
      <div className="space-y-4 text-sm">
        {penalty > 0 ? (
          <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-amber-600" checked={accept} onChange={(e) => { setAccept(e.target.checked); setError('') }} />
            <span>{tx('Entiendo que, según la política que acepté al reservar, se aplica una penalización de')} <b>{money(penalty, r.currency)}</b>.</span>
          </label>
        ) : <p className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{tx('Tu cancelación no tiene costo.')}</p>}
        <Textarea label={tx('¿Nos cuentas el motivo? (opcional)')} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}
