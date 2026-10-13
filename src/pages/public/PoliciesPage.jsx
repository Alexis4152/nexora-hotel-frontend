import { useEffect, useState } from 'react'
import { Baby, CalendarX2, Clock, FileText, PawPrint, RefreshCcw, ShieldCheck, Wallet } from 'lucide-react'
import PublicShell from './PublicShell'
import { publicApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { Skeleton } from '../../components/ui'
import { money } from '../../utils/money'
import { tx } from '../../i18n'

const PENALTY = {
  NONE: () => tx('sin penalización'),
  FIRST_NIGHT: () => tx('se cobra la primera noche'),
  PERCENT: (v) => tx('se cobra el {0} % del total', Number(v)),
  FIXED: (v, c) => tx('se cobra {0}', money(v, c)),
}
const penaltyText = (type, value, currency) => (PENALTY[type] || PENALTY.NONE)(value, currency)

/** Políticas vigentes del hotel (las mismas que el huésped acepta al reservar) y aviso de privacidad. */
export default function PoliciesPage() {
  const { hotel } = useHotel()
  const [p, setP] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => { publicApi.policies().then((r) => setP(r.values)).catch(() => setError(true)) }, [])

  useEffect(() => {
    if (p && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [p])

  if (error) return <PublicShell><div className="card p-10 text-center text-slate-500">{tx('No pudimos cargar las políticas. Intenta más tarde.')}</div></PublicShell>
  if (!p) return <PublicShell><Skeleton className="h-96" /></PublicShell>
  const c = hotel.currency
  const highlights = [
    [CalendarX2, tx('Cancelación'), p.freeCancelHours > 0
      ? tx('Sin costo hasta {0} h antes de la llegada; después {1}.', p.freeCancelHours, penaltyText(p.lateCancelPenaltyType, p.lateCancelPenaltyValue, c))
      : tx('Al cancelar {0}.', penaltyText(p.lateCancelPenaltyType, p.lateCancelPenaltyValue, c))],
    [Wallet, tx('Anticipo'), Number(p.depositPercent) > 0 ? tx('{0} % del total para garantizar la reservación.', Number(p.depositPercent)) : tx('No se requiere anticipo.')],
    [Clock, tx('No presentarse'), tx('Si no llegas y no cancelas, {0}.', penaltyText(p.noShowPenaltyType, p.noShowPenaltyValue, c))],
    [PawPrint, tx('Mascotas'), p.petsAllowed ? (p.petsPolicy || tx('Son bienvenidas.')) : tx('No se admiten mascotas.')],
  ]
  const texts = [
    ['menores', Baby, tx('Menores'), p.childrenPolicy],
    ['reembolsos', RefreshCcw, tx('Reembolsos'), p.refundPolicy],
    ['cambios', CalendarX2, tx('Cambios de fecha'), p.dateChangePolicy],
    ['terminos', FileText, tx('Términos y condiciones'), p.terms],
    ['privacidad', ShieldCheck, tx('Aviso de privacidad'), p.privacyNotice],
  ].filter(([, , , t]) => t && t.trim())

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{tx('Políticas de')} {hotel.name}</h1>
        <p className="mt-2 text-slate-500">{tx('Son las condiciones vigentes. Cada reservación conserva las que aceptaste al hacerla.')}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {highlights.map(([Icon, title, text]) => (
            <div key={title} className="card p-5">
              <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-8">
          {texts.map(([anchor, Icon, title, text]) => (
            <section key={anchor} id={anchor} className="scroll-mt-24">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><Icon className="h-5 w-5 text-brand-600" /> {title}</h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
            </section>
          ))}
          {!texts.some(([a]) => a === 'privacidad') && (
            <section id="privacidad" className="scroll-mt-24 rounded-2xl bg-slate-100/70 p-5 text-sm text-slate-500 dark:bg-white/[.03]">
              {tx('El hotel aún no publica su aviso de privacidad completo. Si tienes dudas sobre el uso de tus datos, contáctalo directamente.')}
            </section>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
