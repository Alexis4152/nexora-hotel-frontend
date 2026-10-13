import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ScrollText, Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, EmptyState, Pagination, Select, Skeleton } from '../../components/ui'
import { adminApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { AUDIT_ACTIONS } from '../../config/permissions'
import { formatDateTime } from '../../utils/format'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { tx } from '../../i18n'

const RESULT = {
  SUCCESS: ['green', tx('Correcto')],
  DENIED: ['amber', tx('Denegado')],
  FAILED: ['red', tx('Fallido')],
}

/** Bitácora inmutable: la base de datos rechaza cualquier modificación o borrado. */
export default function AuditPage() {
  const { hotel } = useHotel()
  const toast = useToast()
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const actorQ = useDebouncedValue(actor)

  const load = useCallback(() => {
    setData(null)
    adminApi.audit({ action: action || undefined, actor: actorQ || undefined, page, size: 20 })
      .then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, actorQ, page])
  useEffect(load, [load])
  useEffect(() => setPage(0), [action, actorQ])

  return (
    <>
      <PageHeader eyebrow={tx('Seguridad')} title={tx('Auditoría')}
        description={tx('Quién hizo qué y cuándo. Los registros no se pueden modificar ni borrar.')} />

      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 dark:border-white/[.06] sm:grid-cols-2">
          <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label={tx('Filtrar por acción')}>
            <option value="">{tx('Todas las acciones')}</option>
            {Object.entries(AUDIT_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Filtrar por correo…')} value={actor} maxLength={150}
              onChange={(e) => setActor(e.target.value)} aria-label={tx('Filtrar por correo')} />
          </div>
        </div>

        {!data ? (
          <div className="space-y-3 p-4">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : data.content.length === 0 ? (
          <EmptyState icon={ScrollText} title={tx('Sin eventos')} description={tx('No hay registros con esos filtros.')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                  <tr><th>{tx('Fecha')}</th><th>{tx('Acción')}</th><th>{tx('Usuario')}</th><th>{tx('Resultado')}</th><th>IP</th><th className="w-10" /></tr>
                </thead>
                <tbody>
                  {data.content.map((e) => {
                    const expandable = e.before || e.after || e.detail
                    const isOpen = open === e.id
                    const [tone, label] = RESULT[e.result] || ['slate', e.result]
                    return (
                      <Fragment key={e.id}>
                        <tr className={`table-row ${expandable ? 'cursor-pointer' : ''}`} onClick={() => expandable && setOpen(isOpen ? null : e.id)}>
                          <td className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDateTime(e.createdAt, hotel?.timezone)}</td>
                          <td className="font-medium">{AUDIT_ACTIONS[e.action] || e.action}</td>
                          <td className="max-w-[220px] truncate">{e.actorEmail || tx('Sistema')}</td>
                          <td><Badge tone={tone} dot>{label}</Badge></td>
                          <td className="font-mono text-xs text-slate-500">{e.ip || '—'}</td>
                          <td>{expandable && <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/70 dark:bg-white/[.02]">
                            <td colSpan={6} className="px-4 pb-4">
                              {e.detail && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{e.detail}</p>}
                              <div className="grid gap-3 md:grid-cols-2">
                                {e.before && <JsonBox title={tx('Antes')} data={e.before} />}
                                {e.after && <JsonBox title={tx('Después')} data={e.after} />}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}

function JsonBox({ title, data }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-ink-950 dark:ring-white/10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <dl className="space-y-1.5 text-xs">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-28 shrink-0 text-slate-500">{k}</dt>
            <dd className="break-all font-mono">{Array.isArray(v) ? v.join(', ') || '—' : v === null ? '—' : String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
