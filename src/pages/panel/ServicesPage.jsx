import { useEffect, useState } from 'react'
import { ConciergeBell, Globe2, Pencil, Plus } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Switch } from '../../components/ui'
import { CHARGE_MODES, DynamicIcon, IconPicker, Textarea } from '../../components/catalog'
import { Can } from '../../guards'
import { ratesApi } from '../../api'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { maxLength, required, validate } from '../../utils/validators'
import { tx } from '../../i18n'

export default function ServicesPage() {
  const toast = useToast()
  const [services, setServices] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = () => ratesApi.services().then(setServices).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader eyebrow={tx('Gestión')} title={tx('Servicios adicionales')}
        description={tx('Desayuno, estacionamiento, traslados… con su forma de cobro. Los marcados en línea aparecen en el sitio del hotel.')}
        actions={<Can permission="SERVICES:MANAGE"><button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {tx('Servicio')}</button></Can>} />
      {!services ? <Skeleton className="h-64" /> : services.length === 0 ? (
        <div className="card"><EmptyState icon={ConciergeBell} title={tx('Sin servicios')} description={tx('Agrega los extras que ofreces a tus huéspedes.')} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <article key={s.id} className={`card flex flex-col p-5 transition hover:shadow-xl ${s.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg"><DynamicIcon name={s.icon} className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-slate-500">{CHARGE_MODES[s.chargeMode]}</p>
                </div>
                <p className="font-display text-xl font-semibold">{money(s.price)}</p>
              </div>
              {s.description && <p className="mt-3 line-clamp-2 text-sm text-slate-500">{s.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {s.bookableOnline && <Badge tone="brand"><Globe2 className="h-3 w-3" /> {tx('En línea')}</Badge>}
                {!s.active && <Badge tone="slate">{tx('Inactivo')}</Badge>}
                <Can permission="SERVICES:MANAGE"><button className="btn-ghost btn-sm ml-auto" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5" /> {tx('Editar')}</button></Can>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <ServiceModal service={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

function ServiceModal({ service, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: service?.name || '', description: service?.description || '', price: service?.price ?? '',
    chargeMode: service?.chargeMode || 'PER_STAY', bookableOnline: service?.bookableOnline ?? true,
    icon: service?.icon || 'coffee', sortOrder: service?.sortOrder ?? 0, active: service?.active ?? true,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const found = validate(form, {
      name: [required(tx('el nombre')), maxLength(100)],
      price: [required(tx('el precio')), (v) => (Number(v) < 0 ? tx('No puede ser negativo') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await ratesApi.saveService(service?.id, { ...form, sortOrder: Number(form.sortOrder) || 0 })
      toast.success(tx('Servicio guardado'))
      onSaved()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={service ? service.name : tx('Nuevo servicio')} icon={ConciergeBell} size="max-w-xl"
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={submit}>{tx('Guardar')}</Button></>}>
      <div className="space-y-4">
        <Input label={tx('Nombre')} required value={form.name} maxLength={100} error={errors.name} placeholder={tx('Desayuno buffet')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label={tx('Descripción')} value={form.description} maxLength={1000} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={tx('Precio (MXN)')} required inputMode="decimal" value={form.price} error={errors.price} onChange={(e) => setForm({ ...form, price: moneyInput(e.target.value) })} />
          <Select label={tx('Forma de cobro')} value={form.chargeMode} onChange={(e) => setForm({ ...form, chargeMode: e.target.value })}>
            {Object.entries(CHARGE_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div><p className="label">{tx('Ícono')}</p><IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} /></div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.bookableOnline} onChange={(v) => setForm({ ...form, bookableOnline: v })} label={tx('En línea')} /> {tx('Se puede contratar al reservar en línea')}</label>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={tx('Activo')} /> {tx('Activo')}</label>
      </div>
    </Modal>
  )
}
