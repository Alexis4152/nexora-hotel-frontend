import { useEffect, useState } from 'react'
import { Building2, Check, Clock, CreditCard, Image as ImageIcon, Landmark, Mail, Palette, Save, Trash2, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, Input, Select, Skeleton, Switch } from '../../components/ui'
import { ImageDrop, Tabs, Textarea } from '../../components/catalog'
import { settingsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import EmailSettingsTab from './EmailSettingsTab'
import PaymentSettingsTab from './PaymentSettingsTab'
import { applyTheme, contrastRatio, isHex } from '../../utils/theme'
import { email, maxLength, mxPhone, onlyDigits, required, validate } from '../../utils/validators'
import { tx } from '../../i18n'

const TABS = [
  { key: 'hotel', label: tx('Hotel'), icon: Building2 },
  { key: 'look', label: tx('Apariencia'), icon: Palette },
  { key: 'ops', label: tx('Operación'), icon: Clock },
  { key: 'policies', label: tx('Políticas'), icon: Landmark },
  { key: 'payments', label: tx('Pagos'), icon: CreditCard, needs: ['PAYMENT_SETTINGS:MANAGE'] },
  { key: 'email', label: tx('Correo'), icon: Mail, needs: ['EMAIL_SETTINGS:MANAGE', 'NOTIFICATIONS:MANAGE'] },
]

export default function SettingsPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState('hotel')
  const tabs = TABS.filter((t) => !t.needs || t.needs.some(can))
  return (
    <>
      <PageHeader eyebrow={tx('Gestión')} title={tx('Configuración')}
        description={tx('Identidad, apariencia, horarios y políticas del hotel. Todo se guarda en la base de datos y se refleja de inmediato.')} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'hotel' && <IdentityTab />}
      {tab === 'look' && <ThemeTab />}
      {tab === 'ops' && <OperationTab />}
      {tab === 'policies' && <PoliciesTab />}
      {tab === 'payments' && <PaymentSettingsTab />}
      {tab === 'email' && <EmailSettingsTab />}
    </>
  )
}

function useLoad(loader) {
  const toast = useToast()
  const [data, setData] = useState(null)
  useEffect(() => {
    loader().then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [data, setData]
}

function Section({ title, description, children, aside }) {
  return (
    <section className="card p-6 animate-fade-up">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function SaveBar({ saving, onSave, disabled, label = tx('Guardar cambios') }) {
  return (
    <div className="flex justify-end">
      <Button loading={saving} onClick={onSave} disabled={disabled}><Save className="h-4 w-4" /> {label}</Button>
    </div>
  )
}

/* ── Hotel ──────────────────────────────────────────────────────────────────────── */

const IMAGES = [
  ['LOGO', 'logoUrl', tx('Logo'), tx('Fondo transparente (PNG) se ve mejor')],
  ['LOGO_ALT', 'logoAltUrl', tx('Logo alternativo'), tx('Versión clara para fondos oscuros')],
  ['FAVICON', 'faviconUrl', tx('Ícono del navegador'), tx('Cuadrado, mínimo 64×64')],
  ['HERO', 'heroUrl', tx('Imagen de portada'), tx('Horizontal, 1920×1080 recomendado')],
]

function IdentityTab() {
  const { can } = useAuth()
  const { refresh } = useHotel()
  const toast = useToast()
  const [data, setData] = useLoad(settingsApi.identity)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const editable = can('SETTINGS:UPDATE')

  useEffect(() => {
    if (data && !form) setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])))
  }, [data, form])

  if (!form) return <Skeleton className="h-96" />

  const set = (f, transform) => (e) => {
    setForm({ ...form, [f]: transform ? transform(e.target.value) : e.target.value })
    setErrors({ ...errors, [f]: null })
  }

  const save = async () => {
    const found = validate(form, {
      name: [required(tx('el nombre')), maxLength(150)],
      contactEmail: [email],
      phone: [mxPhone],
      whatsapp: [mxPhone],
      postalCode: [(v) => (v && !/^\d{5}$/.test(v) ? tx('Debe tener 5 dígitos') : null)],
      rfc: [(v) => (v && !/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{2}[A\d]$/i.test(v) ? tx('El RFC no es válido') : null)],
      ...Object.fromEntries(['website', 'facebook', 'instagram', 'tiktok'].map((k) => [k, [(v) => (v && !/^https:\/\/\S{3,}$/.test(v) ? tx('Debe iniciar con https://') : null)]])),
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const payload = Object.fromEntries(
      ['name', 'tagline', 'description', 'legalName', 'rfc', 'street', 'neighborhood', 'city', 'state', 'postalCode', 'latitude',
        'longitude', 'phone', 'whatsapp', 'contactEmail', 'website', 'facebook', 'instagram', 'tiktok']
        .map((k) => [k, form[k] === '' ? null : form[k]]),
    )
    try {
      const saved = await settingsApi.updateIdentity(payload)
      setData(saved)
      await refresh()
      toast.success(tx('Datos del hotel guardados'))
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const uploadImage = async (kind, files) => {
    setUploading(kind)
    try {
      const saved = await settingsApi.uploadImage(kind, files[0])
      setData(saved)
      setForm((f) => ({ ...f, logoUrl: saved.logoUrl, logoAltUrl: saved.logoAltUrl, faviconUrl: saved.faviconUrl, heroUrl: saved.heroUrl }))
      await refresh()
      toast.success(tx('Imagen actualizada'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(null)
    }
  }

  const removeImage = async (kind) => {
    setUploading(kind)
    try {
      const saved = await settingsApi.removeImage(kind)
      setForm((f) => ({ ...f, logoUrl: saved.logoUrl, logoAltUrl: saved.logoAltUrl, faviconUrl: saved.faviconUrl, heroUrl: saved.heroUrl }))
      await refresh()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(null)
    }
  }

  const f = (name, label, props = {}) => (
    <Input label={label} value={form[name]} onChange={set(name, props.transform)} error={errors[name]} disabled={!editable} {...props} />
  )

  return (
    <div className="space-y-6">
      <Section title={tx('Imágenes de marca')} description={tx('Se guardan en almacenamiento persistente y no se pierden al actualizar el sistema.')}>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {IMAGES.map(([kind, field, label, hint]) => (
            <div key={kind}>
              <p className="label">{label}</p>
              {form[field] ? (
                <div className="group relative overflow-hidden rounded-2xl bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] ring-1 ring-slate-200 dark:bg-[repeating-conic-gradient(#0e1526_0_25%,#131b30_0_50%)] dark:ring-white/10">
                  <img src={form[field]} alt={label} className={`h-32 w-full ${kind === 'HERO' ? 'object-cover' : 'object-contain p-3'}`} />
                  {editable && (
                    <div className="absolute inset-x-2 bottom-2 flex gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <label className="btn-secondary btn-sm flex-1 cursor-pointer">
                        {tx('Cambiar')}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(e) => e.target.files[0] && uploadImage(kind, e.target.files)} />
                      </label>
                      <button className="btn-secondary btn-sm text-rose-600" onClick={() => removeImage(kind)} aria-label={tx('Quitar {0}', label)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              ) : editable ? (
                <ImageDrop compact multiple={false} busy={uploading === kind} label={tx('Subir imagen')} onFiles={(files) => uploadImage(kind, files)} />
              ) : (
                <div className="grid h-32 place-items-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-white/[.03]"><ImageIcon className="h-6 w-6" /></div>
              )}
              <p className="field-hint">{hint}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={tx('Identidad')} description={tx('Lo que ven tus huéspedes en el sitio del hotel.')}>
        <div className="grid gap-4 md:grid-cols-2">
          {f('name', tx('Nombre comercial'), { required: true, maxLength: 150 })}
          {f('tagline', tx('Frase de bienvenida'), { maxLength: 160, placeholder: tx('Frente al mar, a pasos del centro') })}
          <div className="md:col-span-2">
            <Textarea label={tx('Descripción')} value={form.description} onChange={set('description')} maxLength={2000} rows={4} disabled={!editable} error={errors.description} />
          </div>
        </div>
      </Section>

      <Section title={tx('Contacto y ubicación')}>
        <div className="grid gap-4 md:grid-cols-3">
          {f('phone', tx('Teléfono'), { inputMode: 'numeric', transform: (v) => onlyDigits(v), placeholder: tx('10 dígitos') })}
          {f('whatsapp', 'WhatsApp', { inputMode: 'numeric', transform: (v) => onlyDigits(v), placeholder: tx('10 dígitos') })}
          {f('contactEmail', tx('Correo de contacto'), { type: 'email', maxLength: 150 })}
          <div className="md:col-span-2">{f('street', tx('Calle y número'), { maxLength: 200 })}</div>
          {f('neighborhood', tx('Colonia'), { maxLength: 120 })}
          {f('city', tx('Ciudad'), { maxLength: 120 })}
          {f('state', tx('Estado'), { maxLength: 120 })}
          {f('postalCode', tx('Código postal'), { inputMode: 'numeric', transform: (v) => onlyDigits(v, 5) })}
          {f('latitude', tx('Latitud'), { inputMode: 'decimal', placeholder: '21.161908', hint: tx('Para el mapa del sitio') })}
          {f('longitude', tx('Longitud'), { inputMode: 'decimal', placeholder: '-86.851528' })}
        </div>
      </Section>

      <Section title={tx('Redes y sitio web')}>
        <div className="grid gap-4 md:grid-cols-2">
          {f('website', tx('Sitio web'), { placeholder: 'https://' })}
          {f('facebook', tx('Facebook'), { placeholder: 'https://facebook.com/…' })}
          {f('instagram', tx('Instagram'), { placeholder: 'https://instagram.com/…' })}
          {f('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@…' })}
        </div>
      </Section>

      <Section title={tx('Datos fiscales')} description={tx('No se muestran en el sitio público.')}>
        <div className="grid gap-4 md:grid-cols-2">
          {f('legalName', tx('Razón social'), { maxLength: 200 })}
          {f('rfc', 'RFC', { maxLength: 13, transform: (v) => v.toUpperCase() })}
        </div>
      </Section>

      {editable && <SaveBar saving={saving} onSave={save} />}
    </div>
  )
}

/* ── Apariencia ─────────────────────────────────────────────────────────────────── */

const PRESETS = [
  [tx('Laguna'), '#0d9488', '#c8a24a', '#0a0f1c'],
  [tx('Océano'), '#1d4ed8', '#f59e0b', '#0b1220'],
  [tx('Selva'), '#15803d', '#d4a017', '#0c1a12'],
  [tx('Atardecer'), '#c2410c', '#eab308', '#1c0f0a'],
  [tx('Vino'), '#9f1239', '#d4af37', '#1a0b10'],
  [tx('Medianoche'), '#4338ca', '#a78bfa', '#0f0d24'],
]

function ColorField({ label, value, onChange, hint, disabled }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-2">
        <input type="color" value={isHex(value) ? value : '#000000'} disabled={disabled} onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5" aria-label={label} />
        <input className={`input font-mono uppercase ${isHex(value) ? '' : 'input-error'}`} value={value} maxLength={7} disabled={disabled}
          onChange={(e) => onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)} aria-label={tx('{0} en hexadecimal', label)} />
      </div>
      {hint}
    </div>
  )
}

function ContrastBadge({ ratio, min }) {
  const ok = ratio >= min
  return (
    <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {tx('Contraste')} {ratio.toFixed(1)}:1 {ok ? '' : tx('(mínimo {0})', min)}
    </p>
  )
}

function ThemeTab() {
  const { can } = useAuth()
  const { hotel, refresh } = useHotel()
  const toast = useToast()
  const [theme, setTheme] = useState(hotel.theme)
  const [saving, setSaving] = useState(false)
  const editable = can('SETTINGS:UPDATE')

  // Vista previa en vivo; si se sale sin guardar, se restaura el tema guardado.
  useEffect(() => {
    if (isHex(theme.primary) && isHex(theme.accent) && isHex(theme.sidebar)) applyTheme(theme)
  }, [theme])
  useEffect(() => () => applyTheme(hotel.theme), [hotel.theme])

  const valid = isHex(theme.primary) && isHex(theme.accent) && isHex(theme.sidebar)
  const primaryRatio = valid ? contrastRatio(theme.primary, '#ffffff') : 0
  const sidebarRatio = valid ? contrastRatio(theme.sidebar, '#ffffff') : 0
  const dirty = JSON.stringify(theme) !== JSON.stringify(hotel.theme)

  const save = async () => {
    setSaving(true)
    try {
      await settingsApi.updateTheme(theme)
      await refresh()
      toast.success(tx('Apariencia guardada para todo el hotel'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <Section title={tx('Paletas sugeridas')} description={tx('Un punto de partida; puedes ajustar cada color.')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRESETS.map(([name, p, a, s]) => (
              <button key={name} disabled={!editable} onClick={() => setTheme({ ...theme, primary: p, accent: a, sidebar: s })}
                className="group rounded-2xl p-2 text-left ring-1 ring-slate-200 transition hover:ring-brand-400 disabled:opacity-60 dark:ring-white/10">
                <div className="flex h-14 overflow-hidden rounded-xl">
                  <span className="w-1/2" style={{ background: s }} />
                  <span className="w-1/3" style={{ background: p }} />
                  <span className="flex-1" style={{ background: a }} />
                </div>
                <p className="mt-2 px-1 text-sm font-semibold">{name}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section title={tx('Colores')}>
          <div className="grid gap-5 md:grid-cols-3">
            <ColorField label={tx('Principal (botones, enlaces)')} value={theme.primary} disabled={!editable}
              onChange={(v) => setTheme({ ...theme, primary: v })} hint={valid && <ContrastBadge ratio={primaryRatio} min={3} />} />
            <ColorField label={tx('Acento (detalles)')} value={theme.accent} disabled={!editable} onChange={(v) => setTheme({ ...theme, accent: v })} />
            <ColorField label={tx('Menú lateral')} value={theme.sidebar} disabled={!editable}
              onChange={(v) => setTheme({ ...theme, sidebar: v })} hint={valid && <ContrastBadge ratio={sidebarRatio} min={4.5} />} />
          </div>
          <div className="mt-5 max-w-xs">
            <Select label={tx('Modo predeterminado')} value={theme.defaultMode} disabled={!editable} onChange={(e) => setTheme({ ...theme, defaultMode: e.target.value })}
              hint={tx('Cada persona puede cambiarlo con el botón de luna/sol')}>
              <option value="system">{tx('Según el dispositivo')}</option>
              <option value="light">{tx('Claro')}</option>
              <option value="dark">{tx('Oscuro')}</option>
            </Select>
          </div>
        </Section>
        {editable && <SaveBar saving={saving} onSave={save} disabled={!valid || !dirty || primaryRatio < 3 || sidebarRatio < 4.5} />}
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Vista previa')}</p>
        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
          <div className="flex h-72">
            <div className="w-24 space-y-2 p-3" style={{ background: theme.sidebar }}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-700" />
              {[0, 1, 2, 3].map((i) => <div key={i} className={`h-2.5 rounded-full ${i === 0 ? 'bg-white/70' : 'bg-white/20'}`} />)}
            </div>
            <div className="flex-1 space-y-3 bg-slate-50 p-4 dark:bg-ink-950">
              <p className="font-display text-lg font-semibold">{hotel.name}</p>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-white/10">
                <p className="text-xs text-slate-500">{tx('Ocupación')}</p>
                <p className="font-display text-2xl font-semibold">82%</p>
                <span className="chip mt-1 bg-gold-300/20 text-gold-600 ring-gold-500/30">{tx('Temporada alta')}</span>
              </div>
              <button className="btn-primary btn-sm w-full">{tx('Nueva reservación')}</button>
              <p className="text-xs text-brand-600 underline dark:text-brand-400">{tx('Ver todas las llegadas')}</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{tx('Datos de ejemplo solo para la vista previa.')}</p>
      </aside>
    </div>
  )
}

/* ── Operación ──────────────────────────────────────────────────────────────────── */

function OperationTab() {
  const { can } = useAuth()
  const toast = useToast()
  const [data, setData] = useLoad(settingsApi.operation)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const editable = can('SETTINGS:UPDATE')
  if (!data) return <Skeleton className="h-96" />

  const set = (f, num) => (e) => setData({ ...data, [f]: num ? Number(e.target.value) : e.target.value })
  const time = (v) => (v || '').slice(0, 5)

  const save = async () => {
    if (data.maxNights < data.minNights) return setErrors({ maxNights: tx('Debe ser mayor o igual al mínimo') })
    setErrors({})
    setSaving(true)
    try {
      setData(await settingsApi.updateOperation(data))
      toast.success(tx('Horarios y reglas guardados'))
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title={tx('Horarios')} description={tx('Se interpretan en la zona horaria del hotel.')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label={tx('Check-in desde')} type="time" value={time(data.checkInTime)} onChange={set('checkInTime')} disabled={!editable} />
          <Input label={tx('Check-out hasta')} type="time" value={time(data.checkOutTime)} onChange={set('checkOutTime')} disabled={!editable} />
          <Input label={tx('Recepción abre')} type="time" value={time(data.receptionOpens)} onChange={set('receptionOpens')} disabled={!editable || data.reception24h} />
          <Input label={tx('Recepción cierra')} type="time" value={time(data.receptionCloses)} onChange={set('receptionCloses')} disabled={!editable || data.reception24h} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <Switch checked={data.reception24h} disabled={!editable} onChange={(v) => setData({ ...data, reception24h: v })} label={tx('Recepción 24 horas')} />
          {tx('Recepción abierta las 24 horas')}
        </label>
      </Section>
      <Section title={tx('Reglas de reservación')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label={tx('Noches mínimas')} type="number" min={1} max={60} value={data.minNights} onChange={set('minNights', true)} disabled={!editable} />
          <Input label={tx('Noches máximas')} type="number" min={1} max={365} value={data.maxNights} onChange={set('maxNights', true)} disabled={!editable} error={errors.maxNights} />
          <Input label={tx('Habitaciones por reservación')} type="number" min={1} max={50} value={data.maxRoomsPerBooking} onChange={set('maxRoomsPerBooking', true)} disabled={!editable} />
          <Input label={tx('Anticipación mínima (horas)')} type="number" min={0} max={720} value={data.minBookingLeadHours} onChange={set('minBookingLeadHours', true)} disabled={!editable} />
          <Input label={tx('Anticipación máxima (días)')} type="number" min={1} max={730} value={data.maxBookingLeadDays} onChange={set('maxBookingLeadDays', true)} disabled={!editable} />
          <Input label={tx('Retención durante el pago (min)')} type="number" min={5} max={120} value={data.holdMinutes} onChange={set('holdMinutes', true)} disabled={!editable}
            hint={tx('Tiempo que se aparta la habitación mientras el huésped paga')} />
          <Input label={tx('Plazo para confirmar (horas)')} type="number" min={1} max={168} value={data.pendingConfirmationHours} onChange={set('pendingConfirmationHours', true)} disabled={!editable}
            error={errors.pendingConfirmationHours} hint={tx('Una solicitud sin confirmar expira y libera la habitación')} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <Switch checked={data.allowSameDayBooking} disabled={!editable} onChange={(v) => setData({ ...data, allowSameDayBooking: v })} label={tx('Reservar el mismo día')} />
          {tx('Permitir reservaciones para el mismo día')}
        </label>
      </Section>
      {editable && <SaveBar saving={saving} onSave={save} />}
    </div>
  )
}

/* ── Políticas ──────────────────────────────────────────────────────────────────── */

const PENALTIES = { NONE: tx('Sin penalización'), FIRST_NIGHT: tx('Primera noche'), PERCENT: tx('Porcentaje del total'), FIXED: tx('Monto fijo') }

function PoliciesTab() {
  const { can } = useAuth()
  const toast = useToast()
  const [data, setData] = useLoad(settingsApi.policies)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const editable = can('POLICIES:MANAGE')

  useEffect(() => {
    if (data) setForm({ ...data.values })
  }, [data])
  if (!form) return <Skeleton className="h-96" />

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value })

  const save = async () => {
    const found = {}
    if (form.lateCancelPenaltyType === 'PERCENT' && Number(form.lateCancelPenaltyValue) > 100) found.lateCancelPenaltyValue = tx('Máximo 100 %')
    if (form.noShowPenaltyType === 'PERCENT' && Number(form.noShowPenaltyValue) > 100) found.noShowPenaltyValue = tx('Máximo 100 %')
    if (Number(form.depositPercent) < 0 || Number(form.depositPercent) > 100) found.depositPercent = tx('Entre 0 y 100')
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      setData(await settingsApi.updatePolicies({
        ...form,
        freeCancelHours: Number(form.freeCancelHours),
        pendingPaymentExpiryMinutes: Number(form.pendingPaymentExpiryMinutes),
      }))
      toast.success(tx('Políticas guardadas como nueva versión'))
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const penalty = (typeField, valueField, label) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select label={label} value={form[typeField]} onChange={set(typeField)} disabled={!editable}>
        {Object.entries(PENALTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      {(form[typeField] === 'PERCENT' || form[typeField] === 'FIXED') && (
        <Input label={form[typeField] === 'PERCENT' ? tx('Porcentaje') : tx('Monto (MXN)')} inputMode="decimal" value={form[valueField]}
          onChange={set(valueField)} disabled={!editable} error={errors[valueField]} />
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Section title={tx('Cancelaciones y pagos')}
        description={tx('Cada cambio crea una nueva versión; las reservaciones existentes conservan las condiciones que aceptaron.')}
        aside={<Badge tone="brand">{tx('Versión')} {data.version} {tx('vigente')}</Badge>}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Input label={tx('Cancelación gratuita hasta (horas antes del check-in)')} type="number" min={0} max={8760}
            value={form.freeCancelHours} onChange={set('freeCancelHours')} disabled={!editable} />
          <Input label={tx('Anticipo requerido (%)')} inputMode="decimal" value={form.depositPercent} onChange={set('depositPercent')}
            disabled={!editable} error={errors.depositPercent} />
          {penalty('lateCancelPenaltyType', 'lateCancelPenaltyValue', tx('Penalización por cancelación tardía'))}
          {penalty('noShowPenaltyType', 'noShowPenaltyValue', tx('Penalización por no presentarse'))}
          <Input label={tx('Una reservación sin pago expira en (minutos)')} type="number" min={5} max={1440}
            value={form.pendingPaymentExpiryMinutes} onChange={set('pendingPaymentExpiryMinutes')} disabled={!editable} />
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <Switch checked={form.petsAllowed} disabled={!editable} onChange={(v) => setForm({ ...form, petsAllowed: v })} label={tx('Se aceptan mascotas')} />
            {tx('Se aceptan mascotas')}
          </label>
        </div>
      </Section>
      <Section title={tx('Textos para el huésped')}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Textarea label={tx('Menores de edad')} value={form.childrenPolicy} onChange={set('childrenPolicy')} maxLength={2000} disabled={!editable} />
          <Textarea label={tx('Mascotas')} value={form.petsPolicy} onChange={set('petsPolicy')} maxLength={2000} disabled={!editable} />
          <Textarea label={tx('Reembolsos')} value={form.refundPolicy} onChange={set('refundPolicy')} maxLength={2000} disabled={!editable} />
          <Textarea label={tx('Cambios de fecha')} value={form.dateChangePolicy} onChange={set('dateChangePolicy')} maxLength={2000} disabled={!editable} />
          <Textarea label={tx('Términos y condiciones')} value={form.terms} onChange={set('terms')} rows={8} maxLength={50000} disabled={!editable} />
          <Textarea label={tx('Aviso de privacidad')} value={form.privacyNotice} onChange={set('privacyNotice')} rows={8} maxLength={50000} disabled={!editable}
            hint={tx('Requerido por la LFPDPPP: finalidades, derechos ARCO y medios de contacto')} />
        </div>
      </Section>
      {editable && <SaveBar saving={saving} onSave={save} label={tx('Guardar nueva versión')} />}
    </div>
  )
}
