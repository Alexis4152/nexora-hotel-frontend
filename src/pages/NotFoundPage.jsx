import { Link as RouterLink } from 'react-router-dom'
import { Compass, WifiOff } from 'lucide-react'
import { tx } from '../i18n'

/** 404 genérico, hotel inexistente/inactivo o backend fuera de línea. */
export default function NotFoundPage({ kind = 'page' }) {
  const copy = {
    page: [tx('Página no encontrada'), tx('La dirección no existe o cambió.')],
    hotel: [tx('Hotel no disponible'), tx('El enlace no corresponde a un hotel activo. Verifica la dirección que te compartieron.')],
    offline: [tx('Sin conexión con el servidor'), tx('No pudimos contactar al sistema. Revisa tu conexión e intenta de nuevo.')],
  }[kind]
  const Icon = kind === 'offline' ? WifiOff : Compass
  return (
    <div className="aurora grain relative grid min-h-screen place-items-center px-6 text-center text-white">
      <div className="relative z-10 max-w-md animate-fade-up">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-3xl glass">
          <Icon className="h-7 w-7 text-gold-300" />
        </div>
        <h1 className="font-display text-4xl font-medium">{copy[0]}</h1>
        <p className="mt-3 text-white/60">{copy[1]}</p>
        {kind === 'offline' ? (
          <button className="btn-gold mt-8" onClick={() => window.location.reload()}>{tx('Reintentar')}</button>
        ) : (
          <RouterLink to="/" className="btn-gold mt-8">{tx('Ir al inicio')}</RouterLink>
        )}
      </div>
    </div>
  )
}
