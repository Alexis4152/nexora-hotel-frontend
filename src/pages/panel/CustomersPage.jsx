import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Contact, Mail, Pencil, Phone, Plus, Search, ShieldCheck, UserRound } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, Button, EmptyState, Modal, Pagination, Skeleton } from '../../components/ui'
import { Tabs, Textarea } from '../../components/catalog'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime } from '../../utils/format'
import { GuestFields, StatusBadge, emptyGuest, fmtDate, guestErrors } from '../../components/reservations'
import { Can } from '../../guards'
import { customersApi, dataRequestsApi } from '../../api'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { money } from '../../utils/money'
import ReservationDrawer from './ReservationDrawer'
import { LOCALE, tx } from '../../i18n'

const phoneOf = (c) => (c.phone ? `+${c.phoneCountryCode || '52'} ${c.phone}` : '')

export default function CustomersPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState('list')
  const [params, setParams] = useSearchParams()
  const [requestsKey, setRequestsKey] = useState(0)

  // ?tab=solicitudes (enlace de la notificación de una nueva solicitud ARCO).
  useEffect(() => {
    if (params.get('tab') !== 'solicitudes') return
    setTab('requests')
    setRequestsKey((k) => k + 1)
    setParams((p) => { p.delete('tab'); return p }, { replace: true })
  }, [params, setParams])
  const tabs = (
    <Tabs value={tab} onChange={setTab} tabs={[
      { key: 'list', label: tx('Clientes'), icon: Contact },
      { key: 'requests', label: tx('Solicitudes de datos'), icon: ShieldCheck },
    ]} />
  )
  return tab === 'list' ? <CustomersList tabs={tabs} /> : (
    <>
      <PageHeader eyebrow={tx('Huéspedes')} title={tx('Solicitudes de datos personales')}
        description={tx('Derechos de acceso, rectificación, cancelación y oposición (ARCO) que piden los huéspedes desde su cuenta.')} />
      {tabs}
      <DataRequestsTab key={requestsKey} canResolve={can('CUSTOMERS:UPDATE')} />
    </>
  )
}

function CustomersList({ tabs }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [editing, setEditing] = useState(null) // {} nuevo | customer
  const q = useDebouncedValue(query)

  const load = useCallback(() => {
    customersApi.list({ q: q || undefined, page, size: 20 }).then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page])
  useEffect(load, [load])
  useEffect(() => setPage(0), [q])

  return (
    <>
      <PageHeader eyebrow={tx('Huéspedes')} title={tx('Clientes')}
        description={tx('Historial de estancias, datos de contacto y preferencias de cada huésped.')}
        actions={<Can permission="CUSTOMERS:CREATE"><button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {tx('Nuevo cliente')}</button></Can>} />
      {tabs}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 dark:border-white/[.06]">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Nombre, correo o teléfono…')} value={query} maxLength={100}
              onChange={(e) => setQuery(e.target.value)} aria-label={tx('Buscar cliente')} />
          </div>
        </div>
        {!data ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          : data.content.length === 0 ? <EmptyState icon={Contact} title={q ? tx('Sin coincidencias') : tx('Aún no hay clientes')} description={tx('Los clientes se registran solos al reservar, o puedes darlos de alta aquí.')} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                    <tr><th>{tx('Cliente')}</th><th>{tx('Contacto')}</th><th className="text-center">{tx('Estancias')}</th><th>{tx('Última estancia')}</th><th>{tx('Alta')}</th></tr>
                  </thead>
                  <tbody>
                    {data.content.map((c) => (
                      <tr key={c.id} className="table-row cursor-pointer" onClick={() => setOpenId(c.id)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar first={c.firstName} last={c.lastName} />
                            <div><p className="font-medium">{c.firstName} {c.lastName}</p>{c.hasAccount && <Badge tone="brand">{tx('Con cuenta')}</Badge>}</div>
                          </div>
                        </td>
                        <td className="text-sm"><p>{c.email || '—'}</p><p className="text-xs text-slate-500">{phoneOf(c)}</p></td>
                        <td className="text-center font-semibold tabular-nums">{c.reservations}</td>
                        <td>{c.lastStay ? fmtDate(c.lastStay, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="text-slate-500">{new Date(c.createdAt).toLocaleDateString(LOCALE)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
      </div>
      {openId && <CustomerDetail id={openId} onClose={() => setOpenId(null)} onEdit={(c) => setEditing(c)} />}
      {editing && <CustomerForm customer={editing.id ? editing : null} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setOpenId(null); load() }} />}
    </>
  )
}

function CustomerDetail({ id, onClose, onEdit }) {
  const toast = useToast()
  const [d, setD] = useState(null)
  const [resId, setResId] = useState(null)
  useEffect(() => {
    customersApi.detail(id).then(setD).catch((e) => { toast.error(errorMessage(e)); onClose() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  const c = d?.customer
  return (
    <Modal open onClose={onClose} size="max-w-3xl" icon={UserRound} title={c ? `${c.firstName} ${c.lastName}` : tx('Cliente')}
      description={c ? tx('Cliente desde {0}', new Date(c.createdAt).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })) : ''}>
      {!d ? <Skeleton className="h-48" /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 space-y-1 text-sm">
              {c.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{c.email}</p>}
              {c.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{phoneOf(c)}</p>}
            </div>
            <Can permission="CUSTOMERS:UPDATE"><Button size="sm" variant="secondary" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /> {tx('Editar')}</Button></Can>
          </div>
          {(c.preferences || c.notes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {c.preferences && <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/[.03]"><p className="text-xs font-semibold text-slate-500">{tx('Preferencias')}</p><p className="mt-1 whitespace-pre-wrap">{c.preferences}</p></div>}
              {c.notes && <div className="rounded-xl bg-gold-300/15 p-3 text-sm ring-1 ring-gold-500/20"><p className="text-xs font-semibold text-slate-500">{tx('Notas internas')}</p><p className="mt-1 whitespace-pre-wrap">{c.notes}</p></div>}
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Estancias (')}{d.reservations.length})</p>
            {d.reservations.length === 0 ? <p className="text-sm text-slate-500">{tx('Sin reservaciones todavía.')}</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 dark:divide-white/[.06] dark:ring-white/10">
                {d.reservations.map((r) => (
                  <li key={r.id}>
                    <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/[.03]" onClick={() => setResId(r.id)}>
                      <span className="font-mono text-xs font-semibold">{r.folio}</span>
                      <span className="flex-1">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {r.roomTypeName}</span>
                      <StatusBadge status={r.status} />
                      <span className="w-24 text-right font-semibold tabular-nums">{money(r.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {resId && <ReservationDrawer id={resId} onClose={() => setResId(null)} />}
    </Modal>
  )
}

function CustomerForm({ customer, onClose, onSaved }) {
  const toast = useToast()
  const [guest, setGuest] = useState(customer ? {
    firstName: customer.firstName, lastName: customer.lastName, email: customer.email || '',
    phoneCountryCode: customer.phoneCountryCode || '52', phone: customer.phone || '', country: customer.country || 'MX',
  } : emptyGuest())
  const [preferences, setPreferences] = useState(customer?.preferences || '')
  const [notes, setNotes] = useState(customer?.notes || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e = guestErrors(guest)
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const payload = {
        guest: { ...guest, firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim() || null, phone: guest.phone || null },
        preferences: preferences.trim() || null, notes: notes.trim() || null,
      }
      await (customer ? customersApi.update(customer.id, payload) : customersApi.create(payload))
      toast.success(customer ? tx('Cliente actualizado') : tx('Cliente registrado'))
      onSaved()
    } catch (err) {
      setErrors(Object.fromEntries(Object.entries(fieldErrors(err)).map(([k, v]) => [k.replace(/^guest\./, ''), v])))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="max-w-2xl" icon={UserRound} title={customer ? tx('Editar cliente') : tx('Nuevo cliente')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Guardar')}</Button></>}>
      <div className="space-y-4">
        <GuestFields value={guest} onChange={setGuest} errors={errors} />
        <Textarea label={tx('Preferencias')} rows={2} maxLength={1000} value={preferences} onChange={(e) => setPreferences(e.target.value)} />
        <Textarea label={tx('Notas internas')} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

/* ── Solicitudes de datos (ARCO) ────────────────────────────────────────────────── */

const REQUEST_TYPES = { ACCESS: tx('Acceso'), RECTIFICATION: tx('Rectificación'), DELETION: tx('Eliminación'), OPPOSITION: tx('Oposición') }
const REQUEST_STATUS = { PENDING: [tx('Pendiente'), 'amber'], COMPLETED: [tx('Atendida'), 'green'], REJECTED: [tx('Rechazada'), 'red'] }

function DataRequestsTab({ canResolve }) {
  const toast = useToast()
  const [status, setStatus] = useState('PENDING')
  const [list, setList] = useState(null)
  const [resolving, setResolving] = useState(null)
  const load = useCallback(() => {
    setList(null)
    dataRequestsApi.list(status).then(setList).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
  useEffect(load, [load])

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4 dark:border-white/[.06]">
        {[['PENDING', tx('Pendientes')], ['', tx('Todas')]].map(([k, l]) => (
          <button key={l} onClick={() => setStatus(k)} className={`chip ${status === k ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-slate-100 dark:bg-white/5'}`}>{l}</button>
        ))}
      </div>
      {!list ? <div className="space-y-3 p-4">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : list.length === 0 ? <EmptyState icon={ShieldCheck} title={tx('Sin solicitudes')} description={tx('Cuando un huésped haga una solicitud desde su cuenta aparecerá aquí.')} /> : (
          <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{REQUEST_TYPES[r.type]} · {r.customerName}</p>
                  <p className="text-xs text-slate-500">{r.customerEmail || tx('sin correo')} · {formatDateTime(r.createdAt)}</p>
                  {r.details && <p className="mt-1 text-slate-600 dark:text-slate-300">“{r.details}”</p>}
                  {r.resolutionNotes && <p className="mt-1 text-xs text-slate-500">{tx('Resolución:')} {r.resolutionNotes}{r.resolvedByName ? ` (${r.resolvedByName})` : ''}</p>}
                </div>
                <Badge tone={REQUEST_STATUS[r.status][1]} dot>{REQUEST_STATUS[r.status][0]}</Badge>
                {canResolve && r.status === 'PENDING' && <Button size="sm" onClick={() => setResolving(r)}>{tx('Resolver')}</Button>}
              </li>
            ))}
          </ul>
        )}
      {resolving && <ResolveDialog request={resolving} onClose={() => setResolving(null)} onDone={() => { setResolving(null); load() }} />}
    </div>
  )
}

function ResolveDialog({ request, onClose, onDone }) {
  const toast = useToast()
  const [status, setStatus] = useState('COMPLETED')
  const [notes, setNotes] = useState('')
  const [anonymize, setAnonymize] = useState(request.type === 'DELETION')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!notes.trim()) { setError(tx('Explica la resolución (se le muestra al huésped)')); return }
    setSaving(true)
    try {
      await dataRequestsApi.resolve(request.id, { status, notes: notes.trim(), anonymize: request.type === 'DELETION' && status === 'COMPLETED' && anonymize })
      toast.success(tx('Solicitud resuelta'))
      onDone()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} icon={ShieldCheck} title={tx('Solicitud de {0}', REQUEST_TYPES[request.type].toLowerCase())}
      description={`${request.customerName} · ${request.customerEmail || tx('sin correo')}`}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button>
        <Button variant={status === 'COMPLETED' && anonymize ? 'danger' : 'primary'} loading={saving} onClick={submit}>{tx('Resolver')}</Button></>}>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-2">
          {[['COMPLETED', tx('Atendida')], ['REJECTED', tx('Rechazada')]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setStatus(k)}
              className={`rounded-xl p-3 font-medium ring-1 ${status === k ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 dark:ring-white/10'}`}>{l}</button>
          ))}
        </div>
        {request.type === 'DELETION' && status === 'COMPLETED' && (
          <label className="flex items-start gap-3 rounded-xl bg-rose-50 p-3 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose-600" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
            <span>{tx('Anonimizar ahora: se borran nombre, correo, teléfono e identificaciones y se cierra su cuenta. Los registros de pagos y estancias se conservan sin datos personales.')} <b>{tx('No se puede deshacer.')}</b></span>
          </label>
        )}
        <Textarea label={tx('Resolución')} required rows={3} maxLength={2000} value={notes} error={error} onChange={(e) => { setNotes(e.target.value); setError('') }} />
      </div>
    </Modal>
  )
}
