import { ArrowRight, BedDouble, CalendarCheck2, CreditCard, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from '../../router'
import { LanguageToggle, NexoraMark, ThemeToggle } from '../../components/ui'
import { tx } from '../../i18n'

const FEATURES = [
  [ShieldCheck, tx('Permisos a la medida'), tx('Cada rol ve y hace solo lo que el administrador decide, sin tocar código.')],
  [Lock, tx('Cada hotel, aislado'), tx('Usuarios, huéspedes y datos de un hotel nunca son visibles para otro.')],
  [CalendarCheck2, tx('Reservaciones sin choques'), tx('Disponibilidad real con protección contra dobles reservaciones.')],
  [CreditCard, tx('Cobros trazables'), tx('Pagos en recepción y en línea con historial que no se borra.')],
]

/** Portada de la plataforma (raíz del sitio). Los hoteles viven en /h/<slug>. */
export default function PlatformLandingPage() {
  return (
    <div className="aurora grain relative min-h-screen overflow-hidden text-white">
      <div className="grid-lines absolute inset-0" />
      <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl animate-float" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <NexoraMark className="h-10 w-10" />
          <span className="font-display text-xl font-semibold">{tx('Nexora')} <span className="text-gold-400">{tx('Hotel')}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle dark />
          <ThemeToggle className="text-white/70 hover:text-white" />
          <Link to="/login" className="btn-secondary !bg-white/10 !text-white !ring-white/15 hover:!bg-white/15">{tx('Acceso Nexora')}</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 lg:pt-24">
        <div className="max-w-3xl animate-fade-up">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-gold-300 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> {tx('Plataforma de gestión hotelera')}
          </p>
          <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl">
            {tx('La operación de tu hotel,')}<br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-gold-300 bg-clip-text italic text-transparent">{tx('en perfecto orden.')}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg text-white/70">
            {tx('Recepción, reservaciones, habitaciones y cobros en un solo sistema. Cada hotel con su propio equipo, su propia marca y sus datos protegidos.')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/login" className="btn-gold btn-lg">{tx('Entrar a la plataforma')} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([Icon, title, text], i) => (
            <div key={title} className="glass rounded-3xl p-6 transition hover:bg-white/[.09] animate-fade-up" style={{ animationDelay: `${120 + i * 80}ms` }}>
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/30 to-brand-700/30 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-brand-200" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-white/60">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex items-center gap-3 text-sm text-white/50">
          <BedDouble className="h-4 w-4" />
          {tx('¿Trabajas en un hotel? Entra con el enlace que te compartió tu administrador.')}
        </div>
      </main>
    </div>
  )
}
