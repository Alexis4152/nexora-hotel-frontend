import { forwardRef, useCallback } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useNavigate as useRouterNavigate,
} from 'react-router-dom'
import { hotelPath } from './tenant'

/**
 * Link/NavLink/Navigate/useNavigate con el hotel incluido: las pantallas escriben rutas absolutas
 * ('/login', '/panel/usuarios') como si hubiera un solo hotel y aquí se mandan a /h/<slug>/...
 */
function withHotel(to) {
  if (typeof to === 'string') return hotelPath(to)
  if (to && typeof to === 'object' && typeof to.pathname === 'string') return { ...to, pathname: hotelPath(to.pathname) }
  return to
}

export const Link = forwardRef(function Link({ to, ...props }, ref) {
  return <RouterLink ref={ref} to={withHotel(to)} {...props} />
})

export const NavLink = forwardRef(function NavLink({ to, ...props }, ref) {
  return <RouterNavLink ref={ref} to={withHotel(to)} {...props} />
})

export function Navigate({ to, ...props }) {
  return <RouterNavigate to={withHotel(to)} {...props} />
}

export function useNavigate() {
  const navigate = useRouterNavigate()
  return useCallback((to, options) => (typeof to === 'number' ? navigate(to) : navigate(withHotel(to), options)), [navigate])
}
