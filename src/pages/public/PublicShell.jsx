import { useState } from 'react'
import { LayoutDashboard, Minus, Plus, Search, Ticket, UserRound } from 'lucide-react'
import { Link, useNavigate } from '../../router'
import { useHotel } from '../../context/HotelContext'
import { isGuestOnly, useAuth } from '../../context/AuthContext'
import { HotelLogo, LanguageToggle, ThemeToggle } from '../../components/ui'
import { addDays, todayIn } from '../../components/reservations'
import { tx } from '../../i18n'

/** Marco de las pantallas públicas de reservación: barra con la identidad del hotel y pie discreto. */
export default function PublicShell({ children }) {
  const { hotel } = useHotel()
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <HotelLogo hotel={hotel} className="h-9 w-9" />
            <span className="truncate font-display text-lg font-semibold">{hotel.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <AccountLink user={user} />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-slate-200/70 py-6 text-center text-xs text-slate-400 dark:border-white/[.06]">
        {hotel.name}{hotel.phone ? ` · ${hotel.phone}` : ''}{hotel.contactEmail ? ` · ${hotel.contactEmail}` : ''}
        <span className="mx-2">·</span><Link to="/politicas" className="hover:underline">{tx('Políticas y privacidad')}</Link>
      </footer>
    </div>
  )
}

/** Buscador de fechas y huéspedes. Lleva a /reservar con la búsqueda en la URL (se puede compartir). */
export function SearchWidget({ initial, dark, onSearch }) {
  const { hotel } = useHotel()
  const navigate = useNavigate()
  const today = todayIn(hotel.timezone)
  const [v, setV] = useState(initial || { checkIn: today, checkOut: addDays(today, 1), adults: 2, children: 0 })
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!v.checkIn || !v.checkOut || v.checkOut <= v.checkIn) { setError(tx('La salida debe ser posterior a la llegada')); return }
    if (v.checkIn < today) { setError(tx('La llegada no puede ser en el pasado')); return }
    setError('')
    const qs = new URLSearchParams({ entrada: v.checkIn, salida: v.checkOut, adultos: v.adults, menores: v.children })
    if (onSearch) onSearch(v)
    navigate(`/reservar?${qs}`)
  }

  const field = `rounded-xl px-3 py-2 ${dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-slate-50 ring-1 ring-slate-200 dark:bg-white/[.04] dark:ring-white/10'}`
  const label = `block text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-slate-500'}`
  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_.8fr_.8fr_auto]" aria-label={tx('Buscar disponibilidad')}>
      <label className={field}><span className={label}>{tx('Llegada')}</span>
        <input type="date" required min={today} value={v.checkIn} className="w-full bg-transparent text-sm font-semibold outline-none [color-scheme:light] dark:[color-scheme:dark]"
          onChange={(e) => { const checkIn = e.target.value; setV({ ...v, checkIn, checkOut: v.checkOut <= checkIn ? addDays(checkIn, 1) : v.checkOut }) }} />
      </label>
      <label className={field}><span className={label}>{tx('Salida')}</span>
        <input type="date" required min={v.checkIn ? addDays(v.checkIn, 1) : today} value={v.checkOut} className="w-full bg-transparent text-sm font-semibold outline-none [color-scheme:light] dark:[color-scheme:dark]"
          onChange={(e) => setV({ ...v, checkOut: e.target.value })} />
      </label>
      <Stepper className={field} labelClass={label} label={tx('Adultos')} value={v.adults} min={1} onChange={(n) => setV({ ...v, adults: n })} />
      <Stepper className={field} labelClass={label} label={tx('Menores')} value={v.children} min={0} onChange={(n) => setV({ ...v, children: n })} />
      <button type="submit" className="btn-gold h-auto min-h-[44px] self-end px-6 sm:col-span-2 lg:col-span-1"><Search className="h-4 w-4" /> {tx('Buscar')}</button>
      {error && <p className="text-sm font-medium text-rose-400 sm:col-span-2 lg:col-span-5" role="alert">{error}</p>}
    </form>
  )
}

function Stepper({ className, labelClass, label, value, min, onChange }) {
  const btn = 'grid h-7 w-7 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10'
  return (
    <div className={className}>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center justify-between">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={tx('Menos {0}', label.toLowerCase())}><Minus className="h-3.5 w-3.5" /></button>
        <span className="text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" className={btn} disabled={value >= 20} onClick={() => onChange(value + 1)} aria-label={tx('Más {0}', label.toLowerCase())}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

/** Acceso a la cuenta: huésped → Mi cuenta; personal → Panel; visitante → Mi reservación + Entrar. */
export function AccountLink({ user, dark }) {
  const cls = dark ? 'btn-secondary btn-sm !bg-white/10 !text-white !ring-white/20 hover:!bg-white/20' : 'btn-secondary btn-sm'
  if (user && isGuestOnly(user)) return <Link to="/cuenta" className={cls}><UserRound className="h-4 w-4" /> <span className="hidden sm:inline">{tx('Mi cuenta')}</span></Link>
  if (user) return <Link to="/panel" className={cls}><LayoutDashboard className="h-4 w-4" /> {tx('Panel')}</Link>
  return (
    <>
      <Link to="/mi-reservacion" className={`btn-ghost btn-sm ${dark ? 'text-white/80 hover:text-white' : ''}`}><Ticket className="h-4 w-4" /> <span className="hidden sm:inline">{tx('Mi reservación')}</span></Link>
      <Link to="/cuenta/entrar" className={cls}><UserRound className="h-4 w-4" /> {tx('Entrar')}</Link>
    </>
  )
}
