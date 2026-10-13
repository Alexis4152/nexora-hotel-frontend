import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Info, X } from 'lucide-react'
import { tx } from '../i18n'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-500/20', color: 'text-emerald-500' },
  error: { icon: AlertTriangle, ring: 'ring-rose-500/20', color: 'text-rose-500' },
  info: { icon: Info, ring: 'ring-brand-500/20', color: 'text-brand-500' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (type, message, extra = {}) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-3), { id, type, message, ...extra }])
      setTimeout(() => dismiss(id), extra.duration || (type === 'error' ? 6500 : 4000))
    },
    [dismiss],
  )

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
    /** Aviso con título, ícono propio y clic que lleva a la acción (notificaciones en vivo). */
    notice: ({ title, message, icon, tile, onClick }) => push('notice', message, { title, icon, tile, onClick, duration: 7000 }),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite">
        {toasts.map((t) => (t.type === 'notice'
          ? <NoticeToast key={t.id} t={t} onClose={() => dismiss(t.id)} />
          : <SimpleToast key={t.id} t={t} onClose={() => dismiss(t.id)} />))}
      </div>
    </ToastContext.Provider>
  )
}

function SimpleToast({ t, onClose }) {
  const s = STYLES[t.type]
  const Icon = s.icon
  return (
    <div className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 backdrop-blur animate-fade-up dark:bg-ink-850/95 ${s.ring}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.color}`} />
      <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t.message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label={tx('Cerrar')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function NoticeToast({ t, onClose }) {
  const Icon = t.icon || Info
  const open = () => {
    onClose()
    t.onClick?.()
  }
  return (
    <div className="pointer-events-auto group relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl bg-white/95 p-4 pl-5 pr-10 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur animate-fade-up dark:bg-ink-850/95 dark:ring-white/10">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-300 to-brand-600" aria-hidden />
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${t.tile || ''}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <button type="button" onClick={open} className="min-w-0 flex-1 text-left outline-none">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">{tx('Nueva notificación')}</span>
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-slate-900 dark:text-white">{t.title}</span>
        {t.message && <span className="mt-0.5 block truncate text-[13px] text-slate-600 dark:text-slate-400">{t.message}</span>}
        {t.onClick && (
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 transition-all group-hover:gap-1.5 dark:text-brand-300">
            {tx('Ver detalle')} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      <button onClick={onClose} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label={tx('Cerrar')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
