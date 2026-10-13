import { useEffect, useMemo, useState } from 'react'
import {
  Ban, Copy, ExternalLink, Link2, Plus, Receipt, RefreshCw, RotateCcw, Undo2, Wallet,
} from 'lucide-react'
import { Button, Input, Modal, Select, Switch } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { KINDS, METHODS, MethodLabel, PaymentStatusBadge, newIdempotencyKey } from '../../components/payments'
import { publicApi, ratesApi, stayApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import { tx } from '../../i18n'

/**
 * Cuenta de la reservación: lo que se debe, lo cobrado y el saldo, con los movimientos y cargos. Las acciones
 * aparecen solo si el rol tiene el permiso (el backend también lo valida).
 */
export default function AccountSection({ r, onChange }) {
  const { can } = useAuth()
  const toast = useToast()
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(null)
  const a = r.account
  const s = r.summary
  const live = !['EXPIRED'].includes(s.status)
  const balance = Number(a.balance)

  const verify = async (p) => {
    setBusy(p.id)
    try {
      onChange(await stayApi.verify(s.id, p.id))
      toast.success(tx('Estado consultado con la pasarela'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 dark:divide-white/[.06] dark:border-white/[.06]">
        <Figure label={tx('Cuenta')} value={money(a.amountDue)} hint={Number(a.chargesTotal) > 0 ? tx('incluye {0} en cargos', money(a.chargesTotal)) : Number(a.penalty) > 0 ? tx('penalización') : null} />
        <Figure label={tx('Pagado')} value={money(a.paid)} tone="text-emerald-600 dark:text-emerald-400" />
        <Figure label={balance < 0 ? tx('A favor del huésped') : tx('Saldo')} value={money(Math.abs(balance))}
          tone={balance > 0 ? 'text-amber-600 dark:text-amber-400' : balance < 0 ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'} />
      </div>
      {Number(a.depositPending) > 0 && (
        <p className="border-b border-slate-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-800 dark:border-white/[.06] dark:bg-amber-500/10 dark:text-amber-200">
          {tx('Anticipo pendiente según la política:')} <b>{money(a.depositPending)}</b> {tx('(de')} {money(a.depositRequired)})
        </p>
      )}

      <div className="flex flex-wrap gap-2 p-3">
        {can('PAYMENTS:CREATE') && live && balance > 0 && <Button size="sm" onClick={() => setDialog('pay')}><Wallet className="h-4 w-4" /> {tx('Cobrar')}</Button>}
        {can('PAYMENTS:CREATE_LINK') && a.onlineAvailable && balance > 0 && ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_HOUSE'].includes(s.status) && (
          <Button size="sm" variant="secondary" onClick={() => setDialog('link')}><Link2 className="h-4 w-4" /> {tx('Enlace de pago')}</Button>
        )}
        {can('RESERVATIONS:UPDATE') && ['CONFIRMED', 'IN_HOUSE'].includes(s.status) && (
          <Button size="sm" variant="secondary" onClick={() => setDialog('charge')}><Plus className="h-4 w-4" /> {tx('Cargo')}</Button>
        )}
        {(can('PAYMENTS:REFUND') || can('PAYMENTS:REFUND_EXTRAORDINARY')) && Number(a.paid) > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setDialog('refund')}><Undo2 className="h-4 w-4" /> {tx('Reembolsar')}</Button>
        )}
      </div>

      {a.payments.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/[.06] dark:border-white/[.06]">
          {a.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <span className={`w-20 text-xs font-semibold ${p.kind === 'PAYMENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>{KINDS[p.kind]}</span>
              <span className="min-w-0 flex-1">
                <MethodLabel method={p.method} last4={p.cardLast4} />
                <span className="block truncate text-xs text-slate-500">
                  {formatDateTime(p.completedAt || p.createdAt)}{p.createdByName ? ` · ${p.createdByName}` : ''}{p.reference ? ` · Ref. ${p.reference}` : ''}
                  {p.notes ? ` · ${p.notes}` : ''}{p.failureReason ? ` · ${p.failureReason}` : ''}
                </span>
              </span>
              <PaymentStatusBadge status={p.status} />
              <span className="w-28 text-right font-semibold tabular-nums">{p.kind === 'PAYMENT' ? '' : '− '}{money(p.amount)}</span>
              <span className="flex w-20 justify-end gap-1">
                {p.status === 'PENDING' && p.checkoutUrl && (
                  <button className="btn-ghost btn-sm !px-2" title={tx('Copiar enlace')} aria-label={tx('Copiar enlace de pago')}
                    onClick={() => navigator.clipboard?.writeText(p.checkoutUrl).then(() => toast.success(tx('Enlace copiado')))}><Copy className="h-3.5 w-3.5" /></button>
                )}
                {p.status === 'PENDING' && p.method === 'ONLINE' && can('PAYMENTS:VIEW') && (
                  <button className="btn-ghost btn-sm !px-2" title={tx('Verificar con la pasarela')} aria-label={tx('Verificar con la pasarela')}
                    disabled={busy === p.id} onClick={() => verify(p)}><RefreshCw className={`h-3.5 w-3.5 ${busy === p.id ? 'animate-spin' : ''}`} /></button>
                )}
                {p.kind === 'PAYMENT' && p.status === 'COMPLETED' && p.method !== 'ONLINE' && Number(p.remaining) === Number(p.amount)
                  && can('PAYMENTS:REVERSE') && (
                  <button className="btn-ghost btn-sm !px-2" title={tx('Reversar (error de captura)')} aria-label={tx('Reversar pago')}
                    onClick={() => setDialog({ reverse: p })}><RotateCcw className="h-3.5 w-3.5" /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {a.charges.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-white/[.06]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{tx('Cargos a la cuenta')}</p>
          <ul className="space-y-1.5 text-sm">
            {a.charges.map((c) => (
              <li key={c.id} className={`flex items-center gap-3 ${c.voided ? 'text-slate-400 line-through' : ''}`}>
                <Receipt className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="flex-1">{c.description}{Number(c.quantity) !== 1 ? ` × ${Number(c.quantity)}` : ''}
                  {c.voided && <span className="ml-2 text-xs no-underline">{tx('(anulado:')} {c.voidReason})</span>}</span>
                <span className="tabular-nums">{money(c.amount)}</span>
                {!c.voided && can('PAYMENTS:REVERSE') && (
                  <button className="btn-ghost btn-sm !px-2" aria-label={tx('Anular cargo')} title={tx('Anular cargo')} onClick={() => setDialog({ void: c })}><Ban className="h-3.5 w-3.5" /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dialog === 'pay' && <PayDialog r={r} onClose={() => setDialog(null)} onDone={(d) => { setDialog(null); onChange(d) }} />}
      {dialog === 'link' && <LinkDialog r={r} onClose={(created) => { setDialog(null); if (created === true) onChange(null) }} />}
      {dialog === 'charge' && <ChargeDialog r={r} onClose={() => setDialog(null)} onDone={(d) => { setDialog(null); onChange(d) }} />}
      {dialog === 'refund' && <RefundDialog r={r} onClose={() => setDialog(null)} onDone={(d) => { setDialog(null); onChange(d) }} />}
      {dialog?.reverse && <ReasonDialog title={tx('Reversar pago')} icon={RotateCcw} tone="danger" confirm={tx('Reversar')}
        message={tx('Se registrará un reverso por {0} ({1}). El pago original no se borra.{2}', money(dialog.reverse.amount), METHODS[dialog.reverse.method].label, dialog.reverse.method === 'CASH' ? tx(' El efectivo sale de tu caja.') : '')}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => { onChange(await stayApi.reverse(s.id, dialog.reverse.id, reason)); toast.success(tx('Pago reversado')); setDialog(null) }} />}
      {dialog?.void && <ReasonDialog title={tx('Anular cargo')} icon={Ban} tone="danger" confirm={tx('Anular')}
        message={tx('El cargo "{0}" por {1} quedará anulado (no se borra).', dialog.void.description, money(dialog.void.amount))}
        onClose={() => setDialog(null)}
        onSubmit={async (reason) => { onChange(await stayApi.voidCharge(s.id, dialog.void.id, reason)); toast.success(tx('Cargo anulado')); setDialog(null) }} />}
    </section>
  )
}

function Figure({ label, value, tone = '', hint }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-display text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

/* ── Cobrar ─────────────────────────────────────────────────────────────────────── */

function PayDialog({ r, onClose, onDone }) {
  const toast = useToast()
  const balance = Number(r.account.balance)
  const deposit = Number(r.account.depositPending)
  const [form, setForm] = useState({ method: 'CASH', amount: balance.toFixed(2), reference: '', cardLast4: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const key = useMemo(() => newIdempotencyKey(), [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async () => {
    const e = {}
    const amount = Number(form.amount)
    if (!amount || amount <= 0) e.amount = tx('Indica el importe')
    else if (amount > balance) e.amount = tx('No puede exceder el saldo ({0})', money(balance))
    if (form.method === 'TRANSFER' && !form.reference.trim()) e.reference = tx('Escribe la referencia o clave de rastreo')
    if (form.method === 'CARD' && !form.reference.trim() && !form.cardLast4) e.reference = tx('Número de autorización o últimos 4 dígitos')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onDone(await stayApi.pay(r.summary.id, { ...form, reference: form.reference.trim() || null, cardLast4: form.cardLast4 || null, notes: form.notes.trim() || null }, key))
      toast.success(tx('Pago registrado'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Registrar cobro')} icon={Wallet} description={tx('Saldo pendiente: {0}', money(balance))}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Cobrar')} {form.amount ? money(form.amount) : ''}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tx('Método de pago')}>
          {['CASH', 'CARD', 'TRANSFER'].map((m) => {
            const Icon = METHODS[m].icon
            return (
              <button key={m} type="button" role="radio" aria-checked={form.method === m} onClick={() => setForm({ ...form, method: m })}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-sm font-medium ring-1 transition ${form.method === m ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
                <Icon className="h-5 w-5" />{METHODS[m].label}
              </button>
            )
          })}
        </div>
        <div>
          <Input label={tx('Importe (MXN)')} inputMode="decimal" value={form.amount} error={errors.amount} onChange={(e) => setForm({ ...form, amount: moneyInput(e.target.value) })} />
          <div className="mt-2 flex gap-2">
            <button type="button" className="chip bg-slate-100 dark:bg-white/5" onClick={() => setForm({ ...form, amount: balance.toFixed(2) })}>{tx('Saldo completo')}</button>
            {deposit > 0 && deposit < balance && <button type="button" className="chip bg-slate-100 dark:bg-white/5" onClick={() => setForm({ ...form, amount: deposit.toFixed(2) })}>{tx('Anticipo')} {money(deposit)}</button>}
          </div>
        </div>
        {form.method === 'CARD' && (
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Input label={tx('Autorización del voucher')} value={form.reference} error={errors.reference} maxLength={100} onChange={set('reference')} />
            <Input label={tx('Últimos 4')} inputMode="numeric" value={form.cardLast4} maxLength={4} error={errors.cardLast4}
              onChange={(e) => setForm({ ...form, cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          </div>
        )}
        {form.method === 'TRANSFER' && <Input label={tx('Referencia / clave de rastreo')} value={form.reference} error={errors.reference} maxLength={100} onChange={set('reference')} />}
        {form.method === 'CASH' && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/[.03]">{tx('El efectivo se registra en tu caja abierta. Si no la has abierto, hazlo en')} <b>{tx('Caja')}</b>.</p>}
        <Textarea label={tx('Notas (opcional)')} rows={2} maxLength={500} value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  )
}

/* ── Enlace de pago ─────────────────────────────────────────────────────────────── */

function LinkDialog({ r, onClose }) {
  const toast = useToast()
  const balance = Number(r.account.balance)
  const [amount, setAmount] = useState(balance.toFixed(2))
  const [sendEmail, setSendEmail] = useState(!!r.contactEmail)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      const res = await stayApi.link(r.summary.id, { amount, sendEmail })
      setResult(res)
      toast.success(res.emailed ? tx('Enlace generado y enviado por correo') : tx('Enlace generado'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={() => onClose(!!result)} title={tx('Enlace de pago en línea')} icon={Link2}
      description={tx('El huésped paga en la página segura de la pasarela. El pago se confirma solo cuando la pasarela lo verifica.')}
      footer={result ? <Button onClick={() => onClose(true)}>{tx('Listo')}</Button>
        : <><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Generar enlace')}</Button></>}>
      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">
            <code className="min-w-0 flex-1 truncate text-xs">{result.url}</code>
            <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(result.url).then(() => toast.success(tx('Enlace copiado')))}><Copy className="h-4 w-4" /></button>
            <a className="btn-ghost btn-sm" href={result.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </div>
          <p className="text-sm text-slate-500">{tx('Importe')} {money(result.amount)} {tx('· vence')} {formatDateTime(result.expiresAt)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label={tx('Importe (MXN)')} inputMode="decimal" value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} hint={tx('Saldo pendiente: {0}', money(balance))} />
          {r.contactEmail && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>{tx('Enviar por correo a')} <b>{r.contactEmail}</b></span>
              <Switch checked={sendEmail} onChange={setSendEmail} label={tx('Enviar por correo')} />
            </label>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ── Cargo ──────────────────────────────────────────────────────────────────────── */

function ChargeDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const [catalog, setCatalog] = useState([])
  const [form, setForm] = useState({ serviceId: '', description: '', quantity: '1', unitPrice: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = can('RATES:VIEW') ? ratesApi.services().then((l) => l.filter((x) => x.active)) : publicApi.services()
    load.then(setCatalog).catch(() => setCatalog([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = (id) => {
    const svc = catalog.find((c) => String(c.id) === id)
    setForm(svc ? { ...form, serviceId: id, description: svc.name, unitPrice: String(svc.price) } : { ...form, serviceId: '' })
  }
  const total = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0)

  const submit = async () => {
    const e = {}
    if (!form.description.trim()) e.description = tx('Describe el cargo')
    if (!(Number(form.quantity) > 0)) e.quantity = tx('Cantidad inválida')
    if (form.unitPrice === '' || Number(form.unitPrice) < 0) e.unitPrice = tx('Precio inválido')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onDone(await stayApi.addCharge(r.summary.id, { serviceId: form.serviceId ? Number(form.serviceId) : null, description: form.description.trim(), quantity: form.quantity, unitPrice: form.unitPrice }))
      toast.success(tx('Cargo agregado a la cuenta'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Agregar cargo a la cuenta')} icon={Receipt} description={tx('Consumos, servicios o daños durante la estancia. Importe final con impuestos.')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving} onClick={submit}>{tx('Agregar')} {total > 0 ? money(total) : ''}</Button></>}>
      <div className="space-y-4">
        {catalog.length > 0 && (
          <Select label={tx('Servicio del catálogo (opcional)')} value={form.serviceId} onChange={(e) => pick(e.target.value)}>
            <option value="">{tx('Cargo libre')}</option>
            {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} · {money(c.price)}</option>)}
          </Select>
        )}
        <Input label={tx('Descripción')} value={form.description} error={errors.description} maxLength={150} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={tx('Cantidad')} inputMode="decimal" value={form.quantity} error={errors.quantity} onChange={(e) => setForm({ ...form, quantity: moneyInput(e.target.value).slice(0, 6) })} />
          <Input label={tx('Precio unitario (MXN)')} inputMode="decimal" value={form.unitPrice} error={errors.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: moneyInput(e.target.value) })} />
        </div>
      </div>
    </Modal>
  )
}

/* ── Reembolso ──────────────────────────────────────────────────────────────────── */

function RefundDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const a = r.account
  const credit = Math.max(0, -Number(a.balance))
  const online = a.payments.filter((p) => p.kind === 'PAYMENT' && p.status === 'COMPLETED' && p.method === 'ONLINE' && Number(p.remaining) > 0)
  const [form, setForm] = useState({ method: online.length ? 'ONLINE' : 'CASH', amount: (credit || 0).toFixed(2), relatedPaymentId: online[0]?.id ? String(online[0].id) : '', reference: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const extraordinary = Number(form.amount) > credit

  const submit = async () => {
    const e = {}
    if (!(Number(form.amount) > 0)) e.amount = tx('Indica el importe')
    else if (Number(form.amount) > Number(a.paid)) e.amount = tx('No puede exceder lo cobrado ({0})', money(a.paid))
    if (!form.reason.trim()) e.reason = tx('Indica el motivo')
    if (form.method === 'ONLINE' && !form.relatedPaymentId) e.relatedPaymentId = tx('Elige el pago en línea')
    if (form.method === 'TRANSFER' && !form.reference.trim()) e.reference = tx('Escribe la referencia')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      onDone(await stayApi.refund(r.summary.id, {
        method: form.method, amount: form.amount, reason: form.reason.trim(), reference: form.reference.trim() || null,
        relatedPaymentId: form.method === 'ONLINE' ? Number(form.relatedPaymentId) : null,
      }))
      toast.success(tx('Reembolso registrado'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Reembolsar al huésped')} icon={Undo2}
      description={credit > 0 ? tx('Saldo a favor según la cuenta: {0}', money(credit)) : tx('La cuenta no tiene saldo a favor del huésped.')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button variant="danger" loading={saving} onClick={submit}>{tx('Reembolsar')} {Number(form.amount) > 0 ? money(form.amount) : ''}</Button></>}>
      <div className="space-y-4">
        <Select label={tx('Cómo se devuelve')} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          {online.length > 0 && <option value="ONLINE">{tx('A la tarjeta (por la pasarela)')}</option>}
          <option value="CASH">{tx('Efectivo (sale de tu caja)')}</option>
          <option value="TRANSFER">{tx('Transferencia')}</option>
          <option value="CARD">{tx('Terminal de tarjeta')}</option>
        </Select>
        {form.method === 'ONLINE' && (
          <Select label={tx('Pago en línea')} value={form.relatedPaymentId} error={errors.relatedPaymentId} onChange={(e) => setForm({ ...form, relatedPaymentId: e.target.value })}>
            {online.map((p) => <option key={p.id} value={p.id}>{formatDateTime(p.completedAt)} · {money(p.amount)} {tx('(disponible')} {money(p.remaining)})</option>)}
          </Select>
        )}
        <Input label={tx('Importe (MXN)')} inputMode="decimal" value={form.amount} error={errors.amount} onChange={(e) => setForm({ ...form, amount: moneyInput(e.target.value) })} />
        {extraordinary && Number(form.amount) > 0 && (
          <p className={`rounded-xl p-3 text-xs ${can('PAYMENTS:REFUND_EXTRAORDINARY') ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
            {can('PAYMENTS:REFUND_EXTRAORDINARY') ? tx('Reembolso fuera de política: quedará registrado como extraordinario en auditoría.')
              : tx('Este importe excede el saldo a favor: requiere un usuario con permiso de reembolsos extraordinarios.')}
          </p>
        )}
        {['TRANSFER', 'CARD'].includes(form.method) && <Input label={tx('Referencia')} value={form.reference} error={errors.reference} maxLength={100} onChange={(e) => setForm({ ...form, reference: e.target.value })} />}
        <Textarea label={tx('Motivo')} required rows={2} maxLength={500} value={form.reason} error={errors.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
    </Modal>
  )
}

/* ── Motivo genérico (reverso, anulación) ───────────────────────────────────────── */

export function ReasonDialog({ title, icon, message, confirm, tone = 'primary', onClose, onSubmit, children }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!reason.trim()) { setError(tx('Indica el motivo')); return }
    setSaving(true)
    try {
      await onSubmit(reason.trim())
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={title} icon={icon}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Volver')}</Button><Button variant={tone} loading={saving} onClick={submit}>{confirm}</Button></>}>
      <div className="space-y-4 text-sm">
        {message && <p className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">{message}</p>}
        {children}
        <Textarea label={tx('Motivo')} required rows={2} maxLength={500} value={reason} error={error} onChange={(e) => { setReason(e.target.value); setError('') }} />
      </div>
    </Modal>
  )
}
