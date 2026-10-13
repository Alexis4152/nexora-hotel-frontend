import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import PublicShell from './PublicShell'
import { Link } from '../../router'
import { bookingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { money } from '../../utils/money'
import { tx } from '../../i18n'

export const RETURN_KEY = 'nx_pay_return'

/** Recuerda a qué reservación volver después de la página de pago (solo rutas internas del hotel). */
export function rememberReturn() {
  try {
    sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.hash)
  } catch { /* almacenamiento no disponible: el huésped puede volver con el enlace de su correo */ }
}

function savedReturn() {
  try {
    const v = sessionStorage.getItem(RETURN_KEY)
    const viaLink = /^\/h\/[a-z0-9-]+\/reservacion\/[A-Z0-9-]+#[A-Za-z0-9_-]+$/
    const viaAccount = /^\/h\/[a-z0-9-]+\/cuenta\/reservaciones\/[A-Z0-9-]+$/
    return v && (viaLink.test(v) || viaAccount.test(v)) ? v : null
  } catch {
    return null
  }
}

/**
 * Regreso desde la página de pago. El estado SIEMPRE lo da el servidor tras consultar a la pasarela; el navegador
 * nunca decide si se cobró. Si la pasarela aún no lo resuelve, se vuelve a preguntar unos segundos.
 */
export default function PaymentReturnPage() {
  const { ref } = useParams()
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const tries = useRef(0)
  const back = savedReturn()

  useEffect(() => {
    let timer
    const check = () => bookingApi.paymentStatus(ref).then((s) => {
      setState(s)
      if (s.status === 'PENDING' && tries.current++ < 12) timer = setTimeout(check, 4000)
    }).catch((e) => setError(errorMessage(e)))
    check()
    return () => clearTimeout(timer)
  }, [ref])

  const view = !state ? null : {
    COMPLETED: [CheckCircle2, 'from-emerald-500 to-emerald-700', tx('¡Pago recibido!'), tx('Registramos tu pago de {0}. Te enviamos el comprobante por correo.', money(state.amount, state.currency))],
    PENDING: [Clock, 'from-amber-400 to-amber-600', tx('Estamos confirmando tu pago'), tx('La pasarela aún no lo confirma. Esta página se actualiza sola; también te avisaremos por correo.')],
    FAILED: [XCircle, 'from-rose-500 to-rose-700', tx('El pago no se completó'), state.failureReason || tx('No se realizó ningún cargo. Puedes intentarlo de nuevo desde tu reservación.')],
    CANCELLED: [XCircle, 'from-slate-500 to-slate-700', tx('El pago se canceló'), tx('No se realizó ningún cargo. Puedes intentarlo de nuevo desde tu reservación.')],
  }[state.status]

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg">
        {error ? (
          <div className="card p-8 text-center"><XCircle className="mx-auto h-10 w-10 text-rose-500" /><p className="mt-3 font-semibold">{error}</p></div>
        ) : !state ? (
          <div className="card grid place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /><p className="mt-3 text-sm text-slate-500">{tx('Consultando tu pago…')}</p></div>
        ) : (
          <div className="card overflow-hidden text-center">
            <div className={`bg-gradient-to-br p-8 text-white ${view[1]}`}>
              {(() => { const Icon = view[0]; return <Icon className={`mx-auto h-12 w-12 ${state.status === 'PENDING' ? 'animate-pulse' : ''}`} /> })()}
              <h1 className="mt-4 font-display text-3xl font-semibold">{view[2]}</h1>
              <p className="mt-1 font-mono text-sm text-white/80">{tx('Reservación')} {state.folio}</p>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-slate-600 dark:text-slate-300">{view[3]}</p>
              {state.status === 'COMPLETED' && state.reservationStatus === 'CONFIRMED' && (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{tx('Tu reservación quedó confirmada.')}</p>
              )}
              {state.sandbox && <p className="text-xs text-amber-600">{tx('Hotel en modo de pruebas: no se movió dinero real.')}</p>}
              {back ? <a href={back} className="btn-primary w-full">{tx('Ver mi reservación')}</a>
                : <Link to="/mi-reservacion" className="btn-primary w-full">{tx('Consultar mi reservación')}</Link>}
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
