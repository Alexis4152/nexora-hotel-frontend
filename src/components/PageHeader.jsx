/** Encabezado consistente de cada pantalla del panel. */
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.16em] text-brand-600 dark:text-brand-400">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
