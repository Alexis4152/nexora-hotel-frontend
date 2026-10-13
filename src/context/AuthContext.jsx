import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api'
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client'
import { getHotelSlug } from '../tenant'

const AuthContext = createContext(null)

/**
 * Sesión del ámbito actual: un hotel (/h/<slug>) o la plataforma (raíz). Se monta una vez por ámbito
 * (key = slug), así cambiar de hotel nunca arrastra la sesión de otro.
 *
 * Al montar intenta restaurar la sesión con la cookie httpOnly (/auth/refresh). El access token queda solo
 * en memoria. Los permisos del usuario deciden menús y botones; el backend vuelve a validar cada operación.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((s) => {
    setAccessToken(s?.accessToken ?? null)
    setSession(s?.user ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setSessionExpiredHandler(() => setSession(null))
    refreshSession()
      .then((s) => {
        // La cookie es por hotel; aun así se verifica que la sesión sea de este ámbito.
        const slug = getHotelSlug()
        const belongs = slug ? s.user.hotel?.slug === slug : s.user.platform
        if (!cancelled) apply(belongs ? s : null)
      })
      .catch(() => !cancelled && apply(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [apply])

  const login = useCallback(
    async (email, password) => {
      const s = await authApi.login(email, password)
      apply(s)
      return s.user
    },
    [apply],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      apply(null)
    }
  }, [apply])

  const value = useMemo(() => {
    const permissions = new Set(session?.permissions || [])
    return {
      user: session,
      loading,
      login,
      logout,
      applySession: apply,
      can: (code) => permissions.has(code),
      canAny: (...codes) => codes.some((c) => permissions.has(c)),
      isAdmin: session?.roles?.includes('ADMIN') ?? false,
    }
  }, [session, loading, login, logout, apply])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Huésped del portal (sin ningún rol de personal). */
export const isGuestOnly = (u) => !!u && !u.platform && u.roles.length > 0 && u.roles.every((r) => r === 'GUEST')
