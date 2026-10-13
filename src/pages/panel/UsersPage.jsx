import { useCallback, useEffect, useState } from 'react'
import {
  Ban, CheckCircle2, KeyRound, Lock, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, UserPlus, Users,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import TemporaryPasswordModal from '../../components/TemporaryPasswordModal'
import UserOverridesModal from './UserOverridesModal'
import {
  ActionMenu, Avatar, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Pagination, Skeleton,
} from '../../components/ui'
import { Can } from '../../guards'
import { adminApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { email as emailRule, maxLength, mxPhone, onlyDigits, personName, required, validate } from '../../utils/validators'
import { timeAgo } from '../../utils/format'
import { tx } from '../../i18n'

const FILTERS = [
  ['all', tx('Todos')],
  ['active', tx('Activos')],
  ['inactive', tx('Inactivos')],
]

export default function UsersPage() {
  const { user: me, can } = useAuth()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [roles, setRoles] = useState([])
  const [editing, setEditing] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [overridesFor, setOverridesFor] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useDebouncedValue(query)

  const load = useCallback(() => {
    const active = filter === 'all' ? undefined : filter === 'active'
    adminApi.users({ q: q || undefined, active, page, size: 12 }).then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, page])

  useEffect(load, [load])
  useEffect(() => setPage(0), [q, filter])
  useEffect(() => {
    adminApi.roles().then(setRoles).catch(() => setRoles([]))
  }, [])

  const runConfirm = async () => {
    setBusy(true)
    try {
      if (confirm.type === 'toggle') {
        await adminApi.setUserActive(confirm.user.id, !confirm.user.active)
        toast.success(confirm.user.active ? tx('Usuario desactivado') : tx('Usuario activado'))
      } else {
        const res = await adminApi.resetUserPassword(confirm.user.id)
        setTempPassword(res)
      }
      setConfirm(null)
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow={tx('Seguridad')} title={tx('Usuarios')}
        description={tx('Personal con acceso al panel del hotel. Cada persona ve solo lo que sus roles permiten.')}
        actions={
          <Can permission="USERS:MANAGE">
            <button className="btn-primary" onClick={() => setEditing({})}>
              <UserPlus className="h-4 w-4" /> {tx('Nuevo usuario')}
            </button>
          </Can>
        } />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[.06] sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Buscar por nombre o correo…')} value={query}
              onChange={(e) => setQuery(e.target.value)} maxLength={100} aria-label={tx('Buscar usuarios')} />
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="tablist">
            {FILTERS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${filter === key ? 'bg-white text-slate-900 shadow-sm dark:bg-ink-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {!data ? (
          <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : data.content.length === 0 ? (
          <EmptyState icon={Users} title={tx('Sin resultados')} description={query ? tx('Prueba con otro nombre o correo.') : tx('Aún no hay usuarios con este filtro.')} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                  <tr><th>{tx('Usuario')}</th><th>{tx('Roles')}</th><th>{tx('Estado')}</th><th>{tx('Último acceso')}</th><th className="w-12" /></tr>
                </thead>
                <tbody>
                  {data.content.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar first={u.firstName} last={u.lastName} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{u.firstName} {u.lastName}{u.id === me.id && <span className="ml-2 text-xs font-normal text-slate-400">{tx('(tú)')}</span>}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadges roles={u.roles} /></td>
                      <td><StatusBadge u={u} /></td>
                      <td className="text-slate-500 dark:text-slate-400">{timeAgo(u.lastLoginAt)}</td>
                      <td>
                        <RowMenu u={u} isSelf={u.id === me.id} canManage={can('USERS:MANAGE')} canPerms={can('ROLES:MANAGE')}
                          onEdit={() => setEditing(u)} onToggle={() => setConfirm({ type: 'toggle', user: u })}
                          onReset={() => setConfirm({ type: 'reset', user: u })} onPerms={() => setOverridesFor(u)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-white/[.06] md:hidden">
              {data.content.map((u) => (
                <li key={u.id} className="flex items-start gap-3 p-4">
                  <Avatar first={u.firstName} last={u.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u.firstName} {u.lastName}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5"><RoleBadges roles={u.roles} /><StatusBadge u={u} /></div>
                  </div>
                  <RowMenu u={u} isSelf={u.id === me.id} canManage={can('USERS:MANAGE')} canPerms={can('ROLES:MANAGE')}
                    onEdit={() => setEditing(u)} onToggle={() => setConfirm({ type: 'toggle', user: u })}
                    onReset={() => setConfirm({ type: 'reset', user: u })} onPerms={() => setOverridesFor(u)} />
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {editing && (
        <UserFormModal user={editing.id ? editing : null} roles={roles} isAdmin={me.roles.includes('ADMIN')}
          onClose={() => setEditing(null)}
          onSaved={(result) => {
            setEditing(null)
            load()
            if (result?.temporaryPassword) setTempPassword(result)
            else toast.success(tx('Usuario actualizado'))
          }} />
      )}

      <TemporaryPasswordModal data={tempPassword} onClose={() => setTempPassword(null)} loginUrl={`${window.location.origin}${window.location.pathname.replace(/\/panel.*$/, '')}/login`} />

      <ConfirmDialog open={!!confirm} loading={busy} onClose={() => setConfirm(null)} onConfirm={runConfirm}
        tone={confirm?.type === 'toggle' && confirm.user.active ? 'danger' : 'primary'}
        title={confirm?.type === 'reset' ? tx('Generar contraseña temporal') : confirm?.user.active ? tx('Desactivar usuario') : tx('Activar usuario')}
        confirmLabel={confirm?.type === 'reset' ? tx('Generar') : confirm?.user.active ? tx('Desactivar') : tx('Activar')}
        message={confirm?.type === 'reset'
          ? tx('Se cerrarán las sesiones de {0} y deberá entrar con la nueva contraseña temporal.', confirm?.user.firstName)
          : confirm?.user.active
            ? tx('{0} perderá el acceso de inmediato, incluso si tiene una sesión abierta.', confirm?.user.firstName)
            : tx('{0} podrá volver a iniciar sesión.', confirm?.user.firstName)} />

      {overridesFor && (
        <UserOverridesModal user={overridesFor} onClose={() => setOverridesFor(null)} onSaved={() => { setOverridesFor(null); toast.success(tx('Permisos actualizados')) }} />
      )}
    </>
  )
}

function RoleBadges({ roles }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => (
        <Badge key={r.id} tone={r.code === 'ADMIN' ? 'gold' : r.code === 'RECEPTIONIST' ? 'brand' : 'slate'}>
          {r.code === 'ADMIN' && <ShieldCheck className="h-3 w-3" />}{r.name}
        </Badge>
      ))}
    </div>
  )
}

function StatusBadge({ u }) {
  if (!u.active) return <Badge tone="slate" dot>{tx('Inactivo')}</Badge>
  if (u.locked) return <Badge tone="red"><Lock className="h-3 w-3" /> {tx('Bloqueado')}</Badge>
  if (u.mustChangePassword) return <Badge tone="amber" dot>{tx('Pendiente de activar')}</Badge>
  return <Badge tone="green" dot>{tx('Activo')}</Badge>
}

function RowMenu({ u, isSelf, canManage, canPerms, onEdit, onToggle, onReset, onPerms }) {
  const isAdmin = u.roles.some((r) => r.code === 'ADMIN')
  const items = [
    canManage && { icon: Pencil, label: tx('Editar'), run: onEdit },
    canPerms && !isSelf && !isAdmin && { icon: SlidersHorizontal, label: tx('Permisos individuales'), run: onPerms },
    canManage && !isSelf && { icon: KeyRound, label: tx('Contraseña temporal'), run: onReset },
    canManage && !isSelf && { icon: u.active ? Ban : CheckCircle2, label: u.active ? tx('Desactivar') : tx('Activar'), run: onToggle, danger: u.active },
  ].filter(Boolean)
  return <ActionMenu items={items} label={tx('Acciones para {0}', u.firstName)} />
}

function UserFormModal({ user, roles, isAdmin, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    roleIds: new Set(user?.roles?.map((r) => r.id) || []),
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => {
    const value = f === 'phone' ? onlyDigits(e.target.value) : e.target.value
    setForm({ ...form, [f]: value })
    setErrors({ ...errors, [f]: null })
  }
  const toggleRole = (id) => {
    const next = new Set(form.roleIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setForm({ ...form, roleIds: next })
    setErrors({ ...errors, roleIds: null })
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate(form, {
      email: user ? [] : [required(tx('el correo')), emailRule, maxLength(150)],
      firstName: [required(tx('el nombre')), personName, maxLength(100)],
      lastName: [required(tx('los apellidos')), personName, maxLength(100)],
      phone: [mxPhone],
      roleIds: [(v) => (v.size === 0 ? tx('Asigna al menos un rol') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone || null,
      roleIds: [...form.roleIds],
    }
    try {
      const result = user ? await adminApi.updateUser(user.id, payload) : await adminApi.createUser({ ...payload, email: form.email.trim() })
      onSaved(result)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={user ? Pencil : Plus} size="max-w-xl"
      title={user ? tx('Editar usuario') : tx('Nuevo usuario')}
      description={user ? user.email : tx('Recibirá una contraseña temporal que deberá cambiar al entrar.')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button>
          <Button loading={saving} onClick={submit}>{user ? tx('Guardar cambios') : tx('Crear usuario')}</Button>
        </>
      }>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!user && <Input label={tx('Correo electrónico')} type="email" required value={form.email} onChange={set('email')} error={errors.email} maxLength={150} autoComplete="off" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={tx('Nombre')} required value={form.firstName} onChange={set('firstName')} error={errors.firstName} maxLength={100} />
          <Input label={tx('Apellidos')} required value={form.lastName} onChange={set('lastName')} error={errors.lastName} maxLength={100} />
        </div>
        <Input label={tx('Celular')} inputMode="numeric" placeholder={tx('10 dígitos')} value={form.phone} onChange={set('phone')}
          error={errors.phone} hint={tx('Opcional · 10 dígitos, sin lada internacional')} />
        <div>
          <p className="label">{tx('Roles')} <span className="text-rose-500">*</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => {
              const selected = form.roleIds.has(r.id)
              const locked = r.code === 'ADMIN' && !isAdmin
              return (
                <button type="button" key={r.id} disabled={locked} onClick={() => toggleRole(r.id)}
                  className={`flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                    {selected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-slate-500">{r.code === 'ADMIN' ? tx('Acceso total') : `${r.permissions.length} permisos`}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {errors.roleIds && <p className="field-error">{errors.roleIds}</p>}
        </div>
      </form>
    </Modal>
  )
}
