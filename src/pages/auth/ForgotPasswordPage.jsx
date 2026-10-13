import { useState } from 'react'
import { MailCheck, Mail } from 'lucide-react'
import AuthShell from '../../layouts/AuthShell'
import { Button, Input } from '../../components/ui'
import { Link } from '../../router'
import { authApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { errorMessage } from '../../api/client'
import { email as emailRule, required, validate } from '../../utils/validators'
import { tx } from '../../i18n'

export default function ForgotPasswordPage({ platform = false }) {
  const hotel = useHotel()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const found = validate({ email }, { email: [required(tx('tu correo')), emailRule] })
    if (found.email) return setError(found.email)
    setSubmitting(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setSent(res.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell hotelName={platform ? null : hotel?.hotel?.name} eyebrow={tx('Recuperar acceso')}
      title={sent ? tx('Revisa tu correo') : tx('¿Olvidaste tu contraseña?')}
      subtitle={sent ? null : tx('Escribe tu correo y te enviaremos un enlace para crear una nueva.')}
      footer={<Link to="/login" className="font-medium text-brand-600 dark:text-brand-400">{tx('← Volver a iniciar sesión')}</Link>}>
      {sent ? (
        <div className="card p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{sent}</p>
          <p className="mt-3 text-xs text-slate-400">{tx('El enlace vence en 30 minutos y solo funciona una vez.')}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Input label={tx('Correo electrónico')} type="email" icon={Mail} autoComplete="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }} error={error} maxLength={150} />
          <Button type="submit" size="lg" className="w-full" loading={submitting}>{tx('Enviar enlace')}</Button>
        </form>
      )}
    </AuthShell>
  )
}
