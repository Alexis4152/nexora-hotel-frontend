import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft, BedDouble, CalendarRange, ChevronRight, Download, FileText, KeyRound, LogOut, Receipt, ShieldCheck, Ticket, UserRound,
} from 'lucide-react'
import PublicShell from '../public/PublicShell'
import { GuestReservationView } from '../public/ManageReservationPage'
import { Badge, Button, Input, Modal, PasswordInput, Select, Skeleton } from '../../components/ui'
import { Tabs, Textarea } from '../../components/catalog'
import { StatusBadge, downloadBlob, fmtDate } from '../../components/reservations'
import { KINDS, MethodLabel, PaymentStatusBadge } from '../../components/payments'
import { FullPageLoader } from '../../guards'
import { Link, Navigate, useNavigate } from '../../router'
import { accountApi, authApi } from '../../api'
import { isGuestOnly, useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import { onlyDigits, strongPassword } from '../../utils/validators'
import { LOCALE, tx } from '../../i18n'

/** Solo para huéspedes con sesión. El personal tiene su panel; un visitante va a iniciar sesión. */
export function RequireGuest({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/cuenta/entrar" replace state={{ from: location.pathname }} />
  if (!isGuestOnly(user)) {
    return (
      <PublicShell>
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="font-display text-xl font-semibold">{tx('Esta sección es para huéspedes')}</p>
          <p className="mt-1 text-sm text-slate-500">{tx('Entraste con una cuenta del personal del hotel.')}</p>
          <Link to="/panel" className="btn-primary mt-5">{tx('Ir al panel')}</Link>
        </div>
      </PublicShell>
    )
  }
  return children
}

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reservations')
  return (
    <PublicShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{tx('Mi cuenta')}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{tx('Hola,')} {user.firstName}</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/reservar" className="btn-primary"><CalendarRange className="h-4 w-4" /> {tx('Nueva reservación')}</Link>
          <Button variant="secondary" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-4 w-4" /> {tx('Salir')}</Button>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'reservations', label: tx('Mis reservaciones'), icon: Ticket },
        { key: 'payments', label: tx('Pagos'), icon: Receipt },
        { key: 'profile', label: tx('Mis datos'), icon: UserRound },
      ]} />
      {tab === 'reservations' && <ReservationsTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'profile' && <ProfileTab />}
    </PublicShell>
  )
}

/* ── Reservaciones ──────────────────────────────────────────────────────────────── */

function ReservationsTab() {
  const toast = useToast()
  const [list, setList] = useState(null)
  useEffect(() => { accountApi.reservations().then(setList).catch((e) => toast.error(errorMessage(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>
  const upcoming = list.filter((r) => r.upcoming)
  const past = list.filter((r) => !r.upcoming)
  if (list.length === 0) {
    return (
      <div className="card p-12 text-center">
        <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 font-display text-xl font-semibold">{tx('Aún no tienes reservaciones')}</p>
        <p className="mt-1 text-sm text-slate-500">{tx('Las que hagas con tu correo aparecerán aquí automáticamente.')}</p>
        <Link to="/reservar" className="btn-primary mt-6">{tx('Buscar disponibilidad')}</Link>
      </div>
    )
  }
  return (
    <div className="space-y-8">
      {upcoming.length > 0 && <Group title={tx('Próximas estancias')} items={upcoming} />}
      {past.length > 0 && <Group title={tx('Historial')} items={past} muted />}
    </div>
  )
}

function Group({ title, items, muted }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <Link key={r.folio} to={`/cuenta/reservaciones/${r.folio}`}
            className={`card group flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${muted ? 'opacity-90' : ''}`}>
            <div className="relative w-32 shrink-0 bg-slate-100 dark:bg-white/5">
              {r.imageUrl ? <img src={r.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                : <BedDouble className="absolute inset-0 m-auto h-8 w-8 text-slate-300" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500">{r.folio}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="truncate font-display text-lg font-semibold">{r.roomTypeName}</p>
              <p className="text-sm text-slate-500">{fmtDate(r.checkIn, { day: 'numeric', month: 'short' })} → {fmtDate(r.checkOut, { day: 'numeric', month: 'short', year: 'numeric' })} · {r.nights} {tx('noche(s)')}</p>
              <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                <span className="font-semibold tabular-nums">{money(r.total)}</span>
                {Number(r.balance) > 0 && !['CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(r.status)
                  ? <Badge tone="amber">{tx('Saldo')} {money(r.balance)}</Badge>
                  : <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function AccountReservationPage() {
  const { folio } = useParams()
  const toast = useToast()
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    accountApi.reservation(folio).then(setR).catch((e) => { setError(errorMessage(e)); toast.error(errorMessage(e)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folio])
  const back = <Link to="/cuenta" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400"><ArrowLeft className="h-4 w-4" /> {tx('Mis reservaciones')}</Link>
  if (error) return <PublicShell><div className="card mx-auto max-w-md p-8 text-center"><p className="font-semibold">{error}</p><p className="mt-4">{back}</p></div></PublicShell>
  if (!r) return <PublicShell><div className="mx-auto max-w-4xl space-y-4"><Skeleton className="h-40" /><Skeleton className="h-72" /></div></PublicShell>
  const actions = {
    pay: (purpose) => accountApi.pay(folio, purpose),
    cancel: (payload) => accountApi.cancel(folio, payload),
    receipt: () => accountApi.receipt(folio),
  }
  return <PublicShell><GuestReservationView r={r} setR={setR} actions={actions} back={back} /></PublicShell>
}

/* ── Pagos ──────────────────────────────────────────────────────────────────────── */

function PaymentsTab() {
  const toast = useToast()
  const [list, setList] = useState(null)
  useEffect(() => { accountApi.payments().then(setList).catch((e) => toast.error(errorMessage(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return <Skeleton className="h-48" />
  if (list.length === 0) return <div className="card p-10 text-center text-sm text-slate-500">{tx('Aún no hay pagos registrados en tus reservaciones.')}</div>
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
        {list.map((p) => (
          <li key={p.id}>
            <Link to={`/cuenta/reservaciones/${p.folio}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm hover:bg-slate-50 dark:hover:bg-white/[.03]">
              <span className="w-24 font-semibold">{KINDS[p.kind]}</span>
              <span className="min-w-0 flex-1">
                <MethodLabel method={p.method} last4={p.cardLast4} />
                <span className="block text-xs text-slate-500"><span className="font-mono">{p.folio}</span> · {formatDateTime(p.completedAt || p.createdAt)}</span>
              </span>
              <PaymentStatusBadge status={p.status} />
              <span className={`w-28 text-right font-semibold tabular-nums ${p.kind === 'PAYMENT' ? '' : 'text-sky-600'}`}>{p.kind === 'PAYMENT' ? '' : '− '}{money(p.amount, p.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Perfil y privacidad ────────────────────────────────────────────────────────── */

const REQUEST_TYPES = {
  ACCESS: tx('Acceso a mis datos'),
  RECTIFICATION: tx('Rectificación de mis datos'),
  DELETION: tx('Eliminación de mis datos y cuenta'),
  OPPOSITION: tx('Oposición al uso de mis datos'),
}
const REQUEST_STATUS = { PENDING: [tx('En trámite'), 'amber'], COMPLETED: [tx('Atendida'), 'green'], REJECTED: [tx('Rechazada'), 'red'] }

function ProfileTab() {
  const toast = useToast()
  const [p, setP] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState(null)

  const load = () => accountApi.profile().then((data) => {
    setP(data)
    setForm({ firstName: data.firstName, lastName: data.lastName, phoneCountryCode: data.phoneCountryCode || '52', phone: data.phone || '', country: data.country || 'MX' })
  }).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || !form) return <Skeleton className="h-80" />

  const save = async () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = tx('Escribe tu nombre')
    if (!form.lastName.trim()) e.lastName = tx('Escribe tus apellidos')
    if (form.phone && form.phoneCountryCode === '52' && form.phone.length !== 10) e.phone = tx('El celular debe tener 10 dígitos')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const data = await accountApi.updateProfile({ ...form, phone: form.phone || null })
      setP(data)
      toast.success(tx('Datos actualizados'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const exportData = async () => {
    try {
      downloadBlob(await accountApi.exportData(), 'mis-datos.json')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">{tx('Datos personales')}</h2>
        <p className="mb-5 text-sm text-slate-500">{p.email} {tx('· miembro desde')} {new Date(p.memberSince).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}
          {p.stays > 0 ? ` · ${p.stays} estancia(s)` : ''}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tx('Nombre')} value={form.firstName} error={errors.firstName} maxLength={100} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label={tx('Apellidos')} value={form.lastName} error={errors.lastName} maxLength={100} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Select label={tx('Lada')} value={form.phoneCountryCode} onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })}>
            <option value="52">{tx('México +52')}</option><option value="1">{tx('EE. UU./Canadá +1')}</option><option value="34">{tx('España +34')}</option>
            <option value="57">{tx('Colombia +57')}</option><option value="54">{tx('Argentina +54')}</option>
          </Select>
          <Input label={tx('Celular')} inputMode="numeric" value={form.phone} error={errors.phone}
            onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value, form.phoneCountryCode === '52' ? 10 : 14) })} />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog('password')}><KeyRound className="h-4 w-4" /> {tx('Cambiar contraseña')}</Button>
          <Button loading={saving} onClick={save}>{tx('Guardar cambios')}</Button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-brand-600" /> {tx('Privacidad')}</h2>
        <p className="mb-4 text-sm text-slate-500">{tx('Puedes descargar una copia de tus datos o ejercer tus derechos de acceso, rectificación, cancelación u oposición.')}</p>
        <div className="space-y-2">
          <Button variant="secondary" className="w-full" onClick={exportData}><Download className="h-4 w-4" /> {tx('Descargar mis datos (JSON)')}</Button>
          <Button variant="secondary" className="w-full" onClick={() => setDialog('request')}><FileText className="h-4 w-4" /> {tx('Hacer una solicitud')}</Button>
        </div>
        {p.requests.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm">
            {p.requests.map((q) => (
              <li key={q.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{REQUEST_TYPES[q.type]}</span>
                  <Badge tone={REQUEST_STATUS[q.status][1]} dot>{REQUEST_STATUS[q.status][0]}</Badge></div>
                <p className="text-xs text-slate-500">{formatDateTime(q.createdAt)}</p>
                {q.resolutionNotes && <p className="mt-1 text-xs">{q.resolutionNotes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {dialog === 'password' && <PasswordDialog onClose={() => setDialog(null)} />}
      {dialog === 'request' && <RequestDialog onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
    </div>
  )
}

function PasswordDialog({ onClose }) {
  const { applySession } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    const e = {}
    if (!form.current) e.current = tx('Escribe tu contraseña actual')
    const weak = strongPassword(form.next)
    if (weak) e.next = weak
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      applySession(await authApi.changePassword(form.current, form.next))
      toast.success(tx('Contraseña actualizada. Cerramos tus otras sesiones.'))
      onClose()
    } catch (err) {
      setErrors({ current: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} icon={KeyRound} title={tx('Cambiar contraseña')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Guardar')}</Button></>}>
      <div className="space-y-4">
        <PasswordInput label={tx('Contraseña actual')} autoComplete="current-password" value={form.current} error={errors.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        <PasswordInput label={tx('Nueva contraseña')} autoComplete="new-password" showStrength value={form.next} error={errors.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
      </div>
    </Modal>
  )
}

function RequestDialog({ onClose, onDone }) {
  const toast = useToast()
  const [type, setType] = useState('ACCESS')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true)
    try {
      toast.success((await accountApi.dataRequest({ type, details: details.trim() || null })).message)
      onDone()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} icon={ShieldCheck} title={tx('Solicitud sobre mis datos personales')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} variant={type === 'DELETION' ? 'danger' : 'primary'} onClick={submit}>{tx('Enviar solicitud')}</Button></>}>
      <div className="space-y-4">
        <Select label={tx('Tipo de solicitud')} value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(REQUEST_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        {type === 'DELETION' && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tx('El hotel eliminará tus datos personales y cerrará tu cuenta. Por obligación fiscal, los registros de pagos y estancias se conservan sin tus datos. Si tienes una reservación activa, primero debe concluir o cancelarse.')}
          </p>
        )}
        <Textarea label={tx('Detalles (opcional)')} rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
    </Modal>
  )
}
