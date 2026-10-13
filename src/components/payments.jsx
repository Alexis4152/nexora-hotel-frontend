import { Banknote, CreditCard, Globe, Landmark } from 'lucide-react'
import { Badge } from './ui'
import { tx } from '../i18n'

export const METHODS = {
  CASH: { label: tx('Efectivo'), icon: Banknote },
  CARD: { label: tx('Tarjeta'), icon: CreditCard },
  TRANSFER: { label: tx('Transferencia'), icon: Landmark },
  ONLINE: { label: tx('En línea'), icon: Globe },
}

export const KINDS = { PAYMENT: tx('Pago'), REFUND: tx('Reembolso'), REVERSAL: tx('Reverso') }

export const PAYMENT_STATUS = {
  PENDING: { label: tx('Pendiente'), tone: 'amber' },
  COMPLETED: { label: tx('Aplicado'), tone: 'green' },
  FAILED: { label: tx('Fallido'), tone: 'red' },
  CANCELLED: { label: tx('Cancelado'), tone: 'slate' },
}

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'slate' }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}

export function MethodLabel({ method, last4 }) {
  const m = METHODS[method] || { label: method, icon: Banknote }
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />{m.label}{last4 ? <span className="text-slate-400">···· {last4}</span> : null}
    </span>
  )
}

/** Llave única por intento de cobro: si la petición se repite, el backend devuelve el mismo pago. */
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
