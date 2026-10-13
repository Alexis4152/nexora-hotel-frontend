import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock, DoorOpen, Hourglass, LogIn, LogOut, Plus, Search, Wrench,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { EmptyState, Pagination, Skeleton } from '../../components/ui'
import { Tabs } from '../../components/catalog'
import { RES_STATUS, SOURCES, StatusBadge, addDays, fmtDate, nightsBetween, todayIn } from '../../components/reservations'
import { Can } from '../../guards'
import { reservationsApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { money } from '../../utils/money'
import ReservationDrawer from './ReservationDrawer'
import NewReservationModal from './NewReservationModal'
import { tx } from '../../i18n'

export default function ReservationsPage() {
  const [tab, setTab] = useState('today')
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((k) => k + 1)
  const [params, setParams] = useSearchParams()

  // ?r=<id> abre esa reservación (enlaces de las notificaciones). El parámetro se quita para no reabrirla.
  useEffect(() => {
    const id = Number(params.get('r'))
    if (!id) return
    setOpenId(id)
    setParams((p) => { p.delete('r'); return p }, { replace: true })
  }, [params, setParams])

  return (
    <>
      <PageHeader eyebrow={tx('Operación')} title={tx('Reservaciones')}
        description={tx('Llegadas, salidas, solicitudes por confirmar y la ocupación de cada habitación.')}
        actions={<Can permission="RESERVATIONS:CREATE"><button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {tx('Nueva reservación')}</button></Can>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'today', label: tx('Hoy'), icon: Clock },
        { key: 'list', label: tx('Todas'), icon: CalendarCheck2 },
        { key: 'calendar', label: tx('Calendario'), icon: CalendarDays },
      ]} />
      {tab === 'today' && <TodayTab key={refreshKey} onOpen={setOpenId} />}
      {tab === 'list' && <ListTab key={refreshKey} onOpen={setOpenId} />}
      {tab === 'calendar' && <CalendarTab key={refreshKey} onOpen={setOpenId} />}
      {openId && <ReservationDrawer id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {creating && <NewReservationModal onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); refresh(); setOpenId(r.summary.id) }} />}
    </>
  )
}

/* ── Hoy ────────────────────────────────────────────────────────────────────────── */

function TodayTab({ onOpen }) {
  const toast = useToast()
  const [board, setBoard] = useState(null)
  useEffect(() => {
    reservationsApi.board().then(setBoard).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!board) return <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}</div>
  const columns = [
    [tx('Llegadas de hoy'), LogIn, board.arrivals, 'from-emerald-500 to-emerald-700', tx('Nadie llega hoy')],
    [tx('Salidas de hoy'), LogOut, board.departures, 'from-sky-500 to-sky-700', tx('Nadie sale hoy')],
    [tx('En estancia'), DoorOpen, board.inHouse, 'from-brand-500 to-brand-700', tx('Sin huéspedes en casa')],
    [tx('Por confirmar'), Hourglass, board.pending, 'from-gold-400 to-gold-600', tx('Todo al día')],
  ]
  return (
    <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
      {columns.map(([title, Icon, items, tone, empty]) => (
        <section key={title} className="card flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-white/[.06]">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow ${tone}`}><Icon className="h-5 w-5" /></div>
            <h2 className="flex-1 font-semibold">{title}</h2>
            <span className="font-display text-2xl font-semibold tabular-nums">{items.length}</span>
          </div>
          {items.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">{empty}</p> : (
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto dark:divide-white/[.06]">
              {items.map((r) => (
                <li key={r.id}>
                  <button onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[.03]">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 font-display text-sm font-semibold dark:bg-white/5">{r.roomNumber || '—'}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.guestName}</p>
                      <p className="truncate text-xs text-slate-500">{r.folio} · {fmtDate(r.checkIn, { day: 'numeric', month: 'short' })} → {fmtDate(r.checkOut, { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

/* ── Listado ────────────────────────────────────────────────────────────────────── */

function ListTab({ onOpen }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const q = useDebouncedValue(query)

  const load = useCallback(() => {
    reservationsApi.list({ q: q || undefined, status: statuses.length ? statuses : undefined, from: from || undefined, to: to || undefined, page, size: 15 })
      .then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statuses, from, to, page])
  useEffect(load, [load])
  useEffect(() => setPage(0), [q, statuses, from, to])

  const toggle = (s) => setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <div className="card overflow-hidden">
      <div className="space-y-3 border-b border-slate-100 p-4 dark:border-white/[.06]">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder={tx('Folio, nombre, correo o teléfono…')} value={query} maxLength={100}
              onChange={(e) => setQuery(e.target.value)} aria-label={tx('Buscar reservación')} />
          </div>
          <input type="date" className="input md:w-44" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={tx('Desde')} />
          <input type="date" className="input md:w-44" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label={tx('Hasta')} />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RES_STATUS).map(([k, s]) => (
            <button key={k} onClick={() => toggle(k)} aria-pressed={statuses.includes(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${statuses.includes(k) ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'ring-slate-200 hover:ring-slate-300 dark:ring-white/10'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {!data ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : data.content.length === 0 ? <EmptyState icon={CalendarCheck2} title={tx('Sin reservaciones')} description={tx('No hay resultados con esos filtros.')} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="table-head bg-slate-50/60 dark:bg-white/[.02]">
                  <tr><th>{tx('Folio')}</th><th>{tx('Huésped')}</th><th>{tx('Estancia')}</th><th>{tx('Habitación')}</th><th>{tx('Origen')}</th><th>{tx('Estado')}</th><th className="text-right">{tx('Total')}</th></tr>
                </thead>
                <tbody>
                  {data.content.map((r) => (
                    <tr key={r.id} className="table-row cursor-pointer" onClick={() => onOpen(r.id)}>
                      <td className="font-mono text-xs font-semibold">{r.folio}</td>
                      <td><p className="font-medium">{r.guestName}</p><p className="text-xs text-slate-500">{r.contactPhone || ''}</p></td>
                      <td className="whitespace-nowrap">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}<p className="text-xs text-slate-500">{r.nights} {tx('noche(s) ·')} {r.adults + r.children} {tx('huésp.')}</p></td>
                      <td>{r.roomNumber}<p className="text-xs text-slate-500">{r.roomTypeName}</p></td>
                      <td className="text-slate-500">{SOURCES[r.source]}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-right font-semibold tabular-nums">{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
    </div>
  )
}

/* ── Calendario ─────────────────────────────────────────────────────────────────── */

const DAYS = 14

function CalendarTab({ onOpen }) {
  const { hotel } = useHotel()
  const toast = useToast()
  const today = todayIn(hotel.timezone)
  const [start, setStart] = useState(addDays(today, -1))
  const [data, setData] = useState(null)
  const end = addDays(start, DAYS)

  useEffect(() => {
    setData(null)
    reservationsApi.calendar(start, end).then(setData).catch((e) => toast.error(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start])

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start])
  const byRoom = useMemo(() => {
    const map = new Map()
    data?.entries.forEach((e) => {
      if (!map.has(e.roomId)) map.set(e.roomId, [])
      map.get(e.roomId).push(e)
    })
    return map
  }, [data])

  const barTone = (e) => e.kind === 'BLOCK' ? 'bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300'
    : e.status === 'IN_HOUSE' ? 'bg-brand-600 text-white ring-brand-700'
      : e.status === 'CONFIRMED' ? 'bg-emerald-500 text-white ring-emerald-600'
        : 'bg-gold-400/80 text-ink-900 ring-gold-500'

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-white/[.06]">
        <div className="flex gap-1">
          <button className="btn-secondary btn-sm" onClick={() => setStart(addDays(start, -7))} aria-label={tx('Semana anterior')}><ChevronLeft className="h-4 w-4" /></button>
          <button className="btn-secondary btn-sm" onClick={() => setStart(addDays(today, -1))}>{tx('Hoy')}</button>
          <button className="btn-secondary btn-sm" onClick={() => setStart(addDays(start, 7))} aria-label={tx('Semana siguiente')}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="hidden flex-wrap gap-3 text-xs text-slate-500 sm:flex">
          <Legend className="bg-gold-400" label={tx('Por confirmar')} /><Legend className="bg-emerald-500" label={tx('Confirmada')} />
          <Legend className="bg-brand-600" label={tx('En estancia')} /><Legend className="bg-rose-400" label={tx('Bloqueo')} />
        </div>
      </div>
      {!data ? <Skeleton className="m-4 h-80" /> : data.rooms.length === 0 ? <EmptyState icon={CalendarDays} title={tx('Sin habitaciones activas')} /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid border-b border-slate-100 dark:border-white/[.06]" style={{ gridTemplateColumns: `120px repeat(${DAYS}, minmax(0,1fr))` }}>
              <div className="p-2" />
              {days.map((d) => (
                <div key={d} className={`p-2 text-center text-[11px] ${d === today ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                  <p className="uppercase">{fmtDate(d, { weekday: 'short' })}</p>
                  <p className="font-display text-base">{fmtDate(d, { day: 'numeric' })}</p>
                </div>
              ))}
            </div>
            {data.rooms.map((room) => (
              <div key={room.id} className="relative grid border-b border-slate-100 dark:border-white/[.06]" style={{ gridTemplateColumns: `120px repeat(${DAYS}, minmax(0,1fr))` }}>
                <div className="sticky left-0 z-10 bg-white p-3 dark:bg-ink-900">
                  <p className="font-display text-sm font-semibold">{room.number}</p>
                  <p className="truncate text-[11px] text-slate-500">{room.roomTypeName}</p>
                </div>
                {days.map((d) => <div key={d} className={`h-14 border-l border-slate-100 dark:border-white/[.04] ${d === today ? 'bg-brand-50/60 dark:bg-brand-500/5' : ''}`} />)}
                {(byRoom.get(room.id) || []).map((e, i) => {
                  const s = Math.max(0, nightsBetween(start, e.starts))
                  const len = Math.min(DAYS, nightsBetween(start, e.ends)) - s
                  if (len <= 0) return null
                  return (
                    <button key={i} type="button" disabled={!e.reservationId} onClick={() => e.reservationId && onOpen(e.reservationId)}
                      title={e.kind === 'BLOCK' ? tx('Bloqueo: {0}', e.reason) : `${e.folio} · ${e.guestName}`}
                      className={`absolute top-2 flex h-10 items-center gap-1.5 overflow-hidden rounded-lg px-2 text-left text-[11px] font-semibold ring-1 transition hover:brightness-110 ${barTone(e)}`}
                      style={{ left: `calc(120px + (100% - 120px) * ${s / DAYS} + 3px)`, width: `calc((100% - 120px) * ${len / DAYS} - 6px)` }}>
                      {e.kind === 'BLOCK' ? <Wrench className="h-3 w-3 shrink-0" /> : null}
                      <span className="truncate">{e.kind === 'BLOCK' ? e.reason : e.guestName}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Legend({ className, label }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${className}`} />{label}</span>
}
