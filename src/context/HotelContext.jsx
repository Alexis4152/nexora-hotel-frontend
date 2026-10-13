import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { publicApi } from '../api'
import { applyTheme } from '../utils/theme'
import { useTheme } from './ThemeContext'

const HotelContext = createContext(null)

/**
 * Identidad pública del hotel del enlace (GET /api/public/hotel): nombre, logo, portada, contacto y tema.
 * Si el hotel no existe o está inactivo, {@code notFound} = true. {@code refresh} se llama después de guardar
 * cambios en Configuración para verlos al instante, sin recargar.
 */
export function HotelProvider({ children }) {
  const { applyDefaultMode } = useTheme()
  const [state, setState] = useState({ hotel: null, loading: true, notFound: false })

  const apply = useCallback((hotel) => {
    applyTheme(hotel.theme)
    applyDefaultMode(hotel.theme?.defaultMode)
    document.title = hotel.name
    setFavicon(hotel.faviconUrl || hotel.logoUrl)
    setState({ hotel, loading: false, notFound: false })
  }, [applyDefaultMode])

  const refresh = useCallback(() => publicApi.hotel().then(apply), [apply])

  useEffect(() => {
    let cancelled = false
    publicApi
      .hotel()
      .then((hotel) => !cancelled && apply(hotel))
      .catch((err) => {
        if (!cancelled) setState({ hotel: null, loading: false, notFound: err?.response?.status === 404 })
      })
    return () => {
      cancelled = true
    }
  }, [apply])

  return <HotelContext.Provider value={{ ...state, refresh }}>{children}</HotelContext.Provider>
}

function setFavicon(url) {
  const link = document.querySelector("link[rel='icon']")
  if (link) link.href = url || '/favicon.svg'
}

export const useHotel = () => useContext(HotelContext)
