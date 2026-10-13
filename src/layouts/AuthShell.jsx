import { ShieldCheck, Sparkles, Building2 } from 'lucide-react'
import { HotelLogo, LanguageToggle, NexoraMark, ThemeToggle } from '../components/ui'
import { useHotel } from '../context/HotelContext'
import { Link } from '../router'
import { tx } from '../i18n'

/**
 * Pantalla dividida para acceso (login, recuperación, cambio de contraseña). A la izquierda la marca
 * (del hotel o de Nexora), a la derecha el formulario. En móvil solo el formulario con un encabezado compacto.
 */
export default function AuthShell({ hotelName, eyebrow, title, subtitle, children, footer }) {
  const hotelCtx = useHotel()
  const isHotel = !!hotelName
  const hotel = hotelCtx?.hotel || { name: hotelName }
  return (
    <div className="flex min-h-screen bg-white dark:bg-ink-950">
      <aside className="aurora grain relative hidden w-[46%] max-w-[720px] overflow-hidden text-white lg:flex lg:flex-col">
        <div className="grid-lines absolute inset-0" />
        <div className="relative z-10 flex items-center gap-3 p-10">
          {isHotel ? <HotelLogo hotel={hotel} /> : <NexoraMark className="h-10 w-10" />}
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{isHotel ? hotelName : tx('Nexora Hotel')}</p>
            <p className="text-xs text-white/60">{isHotel ? tx('Acceso del personal') : tx('Plataforma de hoteles')}</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto p-10 pb-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-300 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> {isHotel ? tx('Hospitalidad sin fricción') : tx('Operación hotelera, simplificada')}
          </p>
          <h2 className="font-display text-5xl font-medium leading-[1.05] tracking-tight xl:text-6xl">
            {isHotel ? (
              <>{tx('Cada huésped,')}<br /><span className="italic text-gold-300">{tx('bien recibido.')}</span></>
            ) : (
              <>{tx('Todos tus hoteles,')}<br /><span className="italic text-gold-300">{tx('un solo lugar.')}</span></>
            )}
          </h2>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {[
              [ShieldCheck, tx('Permisos por rol'), tx('Cada quien ve solo lo suyo')],
              [Building2, tx('Datos aislados'), tx('Cada hotel, su propia información')],
            ].map(([Icon, t, d]) => (
              <div key={t} className="glass rounded-2xl p-4">
                <Icon className="mb-2 h-5 w-5 text-brand-300" />
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <Link to="/" className="flex items-center gap-2.5 lg:invisible">
            {isHotel ? <HotelLogo hotel={hotel} className="h-9 w-9 text-sm" /> : <NexoraMark className="h-9 w-9" />}
            <span className="font-display font-semibold">{isHotel ? hotelName : tx('Nexora Hotel')}</span>
          </Link>
          <LanguageToggle />
          <ThemeToggle className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-[400px] animate-fade-up">
            {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-brand-600 dark:text-brand-400">{eyebrow}</p>}
            <h1 className="font-display text-[34px] font-semibold leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
