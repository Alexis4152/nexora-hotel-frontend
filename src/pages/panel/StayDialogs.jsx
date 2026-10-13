import { useEffect, useState } from 'react'
import { AlertTriangle, Check, DoorOpen, LogIn, LogOut, Plus, Trash2, UserX } from 'lucide-react'
import { Button, Input, Modal, Select, Skeleton, Switch } from '../../components/ui'
import { Textarea } from '../../components/catalog'
import { stayApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { money } from '../../utils/money'
import { tx } from '../../i18n'

const ID_TYPES = { INE: 'INE', PASSPORT: tx('Pasaporte'), LICENSE: tx('Licencia'), OTHER: tx('Otra') }
const ROOM_STATUS_LABEL = { AVAILABLE: tx('Lista'), CLEANING: tx('En limpieza'), OCCUPIED: tx('Ocupada'), MAINTENANCE: tx('Mantenimiento'), OUT_OF_SERVICE: tx('Fuera de servicio') }

function Notice({ tone = 'amber', children }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20',
    red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  }
  return <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ring-1 ${tones[tone]}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>
}

function Check1({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:ring-white/10 dark:hover:bg-white/[.03]">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 ${checked ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 dark:ring-white/20'}`}>
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  )
}

/* ── Check-in ───────────────────────────────────────────────────────────────────── */

export function CheckInDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const [preview, setPreview] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [guests, setGuests] = useState([{ fullName: r.summary.guestName, minor: false, idType: 'INE', idNumber: '' }])
  const [identity, setIdentity] = useState(false)
  const [acceptBalance, setAcceptBalance] = useState(false)
  const [overrideRoom, setOverrideRoom] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    stayApi.checkInPreview(r.summary.id).then((p) => { setPreview(p); setRoomId(p.room ? String(p.room.id) : '') })
      .catch((e) => { toast.error(errorMessage(e)); onClose() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const room = preview?.rooms.find((x) => String(x.id) === roomId) || preview?.room
  const dirty = room && room.status !== 'AVAILABLE'
  const balance = Number(preview?.balance || 0)
  const setGuest = (i, k, v) => setGuests(guests.map((g, j) => (j === i ? { ...g, [k]: v } : g)))

  const submit = async () => {
    setError('')
    if (guests.some((g) => !g.fullName.trim())) { setError(tx('Escribe el nombre de cada huésped registrado')); return }
    setSaving(true)
    try {
      onDone(await stayApi.checkIn(r.summary.id, {
        roomId: roomId ? Number(roomId) : null, identityVerified: identity, acceptPendingBalance: acceptBalance,
        overrideRoomStatus: overrideRoom, notes: notes.trim() || null,
        guests: guests.map((g) => ({ fullName: g.fullName.trim(), minor: g.minor, idType: g.idNumber ? g.idType : null, idNumber: g.idNumber.trim() || null })),
      }))
      toast.success(tx('Llegada registrada. ¡Bienvenido!'))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const blocked = preview && !preview.allowed
  const ready = preview && preview.allowed && identity && (balance <= 0 || acceptBalance) && (!dirty || overrideRoom)

  return (
    <Modal open onClose={onClose} size="max-w-2xl" icon={LogIn} title={tx('Check-in · {0}', r.summary.folio)}
      description={`${r.summary.guestName} · ${r.summary.adults} adulto(s)${r.summary.children ? `, ${r.summary.children} menor(es)` : ''} · ${r.summary.nights} noche(s)`}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button>
        <Button loading={saving} disabled={!ready} onClick={submit}><DoorOpen className="h-4 w-4" /> {tx('Registrar llegada')}</Button></>}>
      {!preview ? <Skeleton className="h-64" /> : blocked ? (
        <div className="space-y-2">{preview.blockers.map((b) => <Notice key={b} tone="red">{b}</Notice>)}</div>
      ) : (
        <div className="space-y-5">
          {preview.warnings.length > 0 && <div className="space-y-2">{preview.warnings.map((w) => <Notice key={w}>{w}</Notice>)}</div>}

          <section>
            <p className="mb-2 text-sm font-semibold">{tx('Habitación')}</p>
            <Select value={roomId} onChange={(e) => { setRoomId(e.target.value); setOverrideRoom(false) }} aria-label={tx('Habitación')}>
              {preview.rooms.map((x) => (
                <option key={x.id} value={x.id}>{x.number} · {x.roomTypeName}{x.current ? ' (asignada)' : ''} — {ROOM_STATUS_LABEL[x.status] || x.status}</option>
              ))}
            </Select>
            {dirty && (
              <div className="mt-2">
                {room.status === 'CLEANING' && can('RESERVATIONS:OVERRIDE') ? (
                  <Check1 checked={overrideRoom} onChange={setOverrideRoom}>{tx('Confirmo que la habitación')} {room.number} {tx('ya está lista (excepción en auditoría)')}</Check1>
                ) : <Notice tone="red">{tx('La habitación')} {room.number} {tx('no está lista. Elige otra de la lista.')}</Notice>}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{tx('Huéspedes registrados')}</p>
              {guests.length < r.summary.adults + r.summary.children && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => setGuests([...guests, { fullName: '', minor: false, idType: 'INE', idNumber: '' }])}>
                  <Plus className="h-3.5 w-3.5" /> {tx('Agregar')}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {guests.map((g, i) => (
                <div key={i} className="grid gap-2 rounded-xl p-2 ring-1 ring-slate-200 dark:ring-white/10 sm:grid-cols-[1.4fr_.8fr_1fr_auto_auto] sm:items-center">
                  <input className="input" placeholder={tx('Nombre completo')} value={g.fullName} maxLength={201} aria-label={tx('Nombre completo')}
                    onChange={(e) => setGuest(i, 'fullName', e.target.value)} />
                  <select className="input" value={g.idType} onChange={(e) => setGuest(i, 'idType', e.target.value)} aria-label={tx('Identificación')}>
                    {Object.entries(ID_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <input className="input" placeholder={tx('Núm. de identificación')} value={g.idNumber} maxLength={40} aria-label={tx('Número de identificación')}
                    onChange={(e) => setGuest(i, 'idNumber', e.target.value.replace(/[^A-Za-z0-9 -]/g, ''))} />
                  <label className="flex items-center gap-2 text-xs text-slate-500"><Switch size="sm" checked={g.minor} onChange={(v) => setGuest(i, 'minor', v)} label={tx('Menor')} /> {tx('Menor')}</label>
                  {guests.length > 1 && <button type="button" className="btn-ghost btn-sm !px-2" aria-label={tx('Quitar huésped')} onClick={() => setGuests(guests.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{tx('El número de identificación se guarda cifrado.')}</p>
          </section>

          <section className="space-y-2">
            <Check1 checked={identity} onChange={setIdentity}>{tx('Verifiqué la identificación oficial del titular')}</Check1>
            {balance > 0 && (
              <Check1 checked={acceptBalance} onChange={setAcceptBalance}>
                {tx('El saldo pendiente de')} <b>{money(balance)}</b> {tx('se liquidará durante la estancia o a la salida')}
              </Check1>
            )}
          </section>
          <Textarea label={tx('Observaciones (opcional)')} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <Notice tone="red">{error}</Notice>}
        </div>
      )}
    </Modal>
  )
}

/* ── Check-out ──────────────────────────────────────────────────────────────────── */

export function CheckOutDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const a = r.account
  const balance = Number(a.balance)
  const [notes, setNotes] = useState('')
  const [allow, setAllow] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (allow && !reason.trim()) { setError(tx('Indica el motivo de la salida con saldo pendiente')); return }
    setSaving(true)
    try {
      onDone(await stayApi.checkOut(r.summary.id, { notes: notes.trim() || null, allowPendingBalance: allow, reason: reason.trim() || null }))
      toast.success(tx('Salida registrada. La habitación pasó a limpieza.'))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={LogOut} title={tx('Check-out · {0}', r.summary.folio)}
      description={tx('Habitación {0} · {1}', r.summary.roomNumber, r.summary.guestName)}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Cancelar')}</Button>
        <Button loading={saving} disabled={balance > 0 && !allow} onClick={submit}><LogOut className="h-4 w-4" /> {tx('Registrar salida')}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-xs text-slate-500">{tx('Cuenta')}</p><p className="font-semibold tabular-nums">{money(a.amountDue)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-xs text-slate-500">{tx('Pagado')}</p><p className="font-semibold tabular-nums text-emerald-600">{money(a.paid)}</p></div>
          <div className={`rounded-xl p-3 ${balance > 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-white/[.03]'}`}>
            <p className="text-xs text-slate-500">{balance < 0 ? tx('A favor') : tx('Saldo')}</p><p className="font-semibold tabular-nums">{money(Math.abs(balance))}</p>
          </div>
        </div>
        {balance > 0 && (
          <>
            <Notice>{tx('Hay un saldo pendiente. Cóbralo antes de registrar la salida.')}</Notice>
            {can('RESERVATIONS:OVERRIDE') && (
              <div className="space-y-2">
                <Check1 checked={allow} onChange={setAllow}>{tx('Autorizar la salida con saldo pendiente (cuenta por cobrar, queda en auditoría)')}</Check1>
                {allow && <Input label={tx('Motivo')} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}
              </div>
            )}
          </>
        )}
        {balance < 0 && <Notice>{tx('El huésped tiene')} {money(-balance)} {tx('a favor: registra el reembolso desde la cuenta.')}</Notice>}
        <Textarea label={tx('Observaciones (opcional)')} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <Notice tone="red">{error}</Notice>}
      </div>
    </Modal>
  )
}

/* ── No-show ────────────────────────────────────────────────────────────────────── */

export function NoShowDialog({ r, onClose, onDone }) {
  const { can } = useAuth()
  const toast = useToast()
  const penalty = Number(r.account.noShowPenalty || 0)
  const [waive, setWaive] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      onDone(await stayApi.noShow(r.summary.id, { waivePenalty: waive, reason: reason.trim() || null }))
      toast.success(tx('Reservación marcada como no presentada'))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={UserX} title={tx('Marcar como no presentada')}
      footer={<><Button variant="secondary" onClick={onClose}>{tx('Volver')}</Button><Button variant="danger" loading={saving} onClick={submit}>{tx('Confirmar no-show')}</Button></>}>
      <div className="space-y-4 text-sm">
        <p className="rounded-xl bg-slate-50 p-3 dark:bg-white/[.03]">
          {tx('La habitación se libera y, según la política que aceptó el huésped, se aplica una penalización de')} <b>{money(waive ? 0 : penalty)}</b>.
        </p>
        {penalty > 0 && can('RESERVATIONS:OVERRIDE') && (
          <label className="flex items-center justify-between gap-3">
            <span>{tx('Condonar la penalización (queda en auditoría)')}</span>
            <Switch checked={waive} onChange={setWaive} label={tx('Condonar penalización')} />
          </label>
        )}
        <Textarea label={tx('Observaciones (opcional)')} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <Notice tone="red">{error}</Notice>}
      </div>
    </Modal>
  )
}
