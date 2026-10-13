import { useEffect, useState } from 'react'
import { BedDouble, Check, ChevronLeft, Plus, Search, UserRound, Users } from 'lucide-react'
import { Button, Input, Modal, Select, Spinner, Switch } from '../../components/ui'
import { Textarea, CHARGE_MODES, DynamicIcon } from '../../components/catalog'
import { Counter, GuestFields, SOURCES, StayFields, addDays, emptyGuest, guestErrors, todayIn } from '../../components/reservations'
import { customersApi, publicApi, ratesApi, reservationsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { money, moneyInput } from '../../utils/money'
import { tx } from '../../i18n'

export default function NewReservationModal({ onClose, onCreated }) {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const toast = useToast()
  const today = todayIn(hotel.timezone)
  const [step, setStep] = useState(1)
  const [stay, setStay] = useState({ checkIn: today, checkOut: addDays(today, 1), adults: 2, children: 0 })
  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [option, setOption] = useState(null)

  const [customer, setCustomer] = useState(null)
  const [guest, setGuest] = useState(emptyGuest())
  const [catalog, setCatalog] = useState([])
  const [units, setUnits] = useState({})
  const [form, setForm] = useState({ source: 'FRONT_DESK', discount: '', specialRequests: '', internalNotes: '', confirmNow: can('RESERVATIONS:CONFIRM') })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = can('RATES:VIEW') ? ratesApi.services().then((l) => l.filter((s) => s.active)) : publicApi.services()
    load.then(setCatalog).catch(() => setCatalog([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async () => {
    if (!stay.checkIn || !stay.checkOut || stay.checkOut <= stay.checkIn) { setErrors({ checkOut: tx('La salida debe ser posterior a la llegada') }); return }
    setErrors({})
    setSearching(true)
    try {
      setResult(await reservationsApi.availability(stay))
      setOption(null)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSearching(false)
    }
  }

  const submit = async () => {
    const e = customer ? {} : guestErrors(guest)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const created = await reservationsApi.create({
        customerId: customer?.id ?? null,
        guest: customer ? null : { ...guest, firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim() || null, phone: guest.phone || null },
        roomTypeId: option.roomTypeId, ...stay,
        services: Object.entries(units).filter(([, u]) => u > 0).map(([serviceId, u]) => ({ serviceId: Number(serviceId), units: u })),
        discount: form.discount || null, source: form.source,
        specialRequests: form.specialRequests.trim() || null, internalNotes: form.internalNotes.trim() || null, confirmNow: form.confirmNow,
      })
      toast.success(tx('Reservación {0} creada', created.summary.folio))
      onCreated(created)
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k.replace(/^guest\./, ''), v])))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="max-w-4xl" icon={Plus} title={tx('Nueva reservación')}
      description={step === 1 ? tx('Paso 1 de 2 · Fechas y tipo de habitación') : tx('Paso 2 de 2 · Huésped y detalles — {0}', option?.name)}
      footer={step === 1 ? (
        <><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button disabled={!option} onClick={() => setStep(2)}>{tx('Continuar')}</Button></>
      ) : (
        <><Button variant="secondary" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4" /> {tx('Atrás')}</Button>
          <Button loading={saving} onClick={submit}><Check className="h-4 w-4" /> {form.confirmNow ? tx('Crear y confirmar') : tx('Crear reservación')}</Button></>
      )}>
      {step === 1 ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1"><StayFields value={stay} onChange={(v) => { setStay(v); setResult(null); setOption(null) }} errors={errors} compact /></div>
            <Button onClick={search} loading={searching}><Search className="h-4 w-4" /> {tx('Buscar')}</Button>
          </div>
          {searching && <div className="grid place-items-center py-10"><Spinner className="h-6 w-6" /></div>}
          {result && !searching && (
            result.options.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{tx('No hay tipos de habitación activos.')}</p> : (
              <div className="grid gap-3 md:grid-cols-2">
                {result.options.map((o) => {
                  const disabled = o.availableRooms === 0 || !o.fitsGuests
                  const selected = option?.roomTypeId === o.roomTypeId
                  return (
                    <button key={o.roomTypeId} type="button" disabled={disabled} onClick={() => setOption(o)}
                      className={`flex gap-3 rounded-2xl p-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:ring-brand-300 dark:ring-white/10'}`}>
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                        {o.imageUrl ? <img src={o.imageUrl} alt="" className="h-full w-full object-cover" /> : <BedDouble className="m-auto mt-7 h-6 w-6 text-slate-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{o.name}</p>
                        <p className="text-xs text-slate-500">
                          <Users className="mr-1 inline h-3 w-3" />{tx('hasta')} {o.maxAdults} {tx('adultos ·')} {o.maxChildren} {tx('menores')}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${o.availableRooms ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {!o.fitsGuests ? tx('No admite esa ocupación') : o.availableRooms ? `${o.availableRooms} disponible(s)` : tx('Sin disponibilidad')}
                        </p>
                      </div>
                      {o.total != null && (
                        <div className="text-right">
                          <p className="font-display text-lg font-semibold tabular-nums">{money(o.total)}</p>
                          <p className="text-[11px] text-slate-500">{money(o.averageNight)} / noche prom.</p>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-sm font-semibold">{tx('Huésped')}</p>
              {can('CUSTOMERS:VIEW') && <CustomerPicker value={customer} onChange={setCustomer} />}
              {!customer && <div className="mt-3"><GuestFields value={guest} onChange={setGuest} errors={errors} /></div>}
            </section>
            {catalog.length > 0 && (
              <section>
                <p className="mb-2 text-sm font-semibold">{tx('Servicios adicionales')}</p>
                <div className="space-y-2">
                  {catalog.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-slate-200 dark:ring-white/10">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10"><DynamicIcon name={s.icon} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-slate-500">{money(s.price)} · {CHARGE_MODES[s.chargeMode]}</p>
                      </div>
                      <div className="w-32"><Counter bare label={s.name} value={units[s.id] || 0} min={0} max={20} onChange={(v) => setUnits({ ...units, [s.id]: v })} /></div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/[.03]">
              <p className="font-semibold">{option.name}</p>
              <p className="text-slate-500">{result.nights} {tx('noche(s) ·')} {stay.adults} {tx('adulto(s)')}{stay.children ? ` · ${stay.children} menor(es)` : ''}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{money(option.total)}</p>
              <p className="text-xs text-slate-500">{tx('Hospedaje con impuestos; servicios y descuento se suman al guardar.')}</p>
            </div>
            <Select label={tx('Origen')} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {Object.entries(SOURCES).filter(([k]) => k !== 'WEB').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
            {can('RESERVATIONS:APPLY_DISCOUNT') && (
              <Input label={tx('Descuento sobre hospedaje (MXN)')} inputMode="decimal" placeholder="0.00" value={form.discount} error={errors.discount}
                onChange={(e) => setForm({ ...form, discount: moneyInput(e.target.value) })} />
            )}
            <Textarea label={tx('Solicitudes del huésped')} rows={2} maxLength={1000} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
            <Textarea label={tx('Notas internas')} rows={2} maxLength={2000} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
            {can('RESERVATIONS:CONFIRM') && (
              <label className="flex items-center justify-between gap-3 rounded-xl p-3 text-sm ring-1 ring-slate-200 dark:ring-white/10">
                <span><b>{tx('Confirmar de inmediato')}</b><br /><span className="text-slate-500">{tx('Si no, queda como “por confirmar” y expira.')}</span></span>
                <Switch checked={form.confirmNow} onChange={(v) => setForm({ ...form, confirmNow: v })} label={tx('Confirmar de inmediato')} />
              </label>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function CustomerPicker({ value, onChange }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const term = useDebouncedValue(q, 300)
  useEffect(() => {
    if (term.trim().length < 2) { setList([]); return }
    customersApi.list({ q: term.trim(), size: 6 }).then((p) => setList(p.content)).catch(() => setList([]))
  }, [term])

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-400/20">
        <UserRound className="h-5 w-5 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{value.firstName} {value.lastName}</p>
          <p className="truncate text-xs text-slate-500">{[value.email, value.phone].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => onChange(null)}>{tx('Cambiar')}</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <Input icon={Search} placeholder={tx('Buscar cliente existente (nombre, correo, teléfono)…')} value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} aria-label={tx('Buscar cliente')} />
      {list.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-ink-800 dark:ring-white/10">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                onClick={() => { onChange(c); setQ('') }}>
                <UserRound className="h-4 w-4 text-slate-400" />
                <span className="flex-1"><b>{c.firstName} {c.lastName}</b><span className="block text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</span></span>
                <span className="text-xs text-slate-400">{c.reservations} {tx('estancia(s)')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-500">{tx('O captura un huésped nuevo abajo.')}</p>
    </div>
  )
}
