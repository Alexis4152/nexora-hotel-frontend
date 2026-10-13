import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button, Modal, Skeleton } from '../../components/ui'
import { adminApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { actionLabel, moduleIcon, moduleLabel } from '../../config/permissions'
import { tx } from '../../i18n'

const OPTIONS = [
  ['INHERIT', tx('Según rol')],
  ['GRANT', tx('Otorgar')],
  ['DENY', tx('Quitar')],
]

/**
 * Ajustes puntuales sobre lo que los roles le dan a una persona. Solo se listan permisos que quien edita tiene
 * (no se puede otorgar lo que uno no tiene) y nunca los reservados al administrador.
 */
export default function UserOverridesModal({ user, onClose, onSaved }) {
  const { can } = useAuth()
  const toast = useToast()
  const [catalog, setCatalog] = useState(null)
  const [detail, setDetail] = useState(null)
  const [choices, setChoices] = useState({})
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([adminApi.permissions(), adminApi.user(user.id)])
      .then(([perms, d]) => {
        setCatalog(perms)
        setDetail(d)
        setChoices(Object.fromEntries(d.overrides.map((o) => [o.code, o.effect])))
        setReason(d.overrides[0]?.reason || '')
      })
      .catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const grouped = useMemo(() => {
    if (!catalog) return []
    const map = new Map()
    catalog.filter((p) => !p.reserved && can(p.code)).forEach((p) => {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module).push(p)
    })
    return [...map.entries()]
  }, [catalog, can])

  const fromRoles = useMemo(() => {
    if (!detail) return new Set()
    // Lo efectivo menos los GRANT/más los DENY actuales = lo que dan los roles.
    const set = new Set(detail.effectivePermissions)
    detail.overrides.forEach((o) => (o.effect === 'GRANT' ? set.delete(o.code) : set.add(o.code)))
    return set
  }, [detail])

  const save = async () => {
    setSaving(true)
    try {
      const overrides = Object.entries(choices).filter(([, v]) => v !== 'INHERIT').map(([code, effect]) => ({ code, effect }))
      await adminApi.setUserOverrides(user.id, overrides, reason.trim() || null)
      onSaved()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const changes = Object.values(choices).filter((v) => v && v !== 'INHERIT').length

  return (
    <Modal open onClose={onClose} icon={SlidersHorizontal} size="max-w-3xl"
      title={tx('Permisos de {0}', user.firstName)}
      description={tx('Ajustes puntuales sobre lo que le dan sus roles. Aplican en su siguiente acción, sin cerrar sesión.')}
      footer={
        <>
          <span className="mr-auto self-center text-xs text-slate-500">{changes} {tx('ajuste(s)')}</span>
          <button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button>
          <Button loading={saving} onClick={save}>{tx('Guardar permisos')}</Button>
        </>
      }>
      {!catalog || !detail ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([module, perms]) => {
            const Icon = moduleIcon(module)
            return (
              <section key={module}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-brand-500" /> {moduleLabel(module)}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 dark:divide-white/[.06] dark:ring-white/10">
                  {perms.map((p) => {
                    const value = choices[p.code] || 'INHERIT'
                    return (
                      <li key={p.code} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{actionLabel(p.action)}</p>
                          <p className="text-xs text-slate-500">
                            {p.description} · {fromRoles.has(p.code) ? tx('Su rol lo incluye') : tx('Su rol no lo incluye')}
                          </p>
                        </div>
                        <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/5">
                          {OPTIONS.map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setChoices({ ...choices, [p.code]: key })}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${value === key
                                ? key === 'GRANT' ? 'bg-emerald-600 text-white' : key === 'DENY' ? 'bg-rose-600 text-white' : 'bg-white text-slate-900 shadow-sm dark:bg-ink-800 dark:text-white'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          <div>
            <label className="label" htmlFor="ov-reason">{tx('Motivo (queda en la bitácora)')}</label>
            <textarea id="ov-reason" className="input h-20 py-2.5" maxLength={300} value={reason}
              onChange={(e) => setReason(e.target.value)} placeholder={tx('Ej. Cubre el turno nocturno durante vacaciones')} />
          </div>
        </div>
      )}
    </Modal>
  )
}
