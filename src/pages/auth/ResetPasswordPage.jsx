import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import AuthShell from '../../layouts/AuthShell'
import { Button, PasswordInput } from '../../components/ui'
import { Link } from '../../router'
import { authApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { required, strongPassword, validate } from '../../utils/validators'
import { tx } from '../../i18n'

export default function ResetPasswordPage({ platform = false }) {
  const { token } = useParams()
  const hotel = useHotel()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, {
      password: [required(tx('la nueva contraseña')), strongPassword],
      confirm: [required(tx('la confirmación')), (v, all) => (v !== all.password ? tx('Las contraseñas no coinciden') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSubmitting(true)
    setServerError('')
    try {
      await authApi.resetPassword(token, form.password)
      setDone(true)
    } catch (err) {
      setErrors({ password: fieldErrors(err).newPassword })
      setServerError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell hotelName={platform ? null : hotel?.hotel?.name} eyebrow={tx('Nueva contraseña')}
      title={done ? tx('¡Listo!') : tx('Crea una nueva contraseña')}
      subtitle={done ? null : tx('Por seguridad, se cerrarán las sesiones abiertas en otros dispositivos.')}>
      {done ? (
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{tx('Tu contraseña se actualizó correctamente.')}</p>
          <Link to="/login" className="btn-primary mt-5 w-full">{tx('Iniciar sesión')}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          {serverError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{serverError}</div>}
          <PasswordInput label={tx('Nueva contraseña')} autoComplete="new-password" showStrength maxLength={72}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
          <PasswordInput label={tx('Confirmar contraseña')} autoComplete="new-password" maxLength={72}
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
          <Button type="submit" size="lg" className="w-full" loading={submitting}>{tx('Guardar contraseña')}</Button>
        </form>
      )}
    </AuthShell>
  )
}
