import { useEffect, useState } from 'react'
import { CheckCircle2, Inbox, Mail, RefreshCw, RotateCcw, Save, Send, Server } from 'lucide-react'
import { Badge, Button, Input, Modal, PasswordInput, Skeleton, Switch } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { emailApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { formatDateTime } from '../../utils/format'
import { tx } from '../../i18n'

const OUTBOX_TONE = { SENT: 'green', PENDING: 'amber', FAILED: 'red', SKIPPED: 'slate' }
const OUTBOX_LABEL = { SENT: tx('Enviado'), PENDING: tx('En cola'), FAILED: tx('Falló'), SKIPPED: tx('Sin SMTP') }

export default function EmailSettingsTab() {
  const { can } = useAuth()
  return (
    <div className="space-y-6">
      {can('EMAIL_SETTINGS:MANAGE') && <SmtpSection />}
      {can('NOTIFICATIONS:MANAGE') && <TemplatesSection />}
      <OutboxSection />
    </div>
  )
}

function Card({ icon: Icon, title, description, aside, children }) {
  return (
    <section className="card p-6 animate-fade-up">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

/* ── SMTP ───────────────────────────────────────────────────────────────────────── */

function SmtpSection() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => { emailApi.settings().then(setData).catch((e) => toast.error(errorMessage(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <Skeleton className="h-80" />
  const set = (k) => (e) => setData({ ...data, [k]: k === 'port' ? Number(e.target.value.replace(/\D/g, '').slice(0, 5)) : e.target.value })

  const save = async () => {
    const e = {}
    if (data.enabled) {
      if (!data.host) e.host = tx('Escribe el servidor SMTP')
      if (!data.fromAddress) e.fromAddress = tx('Escribe el remitente')
    }
    if (!data.port || data.port > 65535) e.port = tx('Puerto inválido')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const { passwordSet, usable, ...rest } = data // eslint-disable-line no-unused-vars
      setData(await emailApi.update({ ...rest, password: password === '' ? null : password }))
      setPassword('')
      toast.success(tx('Configuración de correo guardada'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(testTo.trim())) { setErrors({ ...errors, testTo: tx('Escribe un correo válido') }); return }
    setTesting(true)
    try {
      const res = await emailApi.test(testTo.trim())
      toast.success(res.message || tx('Correo de prueba enviado'))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card icon={Server} title={tx('Servidor de correo (SMTP)')}
      description={tx('Los correos a huéspedes salen con tu dominio. La contraseña se guarda cifrada y nunca se vuelve a mostrar.')}
      aside={data.usable ? <Badge tone="green" dot>{tx('Listo para enviar')}</Badge> : <Badge tone="amber" dot>{tx('Sin configurar: los correos se registran pero no se envían')}</Badge>}>
      <label className="mb-5 flex items-center gap-3 text-sm">
        <Switch checked={data.enabled} onChange={(v) => setData({ ...data, enabled: v })} label={tx('Usar SMTP propio')} />
        {tx('Usar servidor SMTP del hotel')}
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2"><Input label={tx('Servidor')} placeholder="smtp.tudominio.com" value={data.host || ''} onChange={set('host')} error={errors.host} maxLength={200} /></div>
        <Input label={tx('Puerto')} inputMode="numeric" value={data.port || ''} onChange={set('port')} error={errors.port} />
        <label className="flex items-end gap-3 pb-3 text-sm">
          <Switch checked={data.starttls} onChange={(v) => setData({ ...data, starttls: v })} label="STARTTLS" /> STARTTLS
        </label>
        <div className="lg:col-span-2"><Input label={tx('Usuario')} value={data.username || ''} onChange={set('username')} error={errors.username} maxLength={200} autoComplete="off" /></div>
        <div className="lg:col-span-2">
          <PasswordInput label={tx('Contraseña')} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={300} autoComplete="new-password"
            hint={data.passwordSet ? tx('Ya hay una contraseña guardada; déjalo vacío para conservarla') : tx('Aún no hay contraseña guardada')} />
        </div>
        <div className="lg:col-span-2"><Input label={tx('Correo remitente')} type="email" value={data.fromAddress || ''} onChange={set('fromAddress')} error={errors.fromAddress} maxLength={150} /></div>
        <div className="lg:col-span-2"><Input label={tx('Nombre remitente')} value={data.fromName || ''} onChange={set('fromName')} error={errors.fromName} maxLength={150} /></div>
        <div className="lg:col-span-2"><Input label={tx('Responder a')} type="email" value={data.replyTo || ''} onChange={set('replyTo')} error={errors.replyTo} maxLength={150} /></div>
        <div className="lg:col-span-2"><Input label={tx('Avisos internos (separados por coma)')} value={data.adminRecipients || ''} onChange={set('adminRecipients')} error={errors.adminRecipients} maxLength={1000} hint={tx('Reciben las plantillas marcadas para administración')} /></div>
        <div className="lg:col-span-4"><Input label={tx('Copia oculta (CCO)')} value={data.bccRecipients || ''} onChange={set('bccRecipients')} error={errors.bccRecipients} maxLength={1000} /></div>
      </div>
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-white/[.06] md:flex-row md:items-end">
        <div className="flex-1 md:max-w-sm"><Input label={tx('Enviar prueba a')} type="email" value={testTo} onChange={(e) => { setTestTo(e.target.value); setErrors({ ...errors, testTo: undefined }) }} error={errors.testTo} /></div>
        <Button variant="secondary" loading={testing} onClick={test}><Send className="h-4 w-4" /> {tx('Enviar prueba')}</Button>
        <div className="flex-1" />
        <Button loading={saving} onClick={save}><Save className="h-4 w-4" /> {tx('Guardar')}</Button>
      </div>
    </Card>
  )
}

/* ── Plantillas ─────────────────────────────────────────────────────────────────── */

function TemplatesSection() {
  const toast = useToast()
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = () => emailApi.templates().then(setList).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card icon={Mail} title={tx('Plantillas de notificación')} description={tx('Texto con variables entre llaves dobles. Todo se escapa al enviarse: no se admite HTML.')}>
      {!list ? <Skeleton className="h-40" /> : (
        <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 dark:divide-white/[.06] dark:ring-white/10">
          {list.map((t) => (
            <li key={t.eventCode} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.label}</p>
                <p className="truncate text-xs text-slate-500">{t.subject}</p>
              </div>
              {t.sendToGuest && <Badge tone="brand">{tx('Huésped')}</Badge>}
              {t.sendToAdmins && <Badge tone="gold">{tx('Administración')}</Badge>}
              {!t.enabled && <Badge tone="slate">{tx('Desactivada')}</Badge>}
              <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>{tx('Editar')}</Button>
            </li>
          ))}
        </ul>
      )}
      {editing && <TemplateEditor template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </Card>
  )
}

function TemplateEditor({ template, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ subject: template.subject, body: template.body, enabled: template.enabled, sendToGuest: template.sendToGuest, sendToAdmins: template.sendToAdmins })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState('')

  const save = async () => {
    const e = {}
    if (!form.subject.trim()) e.subject = tx('Escribe el asunto')
    if (!form.body.trim()) e.body = tx('Escribe el mensaje')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving('save')
    try {
      await emailApi.updateTemplate(template.eventCode, form)
      toast.success(tx('Plantilla guardada'))
      onSaved()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving('')
    }
  }
  const reset = async () => {
    setSaving('reset')
    try {
      await emailApi.resetTemplate(template.eventCode)
      toast.success(tx('Plantilla restablecida'))
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving('')
    }
  }

  return (
    <Modal open onClose={onClose} size="max-w-3xl" icon={Mail} title={template.label}
      footer={<><Button variant="ghost" loading={saving === 'reset'} onClick={reset}><RotateCcw className="h-4 w-4" /> {tx('Restablecer')}</Button>
        <div className="flex-1" /><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button><Button loading={saving === 'save'} onClick={save}>{tx('Guardar')}</Button></>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><Switch size="sm" checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label={tx('Activa')} /> {tx('Activa')}</label>
          <label className="flex items-center gap-2"><Switch size="sm" checked={form.sendToGuest} onChange={(v) => setForm({ ...form, sendToGuest: v })} label={tx('Enviar al huésped')} /> {tx('Al huésped')}</label>
          <label className="flex items-center gap-2"><Switch size="sm" checked={form.sendToAdmins} onChange={(v) => setForm({ ...form, sendToAdmins: v })} label={tx('Enviar a administración')} /> {tx('A administración')}</label>
        </div>
        <Input label={tx('Asunto')} value={form.subject} maxLength={200} error={errors.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <Textarea label={tx('Mensaje')} rows={10} maxLength={10000} value={form.body} error={errors.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">{tx('Variables disponibles (clic para insertar)')}</p>
          <div className="flex flex-wrap gap-1.5">
            {template.variables.map((v) => (
              <button key={v} type="button" onClick={() => setForm({ ...form, body: `${form.body}{{${v}}}` })}
                className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] hover:bg-brand-50 hover:text-brand-700 dark:bg-white/5">{`{{${v}}}`}</button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ── Bitácora ───────────────────────────────────────────────────────────────────── */

function OutboxSection() {
  const toast = useToast()
  const [list, setList] = useState(null)
  const load = () => { setList(null); emailApi.outbox().then(setList).catch((e) => toast.error(errorMessage(e))) }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card icon={Inbox} title={tx('Bitácora de envíos')} description={tx('Últimos correos generados por el sistema. Se reintentan solos hasta 5 veces.')}
      aside={<Button size="sm" variant="secondary" onClick={load}><RefreshCw className="h-4 w-4" /> {tx('Actualizar')}</Button>}>
      {!list ? <Skeleton className="h-40" /> : list.length === 0 ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4" /> {tx('Aún no se ha generado ningún correo.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="table-head"><tr><th>{tx('Fecha')}</th><th>{tx('Destinatario')}</th><th>{tx('Asunto')}</th><th>{tx('Estado')}</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="table-row">
                  <td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</td>
                  <td>{o.recipient}</td>
                  <td className="max-w-xs truncate" title={o.subject}>{o.subject}</td>
                  <td>
                    <Badge tone={OUTBOX_TONE[o.status]} dot>{OUTBOX_LABEL[o.status] || o.status}</Badge>
                    {o.lastError && <p className="mt-1 max-w-xs truncate text-xs text-rose-500" title={o.lastError}>{o.lastError}</p>}
                    {o.attempts > 1 && <p className="text-xs text-slate-400">{o.attempts} {tx('intentos')}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
