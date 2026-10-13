import { useState } from 'react'
import { Hash, Mail, MailCheck } from 'lucide-react'
import PublicShell from './PublicShell'
import { bookingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Button, Input } from '../../components/ui'
import { tx } from '../../i18n'

/**
 * Pide un enlace de acceso por correo. La respuesta es la misma exista o no la reservación, para no revelar
 * qué folios o correos están registrados.
 */
export default function LookupForm({ initialFolio = '' }) {
  const [folio, setFolio] = useState(initialFolio)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^[A-Za-z0-9-]{6,12}$/.test(folio.trim())) errs.folio = tx('Escribe el folio tal como aparece en tu correo (ej. NXH-AB12CD)')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = tx('Escribe un correo válido')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      await bookingApi.lookup(folio.trim().toUpperCase(), email.trim())
      setSent(true)
    } catch (err) {
      setErrors({ form: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
        <MailCheck className="mb-2 h-6 w-6" />
        {tx('Si el folio y el correo coinciden con una reservación, en unos minutos recibirás un enlace para consultarla. Revisa también tu carpeta de spam.')}
      </div>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label={tx('Folio')} icon={Hash} value={folio} maxLength={12} error={errors.folio} autoCapitalize="characters"
        onChange={(e) => setFolio(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} />
      <Input label={tx('Correo')} type="email" icon={Mail} value={email} maxLength={150} error={errors.email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <Button type="submit" loading={saving} className="w-full">{tx('Enviarme el enlace')}</Button>
    </form>
  )
}

export function LookupPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <div className="card p-8">
          <h1 className="font-display text-2xl font-semibold">{tx('Mi reservación')}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{tx('Escribe tu folio y el correo con el que reservaste. Te enviaremos un enlace seguro para consultarla o cancelarla.')}</p>
          <LookupForm />
        </div>
      </div>
    </PublicShell>
  )
}
