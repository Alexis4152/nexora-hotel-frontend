import { useEffect, useMemo, useState } from 'react'
import { Check, Crown, Lock, Plus, RotateCcw, ShieldCheck, Trash2, TriangleAlert, Users } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Badge, Button, ConfirmDialog, Input, Modal, Skeleton } from '../../components/ui'
import { adminApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { actionLabel, moduleIcon, moduleLabel } from '../../config/permissions'
import { maxLength, required, validate } from '../../utils/validators'
import { tx } from '../../i18n'

/**
 * Administración → Seguridad → Roles y permisos. Los cambios se guardan en PostgreSQL y aplican en la siguiente
 * acción de cada usuario del rol, sin redeploy ni cierre de sesión. El backend vuelve a validar todo:
 * reservados, anti-escalación y que el Administrador conserve el acceso total.
 */
export default function RolesPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [roles, setRoles] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async (keepId) => {
    try {
      const [r, p] = await Promise.all([adminApi.roles(), adminApi.permissions()])
      setRoles(r)
      setCatalog(p)
      const next = r.find((x) => x.id === keepId) || r.find((x) => x.code === 'RECEPTIONIST') || r[0]
      setSelectedId(next?.id)
      setDraft(new Set(next?.permissions || []))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const role = roles?.find((r) => r.id === selectedId)
  const original = useMemo(() => new Set(role?.permissions || []), [role])
  const dirty = role && (draft.size !== original.size || [...draft].some((c) => !original.has(c)))
  const modules = useMemo(() => {
    const map = new Map()
    catalog.forEach((p) => {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module).push(p)
    })
    return [...map.entries()]
  }, [catalog])

  const select = (r) => {
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return
    setSelectedId(r.id)
    setDraft(new Set(r.permissions))
  }

  const toggle = (code) => {
    const next = new Set(draft)
    next.has(code) ? next.delete(code) : next.add(code)
    setDraft(next)
  }

  const toggleModule = (perms) => {
    const editable = perms.filter((p) => !p.reserved && (can(p.code) || original.has(p.code)))
    const allOn = editable.every((p) => draft.has(p.code))
    const next = new Set(draft)
    editable.forEach((p) => (allOn ? next.delete(p.code) : next.add(p.code)))
    setDraft(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      await adminApi.updateRole(role.id, { name: role.name, description: role.description, permissions: [...draft] })
      toast.success(tx('Permisos de {0} guardados. Aplican de inmediato.', role.name))
      await load(role.id)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      await adminApi.deleteRole(role.id)
      toast.success(tx('Rol eliminado'))
      setDeleting(false)
      await load()
    } catch (e) {
      toast.error(errorMessage(e))
      setDeleting(false)
    }
  }

  const added = role ? [...draft].filter((c) => !original.has(c)).length : 0
  const removed = role ? [...original].filter((c) => !draft.has(c)).length : 0

  return (
    <>
      <PageHeader eyebrow={tx('Seguridad')} title={tx('Roles y permisos')}
        description={tx('Define qué puede ver y hacer cada rol. Los cambios aplican al instante para todas las personas con ese rol.')}
        actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {tx('Nuevo rol')}</button>} />

      {!roles ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]"><Skeleton className="h-80" /><Skeleton className="h-[520px]" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-2 lg:sticky lg:top-24 lg:self-start">
            {roles.map((r) => {
              const active = r.id === selectedId
              return (
                <button key={r.id} onClick={() => select(r)}
                  className={`w-full rounded-2xl p-4 text-left transition ${active ? 'bg-ink-900 text-white shadow-xl ring-1 ring-white/10 dark:bg-brand-500/10 dark:ring-brand-400/30' : 'card hover:-translate-y-0.5 hover:shadow-lg'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`grid h-9 w-9 place-items-center rounded-xl ${r.code === 'ADMIN' ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950' : active ? 'bg-white/10 text-brand-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300'}`}>
                        {r.code === 'ADMIN' ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className={`text-xs ${active ? 'text-slate-400' : 'text-slate-500'}`}>{r.system ? tx('Rol del sistema') : tx('Personalizado')}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-3 flex items-center gap-3 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.userCount}</span>
                    <span>{r.code === 'ADMIN' ? tx('Todos los permisos') : tx('{0} de {1} permisos', r.permissions.length, catalog.length)}</span>
                  </div>
                </button>
              )
            })}
          </aside>

          {role && (
            <section className="card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-6 dark:border-white/[.06] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{role.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{role.description || tx('Sin descripción')}</p>
                </div>
                {!role.system && (
                  <button className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleting(true)}>
                    <Trash2 className="h-4 w-4" /> {tx('Eliminar rol')}
                  </button>
                )}
              </div>

              {!role.editable && (
                <div className="mx-6 mt-6 flex gap-3 rounded-2xl bg-gradient-to-r from-gold-300/20 to-transparent p-4 text-sm ring-1 ring-gold-500/30">
                  <Crown className="h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" />
                  <p>{tx('El')} <b>{tx('Administrador')}</b> {tx('siempre tiene acceso total al hotel. Así el hotel nunca se queda sin quién lo administre.')}</p>
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-white/[.06]">
                {modules.map(([module, perms]) => {
                  const Icon = moduleIcon(module)
                  const onCount = perms.filter((p) => draft.has(p.code)).length
                  return (
                    <div key={module} className="grid gap-3 px-6 py-4 md:grid-cols-[220px_1fr] md:items-center">
                      <button type="button" disabled={!role.editable} onClick={() => toggleModule(perms)}
                        className="flex items-center gap-3 text-left disabled:cursor-default" title={role.editable ? tx('Activar/desactivar todo el módulo') : undefined}>
                        <div className={`grid h-9 w-9 place-items-center rounded-xl ${onCount ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{moduleLabel(module)}</p>
                          <p className="text-[11px] text-slate-500">{onCount}/{perms.length} {tx('activos')}</p>
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => {
                          const on = draft.has(p.code)
                          const locked = !role.editable || p.reserved || (!can(p.code) && !original.has(p.code))
                          const reason = p.reserved ? tx('Reservado al Administrador') : !can(p.code) ? tx('No puedes otorgar un permiso que no tienes') : p.description
                          return (
                            <button key={p.code} type="button" disabled={locked} onClick={() => toggle(p.code)} title={reason}
                              aria-pressed={on}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed ${on
                                ? 'bg-brand-600 text-white ring-brand-600 shadow-sm'
                                : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-400 dark:bg-white/[.03] dark:text-slate-300 dark:ring-white/10'} ${locked && !on ? 'opacity-50' : ''}`}>
                              {p.reserved ? <Lock className="h-3 w-3" /> : on ? <Check className="h-3 w-3" /> : null}
                              {actionLabel(p.action)}
                              {p.sensitive && !p.reserved && <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-gold-300' : 'bg-gold-500'}`} title={tx('Sensible')} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-[11px] text-slate-500 dark:border-white/[.06] dark:bg-white/[.02]">
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> {tx('Sensible: queda en auditoría')}</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> {tx('Reservado al Administrador')}</span>
              </div>
            </section>
          )}
        </div>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 animate-fade-up">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl bg-ink-900 p-3 pl-5 text-white shadow-2xl ring-1 ring-white/10">
            <TriangleAlert className="h-5 w-5 shrink-0 text-gold-400" />
            <p className="flex-1 text-sm">
              {tx('Cambios sin guardar ·')} <span className="text-emerald-400">+{added}</span> <span className="text-rose-400">−{removed}</span>
            </p>
            <button className="btn-ghost btn-sm text-slate-300 hover:bg-white/10" onClick={() => setDraft(new Set(original))}>
              <RotateCcw className="h-3.5 w-3.5" /> {tx('Descartar')}
            </button>
            <Button size="sm" loading={saving} onClick={save}>{tx('Guardar')}</Button>
          </div>
        </div>
      )}

      {creating && (
        <CreateRoleModal roles={roles} onClose={() => setCreating(false)}
          onCreated={async (r) => { setCreating(false); toast.success(tx('Rol creado')); await load(r.id) }} />
      )}
      <ConfirmDialog open={deleting} tone="danger" title={tx('Eliminar rol')} confirmLabel={tx('Eliminar')}
        message={role?.userCount ? tx('Este rol tiene {0} usuario(s). Reasígnalos antes de eliminarlo.', role.userCount) : tx('Se eliminará el rol "{0}".', role?.name)}
        onClose={() => setDeleting(false)} onConfirm={remove} />
    </>
  )
}

function CreateRoleModal({ roles, onClose, onCreated }) {
  const { can } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', description: '', template: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, { name: [required(tx('el nombre del rol')), maxLength(80), (v) => (v.trim().length < 3 ? tx('Mínimo 3 caracteres') : null)] })
    setErrors(found)
    if (Object.keys(found).length) return
    const base = roles.find((r) => String(r.id) === form.template)
    setSaving(true)
    try {
      const created = await adminApi.createRole({
        name: form.name.trim(),
        description: form.description.trim() || null,
        // Al copiar una plantilla solo se toman permisos que quien crea puede otorgar.
        permissions: (base?.permissions || []).filter((c) => can(c) && base?.code !== 'ADMIN'),
      })
      onCreated(created)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Nuevo rol')} icon={ShieldCheck}
      description={tx('Por ejemplo: Ama de llaves, Mantenimiento, Gerente de noche.')}
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={submit}>{tx('Crear rol')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label={tx('Nombre')} required value={form.name} maxLength={80} error={errors.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({}) }} />
        <Input label={tx('Descripción')} value={form.description} maxLength={200}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div>
          <p className="label">{tx('Partir de')}</p>
          <div className="flex flex-wrap gap-2">
            <TemplateChip active={!form.template} onClick={() => setForm({ ...form, template: '' })}>{tx('Sin permisos')}</TemplateChip>
            {roles.filter((r) => r.code !== 'ADMIN').map((r) => (
              <TemplateChip key={r.id} active={form.template === String(r.id)} onClick={() => setForm({ ...form, template: String(r.id) })}>
                {r.name} <Badge tone="slate" className="ml-1">{r.permissions.length}</Badge>
              </TemplateChip>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

function TemplateChip({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${active ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-500/10 dark:text-brand-300' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
      {children}
    </button>
  )
}
