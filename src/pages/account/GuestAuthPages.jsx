import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2, Mail, MailCheck, UserPlus, XCircle } from 'lucide-react'
import PublicShell from '../public/PublicShell'
import { Button, Input, PasswordInput, Select } from '../../components/ui'
import { Link, Navigate, useNavigate } from '../../router'
import { authApi, publicAccountApi } from '../../api'
import { isGuestOnly, useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { email as emailRule, onlyDigits, personName, required, strongPassword, validate } from '../../utils/validators'
import { stripHotelPrefix } from '../../tenant'
import { tx } from '../../i18n'

function Card({ icon: Icon, title, subtitle, children, footer }) {
  return (
    <div className="mx-auto max-w-md animate-fade-up">
      <div className="card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg"><Icon className="h-7 w-7" /></div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>}
    </div>
  )
}

function Alert({ tone = 'red', children }) {
  const tones = {
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  }
  return <p className={`rounded-xl p-3 text-sm ${tones[tone]}`} role="alert">{children}</p>
}

/* ── Iniciar sesión ─────────────────────────────────────────────────────────────── */

export function GuestLoginPage() {
  const { user, loading, login } = useAuth()
  const { hotel } = useHotel()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!loading && user) return <Navigate to={isGuestOnly(user) ? '/cuenta' : '/panel'} replace />

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { email: [required(tx('tu correo')), emailRule], password: [required(tx('tu contraseña'))] })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setError('')
    setUnverified(false)
    try {
      const u = await login(form.email.trim(), form.password)
      const from = location.state?.from ? stripHotelPrefix(location.state.from) : null
      navigate(isGuestOnly(u) ? (from?.startsWith('/cuenta') || from?.startsWith('/reservar') ? from : '/cuenta') : '/panel', { replace: true })
    } catch (err) {
      const msg = errorMessage(err)
      setUnverified(/Confirma tu correo/.test(msg))
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const resend = async () => {
    try {
      await publicAccountApi.resend(form.email.trim())
      setResent(true)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <PublicShell>
      <Card icon={Mail} title={tx('Bienvenido de nuevo')} subtitle={tx('Entra a tu cuenta de {0} para ver tus reservaciones y pagos.', hotel.name)}
        footer={<>{tx('¿Aún no tienes cuenta?')} <Link to="/cuenta/registro" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{tx('Créala aquí')}</Link></>}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label={tx('Correo')} type="email" autoComplete="email" value={form.email} error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <PasswordInput label={tx('Contraseña')} autoComplete="current-password" value={form.password} error={errors.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="text-right"><Link to="/cuenta/recuperar" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{tx('¿Olvidaste tu contraseña?')}</Link></div>
          {error && <Alert>{error}</Alert>}
          {unverified && !resent && <button type="button" className="btn-secondary w-full" onClick={resend}><MailCheck className="h-4 w-4" /> {tx('Reenviar el enlace de confirmación')}</button>}
          {resent && <Alert tone="green">{tx('Si la cuenta está pendiente de confirmar, te enviamos un nuevo enlace.')}</Alert>}
          <Button type="submit" loading={saving} className="w-full">{tx('Entrar')} <ArrowRight className="h-4 w-4" /></Button>
        </form>
      </Card>
    </PublicShell>
  )
}

/* ── Crear cuenta ───────────────────────────────────────────────────────────────── */

export function RegisterPage() {
  const { hotel } = useHotel()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneCountryCode: '52', phone: '', password: '', acceptPrivacy: false })
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, {
      firstName: [required(tx('tu nombre')), personName], lastName: [required(tx('tus apellidos')), personName],
      email: [required(tx('tu correo')), emailRule], password: [required(tx('una contraseña')), strongPassword],
    })
    if (form.phone && form.phoneCountryCode === '52' && form.phone.length !== 10) found.phone = tx('El celular debe tener 10 dígitos')
    if (!form.acceptPrivacy) found.acceptPrivacy = tx('Debes aceptar el aviso de privacidad')
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    setError('')
    try {
      const res = await publicAccountApi.register({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        email: form.email.trim(), phone: form.phone || null, website: honeypot })
      setDone(res.message)
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <PublicShell>
        <Card icon={MailCheck} title={tx('Revisa tu correo')} subtitle={done}>
          <p className="text-center text-sm text-slate-500">{tx('Abre el enlace que te enviamos para activar tu cuenta. Vence en 24 horas.')}</p>
          <Link to="/cuenta/entrar" className="btn-primary mt-6 w-full">{tx('Ir a iniciar sesión')}</Link>
        </Card>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <Card icon={UserPlus} title={tx('Crea tu cuenta')} subtitle={tx('Guarda tus datos y consulta tus estancias en {0}.', hotel.name)}
        footer={<>{tx('¿Ya tienes cuenta?')} <Link to="/cuenta/entrar" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{tx('Inicia sesión')}</Link></>}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={tx('Nombre')} autoComplete="given-name" value={form.firstName} error={errors.firstName} maxLength={100} onChange={set('firstName')} />
            <Input label={tx('Apellidos')} autoComplete="family-name" value={form.lastName} error={errors.lastName} maxLength={100} onChange={set('lastName')} />
          </div>
          <Input label={tx('Correo')} type="email" autoComplete="email" value={form.email} error={errors.email} maxLength={150} onChange={set('email')} />
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <Select label={tx('Lada')} value={form.phoneCountryCode} onChange={set('phoneCountryCode')}>
              <option value="52">{tx('México +52')}</option><option value="1">{tx('EE. UU./Canadá +1')}</option><option value="34">{tx('España +34')}</option>
              <option value="57">{tx('Colombia +57')}</option><option value="54">{tx('Argentina +54')}</option>
            </Select>
            <Input label={tx('Celular (opcional)')} inputMode="numeric" autoComplete="tel-national" value={form.phone} error={errors.phone}
              onChange={(e) => setForm({ ...form, phone: onlyDigits(e.target.value, form.phoneCountryCode === '52' ? 10 : 14) })} />
          </div>
          <PasswordInput label={tx('Contraseña')} autoComplete="new-password" showStrength value={form.password} error={errors.password} onChange={set('password')}
            hint={tx('Mínimo 10 caracteres con mayúsculas, minúsculas y números')} />
          <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off"
            className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={form.acceptPrivacy} onChange={(e) => setForm({ ...form, acceptPrivacy: e.target.checked })} />
            <span>{tx('Acepto el')} <Link to="/politicas#privacidad" className="font-semibold text-brand-600 underline dark:text-brand-400">{tx('aviso de privacidad')}</Link></span>
          </label>
          {errors.acceptPrivacy && <p className="field-error">{errors.acceptPrivacy}</p>}
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={saving} className="w-full"><UserPlus className="h-4 w-4" /> {tx('Crear cuenta')}</Button>
        </form>
      </Card>
    </PublicShell>
  )
}

/* ── Confirmar correo ───────────────────────────────────────────────────────────── */

export function VerifyEmailPage() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    publicAccountApi.verify(token).then((r) => setState({ status: 'ok', message: r.message }))
      .catch((e) => setState({ status: 'error', message: errorMessage(e) }))
  }, [token])
  return (
    <PublicShell>
      {state.status === 'loading' ? (
        <div className="card mx-auto grid max-w-md place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /><p className="mt-3 text-sm text-slate-500">{tx('Confirmando tu correo…')}</p></div>
      ) : (
        <Card icon={state.status === 'ok' ? CheckCircle2 : XCircle} title={state.status === 'ok' ? tx('¡Cuenta confirmada!') : tx('No pudimos confirmar')} subtitle={state.message}>
          <Link to="/cuenta/entrar" className="btn-primary w-full">{tx('Iniciar sesión')}</Link>
        </Card>
      )}
    </PublicShell>
  )
}

/* ── Recuperar y restablecer contraseña ─────────────────────────────────────────── */

export function GuestForgotPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const found = validate({ email }, { email: [required(tx('tu correo')), emailRule] })
    if (found.email) { setError(found.email); return }
    setSaving(true)
    try {
      setSent((await authApi.forgotPassword(email.trim())).message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <PublicShell>
      <Card icon={Mail} title={tx('Recupera tu contraseña')} subtitle={tx('Te enviaremos un enlace para crear una nueva.')}
        footer={<Link to="/cuenta/entrar" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">{tx('Volver a iniciar sesión')}</Link>}>
        {sent ? <Alert tone="green">{sent}</Alert> : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Input label={tx('Correo')} type="email" autoComplete="email" value={email} error={error} onChange={(e) => { setEmail(e.target.value); setError('') }} />
            <Button type="submit" loading={saving} className="w-full">{tx('Enviarme el enlace')}</Button>
          </form>
        )}
      </Card>
    </PublicShell>
  )
}

export function GuestResetPage() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const problem = strongPassword(password)
    if (problem) { setError(problem); return }
    setSaving(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(fieldErrors(err).newPassword || errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <PublicShell>
      <Card icon={done ? CheckCircle2 : Mail} title={done ? tx('Contraseña actualizada') : tx('Crea una nueva contraseña')}
        subtitle={done ? tx('Ya puedes iniciar sesión con tu nueva contraseña.') : tx('El enlace funciona una sola vez.')}>
        {done ? <Link to="/cuenta/entrar" className="btn-primary w-full">{tx('Iniciar sesión')}</Link> : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <PasswordInput label={tx('Nueva contraseña')} autoComplete="new-password" showStrength value={password} error={error}
              onChange={(e) => { setPassword(e.target.value); setError('') }} />
            <Button type="submit" loading={saving} className="w-full">{tx('Guardar contraseña')}</Button>
          </form>
        )}
      </Card>
    </PublicShell>
  )
}
