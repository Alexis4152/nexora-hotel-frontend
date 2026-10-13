import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { money } from '../utils/money'
import { LOCALE, tx } from '../i18n'

/**
 * Gráficas SVG ligeras (sin dependencias). Se dibujan al ancho real del contenedor para que el texto nunca se
 * deforme, usan los colores del hotel (brand/gold) y funcionan en modo oscuro.
 */

export const SERIES_COLORS = ['fill-brand-500', 'fill-gold-500', 'fill-sky-500', 'fill-rose-500']
const SERIES_BG = ['bg-brand-500', 'bg-gold-500', 'bg-sky-500', 'bg-rose-500']

const nf = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Formatea un valor según el formato que declara el backend. */
export function fmtValue(v, format, currency = 'MXN') {
  if (v === null || v === undefined || v === '') return '—'
  switch (format) {
    case 'money': return money(v, currency)
    case 'percent': return `${nf.format(Number(v))} %`
    case 'count': case 'number': return typeof v === 'number' || !isNaN(Number(v)) ? nf.format(Number(v)) : String(v)
    case 'date': return ISO_DATE.test(v) ? fmtDay(v, { day: 'numeric', month: 'short', year: 'numeric' }) : String(v)
    case 'datetime': {
      const [d, t] = String(v).split(' ')
      return ISO_DATE.test(d) ? `${fmtDay(d, { day: 'numeric', month: 'short', year: 'numeric' })} ${t || ''}`.trim() : String(v)
    }
    default: return String(v)
  }
}

function fmtDay(iso, opts) {
  return new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
}

function axisLabel(label) {
  return ISO_DATE.test(label) ? fmtDay(label, { day: 'numeric', month: 'short' }) : label
}

function axisValue(v, format, currency) {
  if (format === 'percent') return `${nf.format(v)}%`
  if (format === 'money') return Math.abs(v) >= 1000 ? `$${compact.format(v)}` : money(v, currency).replace(/\.00$/, '')
  return compact.format(v)
}

/** Escala "bonita": 4 divisiones con pasos de 1, 2, 2.5 o 5 × 10ⁿ. */
function niceScale(min, max, format) {
  if (format === 'percent' && max <= 100 && min >= 0) return { lo: 0, hi: 100, ticks: [0, 25, 50, 75, 100] }
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (hi === lo) return { lo: 0, hi: 1, ticks: [0, 1] }
  const raw = (hi - lo) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks = []
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  return { lo: start, hi: end, ticks }
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return undefined
    setWidth(ref.current.clientWidth)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Barras agrupadas (kind="bar") o línea con área (kind="line").
 * points: [{label, values: [n, n…]}], series: nombres de cada valor.
 */
export function Chart({ points = [], series = [], kind = 'bar', format = 'count', currency, height = 220, empty = tx('Sin datos en el periodo') }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const uid = useId().replace(/:/g, '')
  const values = points.flatMap((p) => p.values.map(Number))
  const allZero = values.every((v) => !v)
  const scale = useMemo(() => niceScale(Math.min(0, ...values), Math.max(0, ...values), format), [values.join(','), format]) // eslint-disable-line react-hooks/exhaustive-deps

  const padL = 48
  const padB = 26
  const padT = 10
  const w = Math.max(0, width - padL - 4)
  const h = height - padB - padT
  const y = (v) => padT + h - ((v - scale.lo) / (scale.hi - scale.lo || 1)) * h
  const band = points.length ? w / points.length : 0
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(w / 56))))

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && points.length > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.join(', ')} className="overflow-visible"
          onMouseLeave={() => setHover(null)}>
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-slate-300 dark:stroke-white/20' : 'stroke-slate-100 dark:stroke-white/[.06]'} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">{axisValue(t, format, currency)}</text>
            </g>
          ))}
          {points.map((p, i) => i % labelEvery === 0 && (
            <text key={p.label} x={padL + band * i + band / 2} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {axisLabel(p.label).slice(0, 14)}
            </text>
          ))}
          {kind === 'line' ? <Line uid={uid} points={points} series={series} x={(i) => padL + band * i + band / 2} y={y} base={y(Math.max(scale.lo, 0))} />
            : points.map((p, i) => {
              const gap = Math.min(10, band * 0.25)
              const bw = Math.max(1, (band - gap) / p.values.length)
              return p.values.map((v, j) => {
                const top = y(Math.max(0, Number(v)))
                const bottom = y(Math.min(0, Number(v)))
                return (
                  <rect key={`${i}-${j}`} x={padL + band * i + gap / 2 + bw * j} y={top} width={Math.max(1, bw - (p.values.length > 1 ? 1 : 0))}
                    height={Math.max(Number(v) ? 1.5 : 0, bottom - top)} rx={Math.min(4, bw / 3)}
                    className={`${SERIES_COLORS[j % 4]} transition-opacity ${hover !== null && hover !== i ? 'opacity-40' : ''}`} />
                )
              })
            })}
          {points.map((p, i) => (
            <rect key={`hit-${p.label}`} x={padL + band * i} y={padT} width={band} height={h} fill="transparent"
              onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
          ))}
          {hover !== null && kind === 'line' && (
            <line x1={padL + band * hover + band / 2} x2={padL + band * hover + band / 2} y1={padT} y2={padT + h}
              className="stroke-slate-300 dark:stroke-white/20" strokeDasharray="3 3" />
          )}
        </svg>
      )}
      {allZero && points.length > 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-xs text-slate-400">{empty}</p>
      )}
      {points.length === 0 && <p className="grid h-full place-items-center text-xs text-slate-400">{empty}</p>}
      {hover !== null && points[hover] && (
        <Tooltip x={padL + band * hover + band / 2} width={width} point={points[hover]} series={series} format={format} currency={currency} />
      )}
    </div>
  )
}

function Line({ uid, points, series, x, y, base }) {
  return series.map((_, j) => {
    const coords = points.map((p, i) => [x(i), y(Number(p.values[j]) || 0)])
    const d = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ')
    const area = `${d} L${coords[coords.length - 1][0].toFixed(1)},${base} L${coords[0][0].toFixed(1)},${base} Z`
    const id = `grad-${uid}-${j}`
    return (
      <g key={id}>
        <g className={j === 0 ? 'text-brand-500' : 'text-gold-500'}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
          <path d={d} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 45 && coords.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.5" fill="currentColor" />)}
        </g>
      </g>
    )
  })
}

function Tooltip({ x, width, point, series, format, currency }) {
  const left = Math.min(Math.max(x, 80), Math.max(80, width - 80))
  return (
    <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink-900/95 px-3 py-2 text-xs text-white shadow-xl ring-1 ring-white/10 backdrop-blur"
      style={{ left }}>
      <p className="mb-1 font-semibold">{ISO_DATE.test(point.label) ? fmtDay(point.label, { weekday: 'short', day: 'numeric', month: 'short' }) : point.label}</p>
      {series.map((s, j) => (
        <p key={s} className="flex items-center gap-2 whitespace-nowrap tabular-nums">
          <span className={`h-2 w-2 rounded-full ${SERIES_BG[j % 4]}`} />{s}: <b>{fmtValue(point.values[j], format, currency)}</b>
        </p>
      ))}
    </div>
  )
}

export function Legend({ series }) {
  if (!series || series.length < 2) return null
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
      {series.map((s, j) => <span key={s} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${SERIES_BG[j % 4]}`} />{s}</span>)}
    </div>
  )
}

/** Barras horizontales para categorías (canal, estado, método). */
export function HBars({ points = [], format = 'count', currency, empty = tx('Sin datos') }) {
  const max = Math.max(1, ...points.map((p) => Math.abs(Number(p.values[0]) || 0)))
  if (!points.length || points.every((p) => !Number(p.values[0]))) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>
  return (
    <ul className="space-y-3">
      {points.map((p, i) => {
        const v = Number(p.values[0]) || 0
        return (
          <li key={p.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate">{p.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{fmtValue(v, format, currency)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className={`h-full rounded-full ${SERIES_BG[i % 4]} transition-[width] duration-700`}
                style={{ width: `${Math.max((Math.abs(v) / max) * 100, v ? 3 : 0)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Anillo de porcentaje. */
export function Donut({ value = 0, size = 'h-28 w-28', label, sub }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={`relative ${size}`}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-slate-100 dark:stroke-white/10" />
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-brand-500 transition-[stroke-dasharray] duration-700"
          strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-2xl font-semibold tabular-nums">{label ?? `${nf.format(pct)}%`}</span>
        {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
      </div>
    </div>
  )
}
