import { Suspense, lazy, useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { HotelProvider, useHotel } from './context/HotelContext'
import { FullPageLoader, RequireAuth, RequirePermission } from './guards'
import { setHotelSlug } from './tenant'
import { applyTheme } from './utils/theme'
import NotFoundPage from './pages/NotFoundPage'
import { Navigate } from './router'
import { tx } from './i18n'

/** Carga diferida de una exportación con nombre (React.lazy solo acepta default). */
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })))

// Cada pantalla se descarga al visitarla: la portada pública no carga el panel.
const StaffLayout = lazy(() => import('./layouts/StaffLayout'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'))
const DashboardPage = lazy(() => import('./pages/panel/DashboardPage'))
const UsersPage = lazy(() => import('./pages/panel/UsersPage'))
const RolesPage = lazy(() => import('./pages/panel/RolesPage'))
const AuditPage = lazy(() => import('./pages/panel/AuditPage'))
const NotificationsPage = lazy(() => import('./pages/panel/NotificationsPage'))
const RoomsPage = lazy(() => import('./pages/panel/RoomsPage'))
const RatesPage = lazy(() => import('./pages/panel/RatesPage'))
const ServicesPage = lazy(() => import('./pages/panel/ServicesPage'))
const SettingsPage = lazy(() => import('./pages/panel/SettingsPage'))
const ReservationsPage = lazy(() => import('./pages/panel/ReservationsPage'))
const CustomersPage = lazy(() => import('./pages/panel/CustomersPage'))
const CashPage = lazy(() => import('./pages/panel/CashPage'))
const PaymentsPage = lazy(() => import('./pages/panel/PaymentsPage'))
const ReportsPage = lazy(() => import('./pages/panel/ReportsPage'))
const PlatformLandingPage = lazy(() => import('./pages/platform/PlatformLandingPage'))
const PlatformHotelsPage = lazy(() => import('./pages/platform/PlatformHotelsPage'))
const HotelHomePage = lazy(() => import('./pages/public/HotelHomePage'))
const BookingPage = lazy(() => import('./pages/public/BookingPage'))
const ManageReservationPage = lazy(() => import('./pages/public/ManageReservationPage'))
const LookupPage = named(() => import('./pages/public/LookupForm'), 'LookupPage')
const PaymentReturnPage = lazy(() => import('./pages/public/PaymentReturnPage'))
const RoomDetailPage = lazy(() => import('./pages/public/RoomDetailPage'))
const PoliciesPage = lazy(() => import('./pages/public/PoliciesPage'))
const GuestForgotPage = named(() => import('./pages/account/GuestAuthPages'), 'GuestForgotPage')
const GuestLoginPage = named(() => import('./pages/account/GuestAuthPages'), 'GuestLoginPage')
const GuestResetPage = named(() => import('./pages/account/GuestAuthPages'), 'GuestResetPage')
const RegisterPage = named(() => import('./pages/account/GuestAuthPages'), 'RegisterPage')
const VerifyEmailPage = named(() => import('./pages/account/GuestAuthPages'), 'VerifyEmailPage')
const AccountPage = lazy(() => import('./pages/account/AccountPage'))
const AccountReservationPage = named(() => import('./pages/account/AccountPage'), 'AccountReservationPage')
const RequireGuest = named(() => import('./pages/account/AccountPage'), 'RequireGuest')

/**
 * Dos ámbitos con sesiones independientes:
 *  - Raíz (/): plataforma Nexora, solo SUPER_ADMIN.
 *  - /h/:slug/*: un hotel. Fija el slug ANTES de pintar (useLayoutEffect) para que cada request lleve X-Hotel,
 *    y monta su propio AuthProvider (key = slug): cambiar de hotel nunca reutiliza la sesión de otro.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/h/:slug/*" element={<HotelScope />} />
            <Route path="/*" element={<PlatformScope />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}

function PlatformScope() {
  setHotelSlug(null)
  useLayoutEffect(() => {
    applyTheme(null)
    document.title = tx('Nexora Hotel')
  }, [])
  return (
    <AuthProvider key="platform">
      <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route index element={<PlatformLandingPage />} />
        <Route path="login" element={<LoginPage platform />} />
        <Route path="recuperar" element={<ForgotPasswordPage platform />} />
        <Route path="restablecer/:token" element={<ResetPasswordPage platform />} />
        <Route path="cambiar-password" element={<RequireAuth><ChangePasswordPage platform /></RequireAuth>} />
        <Route path="plataforma" element={<RequireAuth><PlatformHotelsPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}

function HotelScope() {
  const { slug } = useParams()
  // Se fija en el render (no en un efecto) para que el primer request de los providers ya lleve el header.
  setHotelSlug(slug)
  return (
    <HotelProvider key={slug}>
      <HotelGate>
        <AuthProvider key={slug}>
          <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route index element={<HotelHomePage />} />
            <Route path="reservar" element={<BookingPage />} />
            <Route path="reservacion/:folio" element={<ManageReservationPage />} />
            <Route path="mi-reservacion" element={<LookupPage />} />
            <Route path="pago/:ref" element={<PaymentReturnPage />} />
            <Route path="habitaciones/:id" element={<RoomDetailPage />} />
            <Route path="politicas" element={<PoliciesPage />} />
            <Route path="cuenta/entrar" element={<GuestLoginPage />} />
            <Route path="cuenta/registro" element={<RegisterPage />} />
            <Route path="cuenta/verificar/:token" element={<VerifyEmailPage />} />
            <Route path="cuenta/recuperar" element={<GuestForgotPage />} />
            <Route path="cuenta/restablecer/:token" element={<GuestResetPage />} />
            <Route path="cuenta" element={<RequireGuest><AccountPage /></RequireGuest>} />
            <Route path="cuenta/reservaciones/:folio" element={<RequireGuest><AccountReservationPage /></RequireGuest>} />
            <Route path="login" element={<LoginPage />} />
            <Route path="recuperar" element={<ForgotPasswordPage />} />
            <Route path="restablecer/:token" element={<ResetPasswordPage />} />
            <Route path="cambiar-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
            <Route path="panel" element={<RequireAuth><StaffLayout /></RequireAuth>}>
              <Route index element={<RequirePermission any={['DASHBOARD:VIEW']} fallback={<NoDashboard />}><DashboardPage /></RequirePermission>} />
              <Route path="usuarios" element={<RequirePermission any={['USERS:VIEW']}><UsersPage /></RequirePermission>} />
              <Route path="roles" element={<RequirePermission any={['ROLES:MANAGE']}><RolesPage /></RequirePermission>} />
              <Route path="notificaciones" element={<NotificationsPage />} />
              <Route path="auditoria" element={<RequirePermission any={['AUDIT:VIEW']}><AuditPage /></RequirePermission>} />
              <Route path="reservaciones" element={<RequirePermission any={['RESERVATIONS:VIEW']}><ReservationsPage /></RequirePermission>} />
              <Route path="clientes" element={<RequirePermission any={['CUSTOMERS:VIEW']}><CustomersPage /></RequirePermission>} />
              <Route path="caja" element={<RequirePermission any={['CASH:OPERATE', 'CASH:VIEW_ALL']}><CashPage /></RequirePermission>} />
              <Route path="pagos" element={<RequirePermission any={['PAYMENTS:VIEW']}><PaymentsPage /></RequirePermission>} />
              <Route path="reportes" element={<RequirePermission any={['REPORTS:OPERATIONAL', 'REPORTS:FINANCIAL']}><ReportsPage /></RequirePermission>} />
              <Route path="habitaciones" element={<RequirePermission any={['ROOMS:VIEW', 'HOUSEKEEPING:VIEW']}><RoomsPage /></RequirePermission>} />
              <Route path="tarifas" element={<RequirePermission any={['RATES:VIEW']}><RatesPage /></RequirePermission>} />
              <Route path="servicios" element={<RequirePermission any={['SERVICES:VIEW']}><ServicesPage /></RequirePermission>} />
              <Route path="configuracion" element={<RequirePermission any={['SETTINGS:VIEW', 'POLICIES:MANAGE']}><SettingsPage /></RequirePermission>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </HotelGate>
    </HotelProvider>
  )
}

function HotelGate({ children }) {
  const { loading, notFound, hotel } = useHotel()
  if (loading) return <FullPageLoader />
  if (notFound) return <NotFoundPage kind="hotel" />
  if (!hotel) return <NotFoundPage kind="offline" />
  return children
}

function NoDashboard() {
  return (
    <div className="card p-10 text-center">
      <h1 className="font-display text-2xl font-semibold">{tx('Bienvenido')}</h1>
      <p className="mt-2 text-sm text-slate-500">{tx('Usa el menú para entrar a los módulos que tu rol tiene habilitados.')}</p>
    </div>
  )
}
