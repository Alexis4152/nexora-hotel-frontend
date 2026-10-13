import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Loader2, Moon, MoreHorizontal, Sun, X } from 'lucide-react'
import { passwordStrength } from '../../utils/passwordStrength'
import { hueFor, initials } from '../../utils/format'
import { useTheme } from '../../context/ThemeContext'
import { LANG, LANGUAGES, setLang, tx } from '../../i18n'

/* ── Marca ──────────────────────────────────────────────────────────────────── */

export function NexoraMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand-400))" />
          <stop offset="1" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" className="fill-ink-900" />
      <path d="M18 46V18h6l16 18V18h6v28h-6L24 28v18z" fill="url(#nx-g)" />
      <circle cx="47" cy="17" r="3.5" fill="#c8a24a" />
    </svg>
  )
}

export function HotelMonogram({ name = '', className = 'h-10 w-10 text-base' }) {
  const letters = name.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('') || name[0] || 'H'
  return (
    <div className={`grid place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-display font-semibold text-white shadow-inner ${className}`}>
      {letters.toUpperCase()}
    </div>
  )
}

/* ── Formularios ─────────────────────────────────────────────────────────────── */

export function Field({ label, error, hint, children, htmlFor, required }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, required, className = '', icon: Icon, ...props }, ref) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={props.id || id} required={required}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input ref={ref} id={props.id || id} aria-invalid={!!error}
          className={`input ${Icon ? 'pl-10' : ''} ${error ? 'input-error' : ''} ${className}`} {...props} />
      </div>
    </Field>
  )
})

export function Select({ label, error, hint, required, children, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required}>
      <select id={id} className={`input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_.9rem_center] bg-no-repeat pr-9 ${error ? 'input-error' : ''}`} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function PasswordInput({ label, error, hint, showStrength = false, required, ...props }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  const strength = showStrength ? passwordStrength(props.value || '') : null
  const bars = ['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-500']
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} required={required}>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} aria-invalid={!!error}
          className={`input pr-11 ${error ? 'input-error' : ''}`} {...props} />
        <button type="button" onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5"
          aria-label={visible ? tx('Ocultar contraseña') : tx('Mostrar contraseña')}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && props.value ? (
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < Math.max(strength.score, 1) ? bars[strength.score] : 'bg-slate-200 dark:bg-white/10'}`} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{strength.label}</span>
            {[
              ['length', '10+ caracteres'],
              ['upper', tx('Mayúscula')],
              ['lower', tx('Minúscula')],
              ['digit', tx('Número')],
            ].map(([k, l]) => (
              <span key={k} className={`inline-flex items-center gap-1 ${strength.checks[k] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                <Check className="h-3 w-3" />
                {l}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Field>
  )
}

export function Switch({ checked, onChange, disabled, label, size = 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'
  const knob = size === 'sm' ? 'h-4 w-4 data-[on=true]:translate-x-4' : 'h-5 w-5 data-[on=true]:translate-x-5'
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dims} ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-white/15'}`}>
      <span data-on={checked} className={`rounded-full bg-white shadow transition-transform ${knob}`} />
    </button>
  )
}

/* ── Feedback ────────────────────────────────────────────────────────────────── */

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />
}

export function Button({ loading, children, variant = 'primary', size, className = '', ...props }) {
  return (
    <button className={`btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  gold: 'bg-gold-300/20 text-gold-600 ring-gold-500/30 dark:text-gold-400',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10',
}

export function Badge({ tone = 'slate', children, dot, className = '' }) {
  return (
    <span className={`chip ${TONES[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Avatar({ first, last, size = 'h-9 w-9 text-xs' }) {
  const hue = hueFor(`${first}${last}`)
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${size}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 65% 52%), hsl(${(hue + 40) % 360} 60% 38%))` }}>
      {initials(first, last)}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={`skeleton ${className}`} />
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-white/[.06]">
      <span className="text-slate-500 dark:text-slate-400">{tx('Página')} {page + 1} {tx('de')} {totalPages}</span>
      <div className="flex gap-1.5">
        <button className="btn-secondary btn-sm" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label={tx('Anterior')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-secondary btn-sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} aria-label={tx('Siguiente')}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* el navegador no permitió el portapapeles: el valor sigue visible para copiarlo a mano */
    }
  }
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3.5 dark:border-white/10 dark:bg-white/[.03]">
        <span className={`flex-1 truncate text-sm ${mono ? 'font-mono' : ''}`}>{value}</span>
        <button type="button" onClick={copy} className="btn-secondary btn-sm">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? tx('Copiado') : tx('Copiar')}
        </button>
      </div>
    </div>
  )
}

export function ThemeToggle({ className = '' }) {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} className={`grid h-9 w-9 place-items-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      aria-label={dark ? tx('Usar tema claro') : tx('Usar tema oscuro')} title={dark ? tx('Tema claro') : tx('Tema oscuro')}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}

/* ── Modal ───────────────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, description, children, footer, size = 'max-w-lg', icon: Icon }) {
  const panel = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('input,select,textarea,button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={panel} className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-scale-in dark:bg-ink-900 dark:ring-white/10 sm:rounded-3xl ${size}`}>
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/[.06]">
          {Icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm -mr-2 h-8 w-8 px-0" aria-label={tx('Cerrar')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-white/[.06] dark:bg-white/[.02] sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = tx('Confirmar'), tone = 'primary', loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{tx('Cancelar')}</button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  )
}

/** Logo del hotel si existe; si no, su monograma. */
export function HotelLogo({ hotel, className = 'h-10 w-10 text-sm' }) {
  if (hotel?.logoUrl) {
    return <img src={hotel.logoUrl} alt={hotel.name} className={`rounded-xl bg-white/90 object-contain p-1 ${className}`} />
  }
  return <HotelMonogram name={hotel?.name || ''} className={className} />
}

/* ── Menú de acciones (⋯) ───────────────────────────────────────────────────────── */

/**
 * Menú de acciones de una fila o tarjeta. Se dibuja en un portal con posición fija junto al botón: así ninguna
 * tarjeta con overflow-hidden ni tabla con scroll lo recorta. Se abre hacia arriba si no cabe abajo.
 * items: [{ icon, label, run, danger }]
 */
export function ActionMenu({ items, label, width = 224 }) {
  const [pos, setPos] = useState(null)
  const button = useRef(null)
  const menu = useRef(null)

  useEffect(() => {
    if (!pos) return undefined
    const close = () => setPos(null)
    const onDown = (e) => {
      if (!button.current?.contains(e.target) && !menu.current?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); button.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    menu.current?.querySelector('button')?.focus()
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  if (!items.length) return null

  const toggle = () => {
    if (pos) return setPos(null)
    const r = button.current.getBoundingClientRect()
    const height = items.length * 40 + 12
    const below = window.innerHeight - r.bottom
    const up = below < height + 8 && r.top > below
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8)
    return setPos(up ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
  }

  return (
    <>
      <button ref={button} type="button" className="btn-ghost btn-sm h-8 w-8 px-0" onClick={toggle}
        aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {pos && createPortal(
        <div ref={menu} role="menu" style={{ position: 'fixed', width, ...pos }}
          className="z-[60] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-ink-850 dark:ring-white/10">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { setPos(null); it.run() }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm outline-none ${it.danger ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10' : 'hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-white/5 dark:focus:bg-white/5'}`}>
              <it.icon className="h-4 w-4 opacity-70" /> {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

/* ── Idioma ─────────────────────────────────────────────────────────────────────── */

/** Selector ES | EN. Cambiar de idioma recarga la página (ver i18n/index.js). */
export function LanguageToggle({ className = '', dark: onDark = false }) {
  return (
    <div role="group" aria-label={tx('Idioma')}
      className={`inline-flex h-9 items-center rounded-xl p-0.5 text-[11px] font-bold tracking-wider ${onDark ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/[.06]'} ${className}`}>
      {LANGUAGES.map((l) => {
        const active = l === LANG
        return (
          <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={active}
            title={l === 'es' ? 'Español' : 'English'} lang={l}
            className={`h-8 rounded-[10px] px-2.5 uppercase transition ${active
              ? (onDark ? 'bg-white text-ink-900 shadow' : 'bg-white text-ink-900 shadow-sm dark:bg-white/15 dark:text-white')
              : (onDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}`}>
            {l}
          </button>
        )
      })}
    </div>
  )
}
