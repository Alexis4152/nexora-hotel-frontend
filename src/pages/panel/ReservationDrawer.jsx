import { useEffect, useState } from 'react'
import {
  AlertTriangle, BedDouble, CalendarRange, CheckCircle2, DoorOpen, Download, FileText, History, LogIn, LogOut, Mail, Pencil, Phone,
  ShieldCheck, UserX, Users, Wallet, XCircle,
} from 'lucide-react'
import { Button, Input, Modal, Select, Skeleton, Switch } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { PriceBreakdown, SOURCES, StatusBadge, StayFields, downloadBlob, fmtDate, todayIn } from '../../components/reservations'
import { reservationsApi, publicApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import AccountSection from './ReservationAccount'
import { CheckInDialog, CheckOutDialog, NoShowDialog } from './StayDialogs'
import { tx } from '../../i18n'

const OUTCOME = {
  FREE: { tone: 'text-emerald-600 dark:text-emerald-400', text: 'Cancelación sin costo' },
  WITH_PENALTY: { tone: 'text-amber-600 dark:text-amber-400', text: 'Cancelación con penalización' },
  REQUIRES_ADMIN: { tone: 'text-rose-600 dark:text-rose-400', text: 'Requiere autorización (la llegada ya pasó)' },
}

export default function ReservationDrawer({ id, onClose, onChanged }) {
  const { can } = useAuth()
  const toast = useToast()
  const [r, setR] = useState(null)
  const [busy, setBusy] = useState('')
  const { hotel } = useHotel()
  const today = todayIn(hotel.timezone)
  const [panel, setPanel] = useState(null) // cancel | modify | notes | checkin | checkout | noshow

  const load = () => reservationsApi.detail(id).then(setR).catch((e) => { toast.error(errorMessage(e)); onClose() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id])

  const run = async (key, fn, ok) => {
    setBusy(key)
    try {
      const res = await fn()
      if (ok) toast.success(ok)
      if (res && res.summary) setR(res); else await load()
      onChanged?.()
      return true
    } catch (e) {
      toast.error(errorMessage(e))
      return false
    } finally {
      setBusy('')
    }
  }

  const s = r?.summary
  const open = s && !['CANCELLED', 'EXPIRED', 'NO_SHOW', 'CHECKED_OUT'].includes(s.status)
  const editable = s && ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'].includes(s.status)
  const currentLines = r ? r.priceLines.filter((l) => l.revision === r.priceRevision) : []

  return (
    <Modal open onClose={onClose} size="max-w-4xl" icon={CalendarRange}
      title={s ? <span className="flex flex-wrap items-center gap-3"><span className="font-mono">{s.folio}</span><StatusBadge status={s.status} /></span> : tx('Reservación')}
      description={s ? `${SOURCES[s.source]} · creada ${formatDateTime(s.createdAt)}` : ''}>
      {!r ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-48" /></div> : (
        <div className="space-y-6">
          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            {can('RESERVATIONS:CHECK_IN') && s.status === 'CONFIRMED' && s.checkIn <= today && (
              <Button size="sm" onClick={() => setPanel('checkin')}><LogIn className="h-4 w-4" /> {tx('Check-in')}</Button>
            )}
            {can('RESERVATIONS:CHECK_OUT') && s.status === 'IN_HOUSE' && (
              <Button size="sm" onClick={() => setPanel('checkout')}><LogOut className="h-4 w-4" /> {tx('Check-out')}</Button>
            )}
            {can('RESERVATIONS:CONFIRM') && ['PENDING', 'PENDING_PAYMENT'].includes(s.status) && (
              <Button size="sm" loading={busy === 'confirm'} onClick={() => run('confirm', () => reservationsApi.confirm(id), tx('Reservación confirmada'))}>
                <CheckCircle2 className="h-4 w-4" /> {tx('Confirmar')}
              </Button>
            )}
            {can('RESERVATIONS:UPDATE') && editable && <Button size="sm" variant="secondary" onClick={() => setPanel('modify')}><Pencil className="h-4 w-4" /> {tx('Modificar estancia')}</Button>}
            {can('RESERVATIONS:UPDATE') && <Button size="sm" variant="secondary" onClick={() => setPanel('notes')}><FileText className="h-4 w-4" /> {tx('Notas')}</Button>}
            {can('RESERVATIONS:RESEND') && open && r.contactEmail && (
              <Button size="sm" variant="secondary" loading={busy === 'resend'} onClick={() => run('resend', () => reservationsApi.resend(id), tx('Correo en cola de envío'))}>
                <Mail className="h-4 w-4" /> {tx('Reenviar correo')}
              </Button>
            )}
            <Button size="sm" variant="secondary" loading={busy === 'pdf'}
              onClick={async () => { setBusy('pdf'); try { downloadBlob(await reservationsApi.receipt(id), `${s.folio}.pdf`) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy('') } }}>
              <Download className="h-4 w-4" /> {tx('Comprobante PDF')}
            </Button>
            {can('RESERVATIONS:CHECK_IN') && s.status === 'CONFIRMED' && s.checkIn < today && (
              <Button size="sm" variant="secondary" onClick={() => setPanel('noshow')}><UserX className="h-4 w-4" /> {tx('No se presentó')}</Button>
            )}
            {can('RESERVATIONS:CANCEL') && open && s.status !== 'IN_HOUSE' && (
              <Button size="sm" variant="danger" className="ml-auto" onClick={() => setPanel('cancel')}><XCircle className="h-4 w-4" /> {tx('Cancelar')}</Button>
            )}
          </div>

          {r.expiresAt && ['PENDING', 'PENDING_PAYMENT'].includes(s.status) && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{tx('Si no se confirma antes del')} <b>{formatDateTime(r.expiresAt)}</b>{tx(', la solicitud expira y la habitación se libera automáticamente.')}</p>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5">
              <section className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[.03]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Huésped')}</p>
                <p className="mt-1 font-display text-xl font-semibold">{s.guestName}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {r.contactEmail && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{r.contactEmail}</p>}
                  {s.contactPhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{s.contactPhone}</p>}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-3 text-sm">
                <Fact icon={CalendarRange} label={tx('Llegada')} value={fmtDate(s.checkIn, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <Fact icon={CalendarRange} label={tx('Salida')} value={fmtDate(s.checkOut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <Fact icon={BedDouble} label={tx('Habitación')} value={`${s.roomNumber || '—'} · ${s.roomTypeName}`} />
                <Fact icon={Users} label={tx('Huéspedes')} value={`${s.adults} adulto(s)${s.children ? ` · ${s.children} menor(es)` : ''} · ${s.nights} noche(s)`} />
              </section>
              {(r.specialRequests || r.internalNotes) && (
                <section className="space-y-3 text-sm">
                  {r.specialRequests && <Note title={tx('Solicitudes del huésped')} text={r.specialRequests} />}
                  {r.internalNotes && <Note title={tx('Notas internas')} text={r.internalNotes} internal />}
                </section>
              )}
              {r.cancellation && open && (
                <section className="rounded-2xl p-4 ring-1 ring-slate-200 dark:ring-white/10">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ShieldCheck className="h-4 w-4" /> {tx('Política aceptada')}</p>
                  <p className={`mt-2 font-semibold ${OUTCOME[r.cancellation.outcome].tone}`}>{tx('Hoy:')} {OUTCOME[r.cancellation.outcome].text}
                    {Number(r.cancellation.penalty) > 0 && ` · ${money(r.cancellation.penalty)}`}</p>
                  {r.cancellation.freeUntil && <p className="mt-1 text-sm text-slate-500">{tx('Sin costo hasta el')} {formatDateTime(r.cancellation.freeUntil)}</p>}
                </section>
              )}
              {r.cancelReason && <Note title={tx('Motivo de cancelación')} text={`${r.cancelReason}${Number(r.penaltyAmount) > 0 ? tx(' · penalización {0}', money(r.penaltyAmount)) : ''}`} />}
            </div>
            <section className="rounded-2xl p-4 ring-1 ring-slate-200 dark:ring-white/10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Desglose')}{r.priceRevision > 1 ? tx(' · versión {0}', r.priceRevision) : ''}</p>
              <PriceBreakdown lines={currentLines} total={s.total} />
            </section>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Wallet className="h-4 w-4" /> {tx('Cuenta y pagos')}</p>
            <AccountSection r={r} onChange={(d) => { if (d) setR(d); else load(); onChanged?.() }} />
          </div>

          {(r.account.checkedInAt || r.account.guests.length > 0) && (
            <section className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/[.03]">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><DoorOpen className="h-4 w-4" /> {tx('Estancia')}</p>
              {r.account.checkedInAt && <p>{tx('Llegada registrada el')} {formatDateTime(r.account.checkedInAt)}{r.account.checkedInByName ? ` por ${r.account.checkedInByName}` : ''}</p>}
              {r.account.checkedOutAt && <p>{tx('Salida registrada el')} {formatDateTime(r.account.checkedOutAt)}{r.account.checkedOutByName ? ` por ${r.account.checkedOutByName}` : ''}</p>}
              {r.account.checkInNotes && <p className="text-slate-500">{tx('Llegada:')} {r.account.checkInNotes}</p>}
              {r.account.checkOutNotes && <p className="text-slate-500">{tx('Salida:')} {r.account.checkOutNotes}</p>}
              {r.account.guests.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.account.guests.map((g) => (
                    <li key={g.id} className="rounded-lg bg-white px-2.5 py-1 text-xs ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                      {g.fullName}{g.minor ? ' (menor)' : ''}{g.idNumber ? ` · ${g.idType || 'ID'} ${g.idNumber}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><History className="h-4 w-4" /> {tx('Historial')}</p>
            <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-white/10">
              {r.history.map((h, i) => (
                <li key={i} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-ink-900" />
                  <p className="flex flex-wrap items-center gap-2">{h.from && <><StatusBadge status={h.from} /><span className="text-slate-400">→</span></>}<StatusBadge status={h.to} /></p>
                  <p className="mt-1 text-slate-500">{formatDateTime(h.at)} · {h.userName || tx('Sistema / huésped')}{h.reason ? ` — ${h.reason}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
      {panel === 'cancel' && r && <CancelDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
      {panel === 'modify' && r && <ModifyDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
      {panel === 'notes' && r && <NotesDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
      {panel === 'checkin' && r && <CheckInDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
      {panel === 'checkout' && r && <CheckOutDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
      {panel === 'noshow' && r && <NoShowDialog r={r} onClose={() => setPanel(null)} onDone={(res) => { setPanel(null); setR(res); onChanged?.() }} />}
    </Modal>
  )
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-3 ring-1 ring-slate-200 dark:ring-white/10">
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 font-medium first-letter:uppercase">{value}</p>
    </div>
  )
}

function Note({ title, text, internal }) {
  return (
    <div className={`rounded-xl p-3 ${internal ? 'bg-gold-300/15 ring-1 ring-gold-500/20' : 'bg-slate-50 dark:bg-white/[.03]'}`}>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{text}</p>
    </div>
  )
}

/* ── Cancelar ───────────────────────────────────────────────────────────────────── */

function CancelDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [waive, setWaive] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const c = r.cancellation
  const needsOverride = c.outcome === 'REQUIRES_ADMIN'
  const canOverride = can('RESERVATIONS:OVERRIDE')

  const submit = async () => {
    if (!reason.trim()) { setError(tx('Indica el motivo')); return }
    setSaving(true)
    try {
      onDone(await reservationsApi.cancel(r.summary.id, { reason: reason.trim(), waivePenalty: waive }))
      toast.success(tx('Reservación cancelada'))
    } catch (e) {
      setError(fieldErrors(e).reason || '')
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Cancelar {0}', r.summary.folio)} icon={XCircle}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Volver')}</Button>
        <Button variant="danger" loading={saving} disabled={needsOverride && !canOverride} onClick={submit}>{tx('Cancelar reservación')}</Button></>}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/[.03]">
          <p className={`font-semibold ${OUTCOME[c.outcome].tone}`}>{OUTCOME[c.outcome].text}</p>
          {c.outcome === 'WITH_PENALTY' && <p className="mt-1">{tx('Según la política aceptada, la penalización es de')} <b>{money(waive ? 0 : c.penalty)}</b>.</p>}
          {needsOverride && !canOverride && <p className="mt-1 text-slate-500">{tx('Solo un usuario con permiso para autorizar excepciones puede cancelarla.')}</p>}
        </div>
        {c.outcome === 'WITH_PENALTY' && canOverride && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{tx('Condonar la penalización (queda registrado en auditoría)')}</span>
            <Switch checked={waive} onChange={setWaive} label={tx('Condonar penalización')} />
          </label>
        )}
        <Textarea label={tx('Motivo')} required maxLength={500} rows={3} value={reason} error={error} onChange={(e) => { setReason(e.target.value); setError('') }} />
      </div>
    </Modal>
  )
}

/* ── Modificar estancia ─────────────────────────────────────────────────────────── */

function ModifyDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const toast = useToast()
  const s = r.summary
  const [stay, setStay] = useState({ checkIn: s.checkIn, checkOut: s.checkOut, adults: s.adults, children: s.children })
  const [roomTypeId, setRoomTypeId] = useState(String(r.roomTypeId))
  const [discount, setDiscount] = useState(Number(r.discountTotal) > 0 ? String(r.discountTotal) : '')
  const [reason, setReason] = useState('')
  const [types, setTypes] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { publicApi.roomTypes().then(setTypes).catch(() => setTypes([])) }, [])

  const submit = async () => {
    const e = {}
    if (!reason.trim()) e.reason = tx('Indica el motivo del cambio')
    if (!stay.checkIn || !stay.checkOut || stay.checkOut <= stay.checkIn) e.checkOut = tx('La salida debe ser posterior a la llegada')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onDone(await reservationsApi.modify(s.id, {
        roomTypeId: Number(roomTypeId), ...stay, discount: can('RESERVATIONS:APPLY_DISCOUNT') ? (discount || '0') : null, reason: reason.trim(),
      }))
      toast.success(tx('Estancia actualizada y recotizada'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Modificar estancia')} size="max-w-2xl" icon={Pencil}
      description={tx('Se vuelve a cotizar con las tarifas vigentes y se verifica disponibilidad antes de guardar.')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Volver')}</Button><Button loading={saving} onClick={submit}>{tx('Guardar cambios')}</Button></>}>
      <div className="space-y-4">
        <StayFields value={stay} onChange={setStay} minDate={s.status === 'CONFIRMED' ? undefined : todayIn(hotel.timezone)} errors={errors} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={tx('Tipo de habitación')} value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
            {!types.some((t) => String(t.id) === roomTypeId) && <option value={roomTypeId}>{s.roomTypeName}</option>}
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          {can('RESERVATIONS:APPLY_DISCOUNT') && (
            <Input label={tx('Descuento sobre hospedaje (MXN)')} inputMode="decimal" value={discount} error={errors.discount}
              onChange={(e) => setDiscount(moneyInput(e.target.value))} placeholder="0.00" />
          )}
        </div>
        <Textarea label={tx('Motivo del cambio')} required maxLength={500} rows={2} value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  )
}

/* ── Notas ──────────────────────────────────────────────────────────────────────── */

function NotesDialog({ r, onClose, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState({ specialRequests: r.specialRequests || '', internalNotes: r.internalNotes || '' })
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true)
    try {
      onDone(await reservationsApi.notes(r.summary.id, form))
      toast.success(tx('Notas guardadas'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={tx('Notas de la reservación')} icon={FileText}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Volver')}</Button><Button loading={saving} onClick={submit}>{tx('Guardar')}</Button></>}>
      <div className="space-y-4">
        <Textarea label={tx('Solicitudes del huésped')} maxLength={1000} rows={3} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
        <Textarea label={tx('Notas internas (no las ve el huésped)')} maxLength={2000} rows={4} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
      </div>
    </Modal>
  )
}
