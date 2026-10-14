import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BedDouble, Ban, CalendarX2, CheckCircle2, History, Layers, LogIn, LogOut, Pencil, Plus, Search, Sparkles, Trash2,
  Users, Wrench,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { ActionMenu, Badge, Button, ConfirmDialog, EmptyState, Input, Modal, Select, Skeleton } from '../../components/ui'
import { BED_TYPES, DynamicIcon, Gallery, IconPicker, ImageDrop, ROOM_STATUS, Tabs, Textarea, moveIds } from '../../components/catalog'
import { fmtDate, todayIn } from '../../components/reservations'
import ReservationDrawer from './ReservationDrawer'
import { Can } from '../../guards'
import { inventoryApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage, fieldErrors } from '../../api/client'
import { money, moneyInput } from '../../utils/money'
import { formatDateTime } from '../../utils/format'
import { maxLength, required, validate } from '../../utils/validators'
import { tx } from '../../i18n'

export default function RoomsPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  // Quien solo limpia empieza en su tablero. ?tab=limpieza lo abre también (avisos de la campanita).
  const [tab, setTab] = useState(() => (params.get('tab') === 'limpieza' || !can('ROOMS:VIEW') ? 'housekeeping' : 'rooms'))
  const [rooms, setRooms] = useState(null)
  const [types, setTypes] = useState(null)
  const [amenities, setAmenities] = useState([])
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      const [r, t, a] = await Promise.all([inventoryApi.rooms(), can('ROOMS:VIEW') ? inventoryApi.roomTypes() : [], can('ROOMS:VIEW') ? inventoryApi.amenities() : []])
      setRooms(r)
      setTypes(t)
      setAmenities(a)
    } catch (e) {
      toast.error(errorMessage(e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (params.get('tab') !== 'limpieza') return
    setTab('housekeeping')
    load() // llegó por un aviso: hay algo nuevo que limpiar
    setParams((p) => { p.delete('tab'); return p }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const tabs = [
    { key: 'rooms', label: tx('Habitaciones'), icon: BedDouble, count: rooms?.filter((r) => r.active).length },
    { key: 'housekeeping', label: tx('Limpieza'), icon: Sparkles, count: rooms?.filter((r) => r.active && r.status === 'CLEANING').length },
    ...(can('ROOMS:VIEW') ? [
      { key: 'types', label: tx('Tipos'), icon: Layers, count: types?.filter((t) => t.active).length },
      { key: 'amenities', label: tx('Amenidades'), icon: Sparkles, count: amenities.length },
    ] : []),
  ]

  return (
    <>
      <PageHeader eyebrow={tx('Operación')} title={tx('Habitaciones')}
        description={tx('Inventario, estado de limpieza, bloqueos por mantenimiento y fotografías.')} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'rooms' && <RoomsTab rooms={rooms} types={types || []} reload={load} />}
      {tab === 'housekeeping' && <HousekeepingTab rooms={rooms} reload={load} />}
      {tab === 'types' && <TypesTab types={types} amenities={amenities} reload={load} />}
      {tab === 'amenities' && <AmenitiesTab amenities={amenities} reload={load} />}
    </>
  )
}

/* ── Limpieza ───────────────────────────────────────────────────────────────────── */

/** Tablero de limpieza: el check-out deja la habitación "en limpieza"; aquí se marca lista con un clic. */
function HousekeepingTab({ rooms, reload }) {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const today = todayIn(hotel.timezone)
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  if (!rooms) return <Skeleton className="h-64" />
  const editable = can('HOUSEKEEPING:UPDATE') || can('ROOMS:UPDATE')
  const active = rooms.filter((r) => r.active)
  const columns = [
    ['CLEANING', tx('Por limpiar'), 'from-amber-400 to-amber-600', tx('Ninguna pendiente')],
    ['OCCUPIED', tx('Ocupadas'), 'from-brand-500 to-brand-700', tx('Sin huéspedes en casa')],
    ['AVAILABLE', tx('Listas'), 'from-emerald-500 to-emerald-700', tx('Ninguna lista')],
  ]
  const move = async (room, status) => {
    setBusy(room.id)
    try {
      await inventoryApi.changeStatus(room.id, status, status === 'AVAILABLE' ? tx('Limpieza terminada') : tx('Enviada a limpieza'))
      toast.success(status === 'AVAILABLE' ? tx('Habitación {0} lista', room.number) : tx('Habitación {0} enviada a limpieza', room.number))
      await reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {columns.map(([status, title, tone, empty]) => {
        // Primero lo urgente: por limpiar o listas con llegada hoy; ocupadas, las que salen antes.
        const urgency = (r) => (status === 'OCCUPIED' ? r.currentStay?.checkOut || '9999' : r.nextArrival?.checkIn === today ? '0' : '1')
        const list = active.filter((r) => r.status === status).sort((a, b) => urgency(a).localeCompare(urgency(b)))
        return (
          <section key={status} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-white/[.06]">
              <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${tone}`} />
              <h2 className="flex-1 font-semibold">{title}</h2>
              <span className="font-display text-2xl font-semibold tabular-nums">{list.length}</span>
            </div>
            {list.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">{empty}</p> : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[.06]">
                {list.map((room) => (
                  <li key={room.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 font-display text-sm font-semibold dark:bg-white/5">{room.number}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{room.roomTypeName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {room.floor ? tx('Piso {0}', room.floor) : '—'}
                        {status === 'OCCUPIED' && room.currentStay && (
                          <span className={room.currentStay.checkOut <= today ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}> · {departureText(room.currentStay, today)}</span>
                        )}
                        {status !== 'OCCUPIED' && room.nextArrival?.checkIn === today && (
                          <span className="font-semibold text-brand-600 dark:text-brand-300"> · {tx('Llega hoy')}</span>
                        )}
                      </p>
                    </div>
                    {editable && status === 'CLEANING' && (
                      <Button size="sm" loading={busy === room.id} onClick={() => move(room, 'AVAILABLE')}><CheckCircle2 className="h-4 w-4" /> {tx('Lista')}</Button>
                    )}
                    {editable && status === 'AVAILABLE' && (
                      <Button size="sm" variant="ghost" loading={busy === room.id} onClick={() => move(room, 'CLEANING')}><Sparkles className="h-4 w-4" /> {tx('Limpiar')}</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ── Habitaciones ───────────────────────────────────────────────────────────────── */

function RoomsTab({ rooms, types, reload }) {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const today = todayIn(hotel.timezone)
  const toast = useToast()
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [statusFor, setStatusFor] = useState(null)
  const [blockFor, setBlockFor] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [openRes, setOpenRes] = useState(null) // reservación abierta encima, sin salir de Habitaciones

  // "Salen hoy" incluye a quien ya debía haber salido; "Llegan hoy", la siguiente reservación de la habitación.
  const departing = (r) => r.active && !!r.currentStay && r.currentStay.checkOut <= today
  const arriving = (r) => r.active && r.nextArrival?.checkIn === today
  const visible = useMemo(() => (rooms || []).filter((r) =>
    (filter === 'ALL' ? r.active : filter === 'INACTIVE' ? !r.active : filter === 'DEPARTING' ? departing(r)
      : filter === 'ARRIVING' ? arriving(r) : r.active && r.status === filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    && (!query || r.number.toLowerCase().includes(query.toLowerCase()) || r.roomTypeName.toLowerCase().includes(query.toLowerCase()))), [rooms, filter, query, today])

  const floors = useMemo(() => {
    const map = new Map()
    visible.forEach((r) => {
      const key = r.floor || tx('Sin piso')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return [...map.entries()]
  }, [visible])

  const counts = useMemo(() => {
    const c = { ALL: 0, INACTIVE: 0, DEPARTING: 0, ARRIVING: 0 }
    ;(rooms || []).forEach((r) => {
      if (!r.active) c.INACTIVE += 1
      else {
        c.ALL += 1
        c[r.status] = (c[r.status] || 0) + 1
        if (departing(r)) c.DEPARTING += 1
        if (arriving(r)) c.ARRIVING += 1
      }
    })
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, today])

  if (!rooms) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>

  const toggleActive = async () => {
    try {
      await inventoryApi.setRoomActive(confirm.id, !confirm.active)
      toast.success(confirm.active ? tx('Habitación desactivada') : tx('Habitación activada'))
      setConfirm(null)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
      setConfirm(null)
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} count={counts.ALL}>{tx('Todas')}</FilterChip>
          {Object.entries(ROOM_STATUS).map(([k, s]) => (
            <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)} count={counts[k] || 0} dot={s.dot}>{s.label}</FilterChip>
          ))}
          <FilterChip active={filter === 'DEPARTING'} onClick={() => setFilter('DEPARTING')} count={counts.DEPARTING} icon={LogOut}>{tx('Salen hoy')}</FilterChip>
          <FilterChip active={filter === 'ARRIVING'} onClick={() => setFilter('ARRIVING')} count={counts.ARRIVING} icon={LogIn}>{tx('Llegan hoy')}</FilterChip>
          {counts.INACTIVE > 0 && <FilterChip active={filter === 'INACTIVE'} onClick={() => setFilter('INACTIVE')} count={counts.INACTIVE}>{tx('Desactivadas')}</FilterChip>}
        </div>
        <div className="flex flex-1 gap-2 lg:justify-end">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Número o tipo…')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tx('Buscar habitación')} />
          </div>
          <Can permission="ROOMS:CREATE">
            <button className="btn-primary" onClick={() => setEditing({})} disabled={!types.some((t) => t.active)}
              title={types.some((t) => t.active) ? undefined : tx('Primero crea un tipo de habitación')}>
              <Plus className="h-4 w-4" /> {tx('Habitación')}
            </button>
          </Can>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="card">
          <EmptyState icon={BedDouble} title={tx('Aún no hay habitaciones')}
            description={types.length ? tx('Agrega la primera habitación del hotel.') : tx('Empieza por crear un tipo de habitación (Individual, Doble, Suite…) en la pestaña Tipos.')} />
        </div>
      ) : visible.length === 0 ? (
        <div className="card"><EmptyState icon={Search} title={tx('Sin resultados')} /></div>
      ) : floors.map(([floor, list]) => (
        <section key={floor} className="mb-7">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">
            <span className="h-px w-6 bg-slate-300 dark:bg-white/15" /> {floor === tx('Sin piso') ? floor : tx('Piso {0}', floor)}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {list.map((r) => (
              <RoomCard key={r.id} room={r} today={today} onOpenReservation={setOpenRes} onEdit={() => setEditing(r)} onStatus={() => setStatusFor(r)}
                onBlock={() => setBlockFor(r)} onHistory={() => setHistoryFor(r)} onToggle={() => setConfirm(r)} can={can} />
            ))}
          </div>
        </section>
      ))}

      {editing && <RoomFormModal room={editing.id ? editing : null} types={types} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {statusFor && <StatusModal room={statusFor} today={today} onClose={() => setStatusFor(null)} onSaved={() => { setStatusFor(null); reload() }}
        onOpenReservation={(id) => { setStatusFor(null); setOpenRes(id) }} />}
      {blockFor && <BlockModal room={blockFor} onClose={() => { setBlockFor(null); reload() }} />}
      {historyFor && <HistoryModal room={historyFor} onClose={() => setHistoryFor(null)} />}
      {/* Lo que se haga en la reservación (check-out, cambio de fechas…) cambia el estado de las habitaciones: se recarga. */}
      {openRes && <ReservationDrawer id={openRes} onClose={() => setOpenRes(null)} onChanged={reload} />}
      <ConfirmDialog open={!!confirm} tone={confirm?.active ? 'danger' : 'primary'} onClose={() => setConfirm(null)} onConfirm={toggleActive}
        title={confirm?.active ? tx('Desactivar habitación {0}', confirm?.number) : tx('Activar habitación {0}', confirm?.number)}
        confirmLabel={confirm?.active ? tx('Desactivar') : tx('Activar')}
        message={confirm?.active ? tx('Dejará de ofrecerse para nuevas reservaciones. Si tiene reservaciones vigentes o futuras, el sistema no lo permitirá.') : tx('Volverá a estar disponible para reservaciones.')} />
    </>
  )
}

function FilterChip({ active, onClick, count, dot, icon: Icon, children }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition ${active ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'bg-white ring-slate-200 hover:ring-slate-300 dark:bg-white/[.03] dark:ring-white/10'}`}>
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
      {children}
      <span className={`tabular-nums ${active ? 'opacity-70' : 'text-slate-400'}`}>{count}</span>
    </button>
  )
}

function RoomCard({ room, today, onOpenReservation, onEdit, onStatus, onBlock, onHistory, onToggle, can }) {
  const s = ROOM_STATUS[room.status]
  const cover = room.images[0]?.url
  const block = room.activeBlocks[0]
  const actions = [
    can('ROOMS:UPDATE') && { icon: Pencil, label: tx('Editar y fotos'), run: onEdit },
    (can('HOUSEKEEPING:UPDATE') || can('ROOMS:UPDATE')) && room.active && { icon: Sparkles, label: tx('Cambiar estado'), run: onStatus },
    can('ROOMS:BLOCK') && room.active && { icon: CalendarX2, label: tx('Bloqueos'), run: onBlock },
    { icon: History, label: tx('Historial de estado'), run: onHistory },
    can('ROOMS:DELETE') && { icon: room.active ? Ban : CheckCircle2, label: room.active ? tx('Desactivar') : tx('Activar'), run: onToggle, danger: room.active },
  ].filter(Boolean)
  return (
    <article className={`card group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl ${room.active ? '' : 'opacity-60'}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${s.dot}`} />
      <div className="flex items-start gap-4 p-5 pl-6">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : <BedDouble className="h-6 w-6 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-semibold leading-none">{room.number}</p>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{room.name || room.roomTypeName}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone={s.tone} dot>{s.label}</Badge>
            {block && <Badge tone="red"><Wrench className="h-3 w-3" /> {tx('Bloqueo')} {block.startsOn.slice(5)}</Badge>}
          </div>
        </div>
        <ActionMenu items={actions} label={tx('Acciones de la habitación {0}', room.number)} />
      </div>
      {room.active && <RoomAgenda room={room} today={today} onOpen={onOpenReservation} />}
    </article>
  )
}

const dayLabel = (iso) => fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })

/** Cuándo se desocupa (o debió desocuparse) una habitación ocupada. */
function departureText(stay, today) {
  if (stay.checkOut < today) return tx('Debió salir el {0}', dayLabel(stay.checkOut))
  return stay.checkOut === today ? tx('Sale hoy') : tx('Sale el {0}', dayLabel(stay.checkOut))
}

/**
 * Lo que recepción y limpieza necesitan saber de la habitación hoy: quién está y cuándo sale, quién llega después
 * y, si está bloqueada, por qué y hasta cuándo. El nombre y el enlace a la reservación solo vienen del servidor si
 * la persona puede ver reservaciones; limpieza ve únicamente las fechas.
 */
function RoomAgenda({ room, today, onOpen }) {
  const current = room.currentStay
  const next = room.nextArrival
  const block = room.activeBlocks.find((b) => b.startsOn <= today && b.endsOn > today)
  const rows = []
  if (current) {
    const late = current.checkOut < today
    rows.push({
      key: 'out', icon: LogOut, stay: current, strong: current.checkOut <= today,
      tone: late ? 'text-rose-600 dark:text-rose-400' : current.checkOut === today ? 'text-amber-600 dark:text-amber-400' : '',
      text: departureText(current, today),
    })
  }
  if (next) {
    const arrivesToday = next.checkIn === today
    // Con alguien en casa, la segunda línea habla del SIGUIENTE huésped: si entra el mismo día que sale el actual,
    // la habitación no tiene día de descanso y limpieza debe tenerla lista entre una salida y la otra llegada.
    const backToBack = !!current && next.checkIn <= current.checkOut
    rows.push({
      key: 'in', icon: LogIn, stay: next, strong: arrivesToday,
      tone: arrivesToday ? 'text-brand-600 dark:text-brand-300' : '',
      text: arrivesToday ? tx('Llega hoy')
        : !current ? tx('Libre hasta el {0}', dayLabel(next.checkIn))
        : backToBack ? tx('Ese mismo día entra otro huésped')
        : tx('Siguiente huésped: entra el {0}', dayLabel(next.checkIn)),
      // "Libre hasta…" habla de la habitación, no del huésped: no lleva nombre.
      hideName: !arrivesToday && !current,
    })
  }
  if (block) {
    rows.push({ key: 'block', icon: Wrench, tone: 'text-rose-600 dark:text-rose-400', text: tx('Bloqueada hasta el {0}', dayLabel(block.endsOn)), detail: block.reason })
  }
  if (rows.length === 0) {
    return (
      <p className="border-t border-slate-100 px-5 py-3 pl-6 text-[13px] text-slate-400 dark:border-white/[.06]">
        {room.status === 'AVAILABLE' || room.status === 'CLEANING' ? tx('Sin reservaciones próximas') : '—'}
      </p>
    )
  }
  return (
    <ul className="space-y-1.5 border-t border-slate-100 px-5 py-3 pl-6 text-[13px] dark:border-white/[.06]">
      {rows.map((row) => {
        const Icon = row.icon
        const name = row.hideName ? null : row.stay?.guestName
        const body = (
          <>
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${row.tone || 'text-slate-400'}`} />
            <span className="min-w-0 flex-1 truncate">
              <span className={`${row.strong ? 'font-semibold' : ''} ${row.tone || 'text-slate-600 dark:text-slate-300'}`}>{row.text}</span>
              {name && <span className="text-slate-500 dark:text-slate-400"> · {name}</span>}
              {row.detail && <span className="text-slate-500 dark:text-slate-400"> · {row.detail}</span>}
            </span>
          </>
        )
        return (
          <li key={row.key}>
            {row.stay?.reservationId ? (
              <button type="button" onClick={() => onOpen(row.stay.reservationId)}
                title={tx('Abrir la reservación {0}', row.stay.folio)}
                className="-mx-1.5 flex w-[calc(100%+0.75rem)] items-start gap-2 rounded-lg px-1.5 py-0.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/[.06]">
                {body}
              </button>
            ) : <div className="flex items-start gap-2 py-0.5">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

function RoomFormModal({ room, types, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    roomTypeId: room?.roomTypeId || types.find((t) => t.active)?.id || '',
    number: room?.number || '', name: room?.name || '', floor: room?.floor || '',
    description: room?.description || '', internalNotes: room?.internalNotes || '', sortOrder: room?.sortOrder ?? 0,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState(room?.images || [])
  const [busy, setBusy] = useState(false)
  const set = (f) => (e) => { setForm({ ...form, [f]: e.target.value }); setErrors({ ...errors, [f]: null }) }

  const submit = async (e) => {
    e?.preventDefault()
    const found = validate(form, {
      number: [required(tx('el número')), (v) => (!/^[A-Za-z0-9-]{1,10}$/.test(v) ? tx('Letras, números o guion (máx. 10)') : null)],
      floor: [(v) => (v && !/^[A-Za-z0-9-]{1,10}$/.test(v) ? tx('Letras, números o guion (máx. 10)') : null)],
      roomTypeId: [(v) => (!v ? tx('Elige el tipo') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const payload = { ...form, roomTypeId: Number(form.roomTypeId), sortOrder: Number(form.sortOrder) || 0 }
    try {
      if (room) await inventoryApi.updateRoom(room.id, payload)
      else await inventoryApi.createRoom(payload)
      toast.success(room ? tx('Habitación actualizada') : tx('Habitación creada'))
      onSaved()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const imageOps = useImageOps('rooms', room?.id, setImages, setBusy)

  return (
    <Modal open onClose={onClose} title={room ? tx('Habitación {0}', room.number) : tx('Nueva habitación')} icon={BedDouble} size="max-w-2xl"
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={submit}>{room ? tx('Guardar') : tx('Crear habitación')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label={tx('Número')} required value={form.number} onChange={set('number')} error={errors.number} maxLength={10} />
          <Input label={tx('Piso')} value={form.floor} onChange={set('floor')} error={errors.floor} maxLength={10} />
          <Input label={tx('Orden')} type="number" min={0} value={form.sortOrder} onChange={set('sortOrder')} />
        </div>
        <Select label={tx('Tipo de habitación')} required value={form.roomTypeId} onChange={set('roomTypeId')} error={errors.roomTypeId}>
          {types.filter((t) => t.active || t.id === room?.roomTypeId).map((t) => <option key={t.id} value={t.id}>{t.name} · {money(t.basePrice)}</option>)}
        </Select>
        <Input label={tx('Nombre (opcional)')} placeholder={tx('Suite Presidencial')} value={form.name} onChange={set('name')} maxLength={100} />
        <Textarea label={tx('Descripción')} value={form.description} onChange={set('description')} maxLength={2000} rows={3} />
        <Textarea label={tx('Notas internas (solo personal)')} value={form.internalNotes} onChange={set('internalNotes')} maxLength={2000} rows={2} />
        {room ? (
          <div className="space-y-3">
            <p className="label">{tx('Fotografías propias de esta habitación')}</p>
            <Gallery images={images} busy={busy} onMove={(i, d) => imageOps.move(images, i, d)} onDelete={imageOps.remove} />
            <ImageDrop busy={busy} onFiles={imageOps.add} compact />
          </div>
        ) : <p className="field-hint">{tx('Podrás agregar fotografías después de crearla. Las fotos del tipo se usan si la habitación no tiene propias.')}</p>}
      </form>
    </Modal>
  )
}

function useImageOps(owner, id, setImages, setBusy) {
  const toast = useToast()
  const run = async (fn) => {
    setBusy(true)
    try {
      setImages(await fn())
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return {
    add: (files) => run(() => inventoryApi.addImages(owner, id, files)),
    move: (images, index, delta) => run(() => inventoryApi.reorderImages(owner, id, moveIds(images, index, delta))),
    remove: (img) => run(() => inventoryApi.deleteImage(owner, id, img.id)),
  }
}

function StatusModal({ room, today, onClose, onSaved, onOpenReservation }) {
  const { can } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState(room.status === 'OCCUPIED' ? 'CLEANING' : room.status)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const options = Object.entries(ROOM_STATUS).filter(([k]) => k !== 'OCCUPIED')
    .filter(([k]) => can('ROOMS:UPDATE') || k === 'AVAILABLE' || k === 'CLEANING')
  const save = async () => {
    setSaving(true)
    try {
      await inventoryApi.changeStatus(room.id, status, notes.trim() || null)
      toast.success(tx('Estado actualizado'))
      onSaved()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  // Con un huésped en casa el estado no se cambia a mano: la habitación sale de "Ocupada" con el check-out, que
  // cobra el saldo, cierra la estancia y la manda a limpieza. Aquí solo se explica y se da el acceso a la reservación.
  const stay = room.currentStay
  if (stay) {
    return (
      <Modal open onClose={onClose} title={tx('Estado de la {0}', room.number)} icon={Sparkles} size="max-w-md"
        footer={<>
          <button className="btn-secondary" onClick={onClose}>{tx('Cerrar')}</button>
          {stay.reservationId && <Button onClick={() => onOpenReservation(stay.reservationId)}><LogOut className="h-4 w-4" /> {tx('Abrir la reservación')}</Button>}
        </>}>
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-400/20">
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${ROOM_STATUS.OCCUPIED.dot}`} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{tx('Hay un huésped en casa')}</p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300">{stay.guestName ? `${stay.guestName} · ` : ''}{departureText(stay, today)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {tx('El estado de esta habitación no se cambia a mano. Al registrar la salida desde la reservación, el sistema cobra el saldo, cierra la estancia y pasa la habitación a limpieza automáticamente.')}
        </p>
      </Modal>
    )
  }
  return (
    <Modal open onClose={onClose} title={tx('Estado de la {0}', room.number)} icon={Sparkles} size="max-w-md"
      footer={<><button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button><Button loading={saving} onClick={save}>{tx('Guardar')}</Button></>}>
      <div className="space-y-2">
        {options.map(([k, s]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition ${status === k ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/10' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
            <span className={`h-3 w-3 rounded-full ${s.dot}`} />
            <span className="flex-1 text-sm font-semibold">{s.label}</span>
            {room.status === k && <span className="text-xs text-slate-400">{tx('Actual')}</span>}
          </button>
        ))}
        <div className="pt-2"><Textarea label={tx('Nota (opcional)')} rows={2} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
    </Modal>
  )
}

function BlockModal({ room, onClose }) {
  const { can } = useAuth()
  const { hotel } = useHotel()
  const toast = useToast()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.timezone }).format(new Date())
  const [blocks, setBlocks] = useState(null)
  const [form, setForm] = useState({ startsOn: today, endsOn: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => inventoryApi.blocks(room.id).then(setBlocks).catch((e) => toast.error(errorMessage(e)))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = async () => {
    const found = validate(form, {
      startsOn: [required(tx('el inicio'))],
      endsOn: [required(tx('el fin')), (v, all) => (v && all.startsOn && v <= all.startsOn ? tx('Debe ser posterior al inicio') : null)],
      reason: [required(tx('el motivo')), maxLength(500)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await inventoryApi.block(room.id, form)
      toast.success(tx('Habitación bloqueada'))
      setForm({ startsOn: today, endsOn: '', reason: '' })
      load()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const release = async (b) => {
    try {
      await inventoryApi.release(room.id, b.id, null)
      toast.success(tx('Bloqueo liberado'))
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open onClose={onClose} title={tx('Bloqueos de la {0}', room.number)} icon={CalendarX2} size="max-w-2xl"
      description={tx('La fecha de fin es el día en que la habitación vuelve a estar disponible.')}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[.02] dark:ring-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={tx('Desde')} type="date" min={today} value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} error={errors.startsOn} />
            <Input label={tx('Disponible de nuevo el')} type="date" min={form.startsOn || today} value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} error={errors.endsOn} />
          </div>
          <div className="mt-3"><Input label={tx('Motivo')} value={form.reason} maxLength={500} placeholder={tx('Cambio de alfombra, fuga en baño…')} onChange={(e) => setForm({ ...form, reason: e.target.value })} error={errors.reason} /></div>
          <div className="mt-3 flex justify-end"><Button loading={saving} onClick={create}><Wrench className="h-4 w-4" /> {tx('Bloquear')}</Button></div>
        </div>
        {!blocks ? <Skeleton className="h-24" /> : blocks.length === 0 ? (
          <p className="text-center text-sm text-slate-500">{tx('Sin bloqueos registrados.')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200 dark:divide-white/[.06] dark:ring-white/10">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{b.startsOn} → {b.endsOn}</p>
                  <p className="truncate text-xs text-slate-500">{b.reason}</p>
                </div>
                {b.status === 'OPEN' ? (
                  <>
                    <Badge tone="red" dot>{tx('Activo')}</Badge>
                    {can('ROOMS:RELEASE_BLOCK') && <button className="btn-secondary btn-sm" onClick={() => release(b)}>{tx('Liberar')}</button>}
                  </>
                ) : <Badge tone="slate">{tx('Liberado')} {b.releasedAt ? formatDateTime(b.releasedAt, hotel.timezone) : ''}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function HistoryModal({ room, onClose }) {
  const { hotel } = useHotel()
  const [items, setItems] = useState(null)
  useEffect(() => { inventoryApi.statusHistory(room.id).then(setItems).catch(() => setItems([])) }, [room.id])
  return (
    <Modal open onClose={onClose} title={tx('Historial de la {0}', room.number)} icon={History} size="max-w-lg">
      {!items ? <Skeleton className="h-32" /> : items.length === 0 ? <p className="text-sm text-slate-500">{tx('Sin cambios de estado.')}</p> : (
        <ol className="space-y-3">
          {items.map((h, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ROOM_STATUS[h.toStatus]?.dot}`} />
              <div>
                <p><b>{ROOM_STATUS[h.fromStatus]?.label}</b> → <b>{ROOM_STATUS[h.toStatus]?.label}</b></p>
                <p className="text-xs text-slate-500">{h.userName || tx('Sistema')} · {formatDateTime(h.at, hotel.timezone)}{h.notes ? ` · ${h.notes}` : ''}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

/* ── Tipos ──────────────────────────────────────────────────────────────────────── */

function TypesTab({ types, amenities, reload }) {
  const [editing, setEditing] = useState(null)
  if (!types) return <Skeleton className="h-64" />
  return (
    <>
      <div className="mb-5 flex justify-end">
        <Can permission="ROOMS:CREATE"><button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {tx('Tipo de habitación')}</button></Can>
      </div>
      {types.length === 0 ? (
        <div className="card"><EmptyState icon={Layers} title={tx('Sin tipos de habitación')} description={tx('Crea tus categorías: Individual, Doble, Suite, Familiar…')} /></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => (
            <article key={t.id} className={`card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl ${t.active ? '' : 'opacity-60'}`}>
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-500/20 to-gold-500/20">
                {t.images[0] ? <img src={t.images[0].url} alt={t.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  : <div className="grid h-full place-items-center"><BedDouble className="h-10 w-10 text-brand-500/50" /></div>}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{t.code}</p>
                  <p className="font-display text-xl font-semibold">{t.name}</p>
                </div>
                {!t.active && <span className="absolute right-3 top-3"><Badge tone="slate">{tx('Inactivo')}</Badge></span>}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-2xl font-semibold">{money(t.basePrice)}<span className="text-sm font-normal text-slate-500"> /noche</span></p>
                  <span className="text-xs text-slate-500">{t.roomCount} {tx('hab.')}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {tx('Hasta')} {t.maxOccupancy}</span>
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {t.bedCount} {BED_TYPES[t.bedType]}</span>
                  {t.sizeM2 && <span>{t.sizeM2} {tx('m²')}</span>}
                </div>
                {t.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.amenities.slice(0, 6).map((a) => <span key={a.id} className="chip bg-slate-100 text-slate-600 ring-transparent dark:bg-white/5 dark:text-slate-300"><DynamicIcon name={a.icon} className="h-3 w-3" />{a.name}</span>)}
                    {t.amenities.length > 6 && <span className="chip bg-slate-100 text-slate-500 ring-transparent dark:bg-white/5">+{t.amenities.length - 6}</span>}
                  </div>
                )}
                <Can permission="ROOMS:UPDATE"><button className="btn-secondary btn-sm w-full" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /> {tx('Editar')}</button></Can>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <TypeFormModal type={editing.id ? editing : null} amenities={amenities} onClose={() => { setEditing(null); reload() }} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function TypeFormModal({ type, amenities, onClose, onSaved }) {
  const { can } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(() => ({
    code: type?.code || '', name: type?.name || '', description: type?.description || '',
    basePrice: type?.basePrice ?? '', maxAdults: type?.maxAdults ?? 2, maxChildren: type?.maxChildren ?? 1,
    maxOccupancy: type?.maxOccupancy ?? 3, includedOccupancy: type?.includedOccupancy ?? 2,
    extraAdultFee: type?.extraAdultFee ?? '0', extraChildFee: type?.extraChildFee ?? '0',
    bedCount: type?.bedCount ?? 1, bedType: type?.bedType || 'MATRIMONIAL', sizeM2: type?.sizeM2 ?? '',
    sortOrder: type?.sortOrder ?? 0, amenityIds: new Set(type?.amenities?.map((a) => a.id) || []),
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState(type?.images || [])
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const imageOps = useImageOps('room-types', type?.id, setImages, setBusy)

  const set = (f, transform) => (e) => {
    setForm({ ...form, [f]: transform ? transform(e.target.value) : e.target.value })
    setErrors({ ...errors, [f]: null })
  }
  const num = (v) => v.replace(/\D/g, '').slice(0, 2)

  const submit = async () => {
    const n = (k) => Number(form[k])
    const found = validate(form, {
      code: [required(tx('la clave')), (v) => (!/^[A-Za-z0-9_-]{2,20}$/.test(v) ? tx('2 a 20: letras, números, guion') : null)],
      name: [required(tx('el nombre')), maxLength(100)],
      basePrice: [required(tx('el precio')), (v) => (Number(v) <= 0 ? tx('Debe ser mayor a 0') : null)],
      maxOccupancy: [() => (n('maxOccupancy') > n('maxAdults') + n('maxChildren') ? tx('No puede superar adultos + menores') : n('maxOccupancy') < 1 ? tx('Mínimo 1') : null)],
      includedOccupancy: [() => (n('includedOccupancy') > n('maxOccupancy') || n('includedOccupancy') < 1 ? tx('Entre 1 y la capacidad máxima') : null)],
      maxAdults: [() => (n('maxAdults') < 1 ? tx('Mínimo 1') : null)],
      bedCount: [() => (n('bedCount') < 1 ? tx('Mínimo 1') : null)],
    })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      maxAdults: n('maxAdults'), maxChildren: n('maxChildren'), maxOccupancy: n('maxOccupancy'),
      includedOccupancy: n('includedOccupancy'), bedCount: n('bedCount'), sortOrder: n('sortOrder') || 0,
      sizeM2: form.sizeM2 === '' ? null : form.sizeM2,
      extraAdultFee: form.extraAdultFee || '0', extraChildFee: form.extraChildFee || '0',
      amenityIds: [...form.amenityIds],
    }
    try {
      if (type) await inventoryApi.updateRoomType(type.id, payload)
      else await inventoryApi.createRoomType(payload)
      toast.success(type ? tx('Tipo actualizado') : tx('Tipo creado'))
      onSaved()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    try {
      await inventoryApi.setRoomTypeActive(type.id, !type.active)
      toast.success(type.active ? tx('Tipo desactivado') : tx('Tipo activado'))
      onSaved()
    } catch (e) {
      toast.error(errorMessage(e))
      setConfirm(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={type ? type.name : tx('Nuevo tipo de habitación')} icon={Layers} size="max-w-3xl"
      footer={<>
        {type && can('ROOMS:DELETE') && <button className={`btn-ghost mr-auto ${type.active ? 'text-rose-600' : 'text-emerald-600'}`} onClick={() => setConfirm(true)}>{type.active ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{type.active ? tx('Desactivar') : tx('Activar')}</button>}
        <button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button>
        <Button loading={saving} onClick={submit}>{type ? tx('Guardar') : tx('Crear tipo')}</Button>
      </>}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label={tx('Clave')} required value={form.code} onChange={set('code', (v) => v.toUpperCase())} error={errors.code} maxLength={20} placeholder="DBL" />
          <div className="sm:col-span-2"><Input label={tx('Nombre')} required value={form.name} onChange={set('name')} error={errors.name} maxLength={100} placeholder={tx('Doble Deluxe')} /></div>
        </div>
        <Textarea label={tx('Descripción para el huésped')} value={form.description} onChange={set('description')} maxLength={3000} rows={3} />
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Precio')}</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={tx('Precio base por noche')} required inputMode="decimal" value={form.basePrice} onChange={set('basePrice', moneyInput)} error={errors.basePrice} hint={tx('Antes de impuestos')} />
            <Input label={tx('Adulto adicional / noche')} inputMode="decimal" value={form.extraAdultFee} onChange={set('extraAdultFee', moneyInput)} />
            <Input label={tx('Menor adicional / noche')} inputMode="decimal" value={form.extraChildFee} onChange={set('extraChildFee', moneyInput)} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{tx('Capacidad')}</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input label={tx('Adultos máx.')} inputMode="numeric" value={form.maxAdults} onChange={set('maxAdults', num)} error={errors.maxAdults} />
            <Input label={tx('Menores máx.')} inputMode="numeric" value={form.maxChildren} onChange={set('maxChildren', num)} />
            <Input label={tx('Total máx.')} inputMode="numeric" value={form.maxOccupancy} onChange={set('maxOccupancy', num)} error={errors.maxOccupancy} />
            <Input label={tx('Incluidos en precio')} inputMode="numeric" value={form.includedOccupancy} onChange={set('includedOccupancy', num)} error={errors.includedOccupancy} />
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-4">
          <Input label={tx('Camas')} inputMode="numeric" value={form.bedCount} onChange={set('bedCount', num)} error={errors.bedCount} />
          <Select label={tx('Tipo de cama')} value={form.bedType} onChange={set('bedType')}>
            {Object.entries(BED_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label={tx('Tamaño (m²)')} inputMode="decimal" value={form.sizeM2} onChange={set('sizeM2', (v) => v.replace(/[^\d.]/g, '').slice(0, 6))} />
          <Input label={tx('Orden')} inputMode="numeric" value={form.sortOrder} onChange={set('sortOrder', (v) => v.replace(/\D/g, '').slice(0, 4))} />
        </div>
        {amenities.length > 0 && (
          <div>
            <p className="label">{tx('Amenidades')}</p>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const on = form.amenityIds.has(a.id)
                return (
                  <button key={a.id} type="button" aria-pressed={on} onClick={() => {
                    const next = new Set(form.amenityIds)
                    on ? next.delete(a.id) : next.add(a.id)
                    setForm({ ...form, amenityIds: next })
                  }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:ring-brand-400 dark:ring-white/10'}`}>
                    <DynamicIcon name={a.icon} className="h-3.5 w-3.5" /> {a.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {type ? (
          <div className="space-y-3">
            <p className="label">{tx('Fotografías (la primera es la portada en el sitio)')}</p>
            <Gallery images={images} busy={busy} onMove={(i, d) => imageOps.move(images, i, d)} onDelete={imageOps.remove} />
            <ImageDrop busy={busy} onFiles={imageOps.add} />
          </div>
        ) : <p className="field-hint">{tx('Después de crearlo podrás subir sus fotografías.')}</p>}
      </div>
      <ConfirmDialog open={confirm} tone={type?.active ? 'danger' : 'primary'} onClose={() => setConfirm(false)} onConfirm={toggleActive}
        title={type?.active ? tx('Desactivar tipo') : tx('Activar tipo')} confirmLabel={type?.active ? tx('Desactivar') : tx('Activar')}
        message={type?.active ? tx('Dejará de mostrarse en el sitio. Solo es posible si no tiene habitaciones activas.') : tx('Volverá a estar disponible.')} />
    </Modal>
  )
}

/* ── Amenidades ─────────────────────────────────────────────────────────────────── */

function AmenitiesTab({ amenities, reload }) {
  const { can } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', icon: 'wifi' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const editable = can('ROOMS:UPDATE')

  const add = async () => {
    if (!form.name.trim()) return setError(tx('Escribe el nombre'))
    setSaving(true)
    try {
      await inventoryApi.createAmenity({ name: form.name.trim(), icon: form.icon })
      setForm({ name: '', icon: form.icon })
      setError('')
      reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (a) => {
    try {
      await inventoryApi.deleteAmenity(a.id)
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {editable && (
        <section className="card space-y-4 p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-lg font-semibold">{tx('Nueva amenidad')}</h2>
          <Input label={tx('Nombre')} value={form.name} maxLength={80} placeholder={tx('Wi-Fi de alta velocidad')} error={error}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); setError('') }} />
          <div><p className="label">{tx('Ícono')}</p><IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} /></div>
          <Button className="w-full" loading={saving} onClick={add}><Plus className="h-4 w-4" /> {tx('Agregar')}</Button>
        </section>
      )}
      <section className="card p-6">
        {amenities.length === 0 ? <EmptyState icon={Sparkles} title={tx('Sin amenidades')} description={tx('Agrega las comodidades que ofreces: Wi-Fi, aire acondicionado, alberca…')} /> : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {amenities.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200 dark:ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><DynamicIcon name={a.icon} className="h-5 w-5" /></span>
                <span className="flex-1 text-sm font-medium">{a.name}</span>
                {editable && <button className="btn-ghost btn-sm h-8 w-8 px-0 text-slate-400 hover:text-rose-600" onClick={() => remove(a)} aria-label={tx('Eliminar {0}', a.name)}><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
