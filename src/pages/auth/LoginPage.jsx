import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import AuthShell from '../../layouts/AuthShell'
import { Button, Input, PasswordInput } from '../../components/ui'
import { Link, Navigate, useNavigate } from '../../router'
import { isGuestOnly, useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { email as emailRule, required, validate } from '../../utils/validators'
import { stripHotelPrefix } from '../../tenant'
import { tx } from '../../i18n'

/** Login del personal de un hotel (/h/<slug>/login) o de la plataforma (/login). */
export default function LoginPage({ platform = false }) {
  const { user, loading, login } = useAuth()
  const hotel = useHotel()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const home = (u) => (u.mustChangePassword ? '/cambiar-password' : platform ? '/plataforma' : isGuestOnly(u) ? '/cuenta' : '/panel')

  if (!loading && user) return <Navigate to={home(user)} replace />

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: null }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { email: [required(tx('tu correo')), emailRule], password: [required(tx('tu contraseña'))] })
    setErrors(found)
    if (Object.keys(found).length) return
    setSubmitting(true)
    setServerError('')
    try {
      const u = await login(form.email.trim(), form.password)
      const from = location.state?.from && !u.mustChangePassword ? stripHotelPrefix(location.state.from) : null
      navigate(from || home(u), { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
      setServerError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      hotelName={platform ? null : hotel?.hotel?.name}
      eyebrow={platform ? tx('Nexora · Plataforma') : tx('Acceso del personal')}
      title={tx('Bienvenido de nuevo')}
      subtitle={platform ? tx('Administra los hoteles de la plataforma.') : tx('Inicia sesión para operar tu hotel.')}
      footer={!platform && <Link to="/" className="font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300">{tx('← Volver al sitio del hotel')}</Link>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {serverError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
            {serverError}
          </div>
        )}
        <Input label={tx('Correo electrónico')} type="email" autoComplete="username" icon={Mail} placeholder="tu@correo.com"
          value={form.email} onChange={set('email')} error={errors.email} maxLength={150} />
        <div>
          <PasswordInput label={tx('Contraseña')} autoComplete="current-password" placeholder="••••••••••"
            value={form.password} onChange={set('password')} error={errors.password} maxLength={72} />
          <div className="mt-2 text-right">
            <Link to="/recuperar" className="text-[13px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">{tx('¿Olvidaste tu contraseña?')}</Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {tx('Iniciar sesión')} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  )
}
