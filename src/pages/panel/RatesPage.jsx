import { useEffect, useMemo, useState } from 'react'
import { Calculator, CalendarRange, Pencil, Percent, Plus, Receipt, Tags, Trash2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Select, Skeleton, Switch } from '../../components/ui'
import { Tabs } from '../../components/catalog'
import { Can } from '../../guards'
import { inventoryApi, ratesApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { maxLength, required, validate } from '../../utils/validators'
import { LOCALE, tx } from '../../i18n'

const RULE_TYPES = {
  DATE_OVERRIDE: { label: tx('Fecha específica'), tone: 'red', hint: tx('Precio exacto para un rango de fechas. Gana sobre todas.') },
  HOLIDAY: { label: tx('Día festivo'), tone: 'gold', hint: tx('Puentes y festivos.') },
  SEASON: { label: tx('Temporada'), tone: 'brand', hint: tx('Aplica durante una temporada definida.') },
  WEEKEND: { label: tx('Días de la semana'), tone: 'slate', hint: tx('Por ejemplo viernes y sábado.') },
}
const ADJUSTMENTS = { PERCENT: tx('% sobre el precio base'), AMOUNT: tx('Monto sobre el precio base'), FIXED_PRICE: tx('Precio fijo por noche') }
const DAYS = [['MONDAY', 'L'], ['TUESDAY', 'M'], ['WEDNESDAY', 'M'], ['THURSDAY', 'J'], ['FRIDAY', 'V'], ['SATURDAY', 'S'], ['SUNDAY', 'D']]
const SEASON_KINDS = { HIGH: [tx('Alta'), 'red'], LOW: [tx('Baja'), 'green'], HOLIDAY: [tx('Festiva'), 'gold'] }

export default function RatesPage() {
  const [tab, setTab] = useState('quote')
  const [types, setTypes] = useState([])
  const [seasons, setSeasons] = useState([])
  const toast = useToast()
  const loadSeasons = () => ratesApi.seasons().then(setSeasons).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    inventoryApi.roomTypes().then((t) => setTypes(t.filter((x) => x.active))).catch(() => setTypes([]))
    loadSeasons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <PageHeader eyebrow={tx('Gestión')} title={tx('Tarifas')}
        description={tx('Precio base por tipo, reglas por fecha, temporada o día, e impuestos. La regla de mayor jerarquía gana cada noche.')} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'quote', label: tx('Simulador'), icon: Calculator },
        { key: 'rules', label: tx('Reglas'), icon: Tags },
        { key: 'seasons', label: tx('Temporadas'), icon: CalendarRange },
        { key: 'taxes', label: tx('Impuestos'), icon: Percent },
      ]} />
      {tab === 'quote' && <QuoteTab types={types} />}
      {tab === 'rules' && <RulesTab types={types} seasons={seasons} />}
      {tab === 'seasons' && <SeasonsTab seasons={seasons} reload={loadSeasons} />}
      {tab === 'taxes' && <TaxesTab />}
    </>
  )
}

/* ── Simulador ──────────────────────────────────────────────────────────────────── */

function QuoteTab({ types }) {
  const { hotel } = useHotel()
  const toast = useToast()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.timezone }).format(new Date())
  const plus = (d, n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
  const [form, setForm] = useState({ roomTypeId: '', checkIn: plus(today, 7), checkOut: plus(today, 10), adults: 2, children: 0 })
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!form.roomTypeId && types[0]) setForm((f) => ({ ...f, roomTypeId: types[0].id }))
  }, [types, form.roomTypeId])

  const run = async () => {
    if (!form.roomTypeId) return
    if (form.checkOut <= form.checkIn) return setError(tx('La salida debe ser posterior a la entrada'))
    setError('')
    setLoading(true)
    try {
      setQuote(await ratesApi.quote({ ...form, roomTypeId: Number(form.roomTypeId), adults: Number(form.adults), children: Number(form.children) }))
    } catch (e) {
      setQuote(null)
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.roomTypeId])

  if (!types.length) return <div className="card"><EmptyState icon={Calculator} title={tx('Sin tipos de habitación')} description={tx('Crea un tipo en Habitaciones para simular precios.')} /></div>
  const fmtDay = (d) => new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`))

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="card space-y-4 p-6 xl:sticky xl:top-24 xl:self-start">
        <h2 className="font-display text-lg font-semibold">{tx('Cotizar estancia')}</h2>
        <Select label={tx('Tipo de habitación')} value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label={tx('Entrada')} type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
          <Input label={tx('Salida')} type="date" min={form.checkIn} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          <Input label={tx('Adultos')} type="number" min={1} max={20} value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} />
          <Input label={tx('Menores')} type="number" min={0} max={20} value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <Button className="w-full" loading={loading} onClick={run}><Calculator className="h-4 w-4" /> {tx('Calcular')}</Button>
      </section>

      <section className="card overflow-hidden">
        {!quote ? <EmptyState icon={Calculator} title={tx('Calcula una estancia')} description={tx('Verás el precio de cada noche y qué regla se aplicó.')} /> : (
          <>
            <div className="bg-gradient-to-br from-ink-900 to-ink-800 p-6 text-white">
              <p className="text-xs uppercase tracking-wider text-white/60">{tx('Total de la estancia ·')} {quote.nights.length} {tx('noche(s)')}</p>
              <p className="mt-1 font-display text-5xl font-semibold tabular-nums">{money(quote.total)}</p>
              <p className="mt-2 text-sm text-white/60">{tx('Subtotal')} {money(quote.subtotal)} {tx('+ impuestos')} {money(quote.taxesAdded)}</p>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
              {quote.nights.map((n) => (
                <li key={n.date} className="flex items-center gap-4 px-6 py-3">
                  <span className="w-28 text-sm font-medium capitalize">{fmtDay(n.date)}</span>
                  <span className="flex-1">{n.ruleName ? <Badge tone="brand">{n.ruleName}</Badge> : <span className="text-xs text-slate-400">{tx('Precio base')}</span>}</span>
                  {n.price !== n.base && <span className="text-xs text-slate-400 line-through">{money(n.base)}</span>}
                  <span className="w-28 text-right font-semibold tabular-nums">{money(n.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 text-sm dark:border-white/[.06] dark:bg-white/[.02]">
              <Row label={tx('Hospedaje')} value={money(quote.roomSubtotal)} />
              {Number(quote.extraGuestsSubtotal) > 0 && <Row label={tx('Huéspedes adicionales')} value={money(quote.extraGuestsSubtotal)} />}
              {quote.taxes.map((t) => <Row key={t.name} label={`${t.name} (${t.percent}%)${t.included ? ' · incluido' : ''}`} value={money(t.amount)} muted={t.included} />)}
              <Row label={tx('Total')} value={money(quote.total)} strong />
            </dl>
          </>
        )}
      </section>
    </div>
  )
}

function Row({ label, value, strong, muted }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-slate-200 pt-2 text-base font-semibold dark:border-white/10' : ''} ${muted ? 'text-slate-400' : ''}`}>
      <dt>{label}</dt><dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/* ── Reglas ─────────────────────────────────────────────────────────────────────── */

function RulesTab({ types, seasons }) {
  const toast = useToast()
  const [rules, setRules] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const load = () => ratesApi.rules().then(setRules).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const describe = (r) => {
    const v = Number(r.adjustmentValue)
    if (r.adjustmentType === 'FIXED_PRICE') return tx('{0} por noche', money(v))
    if (r.adjustmentType === 'PERCENT') return `${v > 0 ? '+' : ''}${v}% sobre base`
    return `${v > 0 ? '+' : ''}${money(v)} sobre base`
  }
  const when = (r) => r.ruleType === 'SEASON' ? r.seasonName
    : r.ruleType === 'WEEKEND' ? r.daysOfWeek.map((d) => DAYS.find((x) => x[0] === d)?.[1]).join(' · ')
      : `${r.dateFrom} → ${r.dateTo}`

  const remove = async () => {
    try {
      await ratesApi.deleteRule(deleting.id)
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{tx('Jerarquía:')} <b>{tx('Fecha específica')}</b> › <b>{tx('Festivo')}</b> › <b>{tx('Temporada')}</b> › <b>{tx('Días')}</b> {tx('› precio base')}</p>
        <Can permission="RATES:MANAGE"><button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {tx('Regla')}</button></Can>
      </div>
      {!rules ? <Skeleton className="h-64" /> : rules.length === 0 ? (
        <div className="card"><EmptyState icon={Tags} title={tx('Sin reglas')} description={tx('Sin reglas, cada noche cuesta el precio base del tipo de habitación.')} /></div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-white/[.06]">
          {rules.map((r) => (
            <div key={r.id} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center ${r.active ? '' : 'opacity-50'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{r.name}</p>
                  <Badge tone={RULE_TYPES[r.ruleType].tone}>{RULE_TYPES[r.ruleType].label}</Badge>
                  {!r.active && <Badge tone="slate">{tx('Inactiva')}</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">{when(r)} · {r.roomTypeName || tx('Todos los tipos')}{r.minNights ? tx(' · desde {0} noches', r.minNights) : ''}{r.priority ? ` · prioridad ${r.priority}` : ''}</p>
              </div>
              <p className="font-display text-xl font-semibold">{describe(r)}</p>
              <Can permission="RATES:MANAGE">
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm h-8 w-8 px-0" onClick={() => setEditing(r)} aria-label={tx('Editar regla')}><Pencil className="h-4 w-4" /></button>
                  <button className="btn-ghost btn-sm h-8 w-8 px-0 text-rose-600" onClick={() => setDeleting(r)} aria-label={tx('Eliminar regla')}><Trash2 className="h-4 w-4" /></button>
                </div>
              </Can>
            </div>
          ))}
        </div>
      )}
      {editing && <RuleModal rule={editing.id ? editing : null} types={types} seasons={seasons} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      <ConfirmDialog open={!!deleting} tone="danger" title={tx('Eliminar regla')} confirmLabel={tx('Eliminar')} message={tx('Se eliminará "{0}". Las reservaciones ya hechas conservan su precio.', deleting?.name)}
        onClose={() => setDeleting(null)} onConfirm={remove} />
    </>
  )
}

function RuleModal({ rule, types, seasons, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: rule?.name || '', roomTypeId: rule?.roomTypeId || '', ruleType: rule?.ruleType || 'WEEKEND',
    seasonId: rule?.seasonId || '', dateFrom: rule?.dateFrom || '', dateTo: rule?.dateTo || '',
    daysOfWeek: new Set(rule?.daysOfWeek || ['FRIDAY', 'SATURDAY']), adjustmentType: rule?.adjustmentType || 'PERCENT',
    adjustmentValue: rule?.adjustmentValue ?? '', minNights: rule?.minNights ?? '', priority: rule?.priority ?? 0, active: rule?.active ?? true,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => { setForm({ ...form, [f]: e.target.value }); setErrors({}) }

  const submit = async () => {
    const v = Number(form.adjustmentValue)
    const found = validate(form, {
      name: [required(tx('el nombre')), maxLength(100)],
      adjustmentValue: [required(tx('el valor')), () => (Number.isNaN(v) ? tx('Número inválido')
        : form.adjustmentType === 'FIXED_PRICE' && v <= 0 ? tx('Debe ser mayor a 0')
          : form.adjustmentType === 'PERCENT' && (v < -90 || v > 500) ? tx('Entre -90 y 500') : null)],
      seasonId: [(x) => (form.ruleType === 'SEASON' && !x ? tx('Elige la temporada') : null)],
      dateFrom: [(x) => (['DATE_OVERRIDE', 'HOLIDAY'].includes(form.ruleType) && !x ? tx('Indica el inicio') : null)],
      dateTo: [(x) => (['DATE_OVERRIDE', 'HOLIDAY'].includes(form.ruleType) && (!x || x < form.dateFrom) ? tx('Indica un fin válido') : null)],
      daysOfWeek: [(x) => (form.ruleType === 'WEEKEND' && x.size === 0 ? tx('Elige al menos un día') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await ratesApi.saveRule(rule?.id, {
        ...form,
        roomTypeId: form.roomTypeId ? Number(form.roomTypeId) : null,
        seasonId: form.seasonId ? Number(form.seasonId) : null,
        dateFrom: form.dateFrom || null, dateTo: form.dateTo || null,
        daysOfWeek: [...form.daysOfWeek], minNights: form.minNights ? Number(form.minNights) : null,
        priority: Number(form.priority) || 0,
      })
      toast.success(tx('Regla guardada'))
      onSaved()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const dated = ['DATE_OVERRIDE', 'HOLIDAY'].includes(form.ruleType)
  return (
    <Modal open onClose={onClose} title={rule ? tx('Editar regla') : tx('Nueva regla de tarifa')} icon={Tags} size="max-w-2xl"
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={submit}>{tx('Guardar')}</Button></>}>
      <div className="space-y-5">
        <Input label={tx('Nombre')} required value={form.name} onChange={set('name')} error={errors.name} maxLength={100} placeholder={tx('Fin de semana')} />
        <div>
          <p className="label">{tx('Tipo de regla')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(RULE_TYPES).map(([k, t]) => (
              <button key={k} type="button" onClick={() => setForm({ ...form, ruleType: k })}
                className={`rounded-xl p-3 text-left ring-1 transition ${form.ruleType === k ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-slate-500">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>
        {form.ruleType === 'SEASON' && (
          <Select label={tx('Temporada')} value={form.seasonId} onChange={set('seasonId')} error={errors.seasonId}>
            <option value="">{tx('Elige…')}</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startsOn} → {s.endsOn})</option>)}
          </Select>
        )}
        {form.ruleType === 'WEEKEND' && (
          <div>
            <p className="label">{tx('Días')}</p>
            <div className="flex gap-2">
              {DAYS.map(([d, l]) => {
                const on = form.daysOfWeek.has(d)
                return (
                  <button key={d} type="button" aria-pressed={on} title={d} onClick={() => {
                    const next = new Set(form.daysOfWeek)
                    on ? next.delete(d) : next.add(d)
                    setForm({ ...form, daysOfWeek: next })
                  }} className={`h-10 w-10 rounded-xl text-sm font-semibold ring-1 transition ${on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 dark:ring-white/10'}`}>{l}</button>
                )
              })}
            </div>
            {errors.daysOfWeek && <p className="field-error">{errors.daysOfWeek}</p>}
          </div>
        )}
        {(dated || form.ruleType === 'WEEKEND') && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={dated ? tx('Desde') : tx('Vigente desde (opcional)')} type="date" value={form.dateFrom} onChange={set('dateFrom')} error={errors.dateFrom} />
            <Input label={dated ? tx('Hasta (inclusive)') : tx('Vigente hasta (opcional)')} type="date" min={form.dateFrom} value={form.dateTo} onChange={set('dateTo')} error={errors.dateTo} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={tx('Ajuste')} value={form.adjustmentType} onChange={set('adjustmentType')}>
            {Object.entries(ADJUSTMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label={form.adjustmentType === 'PERCENT' ? tx('Porcentaje (negativo = descuento)') : tx('Monto (MXN)')} inputMode="decimal"
            value={form.adjustmentValue} onChange={(e) => { setForm({ ...form, adjustmentValue: e.target.value.replace(/[^\d.-]/g, '').slice(0, 12) }); setErrors({}) }}
            error={errors.adjustmentValue} placeholder={form.adjustmentType === 'PERCENT' ? '20' : '2500'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label={tx('Aplica a')} value={form.roomTypeId} onChange={set('roomTypeId')}>
            <option value="">{tx('Todos los tipos')}</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Input label={tx('Noches mínimas')} type="number" min={1} max={60} value={form.minNights} onChange={set('minNights')} hint={tx('Opcional')} />
          <Input label={tx('Prioridad')} type="number" min={-100} max={100} value={form.priority} onChange={set('priority')} hint={tx('Desempata reglas del mismo tipo')} />
        </div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={tx('Activa')} /> {tx('Regla activa')}</label>
      </div>
    </Modal>
  )
}

/* ── Temporadas ─────────────────────────────────────────────────────────────────── */

function SeasonsTab({ seasons, reload }) {
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const open = (s) => {
    setEditing(s || {})
    setForm({ name: s?.name || '', kind: s?.kind || 'HIGH', startsOn: s?.startsOn || '', endsOn: s?.endsOn || '', active: s?.active ?? true })
    setErrors({})
  }
  const save = async () => {
    const found = validate(form, {
      name: [required(tx('el nombre')), maxLength(80)],
      startsOn: [required(tx('el inicio'))],
      endsOn: [required(tx('el fin')), (v) => (v && form.startsOn && v < form.startsOn ? tx('No puede ser anterior al inicio') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await ratesApi.saveSeason(editing.id, form)
      setEditing(null)
      reload()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  const remove = async (s) => {
    try {
      await ratesApi.deleteSeason(s.id)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const year = useMemo(() => new Date().getFullYear(), [])
  const pos = (d) => {
    const date = new Date(`${d}T00:00:00`)
    const start = new Date(`${year}-01-01T00:00:00`)
    return Math.min(Math.max((date - start) / (365 * 864e5), 0), 1) * 100
  }

  return (
    <>
      <div className="mb-5 flex justify-end"><Can permission="RATES:MANAGE"><button className="btn-primary" onClick={() => open(null)}><Plus className="h-4 w-4" /> {tx('Temporada')}</button></Can></div>
      {seasons.length === 0 ? <div className="card"><EmptyState icon={CalendarRange} title={tx('Sin temporadas')} description={tx('Define temporada alta, baja y festiva para usarlas en tus reglas.')} /></div> : (
        <>
          <div className="card mb-5 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Calendario')} {year}</p>
            <div className="relative h-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
              {seasons.filter((s) => s.active).map((s) => {
                const left = pos(s.startsOn)
                const width = Math.max(pos(s.endsOn) - left, 0.6)
                const color = { HIGH: 'bg-rose-500/70', LOW: 'bg-emerald-500/70', HOLIDAY: 'bg-gold-500/80' }[s.kind]
                return <div key={s.id} title={s.name} className={`absolute inset-y-1 rounded-md ${color}`} style={{ left: `${left}%`, width: `${width}%` }} />
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] uppercase text-slate-400">{[tx('Ene'), tx('Mar'), tx('May'), tx('Jul'), tx('Sep'), tx('Nov'), tx('Dic')].map((m) => <span key={m}>{m}</span>)}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {seasons.map((s) => (
              <div key={s.id} className={`card p-5 ${s.active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.startsOn} → {s.endsOn}</p>
                  </div>
                  <Badge tone={SEASON_KINDS[s.kind][1]}>{SEASON_KINDS[s.kind][0]}</Badge>
                </div>
                <Can permission="RATES:MANAGE">
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => open(s)}><Pencil className="h-3.5 w-3.5" /> {tx('Editar')}</button>
                    <button className="btn-ghost btn-sm text-rose-600" onClick={() => remove(s)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </Can>
              </div>
            ))}
          </div>
        </>
      )}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? tx('Editar temporada') : tx('Nueva temporada')} icon={CalendarRange} size="max-w-md"
          footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>{tx('Cancelar')}</button><Button loading={saving} onClick={save}>{tx('Guardar')}</Button></>}>
          <div className="space-y-4">
            <Input label={tx('Nombre')} required value={form.name} maxLength={80} error={errors.name} placeholder={tx('Verano 2027')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label={tx('Tipo')} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(SEASON_KINDS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label={tx('Inicio')} type="date" value={form.startsOn} error={errors.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} />
              <Input label={tx('Fin (inclusive)')} type="date" min={form.startsOn} value={form.endsOn} error={errors.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} />
            </div>
            <label className="flex items-center gap-3 text-sm"><Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label={tx('Activa')} /> {tx('Activa')}</label>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ── Impuestos ──────────────────────────────────────────────────────────────────── */

const APPLIES = { ALL: tx('Hospedaje y servicios'), ROOM: tx('Solo hospedaje'), SERVICE: tx('Solo servicios') }

function TaxesTab() {
  const { can } = useAuth()
  const toast = useToast()
  const [taxes, setTaxes] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = () => ratesApi.taxes().then(setTaxes).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    const p = Number(editing.percent)
    if (!editing.name.trim() || Number.isNaN(p) || p < 0 || p > 100) return toast.error(tx('Revisa el nombre y el porcentaje (0 a 100)'))
    try {
      await ratesApi.saveTax(editing.id, { ...editing, name: editing.name.trim() })
      setEditing(null)
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">{tx('El ISH (impuesto sobre hospedaje) varía por estado: ajusta el porcentaje al de tu entidad.')}</p>
        <Can permission="RATES:MANAGE"><button className="btn-primary" onClick={() => setEditing({ name: '', percent: '', appliesTo: 'ALL', includedInPrice: false, active: true })}><Plus className="h-4 w-4" /> {tx('Impuesto')}</button></Can>
      </div>
      {!taxes ? <Skeleton className="h-40" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {taxes.map((t) => (
            <div key={t.id} className={`card p-5 ${t.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-300/20 text-gold-600"><Receipt className="h-5 w-5" /></div>
                <p className="font-display text-3xl font-semibold">{Number(t.percent)}%</p>
              </div>
              <p className="mt-3 font-semibold">{t.name}</p>
              <p className="text-sm text-slate-500">{APPLIES[t.appliesTo]} · {t.includedInPrice ? tx('Incluido en el precio') : tx('Se suma al precio')}</p>
              {can('RATES:MANAGE') && <button className="btn-secondary btn-sm mt-4" onClick={() => setEditing({ ...t, percent: String(t.percent) })}><Pencil className="h-3.5 w-3.5" /> {tx('Editar')}</button>}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? tx('Editar impuesto') : tx('Nuevo impuesto')} icon={Percent} size="max-w-md"
          footer={<>
            {editing.id && <button className="btn-ghost mr-auto text-rose-600" onClick={async () => { await ratesApi.deleteTax(editing.id).catch((e) => toast.error(errorMessage(e))); setEditing(null); load() }}><Trash2 className="h-4 w-4" /> {tx('Eliminar')}</button>}
            <button className="btn-secondary" onClick={() => setEditing(null)}>{tx('Cancelar')}</button><Button onClick={save}>{tx('Guardar')}</Button>
          </>}>
          <div className="space-y-4">
            <Input label={tx('Nombre')} value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label={tx('Porcentaje')} inputMode="decimal" value={editing.percent} onChange={(e) => setEditing({ ...editing, percent: moneyInput(e.target.value) })} />
            <Select label={tx('Aplica a')} value={editing.appliesTo} onChange={(e) => setEditing({ ...editing, appliesTo: e.target.value })}>
              {Object.entries(APPLIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <label className="flex items-center gap-3 text-sm"><Switch checked={editing.includedInPrice} onChange={(v) => setEditing({ ...editing, includedInPrice: v })} label={tx('Incluido')} /> {tx('Ya está incluido en los precios')}</label>
            <label className="flex items-center gap-3 text-sm"><Switch checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label={tx('Activo')} /> {tx('Activo')}</label>
          </div>
        </Modal>
      )}
    </>
  )
}
