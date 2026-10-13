import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import AuthShell from '../../layouts/AuthShell'
import { Button, PasswordInput } from '../../components/ui'
import { Link, useNavigate } from '../../router'
import { authApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { required, strongPassword, validate } from '../../utils/validators'
import { tx } from '../../i18n'

/** Cambio de contraseña: obligatorio tras recibir una temporal, o voluntario desde el menú del usuario. */
export default function ChangePasswordPage({ platform = false }) {
  const { user, applySession } = useAuth()
  const hotel = useHotel()
  const navigate = useNavigate()
  const toast = useToast()
  const forced = user?.mustChangePassword
  const [form, setForm] = useState({ current: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (f) => (e) => {
    setForm({ ...form, [f]: e.target.value })
    setErrors({ ...errors, [f]: null })
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, {
      current: [required(tx('tu contraseña actual'))],
      password: [required(tx('la nueva contraseña')), strongPassword,
        (v, all) => (v && v === all.current ? tx('Debe ser distinta de la actual') : null)],
      confirm: [required(tx('la confirmación')), (v, all) => (v !== all.password ? tx('Las contraseñas no coinciden') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSubmitting(true)
    setServerError('')
    try {
      const session = await authApi.changePassword(form.current, form.password)
      applySession(session)
      toast.success(tx('Contraseña actualizada'))
      navigate(platform ? '/plataforma' : '/panel', { replace: true })
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors({ password: fe.newPassword, current: fe.currentPassword })
      setServerError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell hotelName={platform ? null : hotel?.hotel?.name} eyebrow={forced ? tx('Primer acceso') : tx('Seguridad')}
      title={forced ? tx('Crea tu contraseña') : tx('Cambiar contraseña')}
      subtitle={forced ? tx('Hola {0}, por seguridad reemplaza la contraseña temporal que recibiste.', user?.firstName) : tx('Se cerrarán tus sesiones en otros dispositivos.')}
      footer={!forced && <Link to={platform ? '/plataforma' : '/panel'} className="font-medium text-brand-600 dark:text-brand-400">{tx('← Volver')}</Link>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {forced && (
          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            {tx('Hasta que la cambies no podrás usar el resto del sistema.')}
          </div>
        )}
        {serverError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{serverError}</div>}
        <PasswordInput label={forced ? tx('Contraseña temporal') : tx('Contraseña actual')} autoComplete="current-password"
          value={form.current} onChange={set('current')} error={errors.current} maxLength={72} />
        <PasswordInput label={tx('Nueva contraseña')} autoComplete="new-password" showStrength maxLength={72}
          value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput label={tx('Confirmar nueva contraseña')} autoComplete="new-password" maxLength={72}
          value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>{tx('Guardar y continuar')}</Button>
      </form>
    </AuthShell>
  )
}
