import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, ExternalLink, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink, Link, useNavigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHotel } from '../context/HotelContext'
import { NAVIGATION } from '../config/navigation'
import { Avatar, HotelLogo, LanguageToggle, Spinner, ThemeToggle } from '../components/ui'
import NotificationBell from '../components/NotificationBell'
import { NotificationsProvider } from '../context/NotificationsContext'
import { tx } from '../i18n'

/**
 * Shell del panel del hotel (admin, recepción y roles personalizados comparten estructura; lo que cambia es
 * qué entradas del menú se ven según los permisos). Sidebar oscuro colapsable en escritorio y cajón en móvil.
 */
export default function StaffLayout() {
  const { user, canAny, logout } = useAuth()
  const { hotel } = useHotel()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nx-sidebar') === 'collapsed'
    } catch {
      return false
    }
  })

  useEffect(() => setDrawer(false), [location.pathname])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('nx-sidebar', c ? 'open' : 'collapsed')
      } catch {
        /* preferencia solo para esta visita */
      }
      return !c
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sections = NAVIGATION.map((s) => ({ ...s, items: s.items.filter((i) => canAny(...i.any)) })).filter((s) => s.items.length)
  const role = user?.roles?.includes('ADMIN') ? tx('Administrador') : user?.roles?.includes('RECEPTIONIST') ? tx('Recepción') : tx('Personal')

  const sidebar = (mini) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 pb-4 pt-5 ${mini ? 'justify-center px-2' : ''}`}>
        <HotelLogo hotel={hotel} className="h-10 w-10 shrink-0 text-sm" />
        {!mini && (
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-white">{hotel?.name}</p>
            <p className="text-[11px] text-slate-400">{tx('Panel ·')} {role}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.section}>
            {!mini && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{section.section}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const base = `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition ${mini ? 'justify-center px-0' : ''}`
                if (item.soon) {
                  return (
                    <li key={item.label}>
                      <span className={`${base} cursor-not-allowed text-slate-600`} title={tx('{0} · Próximamente', item.label)}>
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!mini && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{tx('Pronto')}</span>
                          </>
                        )}
                      </span>
                    </li>
                  )
                }
                return (
                  <li key={item.label}>
                    <NavLink to={item.to} end={item.end} title={mini ? item.label : undefined}
                      className={({ isActive }) => `${base} ${isActive ? 'bg-white/[.08] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/.06)]' : 'text-slate-400 hover:bg-white/[.04] hover:text-slate-100'}`}>
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-300 to-brand-500" />}
                          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-300' : ''}`} />
                          {!mini && <span>{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[.06] p-3">
        <Link to="/" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-slate-400 transition hover:bg-white/[.04] hover:text-white ${mini ? 'justify-center px-0' : ''}`} title={tx('Sitio público')}>
          <ExternalLink className="h-4 w-4 shrink-0" />
          {!mini && tx('Ver sitio público')}
        </Link>
      </div>
    </div>
  )

  return (
    <NotificationsProvider>
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-30 hidden bg-sidebar transition-[width] duration-300 lg:block ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}>
          {sidebar(collapsed)}
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 w-[280px] bg-sidebar shadow-2xl animate-fade-up">
              <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5" aria-label={tx('Cerrar menú')}>
                <X className="h-4 w-4" />
              </button>
              {sidebar(false)}
            </aside>
          </div>
        )}

        <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-white/[.06] dark:bg-ink-950/80 sm:px-6">
            <button onClick={() => setDrawer(true)} className="btn-ghost btn-sm h-9 w-9 px-0 lg:hidden" aria-label={tx('Abrir menú')}>
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={toggleCollapsed} className="btn-ghost btn-sm hidden h-9 w-9 px-0 lg:inline-flex" aria-label={tx('Contraer menú')}>
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            </button>
            <div className="flex-1" />
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle className="text-slate-500 dark:text-slate-400" />
            <UserMenu user={user} role={role} onLogout={handleLogout} />
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Suspense fallback={<div className="grid h-64 place-items-center"><Spinner className="h-6 w-6 text-brand-500" /></div>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  )
}

function UserMenu({ user, role, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-white/5" aria-haspopup="menu" aria-expanded={open}>
        <Avatar first={user?.firstName} last={user?.lastName} size="h-8 w-8 text-[11px]" />
        <div className="hidden text-left sm:block">
          <p className="text-[13px] font-semibold leading-tight">{user?.firstName} {user?.lastName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{role}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user?.email}</p>
          </div>
          <Link to="/cambiar-password" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5">
            <KeyRound className="h-4 w-4 text-slate-400" /> {tx('Cambiar contraseña')}
          </Link>
          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
            <LogOut className="h-4 w-4" /> {tx('Cerrar sesión')}
          </button>
        </div>
      )}
    </div>
  )
}
