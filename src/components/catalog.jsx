import { useId, useRef, useState } from 'react'
import {
  Accessibility, ArrowLeft, ArrowRight, Baby, Bath, BedDouble, Bike, Briefcase, Bus, Car, CigaretteOff, Coffee,
  ConciergeBell, Dog, Dumbbell, Fan, Flower2, Heart, ImagePlus, Key, Lock, Microwave, Mountain, Plane,
  Refrigerator, Shirt, ShowerHead, Snowflake, Sofa, Sparkles, Star, Sun, Trash2, Tv, UploadCloud, Utensils, Waves,
  Wifi, Wine,
} from 'lucide-react'
import { Field, Spinner } from './ui'
import { tx } from '../i18n'

/* ── Íconos de amenidades y servicios (el backend guarda solo el nombre) ─────────── */

export const ICONS = {
  wifi: Wifi, snowflake: Snowflake, tv: Tv, bath: Bath, 'shower-head': ShowerHead, coffee: Coffee, wine: Wine,
  utensils: Utensils, car: Car, waves: Waves, dumbbell: Dumbbell, sparkles: Sparkles, 'concierge-bell': ConciergeBell,
  shirt: Shirt, dog: Dog, baby: Baby, mountain: Mountain, sun: Sun, 'bed-double': BedDouble, sofa: Sofa, lock: Lock,
  key: Key, plane: Plane, bus: Bus, bike: Bike, briefcase: Briefcase, 'cigarette-off': CigaretteOff,
  accessibility: Accessibility, fan: Fan, refrigerator: Refrigerator, microwave: Microwave, flower: Flower2,
  heart: Heart, star: Star,
}

export function DynamicIcon({ name, className = 'h-4 w-4' }) {
  const Icon = ICONS[name] || Sparkles
  return <Icon className={className} />
}

export function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
      {Object.keys(ICONS).map((name) => (
        <button key={name} type="button" title={name} onClick={() => onChange(name)} aria-pressed={value === name}
          className={`grid h-9 place-items-center rounded-lg ring-1 transition ${value === name ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:ring-brand-400 dark:ring-white/10'}`}>
          <DynamicIcon name={name} />
        </button>
      ))}
    </div>
  )
}

/* ── Pestañas ───────────────────────────────────────────────────────────────────── */

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-full gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-white/[.07] sm:min-w-0" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = value === t.key
          return (
            <button key={t.key} role="tab" aria-selected={active} onClick={() => onChange(t.key)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-ink-900 text-white shadow dark:bg-white/10' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-slate-200'}`}>
              {Icon && <Icon className="h-4 w-4" />}
              {t.label}
              {t.count !== undefined && <span className={`rounded-md px-1.5 text-[11px] ${active ? 'bg-white/15' : 'bg-slate-100 dark:bg-white/10'}`}>{t.count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Formularios ────────────────────────────────────────────────────────────────── */

export function Textarea({ label, error, hint, rows = 4, maxLength, value, ...props }) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint ?? (maxLength ? `${(value || '').length}/${maxLength}` : undefined)} htmlFor={id}>
      <textarea id={id} rows={rows} maxLength={maxLength} value={value ?? ''}
        className={`input h-auto py-2.5 leading-relaxed ${error ? 'input-error' : ''}`} {...props} />
    </Field>
  )
}

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_MB = 8

/** Zona para soltar o elegir imágenes. Valida tipo y tamaño antes de subir (el backend vuelve a validar todo). */
export function ImageDrop({ onFiles, multiple = true, busy, label = tx('Arrastra fotos o haz clic para elegir'), compact }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')

  const take = (list) => {
    const files = [...list]
    const bad = files.find((f) => !ACCEPT.split(',').includes(f.type) || f.size > MAX_MB * 1024 * 1024)
    if (bad) {
      setError(tx('"{0}" no es JPG, PNG o WEBP de hasta {1} MB', bad.name, MAX_MB))
      return
    }
    setError('')
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition disabled:cursor-wait ${compact ? 'p-4' : 'p-7'} ${over ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 hover:border-brand-400 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[.02]'}`}>
        {busy ? <Spinner className="h-6 w-6 text-brand-500" /> : (compact ? <ImagePlus className="h-5 w-5 text-brand-500" /> : <UploadCloud className="h-7 w-7 text-brand-500" />)}
        <span className="text-sm font-medium">{busy ? tx('Subiendo…') : label}</span>
        {!compact && <span className="text-xs text-slate-500">{tx('JPG, PNG o WEBP · hasta')} {MAX_MB} {tx('MB · se eliminan los metadatos (GPS, cámara)')}</span>}
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} className="hidden"
        onChange={(e) => { take(e.target.files); e.target.value = '' }} />
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

/** Galería ordenable: la primera foto es la principal. */
export function Gallery({ images, onMove, onDelete, busy }) {
  if (!images?.length) return null
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img, i) => (
        <li key={img.id} className="group relative overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-white/10">
          <img src={img.url} alt={img.altText || ''} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          {i === 0 && <span className="absolute left-2 top-2 rounded-md bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-300">{tx('Principal')}</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <div className="flex gap-1">
              <IconBtn label={tx('Mover antes')} disabled={busy || i === 0} onClick={() => onMove(i, -1)}><ArrowLeft className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label={tx('Mover después')} disabled={busy || i === images.length - 1} onClick={() => onMove(i, 1)}><ArrowRight className="h-3.5 w-3.5" /></IconBtn>
            </div>
            <IconBtn label={tx('Eliminar foto')} danger disabled={busy} onClick={() => onDelete(img)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
          </div>
        </li>
      ))}
    </ul>
  )
}

function IconBtn({ children, label, danger, ...props }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={`grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-700 transition hover:bg-white disabled:opacity-40 ${danger ? 'hover:text-rose-600' : ''}`} {...props}>
      {children}
    </button>
  )
}

/** Mueve un elemento y devuelve los ids en el nuevo orden. */
export function moveIds(images, index, delta) {
  const ids = images.map((i) => i.id)
  const target = index + delta
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  return ids
}

export const BED_TYPES = {
  INDIVIDUAL: tx('Individual'),
  MATRIMONIAL: tx('Matrimonial'),
  QUEEN: tx('Queen'),
  KING: tx('King'),
  LITERA: tx('Litera'),
  SOFA_CAMA: tx('Sofá cama'),
}

export const ROOM_STATUS = {
  AVAILABLE: { label: tx('Disponible'), tone: 'green', dot: 'bg-emerald-500' },
  OCCUPIED: { label: tx('Ocupada'), tone: 'brand', dot: 'bg-brand-500' },
  CLEANING: { label: tx('En limpieza'), tone: 'amber', dot: 'bg-amber-500' },
  MAINTENANCE: { label: tx('Mantenimiento'), tone: 'red', dot: 'bg-rose-500' },
  OUT_OF_SERVICE: { label: tx('Fuera de servicio'), tone: 'slate', dot: 'bg-slate-500' },
}

export const CHARGE_MODES = {
  PER_STAY: tx('Por estancia'),
  PER_NIGHT: tx('Por noche'),
  PER_PERSON: tx('Por persona'),
  PER_PERSON_NIGHT: tx('Por persona por noche'),
  PER_UNIT: tx('Por unidad'),
}
