import { useEffect, useState } from 'react'
import {
  ArrowRight, BedDouble, CalendarDays, ChevronLeft, ChevronRight, Clock, Facebook, Globe, Instagram, Mail, MapPin,
  MessageCircle, Phone, Ruler, Users,
} from 'lucide-react'
import { Link } from '../../router'
import { useHotel } from '../../context/HotelContext'
import { useAuth } from '../../context/AuthContext'
import { publicApi } from '../../api'
import { HotelLogo, LanguageToggle, ThemeToggle } from '../../components/ui'
import { BED_TYPES, CHARGE_MODES, DynamicIcon } from '../../components/catalog'
import { money } from '../../utils/money'
import { AccountLink, SearchWidget } from './PublicShell'
import { tx } from '../../i18n'

/**
 * Portal público del hotel con su identidad real (Configuración): portada, habitaciones, servicios, ubicación y
 * contacto, con el buscador de disponibilidad que lleva a la reservación en línea.
 */
export default function HotelHomePage() {
  const { hotel } = useHotel()
  const { user } = useAuth()
  const [rooms, setRooms] = useState(null)
  const [services, setServices] = useState([])
  const [viewer, setViewer] = useState(null)
  // Galería: fotos reales de las habitaciones del hotel (sin imágenes de relleno).
  const gallery = (rooms || []).flatMap((r) => r.images.map((img) => ({ ...img, caption: r.name })))

  useEffect(() => {
    publicApi.roomTypes().then(setRooms).catch(() => setRooms([]))
    publicApi.services().then(setServices).catch(() => setServices([]))
  }, [])

  const time = (t) => (t || '').slice(0, 5)
  const whatsapp = hotel.whatsapp && `https://wa.me/52${hotel.whatsapp}?text=${encodeURIComponent(tx('Hola, quiero información para hospedarme en {0}', hotel.name))}`
  const mapUrl = hotel.latitude && hotel.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
    : hotel.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.address}`)}`
  const minPrice = rooms?.length ? Math.min(...rooms.map((r) => Number(r.basePrice))) : null

  return (
    <div className="min-h-screen bg-white dark:bg-ink-950">
      {/* ── Portada ─────────────────────────────────────────────────────── */}
      <header className="relative flex min-h-[92vh] flex-col overflow-hidden text-white">
        {hotel.heroUrl ? (
          <>
            <img src={hotel.heroUrl} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover animate-[fade-up_1.2s_ease-out_both]" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/30 to-ink-950/90" />
          </>
        ) : (
          <div className="aurora grain absolute inset-0"><div className="grid-lines absolute inset-0" /></div>
        )}

        <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <HotelLogo hotel={hotel} className="h-11 w-11" />
            <span className="hidden font-display text-lg font-semibold sm:block">{hotel.name}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#habitaciones" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white md:block">{tx('Habitaciones')}</a>
            {services.length > 0 && <a href="#servicios" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white md:block">{tx('Servicios')}</a>}
            {gallery.length > 0 && <a href="#galeria" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white md:block">{tx('Galería')}</a>}
            <a href="#contacto" className="hidden rounded-xl px-3 py-2 text-sm text-white/80 hover:text-white md:block">{tx('Contacto')}</a>
            <LanguageToggle dark />
            <ThemeToggle className="text-white/70 hover:text-white" />
            <AccountLink user={user} dark />
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="max-w-3xl animate-fade-up">
            {(hotel.city || hotel.state) && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-gold-300 ring-1 ring-white/20 backdrop-blur">
                <MapPin className="h-3.5 w-3.5" /> {[hotel.city, hotel.state].filter(Boolean).join(', ')}
              </p>
            )}
            <h1 className="font-display text-5xl font-medium leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">{hotel.name}</h1>
            {hotel.tagline && <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">{hotel.tagline}</p>}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {rooms?.length > 0 && <a href="#habitaciones" className="btn-gold btn-lg">{tx('Ver habitaciones')} <ArrowRight className="h-4 w-4" /></a>}
              {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-secondary btn-lg !bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"><MessageCircle className="h-4 w-4" /> {tx('Escríbenos')}</a>}
            </div>
          </div>
          <div className="mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={tx('Check-in')} value={time(hotel.checkInTime)} />
            <Stat label={tx('Check-out')} value={time(hotel.checkOutTime)} />
            {minPrice !== null && <Stat label={tx('Desde')} value={money(minPrice, hotel.currency)} />}
            <Stat label={tx('Mascotas')} value={hotel.petsAllowed ? tx('Bienvenidas') : tx('No')} />
          </div>
        </div>
      </header>

      {/* ── Buscador ───────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto -mt-12 max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-white/10 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays className="h-5 w-5 text-brand-600 dark:text-brand-400" /> {tx('Reserva tu estancia')}</p>
            <Link to="/mi-reservacion" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{tx('¿Ya reservaste? Consulta tu reservación')}</Link>
          </div>
          <SearchWidget />
        </div>
      </section>

      {hotel.description && (
        <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-brand-600 dark:text-brand-400">{tx('Bienvenido')}</p>
          <p className="font-display text-2xl leading-relaxed text-slate-700 dark:text-slate-200 sm:text-3xl">{hotel.description}</p>
        </section>
      )}

      {/* ── Habitaciones ───────────────────────────────────────────────── */}
      <section id="habitaciones" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-16 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-brand-600 dark:text-brand-400">{tx('Hospedaje')}</p>
            <h2 className="font-display text-4xl font-semibold tracking-tight">{tx('Nuestras habitaciones')}</h2>
          </div>
          <p className="text-sm text-slate-500">{tx('Precios por noche, antes de impuestos.')}</p>
        </div>
        {!rooms ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-96" />)}</div>
        ) : rooms.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-10 text-center text-slate-500 dark:bg-white/[.03]">{tx('Muy pronto publicaremos nuestras habitaciones.')}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, i) => <RoomCard key={r.id} room={r} currency={hotel.currency} delay={i * 80} />)}
          </div>
        )}
      </section>

      {/* ── Servicios ──────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="servicios" className="scroll-mt-8 bg-slate-50 py-20 dark:bg-white/[.02]">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-brand-600 dark:text-brand-400">{tx('Extras')}</p>
            <h2 className="mb-10 font-display text-4xl font-semibold tracking-tight">{tx('Servicios para tu estancia')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <div key={s.id} className="card p-6">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg"><DynamicIcon name={s.icon} className="h-5 w-5" /></div>
                  <p className="font-semibold">{s.name}</p>
                  {s.description && <p className="mt-1 text-sm text-slate-500">{s.description}</p>}
                  <p className="mt-4 font-display text-lg font-semibold">{Number(s.price) === 0 ? tx('Incluido') : money(s.price, hotel.currency)} <span className="text-xs font-normal text-slate-500">{Number(s.price) === 0 ? '' : CHARGE_MODES[s.chargeMode].toLowerCase()}</span></p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Galería ────────────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section id="galeria" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-brand-600 dark:text-brand-400">{tx('Galería')}</p>
          <h2 className="mb-10 font-display text-4xl font-semibold tracking-tight">{tx('Conoce el hotel')}</h2>
          <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4">
            {gallery.slice(0, 10).map((img, i) => (
              <button key={img.id} onClick={() => setViewer(i)} aria-label={tx('Ver foto: {0}', img.caption)}
                className={`group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5 ${i % 5 === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                <img src={img.url} alt={img.caption} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">{img.caption}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {viewer !== null && <Lightbox images={gallery} index={viewer} onChange={setViewer} onClose={() => setViewer(null)} />}

      {/* ── Contacto ───────────────────────────────────────────────────── */}
      <section id="contacto" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-ink-900 text-white">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-gold-300">{tx('Contacto')}</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight">{tx('Te esperamos')}</h2>
              <ul className="mt-8 space-y-4 text-white/80">
                {hotel.address && <ContactItem icon={MapPin} href={mapUrl}>{hotel.address}</ContactItem>}
                {hotel.phone && <ContactItem icon={Phone} href={`tel:${hotel.phone}`}>{hotel.phone.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1 $2 $3')}</ContactItem>}
                {whatsapp && <ContactItem icon={MessageCircle} href={whatsapp}>{tx('WhatsApp')}</ContactItem>}
                {hotel.contactEmail && <ContactItem icon={Mail} href={`mailto:${hotel.contactEmail}`}>{hotel.contactEmail}</ContactItem>}
                <ContactItem icon={Clock}>{tx('Check-in desde las')} {time(hotel.checkInTime)} {tx('· Check-out hasta las')} {time(hotel.checkOutTime)}</ContactItem>
              </ul>
              <div className="mt-8 flex gap-2">
                {[[hotel.facebook, Facebook, tx('Facebook')], [hotel.instagram, Instagram, tx('Instagram')], [hotel.website, Globe, tx('Sitio web')]].filter(([u]) => u).map(([u, Icon, l]) => (
                  <a key={l} href={u} target="_blank" rel="noreferrer noopener" aria-label={l} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"><Icon className="h-5 w-5" /></a>
                ))}
              </div>
            </div>
            <div className="relative min-h-[280px] bg-gradient-to-br from-brand-600 to-brand-900">
              {hotel.latitude && hotel.longitude ? (
                <iframe title={tx('Ubicación del hotel')} loading="lazy" className="absolute inset-0 h-full w-full grayscale-[30%]" referrerPolicy="no-referrer"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(hotel.longitude) - 0.01}%2C${Number(hotel.latitude) - 0.006}%2C${Number(hotel.longitude) + 0.01}%2C${Number(hotel.latitude) + 0.006}&layer=mapnik&marker=${hotel.latitude}%2C${hotel.longitude}`} />
              ) : (
                <div className="grid h-full place-items-center p-10 text-center">
                  <div><MapPin className="mx-auto mb-3 h-10 w-10 text-gold-300" /><p className="font-display text-2xl">{hotel.city || hotel.name}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 dark:border-white/[.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-500 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2"><HotelLogo hotel={hotel} className="h-7 w-7 text-[10px]" /> {hotel.name}</div>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/politicas" className="hover:text-slate-700 dark:hover:text-slate-300">{tx('Políticas y privacidad')}</Link>
            <Link to="/mi-reservacion" className="hover:text-slate-700 dark:hover:text-slate-300">{tx('Mi reservación')}</Link>
            <Link to="/login" className="hover:text-slate-700 dark:hover:text-slate-300">{tx('Acceso del personal')}</Link>
          </nav>
          <p>{tx('Operado con Nexora Hotel')}</p>
        </div>
      </footer>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
      <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  )
}

function ContactItem({ icon: Icon, href, children }) {
  const content = <><Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" /><span>{children}</span></>
  return (
    <li>
      {href ? <a href={href} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-white">{content}</a> : <span className="flex gap-3">{content}</span>}
    </li>
  )
}

function RoomCard({ room, currency, delay }) {
  const [index, setIndex] = useState(0)
  const images = room.images
  const go = (d) => setIndex((i) => (i + d + images.length) % images.length)
  return (
    <article className="group overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl animate-fade-up dark:bg-ink-900 dark:ring-white/[.07]" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-500/20 to-gold-500/20">
        {images.length ? (
          <img key={images[index].id} src={images[index].url} alt={`${room.name} – foto ${index + 1}`} loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : <div className="grid h-full place-items-center"><BedDouble className="h-12 w-12 text-brand-500/40" /></div>}
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label={tx('Foto anterior')} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow transition group-hover:opacity-100"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => go(1)} aria-label={tx('Foto siguiente')} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow transition group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((img, i) => <span key={img.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />)}
            </div>
          </>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl font-semibold"><Link to={`/habitaciones/${room.id}`} className="hover:underline">{room.name}</Link></h3>
          <p className="text-right"><span className="block text-[11px] uppercase tracking-wider text-slate-400">{tx('Desde')}</span><span className="font-display text-xl font-semibold">{money(room.basePrice, currency)}</span></p>
        </div>
        {room.description && <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{room.description}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-500" /> {tx('Hasta')} {room.maxOccupancy}</span>
          <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-500" /> {room.bedCount} {BED_TYPES[room.bedType]?.toLowerCase()}</span>
          {room.sizeM2 && <span className="inline-flex items-center gap-1.5"><Ruler className="h-4 w-4 text-brand-500" /> {room.sizeM2} {tx('m²')}</span>}
        </div>
        {room.amenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4 dark:border-white/[.06]">
            {room.amenities.slice(0, 6).map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300"><DynamicIcon name={a.icon} className="h-3 w-3" />{a.name}</span>
            ))}
          </div>
        )}
        <Link to={`/habitaciones/${room.id}`} className="btn-secondary mt-5 w-full">{tx('Ver detalles y reservar')} <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </article>
  )
}

/** Visor de fotos a pantalla completa (teclado: ← → Esc). */
export function Lightbox({ images, index, onChange, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onChange((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onChange, onClose])
  const img = images[index]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={tx('Galería')} onClick={onClose}>
      <img src={img.url} alt={img.caption} className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/80">{img.caption} · {index + 1} / {images.length}</p>
      {images.length > 1 && (
        <>
          <button aria-label={tx('Foto anterior')} onClick={(e) => { e.stopPropagation(); onChange((index - 1 + images.length) % images.length) }}
            className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronLeft className="h-5 w-5" /></button>
          <button aria-label={tx('Foto siguiente')} onClick={(e) => { e.stopPropagation(); onChange((index + 1) % images.length) }}
            className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}
      <button aria-label={tx('Cerrar')} onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25">{tx('Cerrar')}</button>
    </div>
  )
}
