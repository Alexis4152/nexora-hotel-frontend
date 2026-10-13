import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ListChecks, Receipt, Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { EmptyState, Pagination, Skeleton } from '../../components/ui'
import { Tabs } from '../../components/catalog'
import { KINDS, METHODS, MethodLabel, PAYMENT_STATUS, PaymentStatusBadge } from '../../components/payments'
import { StatusBadge, addDays, fmtDate, todayIn } from '../../components/reservations'
import { paymentsApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { money } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import ReservationDrawer from './ReservationDrawer'
import { tx } from '../../i18n'

export default function PaymentsPage() {
  const [tab, setTab] = useState('list')
  const [openId, setOpenId] = useState(null)
  return (
    <>
      <PageHeader eyebrow={tx('Finanzas')} title={tx('Pagos')}
        description={tx('Dinero cobrado y devuelto por método, y cuentas que requieren conciliación. No incluye lo vendido sin cobrar.')} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'list', label: tx('Movimientos'), icon: Receipt },
        { key: 'reconcile', label: tx('Por conciliar'), icon: ListChecks },
      ]} />
      {tab === 'list' ? <Movements onOpen={setOpenId} /> : <Reconciliation onOpen={setOpenId} />}
      {openId && <ReservationDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Movements({ onOpen }) {
  const { hotel } = useHotel()
  const toast = useToast()
  const today = todayIn(hotel.timezone)
  const [filters, setFilters] = useState({ from: `${today.slice(0, 8)}01`, to: today, method: '', status: '', kind: '' })
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const q = useDebouncedValue(query)
  const set = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(0) }

  const load = useCallback(() => {
    if (!filters.from || !filters.to || filters.to < filters.from) return
    paymentsApi.list({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), q: q || undefined, page, size: 25 })
      .then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, q, page])
  useEffect(load, [load])

  const presets = [
    [tx('Hoy'), today, today],
    [tx('7 días'), addDays(today, -6), today],
    [tx('Este mes'), `${today.slice(0, 8)}01`, today],
  ]

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">{tx('Desde')}<input type="date" className="input mt-1 w-40" value={filters.from} max={filters.to} onChange={set('from')} /></label>
          <label className="text-xs text-slate-500">{tx('Hasta')}<input type="date" className="input mt-1 w-40" value={filters.to} min={filters.from} onChange={set('to')} /></label>
          <div className="flex gap-1">
            {presets.map(([label, from, to]) => (
              <button key={label} className={`chip ${filters.from === from && filters.to === to ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-slate-100 dark:bg-white/5'}`}
                onClick={() => { setFilters({ ...filters, from, to }); setPage(0) }}>{label}</button>
            ))}
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Folio, huésped o referencia…')} value={query} maxLength={100}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }} aria-label={tx('Buscar pago')} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="input w-44" value={filters.method} onChange={set('method')} aria-label={tx('Método')}>
            <option value="">{tx('Todos los métodos')}</option>
            {Object.entries(METHODS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
          <select className="input w-40" value={filters.kind} onChange={set('kind')} aria-label={tx('Tipo')}>
            <option value="">{tx('Todos los tipos')}</option>
            {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select className="input w-40" value={filters.status} onChange={set('status')} aria-label={tx('Estado')}>
            <option value="">{tx('Todos los estados')}</option>
            {Object.entries(PAYMENT_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <p className="text-xs uppercase tracking-wider text-white/70">{tx('Neto cobrado')}</p>
            <p className="font-display text-3xl font-semibold tabular-nums">{money(data.net)}</p>
            <p className="text-xs text-white/70">{fmtDate(filters.from, { day: 'numeric', month: 'short' })} – {fmtDate(filters.to, { day: 'numeric', month: 'short' })}</p>
          </div>
          {data.totals.map((t) => (
            <div key={t.method} className="card p-5">
              <p className="text-sm text-slate-500"><MethodLabel method={t.method} /></p>
              <p className="font-display text-2xl font-semibold tabular-nums">{money(t.net)}</p>
              <p className="text-xs text-slate-500">{money(t.received)} {tx('recibido')}{Number(t.returned) > 0 ? ` · ${money(t.returned)} devuelto` : ''} · {t.count} {tx('mov.')}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {!data ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          : data.content.length === 0 ? <EmptyState icon={Receipt} title={tx('Sin movimientos')} description={tx('No hay pagos con esos filtros.')} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                    <tr><th>{tx('Fecha')}</th><th>{tx('Folio')}</th><th>{tx('Huésped')}</th><th>{tx('Tipo')}</th><th>{tx('Método')}</th><th>{tx('Referencia')}</th><th>{tx('Registró')}</th><th>{tx('Estado')}</th><th className="text-right">{tx('Importe')}</th></tr>
                  </thead>
                  <tbody>
                    {data.content.map((p) => (
                      <tr key={p.id} className="table-row cursor-pointer" onClick={() => onOpen(p.reservationId)}>
                        <td className="whitespace-nowrap text-slate-500">{formatDateTime(p.createdAt)}</td>
                        <td className="font-mono text-xs font-semibold">{p.folio}</td>
                        <td>{p.guestName}</td>
                        <td>{KINDS[p.kind]}</td>
                        <td><MethodLabel method={p.method} last4={p.cardLast4} /></td>
                        <td className="max-w-[160px] truncate text-slate-500">{p.reference || '—'}</td>
                        <td className="text-slate-500">{p.createdByName || (p.method === 'ONLINE' ? tx('Huésped') : '—')}</td>
                        <td><PaymentStatusBadge status={p.status} /></td>
                        <td className={`text-right font-semibold tabular-nums ${p.kind === 'PAYMENT' ? '' : 'text-sky-600 dark:text-sky-400'}`}>
                          {p.kind === 'PAYMENT' ? '' : '− '}{money(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
      </div>
    </div>
  )
}

function Reconciliation({ onOpen }) {
  const toast = useToast()
  const [items, setItems] = useState(null)
  useEffect(() => {
    paymentsApi.reconciliation().then(setItems).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!items) return <Skeleton className="h-64" />
  if (items.length === 0) {
    return <div className="card"><EmptyState icon={CheckCircle2} title={tx('Todo conciliado')} description={tx('No hay saldos a favor, cuentas por cobrar tras la salida ni pagos en línea sin resolver.')} /></div>
  }
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
        {items.map((i, n) => (
          <li key={`${i.reservationId}-${n}`}>
            <button className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/[.03]" onClick={() => onOpen(i.reservationId)}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${Number(i.balance) < 0 ? 'text-sky-500' : 'text-amber-500'}`} />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{i.issue}</span>
                <span className="block text-xs text-slate-500"><span className="font-mono">{i.folio}</span> · {i.guestName} {tx('· llegada')} {fmtDate(i.checkIn)}</span>
              </span>
              <StatusBadge status={i.status} />
              <span className="w-32 text-right font-semibold tabular-nums">{money(Math.abs(Number(i.balance)))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
