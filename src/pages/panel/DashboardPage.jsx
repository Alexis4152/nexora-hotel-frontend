import { useEffect, useState } from 'react'
import {
  Activity, ArrowUpRight, BedDouble, CalendarCheck2, CalendarPlus, CalendarX2, Clock3, Coins, DoorOpen, Globe, HandCoins,
  Hourglass, LogIn, LogOut, PiggyBank, ShieldCheck, UserCheck, UserX, Users, Wallet,
} from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { Avatar, Badge, EmptyState, Skeleton } from '../../components/ui'
import { Chart, Donut, HBars } from '../../components/charts'
import { Link } from '../../router'
import { adminApi, reportsApi } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../api/client'
import { AUDIT_ACTIONS } from '../../config/permissions'
import { formatDateTime, timeAgo } from '../../utils/format'
import { money } from '../../utils/money'
import { LOCALE, tx } from '../../i18n'

function greeting(timeZone) {
  const hour = Number(new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()))
  return hour < 12 ? tx('Buenos días') : hour < 19 ? tx('Buenas tardes') : tx('Buenas noches')
}

export default function DashboardPage() {
  const { user, can } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [dash, setDash] = useState(null)

  useEffect(() => {
    adminApi.overview().then(setData).catch((err) => toast.error(errorMessage(err)))
    reportsApi.dashboard().then(setDash).catch((err) => toast.error(errorMessage(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tz = data?.hotel?.timezone
  const today = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date())
  const ops = data?.operations
  const t = dash?.today
  const rooms = dash?.rooms
  const fin = dash?.finance
  const canReports = can('REPORTS:OPERATIONAL') || can('REPORTS:FINANCIAL')
  const totalRoleUsers = data?.roles?.reduce((s, r) => s + r.users, 0) || 1

  return (
    <>
      <PageHeader eyebrow={today} title={`${greeting(tz)}, ${user.firstName}`}
        description={tx('La operación de hoy, la ocupación que viene y la actividad reciente del hotel.')}
        actions={canReports && <Link to="/panel/reportes" className="btn-secondary">{tx('Ver reportes')} <ArrowUpRight className="h-4 w-4" /></Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={LogIn} label={tx('Llegadas hoy')} value={t?.arrivals} tone="from-emerald-500 to-emerald-700"
          sub={ops && t ? (ops.arrivalsToday ? tx('{0} por registrar', ops.arrivalsToday) : t.arrivals ? tx('Todas registradas') : null) : null} />
        <Kpi icon={LogOut} label={tx('Salidas hoy')} value={t?.departures} tone="from-sky-500 to-sky-700" />
        <Kpi icon={DoorOpen} label={tx('En estancia')} value={t?.inHouse} tone="from-brand-500 to-brand-700" />
        <Kpi icon={Hourglass} label={tx('Por confirmar')} value={t?.pending} tone="from-gold-400 to-gold-600" />
      </div>

      {can('RESERVATIONS:VIEW') && ops && (ops.pending > 0 || ops.arrivalsToday > 0) && (
        <Link to="/panel/reservaciones" className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-400/20">
          <CalendarCheck2 className="h-5 w-5" />
          <span className="flex-1">
            {ops.arrivalsToday > 0 && <>{tx('Hoy faltan')} <b>{ops.arrivalsToday}</b> {tx('llegada(s) por registrar.')} </>}
            {ops.pending > 0 && <>{tx('Hay')} <b>{ops.pending}</b> {tx('solicitud(es) esperando confirmación.')}</>}
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <RoomsCard rooms={rooms} />
        <section className="card p-6 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">{tx('Ocupación de los próximos 14 días')}</h2>
              <p className="text-xs text-slate-500">{tx('Habitaciones con reservación confirmada sobre las disponibles')}</p>
            </div>
            {can('REPORTS:OPERATIONAL') && <Link to="/panel/reportes?r=occupancy" className="btn-ghost btn-sm">{tx('Detalle')} <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
          </div>
          {!dash ? <Skeleton className="h-52" /> : <Chart kind="line" points={dash.occupancyNext14} series={[tx('Ocupación')]} format="percent" height={210} empty={tx('Sin reservaciones confirmadas')} />}
        </section>
      </div>

      {fin && (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{tx('Dinero')}</h2>
              <p className="text-xs text-slate-500">{tx('Lo cobrado es dinero recibido; lo por cobrar, saldos pendientes. No se suman entre sí.')}</p>
            </div>
            <Link to="/panel/reportes?r=income" className="btn-ghost btn-sm">{tx('Ingresos')} <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MoneyKpi icon={Coins} label={tx('Cobrado hoy')} value={fin.collectedToday} currency={fin.currency} hint={tx('Pagos menos devoluciones')} />
            <MoneyKpi icon={Wallet} label={tx('Cobrado este mes')} value={fin.collectedMonth} currency={fin.currency} hint={tx('Neto, por fecha de pago')} />
            <MoneyKpi icon={PiggyBank} label={tx('Anticipos del mes')} value={fin.depositsMonth} currency={fin.currency} hint={tx('Pagados antes de la llegada')} />
            <MoneyKpi icon={HandCoins} label={tx('Por cobrar')} value={fin.receivable} currency={fin.currency}
              hint={tx('{0} cuenta(s) con saldo', fin.receivableCount)} to="/panel/reportes?r=receivables" />
            <MoneyKpi icon={Globe} label={tx('Pagos en línea en curso')} value={fin.pendingOnline} plain hint={tx('Esperando confirmación de la pasarela')} />
          </div>
          <section className="card mt-4 p-6">
            <h3 className="mb-4 font-display text-base font-semibold">{tx('Cobrado neto · últimos 30 días')}</h3>
            <Chart points={dash.incomeLast30} series={[tx('Cobrado neto')]} format="money" currency={fin.currency} height={200} empty={tx('Sin cobros en los últimos 30 días')} />
          </section>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">{tx('Hoy')}</h2>
          <p className="mb-4 text-xs text-slate-500">{tx('Movimiento del día')}</p>
          <ul className="space-y-3">
            <TodayRow icon={CalendarPlus} label={tx('Reservaciones nuevas')} value={t?.createdToday} />
            <TodayRow icon={CalendarX2} label={tx('Cancelaciones y no show')} value={t?.cancellations} />
            <TodayRow icon={LogIn} label={tx('Llegadas programadas')} value={t?.arrivals} />
            <TodayRow icon={LogOut} label={tx('Salidas programadas')} value={t?.departures} />
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">{tx('Reservaciones por canal')}</h2>
          <p className="mb-4 text-xs text-slate-500">{tx('Creadas este mes')}</p>
          {!dash ? <Skeleton className="h-32" /> : <HBars points={dash.byChannel} empty={tx('Aún no hay reservaciones este mes')} />}
        </section>
        <section className="card p-6 md:col-span-2 xl:col-span-1">
          <h2 className="font-display text-lg font-semibold">{tx('Reservaciones por estado')}</h2>
          <p className="mb-4 text-xs text-slate-500">{tx('Creadas este mes, estado actual')}</p>
          {!dash ? <Skeleton className="h-32" /> : <HBars points={dash.byStatus} empty={tx('Aún no hay reservaciones este mes')} />}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{tx('Actividad reciente')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tx('Bitácora inmutable del hotel')}</p>
            </div>
            {can('AUDIT:VIEW') && (
              <Link to="/panel/auditoria" className="btn-ghost btn-sm">{tx('Ver todo')} <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            )}
          </div>
          {!data ? (
            <div className="space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !data.recentActivity ? (
            <EmptyState icon={Activity} title={tx('Sin acceso a la bitácora')} description={tx('Tu rol no incluye la consulta de auditoría.')} />
          ) : data.recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title={tx('Todavía no hay actividad')} />
          ) : (
            <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-white/10">
              {data.recentActivity.map((e) => (
                <li key={e.id} className="relative flex items-start gap-4 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/[.02]">
                  <span className={`relative z-10 mt-1 grid h-[14px] w-[14px] place-items-center rounded-full ring-4 ring-white dark:ring-ink-900 ${e.result === 'SUCCESS' ? 'bg-emerald-500' : e.result === 'DENIED' ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ marginLeft: 9 }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{AUDIT_ACTIONS[e.action] || e.action}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{e.actorEmail || tx('Sistema')}{e.detail ? ` · ${e.detail}` : ''}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400" title={formatDateTime(e.createdAt, tz)}>{timeAgo(e.createdAt)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-1 font-display text-lg font-semibold">{tx('Equipo')}</h2>
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> {data?.activeStaff ?? '—'} {tx('activos')}</span>
              <span className="inline-flex items-center gap-1"><UserX className="h-3.5 w-3.5" /> {data?.inactiveStaff ?? '—'} {tx('inactivos')}</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {data?.roles?.length ?? '—'} {tx('roles')}</span>
            </div>
            {!data ? <Skeleton className="h-28" /> : (
              <ul className="space-y-4">
                {data.roles.map((r, i) => (
                  <li key={r.code}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="tabular-nums text-slate-500">{r.users}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div className={`h-full rounded-full ${['bg-brand-500', 'bg-gold-500', 'bg-sky-500', 'bg-violet-500'][i % 4]}`}
                        style={{ width: `${Math.max((r.users / totalRoleUsers) * 100, r.users ? 6 : 0)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-lg font-semibold">{tx('Últimos accesos')}</h2>
            </div>
            {!data ? <Skeleton className="h-28" /> : data.recentLogins.length === 0 ? (
              <p className="text-sm text-slate-500">{tx('Nadie ha iniciado sesión todavía.')}</p>
            ) : (
              <ul className="space-y-3">
                {data.recentLogins.map((l) => {
                  const [first, ...rest] = l.name.split(' ')
                  return (
                    <li key={l.email} className="flex items-center gap-3">
                      <Avatar first={first} last={rest.join(' ')} size="h-8 w-8 text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.name}</p>
                        <p className="truncate text-xs text-slate-500">{l.email}</p>
                      </div>
                      <Badge tone="slate">{timeAgo(l.at)}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {can('USERS:VIEW') && (
            <Link to="/panel/usuarios" className="card group flex items-center gap-4 p-5 transition hover:shadow-glow">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{tx('Administrar equipo')}</p>
                <p className="text-xs text-slate-500">{tx('Altas, roles y permisos')}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-brand-500" />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

function Kpi({ icon: Icon, label, value, tone, sub }) {
  return (
    <div className="card relative overflow-hidden p-5 animate-fade-up">
      <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {value === undefined ? <Skeleton className="mt-1 h-9 w-16" /> : (
        <p className="mt-0.5 font-display text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function MoneyKpi({ icon: Icon, label, value, currency, hint, plain, to }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4 text-brand-500" /> {label}</div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">{plain ? value : money(value, currency)}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  )
  return to
    ? <Link to={to} className="card block p-5 transition hover:shadow-glow">{body}</Link>
    : <div className="card p-5">{body}</div>
}

function TodayRow({ icon: Icon, label, value }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5"><Icon className="h-4 w-4" /></span>
      <span className="flex-1 text-sm">{label}</span>
      {value === undefined ? <Skeleton className="h-5 w-6" /> : <span className="font-display text-lg font-semibold tabular-nums">{value}</span>}
    </li>
  )
}

/** Estado de las habitaciones esta noche: ocupadas, disponibles, en mantenimiento y fuera de servicio. */
function RoomsCard({ rooms }) {
  const segments = rooms ? [
    [tx('Ocupadas'), rooms.occupied, 'bg-brand-500'],
    [tx('Disponibles'), rooms.available, 'bg-emerald-400'],
    [tx('Mantenimiento'), rooms.maintenance, 'bg-gold-500'],
    [tx('Fuera de servicio'), rooms.outOfService, 'bg-slate-400'],
  ] : []
  const total = rooms?.total || 0
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <BedDouble className="h-4 w-4 text-slate-400" />
        <h2 className="font-display text-lg font-semibold">{tx('Habitaciones esta noche')}</h2>
      </div>
      {!rooms ? <Skeleton className="h-52" /> : (
        <>
          <div className="flex items-center gap-5">
            <Donut value={rooms.occupancyPercent} sub={tx('ocupación')} />
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums">{rooms.occupied}<span className="text-lg text-slate-400">/{Math.max(0, total - rooms.maintenance - rooms.outOfService)}</span></p>
              <p className="text-xs text-slate-500">{tx('ocupadas de las disponibles para venta')}</p>
              <p className="mt-1 text-xs text-slate-500">{total} {tx('habitaciones activas')}</p>
            </div>
          </div>
          {total > 0 && (
            <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              {segments.map(([l, v, c]) => v > 0 && <div key={l} className={c} style={{ width: `${(v / total) * 100}%` }} title={`${l}: ${v}`} />)}
            </div>
          )}
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {segments.map(([l, v, c]) => (
              <li key={l} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${c}`} /><span className="flex-1 text-slate-500">{l}</span><b className="tabular-nums">{v}</b></li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
