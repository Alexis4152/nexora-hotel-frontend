import { useLocation } from 'react-router-dom'
import { Navigate } from '../router'
import { useAuth } from '../context/AuthContext'
import { stripHotelPrefix } from '../tenant'
import { Spinner } from '../components/ui'

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-7 w-7 text-brand-500" />
    </div>
  )
}

/**
 * Exige sesión. Con contraseña temporal, fuerza el cambio antes de cualquier otra pantalla.
 * La protección real es del backend; esto evita mostrar pantallas que de todas formas responderían 401/403.
 */
export function RequireAuth({ children, loginPath = '/login' }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  if (user.mustChangePassword && stripHotelPrefix(location.pathname) !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />
  }
  return children
}

/** Ruta disponible solo con al menos uno de los permisos indicados. */
export function RequirePermission({ any, children, fallback }) {
  const { canAny } = useAuth()
  if (!canAny(...any)) return fallback ?? <Navigate to="/panel" replace />
  return children
}

/** Muestra su contenido solo si el usuario tiene el permiso (oculta botones y acciones). */
export function Can({ permission, any, children, fallback = null }) {
  const { can, canAny } = useAuth()
  const allowed = permission ? can(permission) : canAny(...(any || []))
  return allowed ? children : fallback
}
