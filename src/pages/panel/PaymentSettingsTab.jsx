import { useEffect, useState } from 'react'
import { Banknote, Copy, CreditCard, Globe, KeyRound, Landmark, PlugZap, RefreshCw, Save, ShieldCheck, Webhook } from 'lucide-react'
import { Badge, Button, Input, Modal, PasswordInput, Skeleton, Switch } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { paymentSettingsApi } from '../../api'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { tx } from '../../i18n'

/**
 * Métodos de cobro y pasarela (Openpay). La llave privada se guarda cifrada y nunca se vuelve a mostrar: el campo
 * vacío conserva la guardada. En modo pruebas (sandbox) no se mueve dinero real.
 */
export default function PaymentSettingsTab() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [privateKey, setPrivateKey] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hook, setHook] = useState(null)

  useEffect(() => { paymentSettingsApi.get().then(setData).catch((e) => toast.error(errorMessage(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <Skeleton className="h-96" />
  const toggle = (k) => (v) => setData({ ...data, [k]: v })

  const save = async () => {
    const e = {}
    if (data.onlineEnabled && !data.merchantId) e.merchantId = tx('Escribe el ID de comercio')
    if (data.onlineEnabled && !data.privateKeySet && !privateKey) e.privateKey = tx('Escribe la llave privada')
    if (privateKey && !/^sk_[A-Za-z0-9]{10,100}$/.test(privateKey.trim())) e.privateKey = tx('La llave privada de Openpay empieza con sk_')
    if (data.publicKey && !/^pk_[A-Za-z0-9]{10,90}$/.test(data.publicKey.trim())) e.publicKey = tx('La llave pública empieza con pk_')
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      setData(await paymentSettingsApi.update({
        cashEnabled: data.cashEnabled, cardEnabled: data.cardEnabled, transferEnabled: data.transferEnabled,
        onlineEnabled: data.onlineEnabled, sandbox: data.sandbox, merchantId: data.merchantId?.trim() || null,
        privateKey: privateKey.trim() || null, publicKey: data.publicKey?.trim() || null,
        transferInstructions: data.transferInstructions?.trim() || null,
      }))
      setPrivateKey('')
      toast.success(tx('Configuración de cobro guardada'))
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      toast.success((await paymentSettingsApi.test()).message)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setTesting(false)
    }
  }

  const regenerate = async () => {
    try {
      setHook(await paymentSettingsApi.regenerateWebhook())
      setData({ ...data, webhookPasswordSet: true, webhookVerification: null })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 animate-fade-up">
        <h2 className="font-display text-lg font-semibold">{tx('Métodos en recepción')}</h2>
        <p className="mb-5 text-sm text-slate-500">{tx('Lo que el personal puede registrar en la caja y lo que verá el huésped como formas de pago.')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MethodToggle icon={Banknote} label={tx('Efectivo')} checked={data.cashEnabled} onChange={toggle('cashEnabled')} />
          <MethodToggle icon={CreditCard} label={tx('Tarjeta (terminal)')} checked={data.cardEnabled} onChange={toggle('cardEnabled')} />
          <MethodToggle icon={Landmark} label={tx('Transferencia')} checked={data.transferEnabled} onChange={toggle('transferEnabled')} />
        </div>
        {data.transferEnabled && (
          <div className="mt-4">
            <Textarea label={tx('Datos para transferencia (los ve el huésped)')} rows={3} maxLength={1000} value={data.transferInstructions || ''}
              placeholder={tx('Banco, titular, CLABE y la referencia a usar (ej. el folio de la reservación)')}
              onChange={(e) => setData({ ...data, transferInstructions: e.target.value })} />
          </div>
        )}
      </section>

      <section className="card p-6 animate-fade-up">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Globe className="h-5 w-5" /></div>
            <div>
              <h2 className="font-display text-lg font-semibold">{tx('Pago en línea · Openpay')}</h2>
              <p className="text-sm text-slate-500">{tx('El huésped paga en la página segura de Openpay. Nunca se capturan ni guardan datos de tarjeta en este sistema.')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.sandbox ? <Badge tone="amber" dot>{tx('Modo pruebas')}</Badge> : <Badge tone="red" dot>{tx('Producción · cobros reales')}</Badge>}
            {data.onlineUsable ? <Badge tone="green" dot>{tx('Activo')}</Badge> : <Badge tone="slate" dot>{tx('Inactivo')}</Badge>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl p-3 text-sm ring-1 ring-slate-200 dark:ring-white/10 md:col-span-2">
            <span><b>{tx('Cobrar en línea')}</b><br /><span className="text-slate-500">{tx('Si la política pide anticipo, las reservaciones del portal quedan “pendientes de pago” y se confirman solas al verificarse el pago.')}</span></span>
            <Switch checked={data.onlineEnabled} onChange={toggle('onlineEnabled')} label={tx('Cobrar en línea')} />
          </label>
          <Input label={tx('ID de comercio (Merchant ID)')} icon={KeyRound} value={data.merchantId || ''} error={errors.merchantId} maxLength={40}
            onChange={(e) => setData({ ...data, merchantId: e.target.value.replace(/[^A-Za-z0-9]/g, '') })} />
          <PasswordInput label={tx('Llave privada (sk_…)')} value={privateKey} error={errors.privateKey} maxLength={200} autoComplete="off"
            hint={data.privateKeySet ? tx('Ya hay una llave guardada (cifrada); déjalo vacío para conservarla') : tx('Se guarda cifrada y no se vuelve a mostrar')}
            onChange={(e) => setPrivateKey(e.target.value)} />
          <Input label={tx('Llave pública (pk_…, opcional)')} value={data.publicKey || ''} error={errors.publicKey} maxLength={100}
            onChange={(e) => setData({ ...data, publicKey: e.target.value })} />
          <label className="flex items-center justify-between gap-3 rounded-xl p-3 text-sm ring-1 ring-slate-200 dark:ring-white/10">
            <span><b>{tx('Modo pruebas (sandbox)')}</b><br /><span className="text-slate-500">{tx('Usa las tarjetas de prueba de Openpay; no se cobra dinero real.')}</span></span>
            <Switch checked={data.sandbox} onChange={toggle('sandbox')} label={tx('Modo pruebas')} />
          </label>
        </div>
        {!data.sandbox && data.onlineEnabled && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {tx('Estás en producción: los cargos serán reales. Verifica que las llaves sean las de producción de tu cuenta Openpay.')}
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-white/[.03]">
          <p className="flex items-center gap-2 text-sm font-semibold"><Webhook className="h-4 w-4" /> {tx('Webhook (notificaciones de Openpay)')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {tx('Regístralo en el panel de Openpay con autenticación básica. Aun así, cada notificación se verifica consultando el cargo directamente a Openpay: el contenido del webhook nunca basta para marcar un pago como cobrado.')}
          </p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[110px_1fr]">
            <span className="text-slate-500">URL</span><CopyLine value={data.webhookUrl} />
            <span className="text-slate-500">{tx('Usuario')}</span><CopyLine value={data.webhookUser || tx('— (guarda la configuración para generarlo)')} />
            <span className="text-slate-500">{tx('Contraseña')}</span><span>{data.webhookPasswordSet ? tx('Generada (oculta)') : '—'}</span>
            {data.webhookVerification && <><span className="text-slate-500">{tx('Verificación')}</span><CopyLine value={data.webhookVerification} /></>}
          </div>
          <Button size="sm" variant="secondary" className="mt-3" onClick={regenerate}><RefreshCw className="h-4 w-4" /> {tx('Generar credenciales del webhook')}</Button>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" loading={testing} disabled={!data.privateKeySet} onClick={test}><PlugZap className="h-4 w-4" /> {tx('Probar conexión')}</Button>
        </div>
      </section>

      <div className="flex justify-end"><Button loading={saving} onClick={save}><Save className="h-4 w-4" /> {tx('Guardar cambios')}</Button></div>

      {hook && (
        <Modal open onClose={() => setHook(null)} icon={ShieldCheck} title={tx('Credenciales del webhook')}
          description={tx('Cópialas ahora en Openpay (Configuración → Webhooks). La contraseña no se volverá a mostrar.')}
          footer={<Button onClick={() => setHook(null)}>{tx('Ya las copié')}</Button>}>
          <div className="grid gap-2 text-sm sm:grid-cols-[100px_1fr]">
            <span className="text-slate-500">URL</span><CopyLine value={hook.url} />
            <span className="text-slate-500">{tx('Usuario')}</span><CopyLine value={hook.user} />
            <span className="text-slate-500">{tx('Contraseña')}</span><CopyLine value={hook.password} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function MethodToggle({ icon: Icon, label, checked, onChange }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition ${checked ? 'bg-brand-50/60 ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-400/30' : 'ring-slate-200 dark:ring-white/10'}`}>
      <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </label>
  )
}

function CopyLine({ value }) {
  const toast = useToast()
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">{value}</code>
      <button type="button" className="btn-ghost btn-sm !px-2" aria-label={tx('Copiar')} onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(tx('Copiado')))}>
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}
