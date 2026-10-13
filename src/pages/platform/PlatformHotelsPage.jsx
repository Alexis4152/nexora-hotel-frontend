import { useEffect, useMemo, useState } from 'react'
import {
  Building2, CheckCircle2, ExternalLink, Globe2, KeyRound, LogOut, Plus, Power, Search, Users,
} from 'lucide-react'
import { Badge, Button, ConfirmDialog, CopyField, EmptyState, HotelMonogram, Input, LanguageToggle, Modal, NexoraMark, Select, Skeleton, ThemeToggle } from '../../components/ui'
import TemporaryPasswordModal from '../../components/TemporaryPasswordModal'
import { platformApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { useNavigate } from '../../router'
import { TIMEZONES, formatDateTime } from '../../utils/format'
import { email as emailRule, maxLength, personName, required, slug as slugRule, toSlug, validate } from '../../utils/validators'
import { tx } from '../../i18n'

/** Panel del SUPER_ADMIN: alta de hoteles y entrega del enlace + administrador a cada dueño. */
export default function PlatformHotelsPage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [hotels, setHotels] = useState(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [provisioned, setProvisioned] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => platformApi.hotels().then(setHotels).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (hotels || []).filter((h) => !q || h.name.toLowerCase().includes(q) || h.slug.includes(q))
  }, [hotels, query])

  const stats = useMemo(() => ({
    total: hotels?.length ?? 0,
    active: hotels?.filter((h) => h.active).length ?? 0,
    staff: hotels?.reduce((s, h) => s + h.staffCount, 0) ?? 0,
  }), [hotels])

  const runConfirm = async () => {
    setBusy(true)
    try {
      const h = confirm.hotel
      if (confirm.type === 'toggle') {
        await platformApi.updateHotel(h.id, { name: h.name, timezone: h.timezone, active: !h.active })
        toast.success(h.active ? tx('Hotel desactivado') : tx('Hotel activado'))
      } else {
        setTempPassword({ ...(await platformApi.resetAdminPassword(h.id)), url: h.accessUrl })
      }
      setConfirm(null)
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="aurora grain relative overflow-hidden text-white">
        <div className="grid-lines absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <NexoraMark className="h-9 w-9" />
              <span className="font-display text-lg font-semibold">{tx('Nexora')} <span className="text-gold-400">{tx('Plataforma')}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-2 hidden text-sm text-white/60 sm:block">{user.email}</span>
              <LanguageToggle dark />
              <ThemeToggle className="text-white/70 hover:text-white" />
              <button className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white" title={tx('Cerrar sesión')} aria-label={tx('Cerrar sesión')}
                onClick={async () => { await logout(); navigate('/login', { replace: true }) }}>
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-6 pb-24 pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold-300">{tx('Hoteles')}</p>
              <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">{tx('Tu red de hoteles')}</h1>
              <p className="mt-2 text-white/60">{tx('Crea un hotel y entrega a su dueño el enlace y su acceso de administrador.')}</p>
            </div>
            <button className="btn-gold btn-lg" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {tx('Nuevo hotel')}</button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-14 max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[[Building2, tx('Hoteles'), stats.total], [CheckCircle2, tx('Activos'), stats.active], [Users, tx('Personal con acceso'), stats.staff]].map(([Icon, label, value]) => (
            <div key={label} className="card flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className="font-display text-3xl font-semibold tabular-nums">{hotels ? value : '—'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-8 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder={tx('Buscar hotel…')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tx('Buscar hotel')} />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {!hotels ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />) : filtered.length === 0 ? (
            <div className="card md:col-span-2 xl:col-span-3">
              <EmptyState icon={Building2} title={hotels.length ? tx('Sin resultados') : tx('Aún no hay hoteles')}
                description={hotels.length ? tx('Prueba con otro nombre.') : tx('Crea el primero y entrégale el acceso a su dueño.')}
                action={!hotels.length && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {tx('Nuevo hotel')}</button>} />
            </div>
          ) : filtered.map((h) => (
            <article key={h.id} className={`card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-xl ${!h.active ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-3">
                <HotelMonogram name={h.name} className="h-12 w-12 text-base" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg font-semibold">{h.name}</h3>
                  <p className="truncate font-mono text-xs text-slate-500">/h/{h.slug}</p>
                </div>
                <Badge tone={h.active ? 'green' : 'slate'} dot>{h.active ? tx('Activo') : tx('Inactivo')}</Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-500">{tx('Personal')}</dt><dd className="font-semibold tabular-nums">{h.staffCount}</dd></div>
                <div><dt className="text-xs text-slate-500">{tx('Zona horaria')}</dt><dd className="truncate font-semibold">{h.timezone.split('/')[1]?.replace('_', ' ')}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-slate-500">{tx('Alta')}</dt><dd>{formatDateTime(h.createdAt)}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/[.06]">
                <a href={h.accessUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm"><ExternalLink className="h-3.5 w-3.5" /> {tx('Abrir')}</a>
                <button className="btn-secondary btn-sm" onClick={() => setConfirm({ type: 'reset', hotel: h })}><KeyRound className="h-3.5 w-3.5" /> {tx('Acceso admin')}</button>
                <button className={`btn-ghost btn-sm ml-auto ${h.active ? 'text-rose-600' : 'text-emerald-600'}`} onClick={() => setConfirm({ type: 'toggle', hotel: h })}>
                  <Power className="h-3.5 w-3.5" /> {h.active ? tx('Desactivar') : tx('Activar')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {creating && (
        <CreateHotelModal onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); setProvisioned(r); load() }} />
      )}
      {provisioned && <ProvisionedModal data={provisioned} onClose={() => setProvisioned(null)} />}
      <TemporaryPasswordModal data={tempPassword} loginUrl={tempPassword ? `${tempPassword.url}/login` : ''} title={tx('Nuevo acceso del administrador')} onClose={() => setTempPassword(null)} />
      <ConfirmDialog open={!!confirm} loading={busy} onClose={() => setConfirm(null)} onConfirm={runConfirm}
        tone={confirm?.type === 'toggle' && confirm.hotel.active ? 'danger' : 'primary'}
        title={confirm?.type === 'reset' ? tx('Generar acceso del administrador') : confirm?.hotel.active ? tx('Desactivar hotel') : tx('Activar hotel')}
        confirmLabel={confirm?.type === 'reset' ? tx('Generar') : confirm?.hotel.active ? tx('Desactivar') : tx('Activar')}
        message={confirm?.type === 'reset'
          ? tx('Se generará una contraseña temporal para el administrador de {0} y se cerrarán sus sesiones.', confirm?.hotel.name)
          : confirm?.hotel.active
            ? tx('Todo el personal de {0} perderá el acceso y su sitio público dejará de estar disponible.', confirm?.hotel.name)
            : tx('{0} volverá a estar disponible.', confirm?.hotel.name)} />
    </div>
  )
}

function CreateHotelModal({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', slug: '', timezone: 'America/Mexico_City', adminFirstName: '', adminLastName: '', adminEmail: '' })
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (f) => (e) => {
    const value = e.target.value
    setErrors({ ...errors, [f]: null })
    if (f === 'name' && !slugTouched) return setForm({ ...form, name: value, slug: toSlug(value) })
    if (f === 'slug') {
      setSlugTouched(true)
      return setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
    }
    setForm({ ...form, [f]: value })
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, {
      name: [required(tx('el nombre del hotel')), maxLength(150)],
      slug: [required(tx('el enlace')), slugRule],
      adminFirstName: [required(tx('el nombre')), personName],
      adminLastName: [required(tx('los apellidos')), personName],
      adminEmail: [required(tx('el correo')), emailRule],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      onCreated(await platformApi.createHotel({ ...form, name: form.name.trim(), adminEmail: form.adminEmail.trim() }))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Nuevo hotel')} icon={Building2} size="max-w-2xl"
      description={tx('Se crean sus roles (Administrador, Recepcionista, Huésped) y su primer administrador.')}
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={submit}>{tx('Crear hotel')}</Button></>}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Hotel')}</legend>
          <Input label={tx('Nombre comercial')} required value={form.name} onChange={set('name')} error={errors.name} maxLength={150} placeholder={tx('Hotel Casa del Mar')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input label={tx('Enlace')} required value={form.slug} onChange={set('slug')} error={errors.slug} maxLength={60} icon={Globe2} />
              {!errors.slug && form.slug && <p className="field-hint font-mono">{window.location.origin}/h/{form.slug}</p>}
            </div>
            <Select label={tx('Zona horaria')} value={form.timezone} onChange={set('timezone')}>
              {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Administrador (dueño)')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={tx('Nombre')} required value={form.adminFirstName} onChange={set('adminFirstName')} error={errors.adminFirstName} maxLength={100} />
            <Input label={tx('Apellidos')} required value={form.adminLastName} onChange={set('adminLastName')} error={errors.adminLastName} maxLength={100} />
          </div>
          <Input label={tx('Correo')} type="email" required value={form.adminEmail} onChange={set('adminEmail')} error={errors.adminEmail} maxLength={150} />
        </fieldset>
      </form>
    </Modal>
  )
}

function ProvisionedModal({ data, onClose }) {
  const message = tx('¡Bienvenido a Nexora Hotel! Tu hotel ya está listo.\nEnlace: {0}\nAcceso del personal: {1}/login\nUsuario: {2}\nContraseña temporal: {3}\nAl entrar se te pedirá crear tu propia contraseña.', data.hotel.accessUrl, data.hotel.accessUrl, data.adminEmail, data.temporaryPassword)
  return (
    <Modal open onClose={onClose} title={tx('¡Hotel creado!')} icon={CheckCircle2}
      description={tx('Entrega estos datos al dueño. La contraseña temporal no se volverá a mostrar.')}
      footer={<button className="btn-primary" onClick={onClose}>{tx('Listo')}</button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-transparent p-4 dark:from-brand-500/10">
          <HotelMonogram name={data.hotel.name} className="h-12 w-12" />
          <div>
            <p className="font-display text-lg font-semibold">{data.hotel.name}</p>
            <p className="text-xs text-slate-500">{tx('3 roles creados · 1 administrador')}</p>
          </div>
        </div>
        <CopyField label={tx('Enlace del hotel')} value={data.hotel.accessUrl} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CopyField label={tx('Usuario')} value={data.adminEmail} />
          <CopyField label={tx('Contraseña temporal')} value={data.temporaryPassword} />
        </div>
        <CopyField label={tx('Mensaje para el dueño')} value={message.replace(/\n/g, ' · ')} mono={false} />
      </div>
    </Modal>
  )
}
