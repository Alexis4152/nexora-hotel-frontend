import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Check, Ruler, Users } from 'lucide-react'
import PublicShell, { SearchWidget } from './PublicShell'
import { Lightbox } from './HotelHomePage'
import { Link } from '../../router'
import { publicApi } from '../../api'
import { useHotel } from '../../context/HotelContext'
import { Skeleton } from '../../components/ui'
import { BED_TYPES, DynamicIcon } from '../../components/catalog'
import { money } from '../../utils/money'
import { tx } from '../../i18n'

/** Ficha de un tipo de habitación: galería, capacidad, amenidades y buscador para reservarla. */
export default function RoomDetailPage() {
  const { id } = useParams()
  const { hotel } = useHotel()
  const [room, setRoom] = useState(undefined)
  const [viewer, setViewer] = useState(null)

  useEffect(() => {
    publicApi.roomTypes().then((list) => setRoom(list.find((r) => String(r.id) === id) || null)).catch(() => setRoom(null))
  }, [id])

  if (room === undefined) return <PublicShell><Skeleton className="h-96" /></PublicShell>
  if (room === null) {
    return (
      <PublicShell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="font-display text-xl font-semibold">{tx('Esta habitación ya no está disponible')}</p>
          <Link to="/" className="btn-primary mt-5">{tx('Ver todas las habitaciones')}</Link>
        </div>
      </PublicShell>
    )
  }
  const images = room.images.map((img) => ({ ...img, caption: room.name }))

  return (
    <PublicShell>
      <Link to="/" className="btn-ghost btn-sm -ml-2 mb-4"><ArrowLeft className="h-4 w-4" /> {tx('Todas las habitaciones')}</Link>
      {images.length > 0 ? (
        <div className="grid h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-[440px]">
          {images.slice(0, 5).map((img, i) => (
            <button key={img.id} onClick={() => setViewer(i)} aria-label={tx('Ver foto {0}', i + 1)}
              className={`group relative overflow-hidden bg-slate-100 dark:bg-white/5 ${i === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : 'hidden sm:block'}`}>
              <img src={img.url} alt={`${room.name} – foto ${i + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              {i === 4 && images.length > 5 && <span className="absolute inset-0 grid place-items-center bg-black/50 font-semibold text-white">+{images.length - 5} {tx('fotos')}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid h-64 place-items-center rounded-3xl bg-gradient-to-br from-brand-500/20 to-gold-500/20"><BedDouble className="h-14 w-14 text-brand-500/40" /></div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{room.name}</h1>
          <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-500" /> {tx('Hasta')} {room.maxAdults} {tx('adultos y')} {room.maxChildren} {tx('menores')}</span>
            <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-500" /> {room.bedCount} {tx('cama(s)')} {BED_TYPES[room.bedType]?.toLowerCase()}</span>
            {room.sizeM2 && <span className="inline-flex items-center gap-1.5"><Ruler className="h-4 w-4 text-brand-500" /> {Number(room.sizeM2)} {tx('m²')}</span>}
          </div>
          {room.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">{room.description}</p>}
          {room.amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 font-display text-xl font-semibold">{tx('Amenidades')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {room.amenities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><DynamicIcon name={a.icon} /></span>{a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="mt-8 rounded-2xl bg-slate-100/70 p-5 text-sm dark:bg-white/[.03]">
            <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-emerald-600" /> {tx('Check-in desde las')} {(hotel.checkInTime || '').slice(0, 5)} {tx('· check-out hasta las')} {(hotel.checkOutTime || '').slice(0, 5)}</p>
            <p className="mt-1 text-slate-500">{tx('Consulta las')} <Link to="/politicas" className="font-medium text-brand-600 underline dark:text-brand-400">{tx('políticas de cancelación y estancia')}</Link>.</p>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-sm text-slate-500">{tx('Desde')}</p>
            <p className="font-display text-3xl font-semibold">{money(room.basePrice, hotel.currency)} <span className="text-sm font-normal text-slate-500">{tx('por noche, antes de impuestos')}</span></p>
            <p className="mb-4 mt-1 text-xs text-slate-500">{tx('El precio final depende de las fechas y temporada.')}</p>
            <SearchWidget />
          </div>
        </aside>
      </div>
      {viewer !== null && <Lightbox images={images} index={viewer} onChange={setViewer} onClose={() => setViewer(null)} />}
    </PublicShell>
  )
}
