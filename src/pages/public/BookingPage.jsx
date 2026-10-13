import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, BedDouble, Building2, Check, CreditCard, Lock, Ruler, ShieldCheck, Users } from 'lucide-react'
import PublicShell, { SearchWidget } from './PublicShell'
import { Link, useNavigate } from '../../router'
import { isGuestOnly, useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { accountApi, bookingApi, publicApi } from '../../api'
import { errorMessage, fieldErrors } from '../../api/client'
import { Button, Modal, Spinner } from '../../components/ui'
import { BED_TYPES, CHARGE_MODES, DynamicIcon, Textarea } from '../../components/catalog'
import { Counter, GuestFields, addDays, emptyGuest, fmtDate, guestErrors, nightsBetween, todayIn } from '../../components/reservations'
import { money } from '../../utils/money'
import { hotelPath } from '../../tenant'
import { RETURN_KEY } from './PaymentReturnPage'
import { tx } from '../../i18n'

const PENALTY_TEXT = {
  NONE: () => tx('sin penalización'),
  FIRST_NIGHT: () => tx('se cobra la primera noche'),
  PERCENT: (v) => tx('se cobra el {0}% del total', Number(v)),
  FIXED: (v, c) => tx('se cobra {0}', money(v, c)),
}

function readSearch(params, today) {
  const iso = /^\d{4}-\d{2}-\d{2}$/
  const checkIn = iso.test(params.get('entrada') || '') ? params.get('entrada') : today
  let checkOut = iso.test(params.get('salida') || '') ? params.get('salida') : addDays(checkIn, 1)
  if (checkOut <= checkIn) checkOut = addDays(checkIn, 1)
  const clamp = (v, min, def) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(20, Math.max(min, n)) : def }
  return { checkIn, checkOut, adults: clamp(params.get('adultos'), 1, 2), children: clamp(params.get('menores'), 0, 0) }
}

export default function BookingPage() {
  const { hotel } = useHotel()
  const [params] = useSearchParams()
  const today = todayIn(hotel.timezone)
  const search = useMemo(() => readSearch(params, today), [params, today])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [reload, setReload] = useState(0)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setResult(null); setError(''); setSelected(null)
    bookingApi.availability(search).then(setResult).catch((e) => setError(errorMessage(e)))
  }, [search, reload])

  /** La habitación elegida se ocupó mientras el huésped capturaba sus datos: se vuelve a consultar la disponibilidad. */
  const unavailable = (message) => {
    setNotice(message)
    setReload((n) => n + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PublicShell>
      {selected ? (
        <GuestStep search={search} option={selected} onBack={() => setSelected(null)} onUnavailable={unavailable} />
      ) : (
        <>
          {notice && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-400/20" role="alert">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1"><p className="font-semibold">{tx('La disponibilidad cambió')}</p><p>{notice} {tx('Te mostramos las opciones actualizadas; tus datos no se guardaron todavía.')}</p></div>
              <button className="text-amber-700 hover:underline" onClick={() => setNotice('')}>{tx('Entendido')}</button>
            </div>
          )}
          <div className="mb-8 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200/70 dark:bg-white/[.03] dark:ring-white/[.06]">
            <SearchWidget key={`${search.checkIn}${search.checkOut}${search.adults}${search.children}`} initial={search} />
          </div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{tx('Elige tu habitación')}</h1>
              <p className="text-sm text-slate-500">
                {fmtDate(search.checkIn, { weekday: 'short', day: 'numeric', month: 'long' })} → {fmtDate(search.checkOut, { weekday: 'short', day: 'numeric', month: 'long' })}
                {' · '}{nightsBetween(search.checkIn, search.checkOut)} {tx('noche(s) ·')} {search.adults} {tx('adulto(s)')}{search.children ? ` · ${search.children} menor(es)` : ''}
              </p>
            </div>
            <p className="text-xs text-slate-500">{tx('Precios totales con impuestos incluidos.')}</p>
          </div>
          {error ? (
            <div className="card p-10 text-center"><p className="font-semibold">{error}</p><p className="mt-1 text-sm text-slate-500">{tx('Ajusta las fechas e intenta de nuevo.')}</p></div>
          ) : !result ? (
            <div className="grid place-items-center py-24"><Spinner className="h-7 w-7" /></div>
          ) : (
            <Results result={result} currency={hotel.currency} onSelect={setSelected} />
          )}
        </>
      )}
    </PublicShell>
  )
}

function Results({ result, currency, onSelect }) {
  const bookable = result.options.filter((o) => o.availableRooms > 0 && o.fitsGuests)
  const others = result.options.filter((o) => !(o.availableRooms > 0 && o.fitsGuests))
  if (bookable.length === 0) {
    return (
      <div className="card p-12 text-center">
        <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 font-display text-xl font-semibold">{tx('No hay habitaciones disponibles para esas fechas')}</p>
        <p className="mt-1 text-sm text-slate-500">{tx('Prueba con otras fechas o con menos huéspedes por habitación.')}</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {bookable.map((o, i) => <OptionCard key={o.roomTypeId} o={o} currency={currency} onSelect={onSelect} delay={i * 70} />)}
      {others.length > 0 && (
        <div className="pt-4">
          <p className="mb-3 text-sm font-semibold text-slate-500">{tx('No disponibles para tu búsqueda')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((o) => (
              <div key={o.roomTypeId} className="flex items-center gap-3 rounded-2xl bg-white p-3 opacity-60 ring-1 ring-slate-200 dark:bg-white/[.03] dark:ring-white/10">
                <BedDouble className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-sm font-medium">{o.name}</span>
                <span className="text-xs text-slate-500">{!o.fitsGuests ? tx('Máx. {0} adultos / {1} menores', o.maxAdults, o.maxChildren) : tx('Agotada')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OptionCard({ o, currency, onSelect, delay }) {
  return (
    <article className="card grid overflow-hidden animate-fade-up md:grid-cols-[320px_1fr]" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-[4/3] bg-slate-100 md:aspect-auto dark:bg-white/5">
        {o.imageUrl ? <img src={o.imageUrl} alt={o.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          : <BedDouble className="absolute inset-0 m-auto h-10 w-10 text-slate-300" />}
        {o.availableRooms <= 3 && <span className="absolute left-3 top-3 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-semibold text-gold-300 backdrop-blur">{tx('¡Quedan')} {o.availableRooms}!</span>}
      </div>
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row">
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold">{o.name}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{o.maxAdults} {tx('adultos ·')} {o.maxChildren} {tx('menores')}</span>
            <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{o.bedCount} × {BED_TYPES[o.bedType] || o.bedType}</span>
            {o.sizeM2 && <span className="inline-flex items-center gap-1.5"><Ruler className="h-4 w-4" />{Number(o.sizeM2)} {tx('m²')}</span>}
          </div>
          {o.description && <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{o.description}</p>}
          {o.amenities?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {o.amenities.slice(0, 8).map((a) => <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs dark:bg-white/5">{a}</span>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-slate-100 pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right dark:border-white/[.06]">
          <div>
            <p className="text-xs text-slate-500">{o.nights.length} {tx('noche(s) · prom.')} {money(o.averageNight, currency)}</p>
            <p className="font-display text-3xl font-semibold tabular-nums">{money(o.total, currency)}</p>
            <p className="text-xs text-slate-500">{tx('incluye')} {money(o.taxes, currency)} {tx('de impuestos')}</p>
          </div>
          <button className="btn-primary w-full" onClick={() => onSelect(o)}>{tx('Reservar')}</button>
        </div>
      </div>
    </article>
  )
}

/* ── Datos del huésped ──────────────────────────────────────────────────────────── */

function GuestStep({ search, option, onBack, onUnavailable }) {
  const { hotel } = useHotel()
  const { user } = useAuth()
  const signedIn = isGuestOnly(user)
  const navigate = useNavigate()
  const [payChoice, setPayChoice] = useState('ONLINE')
  const [guest, setGuest] = useState(emptyGuest())
  const [catalog, setCatalog] = useState([])
  const [units, setUnits] = useState({})
  const [requests, setRequests] = useState('')
  const [accept, setAccept] = useState({ terms: false, privacy: false })
  const [honeypot, setHoneypot] = useState('')
  const [policy, setPolicy] = useState(null)
  const [payment, setPayment] = useState(null)
  const [reading, setReading] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0 })
    publicApi.services().then(setCatalog).catch(() => setCatalog([]))
    publicApi.policies().then((p) => setPolicy(p.values)).catch(() => setPolicy(null))
    bookingApi.paymentOptions().then(setPayment).catch(() => setPayment(null))
    if (signedIn) {
      // Con sesión, los datos salen del perfil y la reservación queda en "Mis reservaciones".
      accountApi.profile().then((p) => setGuest({ firstName: p.firstName, lastName: p.lastName, email: p.email,
        phoneCountryCode: p.phoneCountryCode || '52', phone: p.phone || '', country: p.country || 'MX' })).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onlineAvailable = !!(payment?.online && policy && Number(policy.depositPercent) > 0)
  const payOnline = onlineAvailable && payChoice === 'ONLINE'

  const submit = async (e) => {
    e.preventDefault()
    const errs = guestErrors(guest, { requireEmail: true })
    if (!accept.terms) errs.acceptTerms = tx('Debes aceptar las políticas del hotel')
    if (!accept.privacy) errs.acceptPrivacy = tx('Debes aceptar el aviso de privacidad')
    setErrors(errs)
    setFormError('')
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const created = await bookingApi.create({
        roomTypeId: option.roomTypeId, ...search,
        guest: { ...guest, firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim(), phone: guest.phone || null },
        services: Object.entries(units).filter(([, u]) => u > 0).map(([serviceId, u]) => ({ serviceId: Number(serviceId), units: u })),
        specialRequests: requests.trim() || null, acceptTerms: accept.terms, acceptPrivacy: accept.privacy, website: honeypot,
        payOnline: onlineAvailable ? payOnline : null,
      })
      const manage = { pathname: `/reservacion/${created.folio}`, hash: created.accessToken }
      if (created.paymentRequired) {
        // El anticipo se paga en la página segura de la pasarela; al volver, el servidor verifica el pago con ella.
        try {
          const start = await bookingApi.pay(created.folio, created.accessToken, 'DEPOSIT')
          try {
            sessionStorage.setItem(RETURN_KEY, signedIn ? hotelPath(`/cuenta/reservaciones/${created.folio}`)
              : `${hotelPath(manage.pathname)}#${created.accessToken}`)
          } catch { /* sin almacenamiento: el enlace del correo sigue funcionando */ }
          window.location.assign(start.url)
          return
        } catch {
          // Si la pasarela no responde, el huésped puede reintentar el pago desde su reservación.
        }
      }
      navigate(signedIn ? `/cuenta/reservaciones/${created.folio}` : manage, { state: { created: true } })
    } catch (err) {
      if (err?.response?.status === 409) {
        onUnavailable(errorMessage(err))
        return
      }
      const fe = fieldErrors(err)
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k.replace(/^guest\./, ''), v])))
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const freeHours = policy?.freeCancelHours
  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <button type="button" onClick={onBack} className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" /> {tx('Cambiar habitación')}</button>
        <section className="card p-6">
          <h2 className="mb-1 font-display text-xl font-semibold">{tx('Tus datos')}</h2>
          <p className="mb-5 text-sm text-slate-500">
            {signedIn ? tx('Usamos los datos de tu cuenta; la reservación aparecerá en "Mis reservaciones".')
              : <>{tx('Te enviaremos la confirmación y el enlace para consultar tu reservación. ¿Tienes cuenta?')} <Link to="/cuenta/entrar" state={{ from: `/reservar${window.location.search}` }} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{tx('Inicia sesión')}</Link></>}
          </p>
          <GuestFields value={guest} onChange={setGuest} errors={errors} requireEmail />
          {/* Campo trampa para bots: invisible y fuera del orden de tabulación. */}
          <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off"
            className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
        </section>
        {catalog.length > 0 && (
          <section className="card p-6">
            <h2 className="mb-1 font-display text-xl font-semibold">{tx('Mejora tu estancia')}</h2>
            <p className="mb-5 text-sm text-slate-500">{tx('Opcional. El importe final se calcula con impuestos al confirmar.')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.map((s) => (
                <div key={s.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 transition ${units[s.id] ? 'bg-brand-50/60 ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-400/30' : 'ring-slate-200 dark:ring-white/10'}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><DynamicIcon name={s.icon} className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">{money(s.price, hotel.currency)} · {CHARGE_MODES[s.chargeMode]}</p>
                  </div>
                  <div className="w-28"><Counter bare label={s.name} value={units[s.id] || 0} min={0} max={20} onChange={(v) => setUnits({ ...units, [s.id]: v })} /></div>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="card p-6">
          <Textarea label={tx('Solicitudes especiales (opcional)')} rows={3} maxLength={1000} value={requests} onChange={(e) => setRequests(e.target.value)}
            placeholder={tx('Hora estimada de llegada, cama extra, celebración…')} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          {option.imageUrl && <img src={option.imageUrl} alt="" className="h-40 w-full object-cover" />}
          <div className="space-y-4 p-6">
            <div>
              <p className="font-display text-xl font-semibold">{option.name}</p>
              <p className="text-sm text-slate-500">{fmtDate(search.checkIn, { day: 'numeric', month: 'short' })} → {fmtDate(search.checkOut, { day: 'numeric', month: 'short', year: 'numeric' })} · {option.nights.length} {tx('noche(s)')}</p>
              <p className="text-sm text-slate-500">{search.adults} {tx('adulto(s)')}{search.children ? ` · ${search.children} menor(es)` : ''}</p>
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-4 text-sm dark:border-white/[.06]">
              {option.nights.map((n) => (
                <div key={n.date} className="flex justify-between"><span className="text-slate-500">{fmtDate(n.date)}</span><span className="tabular-nums">{money(n.price, hotel.currency)}</span></div>
              ))}
              <div className="flex justify-between text-slate-500"><span>{tx('Impuestos')}</span><span className="tabular-nums">{money(option.taxes, hotel.currency)}</span></div>
              <div className="flex justify-between pt-2 text-base font-semibold"><span>{tx('Total hospedaje')}</span><span className="tabular-nums">{money(option.total, hotel.currency)}</span></div>
            </div>
            {policy && (
              <div className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <p>{freeHours > 0 ? tx('Cancela sin costo hasta {0} h antes de tu llegada; después {1}.', freeHours, PENALTY_TEXT[policy.lateCancelPenaltyType](policy.lateCancelPenaltyValue, hotel.currency))
                  : tx('Cancelación: {0}.', PENALTY_TEXT[policy.lateCancelPenaltyType](policy.lateCancelPenaltyValue, hotel.currency))}</p>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <Check1 checked={accept.terms} onChange={(v) => setAccept({ ...accept, terms: v })} error={errors.acceptTerms}>
                {tx('Acepto las')} <button type="button" className="font-semibold text-brand-600 underline dark:text-brand-400" onClick={() => setReading('terms')}>{tx('políticas y condiciones')}</button> {tx('del hotel')}
              </Check1>
              <Check1 checked={accept.privacy} onChange={(v) => setAccept({ ...accept, privacy: v })} error={errors.acceptPrivacy}>
                {tx('Acepto el')} <button type="button" className="font-semibold text-brand-600 underline dark:text-brand-400" onClick={() => setReading('privacy')}>{tx('aviso de privacidad')}</button>
              </Check1>
            </div>
            {onlineAvailable && (
              <fieldset className="space-y-2 border-t border-slate-100 pt-4 dark:border-white/[.06]">
                <legend className="mb-2 text-sm font-semibold">{tx('Forma de pago')}</legend>
                {[
                  ['ONLINE', CreditCard, tx('Anticipo en línea ahora'), tx('Tu reservación queda confirmada al instante de verificarse el pago.')],
                  ['HOTEL', Building2, tx('Pagar en el hotel'), tx('Sin cargo ahora; el hotel revisará y confirmará tu solicitud.')],
                ].map(([key, Icon, title, text]) => (
                  <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition ${payChoice === key ? 'bg-brand-50/60 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 dark:ring-white/10'}`}>
                    <input type="radio" name="payChoice" className="sr-only" checked={payChoice === key} onChange={() => setPayChoice(key)} />
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
                    <span className="text-sm"><b>{title}</b><span className="block text-xs text-slate-500">{text}</span></span>
                  </label>
                ))}
              </fieldset>
            )}
            {formError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{formError}</p>}
            {payOnline ? (
              <>
                <Button type="submit" loading={saving} className="w-full btn-lg"><Lock className="h-4 w-4" /> {tx('Reservar y pagar anticipo')}</Button>
                <p className="text-center text-xs text-slate-500">
                  {tx('Anticipo de')} {money(Number(option.total) * Number(policy.depositPercent) / 100, hotel.currency)} ({Number(policy.depositPercent)} {tx('%) en la página segura de Openpay')}{payment.sandbox ? tx(' (modo de pruebas)') : ''}{tx('. Tu reservación se confirma al verificarse el pago; el resto se paga en el hotel.')}
                </p>
              </>
            ) : (
              <>
                <Button type="submit" loading={saving} className="w-full btn-lg"><Lock className="h-4 w-4" /> {tx('Solicitar reservación')}</Button>
                <p className="text-center text-xs text-slate-500">{tx('No se realiza ningún cargo en este paso. El hotel confirmará tu solicitud.')}</p>
              </>
            )}
          </div>
        </div>
      </aside>
      {reading && <PolicyModal kind={reading} policy={policy} onClose={() => setReading(null)} />}
    </form>
  )
}

function Check1({ checked, onChange, error, children }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 transition ${checked ? 'bg-brand-600 text-white ring-brand-600' : error ? 'ring-rose-400' : 'ring-slate-300 dark:ring-white/20'}`}>
          {checked && <Check className="h-3.5 w-3.5" />}
        </span>
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{children}</span>
      </label>
      {error && <p className="field-error ml-7" role="alert">{error}</p>}
    </div>
  )
}

function PolicyModal({ kind, policy, onClose }) {
  const title = kind === 'terms' ? tx('Políticas y condiciones') : tx('Aviso de privacidad')
  const blocks = kind === 'terms'
    ? [[tx('Términos'), policy?.terms], [tx('Reembolsos'), policy?.refundPolicy], [tx('Cambios de fecha'), policy?.dateChangePolicy], [tx('Menores'), policy?.childrenPolicy], [tx('Mascotas'), policy?.petsPolicy]]
    : [['', policy?.privacyNotice]]
  const filled = blocks.filter(([, t]) => t && t.trim())
  return (
    <Modal open onClose={onClose} title={title} size="max-w-2xl" footer={<button className="btn-primary" onClick={onClose}>{tx('Entendido')}</button>}>
      {!policy ? <Spinner className="h-5 w-5" /> : filled.length === 0 ? (
        <p className="text-sm text-slate-500">{tx('El hotel aún no ha publicado este documento. Si tienes dudas, contáctalo antes de reservar.')}</p>
      ) : (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-2 text-sm leading-relaxed">
          {filled.map(([h, t]) => <div key={h}>{h && <p className="mb-1 font-semibold">{h}</p>}<p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{t}</p></div>)}
        </div>
      )}
    </Modal>
  )
}
