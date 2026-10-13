import { useCallback, useEffect, useState } from 'react'
import { BellRing, CheckCheck, Inbox } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import { EmptyState, Pagination, Skeleton } from '../../components/ui'
import { CATEGORIES, NotificationItem } from '../../components/notifications'
import { notificationsApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useNotifications } from '../../context/NotificationsContext'
import { useToast } from '../../context/ToastContext'
import { tx } from '../../i18n'

/** Historial completo de notificaciones de la persona, con filtros. Se actualiza solo cuando llega una nueva. */
export default function NotificationsPage() {
  const toast = useToast()
  const { unread, version, open, markRead, markAllRead } = useNotifications()
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)

  const load = useCallback(() => {
    notificationsApi.list({ unread: onlyUnread || undefined, category: category || undefined, page, size: 20 })
      .then(setData)
      .catch((e) => toast.error(errorMessage(e)))
  }, [onlyUnread, category, page, toast])

  useEffect(() => { load() }, [load, version])

  const filter = (fn) => {
    fn()
    setPage(0)
  }

  const markOne = async (n) => {
    if (n.read) return
    setData((d) => d && { ...d, content: d.content.map((x) => (x.id === n.id ? { ...x, read: true } : x)) })
    await markRead(n)
  }

  const chip = (active) => `rounded-full px-3 py-1.5 text-xs font-semibold transition ${active
    ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/[.04] dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/[.07]'}`

  return (
    <>
      <PageHeader eyebrow={tx('Avisos')} title={tx('Notificaciones')}
        description={tx('Lo que pasa en el hotel y requiere tu atención: reservaciones, pagos, operación del día y solicitudes de huéspedes.')}
        actions={<button className="btn-secondary" onClick={markAllRead} disabled={unread === 0}><CheckCheck className="h-4 w-4" /> {tx('Marcar todas como leídas')}</button>} />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-white/[.06]">
          <button type="button" className={chip(!onlyUnread)} onClick={() => filter(() => setOnlyUnread(false))} aria-pressed={!onlyUnread}>{tx('Todas')}</button>
          <button type="button" className={chip(onlyUnread)} onClick={() => filter(() => setOnlyUnread(true))} aria-pressed={onlyUnread}>
            {tx('Sin leer')}{unread > 0 && <span className="ml-1.5 opacity-70">{unread}</span>}
          </button>
          <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />
          <button type="button" className={chip(category === '')} onClick={() => filter(() => setCategory(''))} aria-pressed={category === ''}>
            {tx('Todas las áreas')}
          </button>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} type="button" className={chip(category === key)} onClick={() => filter(() => setCategory(key))} aria-pressed={category === key}>
              {label}
            </button>
          ))}
        </div>

        {data === null ? (
          <div className="divide-y divide-slate-100 dark:divide-white/[.05]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 px-5 py-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : data.content.length === 0 ? (
          <EmptyState icon={onlyUnread ? Inbox : BellRing}
            title={onlyUnread ? tx('Todo al día') : tx('Sin notificaciones')}
            description={onlyUnread ? tx('No tienes notificaciones sin leer.') : tx('Aquí verás reservaciones, pagos y avisos de la operación en cuanto pasen.')} />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-white/[.05]">
              {data.content.map((n) => <NotificationItem key={n.id} n={n} roomy onOpen={open} onMarkRead={markOne} />)}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </>
  )
}
