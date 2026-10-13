import { CalendarDays, Minus, Plus } from 'lucide-react'
import { Badge, Input, Select } from './ui'
import { money } from '../utils/money'
import { onlyDigits } from '../utils/validators'
import { LOCALE, tx } from '../i18n'

export const RES_STATUS = {
  PENDING: { label: tx('Por confirmar'), tone: 'amber' },
  PENDING_PAYMENT: { label: tx('Pendiente de pago'), tone: 'amber' },
  CONFIRMED: { label: tx('Confirmada'), tone: 'green' },
  IN_HOUSE: { label: tx('En estancia'), tone: 'brand' },
  CHECKED_OUT: { label: tx('Finalizada'), tone: 'slate' },
  CANCELLED: { label: tx('Cancelada'), tone: 'red' },
  NO_SHOW: { label: tx('No se presentó'), tone: 'red' },
  EXPIRED: { label: tx('Expirada'), tone: 'slate' },
}

export const SOURCES = { FRONT_DESK: tx('Recepción'), PHONE: tx('Teléfono'), EMAIL: tx('Correo'), WEB: tx('Portal web'), OTHER: tx('Otro') }

export function StatusBadge({ status }) {
  const s = RES_STATUS[status] || { label: status, tone: 'slate' }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}

/* ── Fechas (siempre como 'YYYY-MM-DD' en la zona del hotel) ─────────────────────── */

export const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const nightsBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 864e5)

export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ── Formularios ────────────────────────────────────────────────────────────────── */

export function StayFields({ value, onChange, minDate, errors = {}, compact }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const nights = value.checkIn && value.checkOut ? nightsBetween(value.checkIn, value.checkOut) : 0
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      <Input label={tx('Llegada')} type="date" min={minDate} value={value.checkIn} error={errors.checkIn} icon={CalendarDays}
        onChange={(e) => {
          const checkIn = e.target.value
          onChange({ ...value, checkIn, checkOut: !value.checkOut || value.checkOut <= checkIn ? addDays(checkIn, 1) : value.checkOut })
        }} />
      <Input label={tx('Salida{0}', nights > 0 ? ` · ${nights} noche${nights > 1 ? 's' : ''}` : '')} type="date"
        min={value.checkIn ? addDays(value.checkIn, 1) : minDate} value={value.checkOut} error={errors.checkOut} icon={CalendarDays}
        onChange={(e) => set('checkOut', e.target.value)} />
      <Counter label={tx('Adultos')} value={value.adults} min={1} max={20} onChange={(v) => set('adults', v)} />
      <Counter label={tx('Menores')} value={value.children} min={0} max={20} onChange={(v) => set('children', v)} />
    </div>
  )
}

export function Counter({ label, value, min, max, onChange, bare }) {
  return (
    <div>
      {!bare && <p className="label">{label}</p>}
      <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-1.5 dark:border-white/10 dark:bg-white/[.04]">
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
          disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={tx('Menos {0}', label.toLowerCase())}><Minus className="h-4 w-4" /></button>
        <span className="font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
          disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={tx('Más {0}', label.toLowerCase())}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

const COUNTRY_CODES = [['52', tx('México +52')], ['1', tx('EE. UU./Canadá +1')], ['34', tx('España +34')], ['57', tx('Colombia +57')],
  ['54', tx('Argentina +54')], ['56', tx('Chile +56')], ['51', tx('Perú +51')], ['502', tx('Guatemala +502')], ['44', tx('Reino Unido +44')],
  ['49', tx('Alemania +49')], ['33', tx('Francia +33')], ['39', tx('Italia +39')]]

export const emptyGuest = () => ({ firstName: '', lastName: '', email: '', phoneCountryCode: '52', phone: '', country: 'MX' })

/** Valida igual que el backend: celular de México a 10 dígitos; internacional de 6 a 14. */
export function guestErrors(g, { requireEmail } = {}) {
  const e = {}
  const name = /^[\p{L}\p{M}]+(?:[ '’.\-][\p{L}\p{M}]+)*\.?$/u
  if (!g.firstName.trim()) e.firstName = tx('Escribe el nombre')
  else if (!name.test(g.firstName.trim())) e.firstName = tx('Solo letras, espacios, apóstrofos y guiones')
  if (!g.lastName.trim()) e.lastName = tx('Escribe los apellidos')
  else if (!name.test(g.lastName.trim())) e.lastName = tx('Solo letras, espacios, apóstrofos y guiones')
  if (requireEmail && !g.email.trim()) e.email = tx('Escribe tu correo')
  else if (g.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(g.email.trim())) e.email = tx('El correo no es válido')
  if (g.phone) {
    if (g.phoneCountryCode === '52' && !/^\d{10}$/.test(g.phone)) e.phone = tx('El celular debe tener 10 dígitos')
    else if (g.phoneCountryCode !== '52' && !/^\d{6,14}$/.test(g.phone)) e.phone = tx('Teléfono inválido')
  }
  return e
}

export function GuestFields({ value, onChange, errors = {}, requireEmail }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label={tx('Nombre')} required value={value.firstName} onChange={set('firstName')} error={errors.firstName} maxLength={100} autoComplete="given-name" />
      <Input label={tx('Apellidos')} required value={value.lastName} onChange={set('lastName')} error={errors.lastName} maxLength={100} autoComplete="family-name" />
      <Input label={tx('Correo')} type="email" required={requireEmail} value={value.email} onChange={set('email')} error={errors.email} maxLength={150} autoComplete="email" />
      <div className="grid grid-cols-[130px_1fr] gap-2">
        <Select label={tx('Lada')} value={value.phoneCountryCode} onChange={(e) => onChange({ ...value, phoneCountryCode: e.target.value, phone: value.phone.slice(0, e.target.value === '52' ? 10 : 14) })}>
          {COUNTRY_CODES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </Select>
        <Input label={tx('Celular')} inputMode="numeric" autoComplete="tel-national" value={value.phone} error={errors.phone}
          placeholder={value.phoneCountryCode === '52' ? tx('10 dígitos') : ''}
          onChange={(e) => onChange({ ...value, phone: onlyDigits(e.target.value, value.phoneCountryCode === '52' ? 10 : 14) })} />
      </div>
    </div>
  )
}

/* ── Desglose ───────────────────────────────────────────────────────────────────── */

export function PriceBreakdown({ lines, total, currency = 'MXN' }) {
  const nights = lines.filter((l) => l.type === 'NIGHT')
  const other = lines.filter((l) => l.type !== 'NIGHT')
  return (
    <div className="space-y-1.5 text-sm">
      {nights.map((l) => (
        <Row key={`${l.date}-${l.description}`} label={`${fmtDate(l.date)} · ${l.description}`} value={money(l.amount, currency)} />
      ))}
      {other.map((l, i) => (
        <Row key={i} muted={l.type === 'TAX_INCLUDED'} accent={l.type === 'DISCOUNT'}
          label={`${l.date ? `${fmtDate(l.date)} · ` : ''}${l.description}${Number(l.quantity) > 1 ? ` × ${Number(l.quantity)}` : ''}`}
          value={money(l.amount, currency)} />
      ))}
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold dark:border-white/10">
        <span>{tx('Total')}</span><span className="tabular-nums">{money(total, currency)}</span>
      </div>
    </div>
  )
}

function Row({ label, value, muted, accent }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? 'text-slate-400' : ''} ${accent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
      <span>{label}</span><span className="shrink-0 tabular-nums">{value}</span>
    </div>
  )
}
