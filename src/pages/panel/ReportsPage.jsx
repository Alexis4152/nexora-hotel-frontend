import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, BarChart3, BedDouble, CalendarRange, CalendarX2, Clock, Coins, FileSpreadsheet, FileText,
  HandCoins, Info, Landmark, ListChecks, RefreshCcw, Repeat, Sheet, TrendingUp, Undo2, Wallet,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Chart, HBars, Legend, fmtValue } from '../../components/charts'
import { EmptyState, Skeleton } from '../../components/ui'
import { RES_STATUS, SOURCES, addDays, downloadBlob, todayIn } from '../../components/reservations'
import { KINDS, METHODS, PAYMENT_STATUS } from '../../components/payments'
import { inventoryApi, reportsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { LOCALE, tx } from '../../i18n'

const ICONS = {
  reservations: CalendarRange, occupancy: BedDouble, rooms: TrendingUp, cancellations: CalendarX2, customers: Repeat,
  pending: Clock, income: Coins, payments: Wallet, refunds: Undo2, receivables: HandCoins, cash: Landmark,
}
const FILTER_KEYS = ['basis', 'status', 'source', 'roomTypeId', 'method', 'kind']

/** Periodos rápidos en la zona del hotel. */
function presets(today) {
  const [y, m] = today.split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const prevStart = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10)
  const prevEnd = addDays(monthStart, -1)
  return [
    [tx('Hoy'), today, today],
    [tx('7 días'), addDays(today, -6), today],
    [tx('Este mes'), monthStart, today],
    [tx('Mes anterior'), prevStart, prevEnd],
    [tx('30 días'), addDays(today, -29), today],
    [tx('90 días'), addDays(today, -89), today],
    [tx('Este año'), `${y}-01-01`, today],
  ]
}

/** Para ver los próximos días (ocupación y habitaciones). */
function forwardPresets(today) {
  return [[tx('Próximos 7'), today, addDays(today, 6)], [tx('Próximos 30'), today, addDays(today, 29)]]
}

async function blobError(err) {
  const d = err?.response?.data
  if (d instanceof Blob) {
    try { return JSON.parse(await d.text()).message || errorMessage(err) } catch { /* sin cuerpo JSON */ }
  }
  return errorMessage(err)
}

export default function ReportsPage() {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const toast = useToast()
  const tz = hotel?.timezone
  const today = todayIn(tz)
  const [params, setParams] = useSearchParams()
  const [catalog, setCatalog] = useState(null)
  const [roomTypes, setRoomTypes] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(null)

  const type = params.get('r') || catalog?.[0]?.type
  const info = catalog?.find((c) => c.type === type)
  const from = params.get('from') || `${today.slice(0, 7)}-01`
  const to = params.get('to') || today
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']))
  const query = useMemo(() => {
    const q = info?.snapshot ? {} : { from, to }
    info?.filters.forEach((k) => { if (filters[k]) q[k] = filters[k] })
    return q
  }, [info, from, to, params]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reportsApi.catalog().then(setCatalog).catch((e) => toast.error(errorMessage(e)))
    inventoryApi.roomTypes().then(setRoomTypes).catch(() => setRoomTypes([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!info) return undefined
    let alive = true
    setLoading(true)
    setError(null)
    reportsApi.run(info.type, query)
      .then((r) => { if (alive) setReport(r) })
      .catch((e) => { if (alive) { setError(errorMessage(e)); setReport(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [info, JSON.stringify(query)]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }
  const choose = (t) => {
    const next = new URLSearchParams()
    next.set('r', t)
    if (params.get('from')) next.set('from', from)
    if (params.get('to')) next.set('to', to)
    setParams(next, { replace: true })
  }

  const download = async (format) => {
    setExporting(format)
    try {
      const { blob, filename } = await reportsApi.export(info.type, format, query)
      downloadBlob(blob, filename)
    } catch (e) {
      toast.error(await blobError(e))
    } finally {
      setExporting(null)
    }
  }

  if (catalog && catalog.length === 0) {
    return <EmptyState icon={BarChart3} title={tx('Sin reportes disponibles')} description={tx('Tu rol no incluye la consulta de reportes.')} />
  }

  const groups = (catalog || []).reduce((acc, c) => ({ ...acc, [c.group]: [...(acc[c.group] || []), c] }), {})
  const periodPresets = [...presets(today), ...(['occupancy', 'rooms'].includes(type) ? forwardPresets(today) : [])]

  return (
    <>
      <PageHeader eyebrow={tx('Reportes')} title={info?.title || tx('Reportes')} description={info?.description}
        actions={info && can('REPORTS:EXPORT') && (
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-white/[.07]">
            {[['csv', 'CSV', Sheet], ['xlsx', tx('Excel'), FileSpreadsheet], ['pdf', 'PDF', FileText]].map(([f, label, Icon]) => (
              <button key={f} onClick={() => download(f)} disabled={!!exporting || loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5">
                {exporting === f ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{label}
              </button>
            ))}
          </div>
        )} />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <label className="lg:hidden">
            <span className="sr-only">{tx('Reporte')}</span>
            <select className="input" value={type || ''} onChange={(e) => choose(e.target.value)}>
              {Object.entries(groups).map(([g, items]) => (
                <optgroup key={g} label={g}>{items.map((c) => <option key={c.type} value={c.type}>{c.title}</option>)}</optgroup>
              ))}
            </select>
          </label>
          <nav className="card hidden p-2 lg:block" aria-label={tx('Reportes')}>
            {!catalog ? <div className="space-y-2 p-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}</div>
              : Object.entries(groups).map(([g, items]) => (
                <div key={g} className="mb-2 last:mb-0">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">{g}</p>
                  {items.map((c) => {
                    const Icon = ICONS[c.type] || BarChart3
                    const active = c.type === type
                    return (
                      <button key={c.type} onClick={() => choose(c.type)} aria-current={active ? 'page' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${active ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}>
                        <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{c.title}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {info && (
            <section className="card p-4">
              {info.snapshot ? (
                <p className="flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4 text-brand-500" /> {tx('Muestra la situación en este momento; no depende de un periodo.')}</p>
              ) : (
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 xl:pb-0">
                    {periodPresets.map(([label, f, t]) => {
                      const active = f === from && t === to
                      return (
                        <button key={label} onClick={() => update({ from: f, to: t })}
                          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-ink-900 text-white dark:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex w-full items-center gap-2 xl:ml-auto xl:w-auto">
                    <input type="date" aria-label={tx('Desde')} className="input h-9 min-w-0 flex-1 py-1 text-sm xl:w-40 xl:flex-none" value={from} max={to}
                      onChange={(e) => e.target.value && update({ from: e.target.value })} />
                    <span className="text-slate-400">–</span>
                    <input type="date" aria-label={tx('Hasta')} className="input h-9 min-w-0 flex-1 py-1 text-sm xl:w-40 xl:flex-none" value={to} min={from}
                      onChange={(e) => e.target.value && update({ to: e.target.value })} />
                  </div>
                </div>
              )}
              {info.filters.length > 0 && (
                <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 dark:border-white/[.06] sm:grid-cols-2 xl:grid-cols-4">
                  {info.filters.map((k) => (
                    <FilterSelect key={k} name={k} type={info.type} value={filters[k]} roomTypes={roomTypes}
                      onChange={(v) => update({ [k]: v })} />
                  ))}
                </div>
              )}
            </section>
          )}

          {error ? (
            <div className="card p-10"><EmptyState icon={Info} title={tx('No se pudo generar el reporte')} description={error} /></div>
          ) : !report || (loading && report.type !== info?.type) ? <ReportSkeleton /> : (
            <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <ListChecks className="h-3.5 w-3.5" /> {report.basis}
                {!info?.snapshot && <span>· {fmtValue(report.from, 'date')} – {fmtValue(report.to, 'date')}</span>}
              </p>
              <Metrics metrics={report.metrics} currency={report.currency} />
              {report.charts.length > 0 && <Charts charts={report.charts} currency={report.currency} />}
              <DataTable report={report} />
              {report.notes.length > 0 && (
                <ul className="space-y-1.5 rounded-2xl bg-slate-100/70 p-4 text-xs text-slate-500 dark:bg-white/[.03]">
                  {report.notes.map((n) => <li key={n} className="flex gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function FilterSelect({ name, type, value, roomTypes, onChange }) {
  const paymentReport = ['payments', 'refunds'].includes(type)
  const options = {
    basis: [['', 'Fecha de creación'], ['arrival', 'Fecha de llegada']],
    status: paymentReport
      ? [['', 'Aplicados'], ...Object.entries(PAYMENT_STATUS).filter(([k]) => k !== 'COMPLETED').map(([k, v]) => [k, v.label])]
      : [['', 'Todos los estados'], ...Object.entries(RES_STATUS)
        .filter(([k]) => type !== 'receivables' || ['CONFIRMED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(k))
        .map(([k, v]) => [k, v.label])],
    source: [['', 'Todos los canales'], ...Object.entries(SOURCES)],
    roomTypeId: [['', tx('Todos los tipos')], ...roomTypes.map((t) => [String(t.id), t.name])],
    method: [['', 'Todos los métodos'], ...Object.entries(METHODS)
      .filter(([k]) => type !== 'cash' || k !== 'ONLINE').map(([k, v]) => [k, v.label])],
    kind: [['', 'Pagos y devoluciones'], ...Object.entries(KINDS)],
  }[name]
  if (!options || (name === 'roomTypeId' && roomTypes.length === 0)) return null
  const labels = { basis: 'Fecha base', status: 'Estado', source: 'Canal', roomTypeId: tx('Tipo de habitación'), method: 'Método', kind: 'Tipo de movimiento' }
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{labels[name]}</span>
      <select className="input h-9 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function Metrics({ metrics, currency }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {metrics.map((m, i) => (
        <div key={m.key} className="card relative overflow-hidden p-5 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{m.label}</p>
          <p className={`mt-1 font-display font-semibold tabular-nums tracking-tight ${m.format === 'text' ? 'text-2xl' : 'text-3xl'} ${m.format === 'money' && Number(m.value) < 0 ? 'text-rose-600' : ''}`}>
            {fmtValue(m.value, m.format, currency)}
          </p>
          {m.hint && <p className="mt-1.5 text-xs leading-snug text-slate-500">{m.hint}</p>}
        </div>
      ))}
    </div>
  )
}

function Charts({ charts, currency }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {charts.map((c) => {
        const timeline = c.points.length > 8 && /^\d{4}-/.test(c.points[0]?.label || '')
        const categorical = !timeline && c.series.length === 1 && c.points.length <= 8
        return (
          <section key={c.key} className={`card p-5 ${timeline || charts.length === 1 ? 'xl:col-span-2' : ''}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{c.title}</h2>
              <Legend series={c.series} />
            </div>
            {categorical ? <HBars points={c.points} format={c.format} currency={currency} />
              : <Chart points={c.points} series={c.series} kind={c.kind} format={c.format} currency={currency} height={timeline ? 240 : 200} />}
          </section>
        )
      })}
    </div>
  )
}

function DataTable({ report }) {
  const [sort, setSort] = useState(null)
  useEffect(() => setSort(null), [report.type])
  const rows = useMemo(() => {
    if (!sort) return report.rows
    const col = report.columns.find((c) => c.key === sort.key)
    const numeric = col && ['money', 'count', 'number', 'percent'].includes(col.format)
    return [...report.rows].sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      if (x == null) return 1
      if (y == null) return -1
      const r = numeric ? Number(x) - Number(y) : String(x).localeCompare(String(y), LOCALE)
      return sort.dir === 'asc' ? r : -r
    })
  }, [report, sort])
  const totals = report.columns.map((c) => (c.format === 'money' ? report.rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : null))
  const showTotals = report.rows.length > 1 && totals.some((t) => t !== null) && !report.truncated
  const right = (c) => ['money', 'count', 'number', 'percent'].includes(c.format)

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/[.06]">
        <h2 className="font-display text-lg font-semibold">{tx('Detalle')}</h2>
        <p className="text-xs text-slate-500">
          {report.truncated ? tx('Se muestran {0} de {1}: exporta para ver todos', report.rows.length, report.totalRows) : `${report.totalRows} registro(s)`}
        </p>
      </div>
      {report.rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">{tx('Sin registros con estos filtros.')}</p>
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-ink-900/95">
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-semibold ${right(c) ? 'text-right' : ''}`}>
                    <button className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[.05]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-white/[.02]">
                  {report.columns.map((c) => (
                    <td key={c.key} className={`whitespace-nowrap px-4 py-2.5 ${right(c) ? 'text-right tabular-nums' : ''} ${c.format === 'money' && Number(r[c.key]) < 0 ? 'text-rose-600' : ''} ${c.key === 'folio' ? 'font-mono text-xs font-semibold' : ''}`}>
                      <span className={c.format === 'text' ? 'block max-w-[260px] truncate' : ''} title={c.format === 'text' ? r[c.key] || '' : undefined}>
                        {fmtValue(r[c.key], c.format, report.currency)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {showTotals && (
              <tfoot className="sticky bottom-0 bg-slate-50/95 font-semibold backdrop-blur dark:bg-ink-900/95">
                <tr>
                  {report.columns.map((c, i) => (
                    <td key={c.key} className={`whitespace-nowrap px-4 py-3 ${right(c) ? 'text-right tabular-nums' : ''}`}>
                      {i === 0 ? tx('Total') : totals[i] !== null ? fmtValue(Math.round(totals[i] * 100) / 100, 'money', report.currency) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
    </div>
  )
}
