import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, History, Landmark, Lock, Printer, Unlock, Vault, Wallet } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, EmptyState, Input, Modal, Pagination, Skeleton } from '../../components/ui'
import { Tabs, Textarea } from '../../components/catalog'
import { METHODS } from '../../components/payments'
import { cashApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import ReservationDrawer from './ReservationDrawer'
import { tx } from '../../i18n'

const TYPE_LABEL = { PAYMENT: tx('Cobro'), REFUND: tx('Reembolso'), REVERSAL: tx('Reverso'), WITHDRAWAL: tx('Retiro'), DEPOSIT: tx('Depósito') }

export default function CashPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState(can('CASH:OPERATE') ? 'mine' : 'history')
  const tabs = [
    can('CASH:OPERATE') && { key: 'mine', label: tx('Mi caja'), icon: Wallet },
    { key: 'history', label: can('CASH:VIEW_ALL') ? tx('Historial de cajas') : tx('Mis turnos'), icon: History },
  ].filter(Boolean)
  return (
    <>
      <PageHeader eyebrow={tx('Operación')} title={tx('Caja')}
        description={tx('Apertura con fondo inicial, cobros del turno por método, retiros y corte con conteo de efectivo.')} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'mine' && <MyCash />}
      {tab === 'history' && <SessionHistory />}
    </>
  )
}

/* ── Mi caja ────────────────────────────────────────────────────────────────────── */

function MyCash() {
  const toast = useToast()
  const [state, setState] = useState(undefined)
  const [dialog, setDialog] = useState(null)
  const load = useCallback(() => cashApi.current().then((s) => setState(s ?? null)).catch((e) => toast.error(errorMessage(e))), [toast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  if (state === undefined) return <Skeleton className="h-80" />
  if (state === null) return <OpenCash onOpened={setState} />
  return (
    <>
      <SessionView session={state} actions={(
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={load}>{tx('Actualizar')}</Button>
          <AdjustButtons session={state} onDone={setState} />
          <Button size="sm" variant="danger" onClick={() => setDialog('close')}><Lock className="h-4 w-4" /> {tx('Corte y cierre')}</Button>
        </div>
      )} />
      {dialog === 'close' && <CloseDialog session={state} onClose={() => setDialog(null)} onDone={(s) => { setDialog(null); setState(null); toast.success(tx('Caja cerrada · diferencia {0}', money(s.difference))) }} />}
    </>
  )
}

function OpenCash({ onOpened }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (amount === '' || Number(amount) < 0) { setError(tx('Indica el fondo inicial (puede ser 0)')); return }
    setSaving(true)
    try {
      onOpened(await cashApi.open({ openingFloat: amount, notes: notes.trim() || null }))
      toast.success(tx('Caja abierta'))
    } catch (e) {
      setError(fieldErrors(e).openingFloat || '')
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Unlock className="h-7 w-7" /></div>
      <h2 className="font-display text-2xl font-semibold">{tx('Abre tu caja')}</h2>
      <p className="mt-1 text-sm text-slate-500">{tx('Cuenta el efectivo con el que inicias el turno. Los cobros en efectivo requieren una caja abierta.')}</p>
      <div className="mt-6 space-y-3 text-left">
        <Input label={tx('Fondo inicial (MXN)')} inputMode="decimal" value={amount} error={error} placeholder="0.00" onChange={(e) => setAmount(moneyInput(e.target.value))} />
        <Textarea label={tx('Notas (opcional)')} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button className="w-full" loading={saving} onClick={submit}><Unlock className="h-4 w-4" /> {tx('Abrir caja')}</Button>
      </div>
    </div>
  )
}

function AdjustButtons({ session, onDone }) {
  const { can } = useAuth()
  const [type, setType] = useState(null)
  if (!can('CASH:ADJUST')) return null
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setType('WITHDRAWAL')}><Vault className="h-4 w-4" /> {tx('Retiro')}</Button>
      <Button size="sm" variant="secondary" onClick={() => setType('DEPOSIT')}><ArrowDownLeft className="h-4 w-4" /> {tx('Depósito')}</Button>
      {type && <AdjustDialog session={session} type={type} onClose={() => setType(null)} onDone={(s) => { setType(null); onDone(s) }} />}
    </>
  )
}

function AdjustDialog({ session, type, onClose, onDone }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    const e = {}
    if (!(Number(amount) > 0)) e.amount = tx('Indica el importe')
    if (!reason.trim()) e.reason = tx('Indica el motivo')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onDone(await cashApi.adjust(session.id, { type, amount, reason: reason.trim() }))
      toast.success(tx('Movimiento registrado'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} icon={type === 'WITHDRAWAL' ? Vault : ArrowDownLeft}
      title={type === 'WITHDRAWAL' ? tx('Retiro de efectivo') : tx('Depósito de efectivo')}
      description={type === 'WITHDRAWAL' ? tx('Efectivo esperado en caja: {0}', money(session.summary.expectedCash)) : tx('Entrada de efectivo que no es un cobro (ej. reposición de cambio).')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Registrar')}</Button></>}>
      <div className="space-y-4">
        <Input label={tx('Importe (MXN)')} inputMode="decimal" value={amount} error={errors.amount} onChange={(e) => setAmount(moneyInput(e.target.value))} />
        <Textarea label={tx('Motivo')} required rows={2} maxLength={300} value={reason} error={errors.reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  )
}

function CloseDialog({ session, onClose, onDone }) {
  const toast = useToast()
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const expected = Number(session.summary.expectedCash)
  const diff = counted === '' ? null : Number(counted) - expected

  const submit = async () => {
    if (counted === '') { setError(tx('Escribe el efectivo que contaste')); return }
    if (diff !== 0 && !notes.trim()) { setError(tx('Hay una diferencia: explica el motivo')); return }
    setSaving(true)
    try {
      onDone(await cashApi.close(session.id, { countedCash: counted, notes: notes.trim() || null }))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={Lock} title={tx('Corte y cierre de caja')} size="max-w-xl"
      description={tx('Cuenta el efectivo físico. Al cerrar, la caja y sus movimientos ya no se pueden modificar.')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button variant="danger" loading={saving} onClick={submit}><Lock className="h-4 w-4" /> {tx('Cerrar caja')}</Button></>}>
      <div className="space-y-4">
        <Totals summary={session.summary} />
        <Input label={tx('Efectivo contado (MXN)')} inputMode="decimal" value={counted} onChange={(e) => { setCounted(moneyInput(e.target.value)); setError('') }} />
        {diff !== null && (
          <div className={`rounded-xl p-3 text-center text-sm font-semibold ${diff === 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'}`}>
            {diff === 0 ? tx('La caja cuadra') : diff > 0 ? tx('Sobrante de {0}', money(diff)) : tx('Faltante de {0}', money(-diff))}
          </div>
        )}
        <Textarea label={diff ? tx('Explicación de la diferencia') : tx('Notas (opcional)')} required={!!diff} rows={2} maxLength={500} value={notes}
          error={error} onChange={(e) => { setNotes(e.target.value); setError('') }} />
      </div>
    </Modal>
  )
}

/* ── Vista de una caja ──────────────────────────────────────────────────────────── */

function Totals({ summary }) {
  const rows = [
    [Banknote, tx('Efectivo'), summary.cashIn, summary.cashOut],
    [CreditCard, tx('Tarjeta'), summary.cardIn, summary.cardOut],
    [Landmark, tx('Transferencia'), summary.transferIn, summary.transferOut],
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500"><tr><th className="py-1 text-left font-medium">{tx('Método')}</th><th className="text-right font-medium">{tx('Entradas')}</th><th className="text-right font-medium">{tx('Salidas')}</th></tr></thead>
        <tbody>
          {rows.map(([Icon, label, inn, out]) => (
            <tr key={label} className="border-t border-slate-100 dark:border-white/[.06]">
              <td className="py-2"><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" />{label}</span></td>
              <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{money(inn)}</td>
              <td className="text-right tabular-nums text-rose-600 dark:text-rose-400">{Number(out) > 0 ? `− ${money(out)}` : money(0)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-100 text-slate-500 dark:border-white/[.06]"><td className="py-2">{tx('Retiros / depósitos')}</td>
            <td className="text-right tabular-nums">{money(summary.deposits)}</td><td className="text-right tabular-nums">− {money(summary.withdrawals)}</td></tr>
        </tbody>
      </table>
      <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white sm:w-56">
        <p className="text-xs uppercase tracking-wider text-white/70">{tx('Efectivo esperado')}</p>
        <p className="font-display text-3xl font-semibold tabular-nums">{money(summary.expectedCash)}</p>
        <p className="mt-1 text-xs text-white/70">{tx('fondo')} {money(summary.openingFloat)} {tx('+ entradas − salidas')}</p>
      </div>
    </div>
  )
}

function SessionView({ session, actions }) {
  const [openRes, setOpenRes] = useState(null)
  const closed = session.status === 'CLOSED'
  return (
    <div className="space-y-6">
      <section className="card p-6 print:shadow-none">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{tx('Caja de')} {session.userName}</h2>
              <Badge tone={closed ? 'slate' : 'green'} dot>{closed ? tx('Cerrada') : tx('Abierta')}</Badge>
            </div>
            <p className="text-sm text-slate-500">{tx('Abierta')} {formatDateTime(session.openedAt)}{closed ? ` · cerrada ${formatDateTime(session.closedAt)}${session.closedByName ? ` por ${session.closedByName}` : ''}` : ''}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            {actions}
            <Button size="sm" variant="ghost" onClick={() => window.print()} aria-label={tx('Imprimir corte')}><Printer className="h-4 w-4" /></Button>
          </div>
        </div>
        <Totals summary={session.summary} />
        {closed && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label={tx('Esperado')} value={money(session.expectedCash)} />
            <Stat label={tx('Contado')} value={money(session.countedCash)} />
            <Stat label={tx('Diferencia')} value={money(session.difference)} tone={Number(session.difference) === 0 ? 'text-emerald-600' : 'text-amber-600'} />
            {session.closingNotes && <p className="text-sm text-slate-500 sm:col-span-3">{tx('Notas del cierre:')} {session.closingNotes}</p>}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 dark:border-white/[.06]"><h3 className="font-semibold">{tx('Movimientos (')}{session.movements.length})</h3></div>
        {session.movements.length === 0 ? <EmptyState icon={Wallet} title={tx('Sin movimientos todavía')} description={tx('Los cobros que registres en recepción aparecerán aquí.')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]"><tr><th>{tx('Hora')}</th><th>{tx('Tipo')}</th><th>{tx('Método')}</th><th>{tx('Reservación / motivo')}</th><th>{tx('Usuario')}</th><th className="text-right">{tx('Importe')}</th></tr></thead>
              <tbody>
                {session.movements.map((m) => (
                  <tr key={m.id} className="table-row">
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td>{TYPE_LABEL[m.type]}</td>
                    <td>{METHODS[m.method]?.label}</td>
                    <td>{m.folio ? <button className="font-mono text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400" onClick={() => setOpenRes(m.reservationId)}>{m.folio}</button> : null}
                      {m.reason && <span className="ml-1 text-slate-500">{m.reason}</span>}</td>
                    <td className="text-slate-500">{m.userName}</td>
                    <td className={`text-right font-semibold tabular-nums ${m.direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span className="inline-flex items-center gap-1">{m.direction === 'IN' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{money(m.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {openRes && <ReservationDrawer id={openRes} onClose={() => setOpenRes(null)} />}
    </div>
  )
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-display text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

/* ── Historial ──────────────────────────────────────────────────────────────────── */

function SessionHistory() {
  const toast = useToast()
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    cashApi.sessions({ page, size: 15 }).then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])
  const open = (id) => cashApi.session(id).then(setSelected).catch((e) => toast.error(errorMessage(e)))

  if (selected) {
    return (
      <div>
        <button className="btn-ghost btn-sm mb-4" onClick={() => setSelected(null)}>{tx('← Volver al historial')}</button>
        <SessionView session={selected} />
      </div>
    )
  }
  return (
    <div className="card overflow-hidden">
      {!data ? <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        : data.content.length === 0 ? <EmptyState icon={History} title={tx('Aún no hay turnos de caja')} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                  <tr><th>{tx('Responsable')}</th><th>{tx('Apertura')}</th><th>{tx('Cierre')}</th><th>{tx('Estado')}</th><th className="text-right">{tx('Fondo')}</th><th className="text-right">{tx('Esperado')}</th><th className="text-right">{tx('Contado')}</th><th className="text-right">{tx('Diferencia')}</th></tr>
                </thead>
                <tbody>
                  {data.content.map((c) => (
                    <tr key={c.id} className="table-row cursor-pointer" onClick={() => open(c.id)}>
                      <td className="font-medium">{c.userName}</td>
                      <td className="whitespace-nowrap text-slate-500">{formatDateTime(c.openedAt)}</td>
                      <td className="whitespace-nowrap text-slate-500">{c.closedAt ? formatDateTime(c.closedAt) : '—'}</td>
                      <td><Badge tone={c.status === 'OPEN' ? 'green' : 'slate'} dot>{c.status === 'OPEN' ? tx('Abierta') : tx('Cerrada')}</Badge></td>
                      <td className="text-right tabular-nums">{money(c.openingFloat)}</td>
                      <td className="text-right tabular-nums">{c.expectedCash == null ? '—' : money(c.expectedCash)}</td>
                      <td className="text-right tabular-nums">{c.countedCash == null ? '—' : money(c.countedCash)}</td>
                      <td className={`text-right font-semibold tabular-nums ${c.difference == null ? '' : Number(c.difference) === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {c.difference == null ? '—' : money(c.difference)}
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
  )
}
