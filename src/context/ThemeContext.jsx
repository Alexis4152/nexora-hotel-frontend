import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function readStored() {
  try {
    return localStorage.getItem('nx-theme')
  } catch {
    return null
  }
}

/** Claro/oscuro por usuario del navegador (preferencia local, no dato de negocio). */
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (readStored()) return undefined
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setDark((d) => {
      try {
        localStorage.setItem('nx-theme', d ? 'light' : 'dark')
      } catch {
        /* almacenamiento bloqueado: el cambio aplica solo a esta visita */
      }
      return !d
    })
  }, [])

  /** Modo por defecto del hotel: solo aplica si la persona no eligió uno propio en este navegador. */
  const applyDefaultMode = useCallback((mode) => {
    if (readStored()) return
    if (mode === 'dark' || mode === 'light') setDark(mode === 'dark')
    else setDark(matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  return <ThemeContext.Provider value={{ dark, toggle, applyDefaultMode }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
