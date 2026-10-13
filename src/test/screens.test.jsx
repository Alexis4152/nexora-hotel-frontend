import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App'

/**
 * Renderiza la aplicación completa en cada ruta con la API simulada: detecta pantallas que truenan al pintar
 * y verifica que cada ámbito muestre lo que corresponde según la sesión y los permisos.
 */
const state = vi.hoisted(() => ({ session: null }))

const ADMIN = {
  id: 1, email: 'admin@granhotel.mx', firstName: 'Mariana', lastName: 'Ortega', platform: false,
  hotel: { id: 1, slug: 'gran-hotel', name: 'Gran Hotel Nexora', timezone: 'America/Cancun' },
  roles: ['ADMIN'], permissions: ['DASHBOARD:VIEW', 'USERS:VIEW', 'USERS:MANAGE', 'ROLES:MANAGE', 'AUDIT:VIEW', 'RESERVATIONS:VIEW',
    'ROOMS:VIEW', 'ROOMS:CREATE', 'ROOMS:UPDATE', 'ROOMS:BLOCK', 'HOUSEKEEPING:UPDATE', 'RATES:VIEW', 'RATES:MANAGE', 'SERVICES:VIEW',
    'SERVICES:MANAGE', 'SETTINGS:VIEW', 'SETTINGS:UPDATE', 'POLICIES:MANAGE', 'RESERVATIONS:CREATE', 'RESERVATIONS:CONFIRM', 'RESERVATIONS:CANCEL', 'CUSTOMERS:VIEW', 'CUSTOMERS:CREATE', 'EMAIL_SETTINGS:MANAGE', 'NOTIFICATIONS:MANAGE', 'CASH:OPERATE', 'PAYMENTS:VIEW', 'PAYMENT_SETTINGS:MANAGE', 'REPORTS:OPERATIONAL', 'REPORTS:FINANCIAL', 'REPORTS:EXPORT'],
  mustChangePassword: false,
}
const RECEPTION = { ...ADMIN, id: 2, firstName: 'Luis', roles: ['RECEPTIONIST'], permissions: ['DASHBOARD:VIEW', 'RESERVATIONS:VIEW'] }
const GUEST = { id: 30, email: 'lucia@mail.mx', firstName: 'Lucía', lastName: 'Méndez', platform: false, hotel: { id: 1, slug: 'gran-hotel', name: 'Gran Hotel Nexora', timezone: 'America/Cancun' }, roles: ['GUEST'], permissions: [], mustChangePassword: false }
const SUPER = { id: 9, email: 'super@nexora.mx', firstName: 'Nexora', lastName: 'Plataforma', platform: true, hotel: null, roles: ['SUPER_ADMIN'], permissions: [], mustChangePassword: false }

vi.mock('../api/client', () => ({
  default: {},
  setAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
  refreshSession: () => (state.session ? Promise.resolve({ accessToken: 't', user: state.session }) : Promise.reject(new Error('401'))),
  errorMessage: () => 'error',
  fieldErrors: () => ({}),
}))

vi.mock('../api', () => {
  const roles = [
    { id: 1, code: 'ADMIN', name: 'Administrador', system: true, editable: false, userCount: 1, permissions: ['USERS:VIEW', 'ROLES:MANAGE'] },
    { id: 2, code: 'RECEPTIONIST', name: 'Recepcionista', system: true, editable: true, userCount: 1, permissions: ['DASHBOARD:VIEW'] },
  ]
  const permissions = [
    { code: 'DASHBOARD:VIEW', module: 'DASHBOARD', action: 'VIEW', description: 'Ver panel', reserved: false, sensitive: false },
    { code: 'ROLES:MANAGE', module: 'ROLES', action: 'MANAGE', description: 'Roles', reserved: true, sensitive: true },
  ]
  const user = { id: 2, email: 'recepcion@granhotel.mx', firstName: 'Luis', lastName: 'Fernández', active: true, locked: false, mustChangePassword: false, lastLoginAt: null, roles: [{ id: 2, code: 'RECEPTIONIST', name: 'Recepcionista' }] }
  const summary = { id: 5, folio: 'NXH-AB12CD', status: 'PENDING', source: 'WEB', guestName: 'Ana López', contactPhone: '9981234567', checkIn: '2026-12-04', checkOut: '2026-12-06', nights: 2, adults: 2, children: 0, roomNumber: '101', roomTypeName: 'Suite Océano', total: 8908.8, createdAt: '2026-10-07T12:00:00Z' }
  const option = { roomTypeId: 1, name: 'Suite Océano', description: 'Vista al mar', maxAdults: 2, maxChildren: 1, maxOccupancy: 3, bedType: 'KING', bedCount: 1, sizeM2: 48, imageUrl: null, amenities: ['Wi-Fi'], availableRooms: 2, fitsGuests: true, lodgingTotal: 7680, taxes: 1228.8, total: 8908.8, averageNight: 3840, nights: [{ date: '2026-12-04', price: 3840 }, { date: '2026-12-05', price: 3840 }] }
  return {
    authApi: { logout: vi.fn(), login: vi.fn() },
    publicApi: {
      hotel: () => Promise.resolve({ slug: 'gran-hotel', name: 'Gran Hotel Nexora', timezone: 'America/Cancun', currency: 'MXN', tagline: 'Frente al mar', checkInTime: '15:00:00', checkOutTime: '12:00:00', whatsapp: '9981234567', theme: { primary: '#0d9488', accent: '#c8a24a', sidebar: '#0a0f1c', defaultMode: 'system' } }),
      roomTypes: () => Promise.resolve([{ id: 1, name: 'Suite Océano', description: 'Vista al mar', basePrice: 3200, maxAdults: 2, maxChildren: 1, maxOccupancy: 3, bedCount: 1, bedType: 'KING', sizeM2: 48, amenities: [{ id: 1, name: 'Wi-Fi', icon: 'wifi' }], images: [] }]),
      services: () => Promise.resolve([{ id: 1, name: 'Desayuno buffet', price: 250, chargeMode: 'PER_PERSON_NIGHT', icon: 'coffee' }]),
      policies: () => Promise.resolve({ version: 1, values: { freeCancelHours: 48, lateCancelPenaltyType: 'FIRST_NIGHT', lateCancelPenaltyValue: 0, terms: 'Términos del hotel', privacyNotice: 'Aviso' } }),
    },
    settingsApi: {
      identity: () => Promise.resolve({ name: 'Gran Hotel Nexora', slug: 'gran-hotel', theme: {} }),
      operation: () => Promise.resolve({ checkInTime: '15:00:00', checkOutTime: '12:00:00', receptionOpens: '00:00:00', receptionCloses: '23:59:00', reception24h: true, minBookingLeadHours: 0, maxBookingLeadDays: 365, minNights: 1, maxNights: 30, maxRoomsPerBooking: 5, holdMinutes: 15, allowSameDayBooking: true, pendingConfirmationHours: 24 }),
      policies: () => Promise.resolve({ version: 2, values: { freeCancelHours: 48, lateCancelPenaltyType: 'FIRST_NIGHT', lateCancelPenaltyValue: 0, depositPercent: 30, pendingPaymentExpiryMinutes: 30, noShowPenaltyType: 'FIRST_NIGHT', noShowPenaltyValue: 0, petsAllowed: false } }),
    },
    inventoryApi: {
      rooms: () => Promise.resolve([{ id: 7, number: '101', floor: '1', status: 'CLEANING', active: true, roomTypeId: 1, roomTypeName: 'Suite Océano', images: [], activeBlocks: [] }]),
      roomTypes: () => Promise.resolve([{ id: 1, code: 'STE', name: 'Suite Océano', basePrice: 3200, maxOccupancy: 3, bedCount: 1, bedType: 'KING', active: true, roomCount: 1, amenities: [], images: [] }]),
      amenities: () => Promise.resolve([{ id: 1, name: 'Wi-Fi', icon: 'wifi', active: true }]),
    },
    ratesApi: {
      seasons: () => Promise.resolve([]),
      rules: () => Promise.resolve([{ id: 3, name: 'Fin de semana', ruleType: 'WEEKEND', daysOfWeek: ['FRIDAY', 'SATURDAY'], adjustmentType: 'PERCENT', adjustmentValue: 20, priority: 0, active: true }]),
      taxes: () => Promise.resolve([{ id: 1, name: 'IVA', percent: 16, appliesTo: 'ALL', includedInPrice: false, active: true }]),
      services: () => Promise.resolve([{ id: 1, name: 'Desayuno buffet', price: 250, chargeMode: 'PER_PERSON_NIGHT', icon: 'coffee', active: true, bookableOnline: true }]),
      quote: () => Promise.resolve({ nights: [{ date: '2026-12-04', base: 3200, price: 3840, ruleName: 'Fin de semana' }], roomSubtotal: 3840, extraGuestsSubtotal: 0, subtotal: 3840, taxes: [{ name: 'IVA', percent: 16, included: false, amount: 614.4 }], taxesAdded: 614.4, total: 4454.4 }),
    },
    reservationsApi: {
      board: () => Promise.resolve({ arrivals: [summary], departures: [], inHouse: [], pending: [summary] }),
      list: () => Promise.resolve({ content: [summary], page: 0, totalPages: 1 }),
      calendar: () => Promise.resolve({ rooms: [], entries: [] }),
    },
    customersApi: {
      list: () => Promise.resolve({ content: [{ id: 3, firstName: 'Ana', lastName: 'López', email: 'ana@correo.mx', phoneCountryCode: '52', phone: '9981234567', reservations: 2, lastStay: '2026-08-01', hasAccount: false, createdAt: '2026-07-01T12:00:00Z' }], page: 0, totalPages: 1 }),
    },
    emailApi: {
      settings: () => Promise.resolve({ enabled: false, port: 587, starttls: true, passwordSet: false, usable: false }),
      templates: () => Promise.resolve([{ eventCode: 'RESERVATION_CREATED', label: 'Reservación recibida', subject: 'Recibimos tu solicitud', body: 'Hola', enabled: true, sendToGuest: true, sendToAdmins: true, variables: ['folio'] }]),
      outbox: () => Promise.resolve([]),
    },
    publicAccountApi: { register: vi.fn(), verify: () => Promise.resolve({ message: 'Tu correo quedó confirmado' }), resend: vi.fn() },
    accountApi: {
      profile: () => Promise.resolve({ firstName: 'Lucía', lastName: 'Méndez', email: 'lucia@mail.mx', phoneCountryCode: '52', phone: '9982223344', country: 'MX', memberSince: '2026-01-01T00:00:00Z', stays: 1, requests: [] }),
      reservations: () => Promise.resolve([{ folio: 'NXH-AB12CD', status: 'CONFIRMED', checkIn: '2026-12-04', checkOut: '2026-12-06', nights: 2, adults: 2, children: 0, roomTypeName: 'Suite Océano', imageUrl: null, total: 8908.8, paid: 2672.4, balance: 6236.4, depositPending: 0, upcoming: true }]),
      payments: () => Promise.resolve([]),
    },
    dataRequestsApi: { list: () => Promise.resolve([]) },
    reportsApi: {
      dashboard: () => Promise.resolve({
        rooms: { total: 9, available: 2, occupied: 6, maintenance: 1, outOfService: 0, occupancyPercent: 75 },
        today: { createdToday: 2, arrivals: 4, departures: 1, inHouse: 4, cancellations: 1, pending: 2 },
        finance: { collectedToday: 1500, collectedMonth: 48200.5, depositsMonth: 12000, receivable: 9800, receivableCount: 3, pendingOnline: 1, currency: 'MXN' },
        byChannel: [{ label: 'Sitio web', values: [5] }, { label: 'Recepción', values: [2] }],
        byStatus: [{ label: 'Confirmada', values: [6] }],
        occupancyNext14: [{ label: '2026-10-08', values: [75] }, { label: '2026-10-09', values: [50] }],
        incomeLast30: [{ label: '2026-10-07', values: [800] }, { label: '2026-10-08', values: [1500] }],
      }),
      catalog: () => Promise.resolve([
        { type: 'income', title: 'Ingresos por periodo', description: 'Cobrado contra devengado', group: 'Finanzas', financial: true, snapshot: false, filters: [] },
        { type: 'occupancy', title: 'Ocupación', description: 'Vendidas contra disponibles', group: 'Operación', financial: false, snapshot: false, filters: ['roomTypeId'] },
      ]),
      run: () => Promise.resolve({
        type: 'income', title: 'Ingresos por periodo', basis: 'Cobrado por fecha de pago', from: '2026-10-01', to: '2026-10-08', currency: 'MXN',
        metrics: [{ key: 'collected', label: 'Cobrado neto', value: 1800, format: 'money', hint: 'Pagos completados menos reembolsos' }],
        charts: [{ key: 'c', title: 'Cobrado contra devengado', kind: 'bar', format: 'money', series: ['Cobrado neto', 'Devengado'], points: [{ label: '2026-10-08', values: [1800, 2000] }] }],
        columns: [{ key: 'day', label: 'Día', format: 'date' }, { key: 'collected', label: 'Cobrado neto', format: 'money' }],
        rows: [{ day: '2026-10-07', collected: 300 }, { day: '2026-10-08', collected: 1500 }], totalRows: 2, truncated: false, notes: ['Cobrado y devengado no se suman.'],
      }),
      export: vi.fn(),
    },
    cashApi: { current: () => Promise.resolve(null), sessions: () => Promise.resolve({ content: [], page: 0, totalPages: 0 }) },
    paymentsApi: {
      list: () => Promise.resolve({ content: [{ id: 1, reservationId: 5, folio: 'NXH-AB12CD', guestName: 'Ana López', kind: 'PAYMENT', method: 'CASH', status: 'COMPLETED', amount: 1500, reference: null, createdByName: 'Luis', createdAt: '2026-10-07T12:00:00Z', completedAt: '2026-10-07T12:00:00Z' }], page: 0, totalPages: 1, totalElements: 1, totals: [{ method: 'CASH', received: 1500, returned: 0, net: 1500, count: 1 }], net: 1500 }),
      reconciliation: () => Promise.resolve([]),
    },
    paymentSettingsApi: { get: () => Promise.resolve({ cashEnabled: true, cardEnabled: true, transferEnabled: true, onlineEnabled: false, sandbox: true, privateKeySet: false, webhookUrl: 'https://api/x', onlineUsable: false }) },
    bookingApi: {
      availability: () => Promise.resolve({ checkIn: '2026-12-04', checkOut: '2026-12-06', nights: 2, adults: 2, children: 0, options: [option] }),
      paymentOptions: () => Promise.resolve({ cash: true, card: true, transfer: true, online: false, sandbox: true }),
      paymentStatus: () => Promise.resolve({ status: 'COMPLETED', amount: 2672.4, currency: 'MXN', folio: 'NXH-AB12CD', hotelName: 'Gran Hotel Nexora', reservationStatus: 'CONFIRMED', sandbox: true }),
      view: (folio, token) => (token === 'tok-valido-123456789012345' ? Promise.resolve({ folio, status: 'PENDING', hotelName: 'Gran Hotel Nexora', guestName: 'Ana López', checkIn: '2026-12-04', checkOut: '2026-12-06', nights: 2, adults: 2, children: 0, roomTypeName: 'Suite Océano', services: [], priceLines: [{ revision: 1, type: 'NIGHT', date: '2026-12-04', description: 'Suite Océano', quantity: 1, amount: 3840 }], total: 8908.8, currency: 'MXN', policy: { checkInTime: '15:00' }, cancellation: { outcome: 'FREE', penalty: 0 }, canCancel: true, expiresAt: null }) : Promise.reject(new Error('404'))),
    },
    platformApi: {
      hotels: () => Promise.resolve([{ id: 1, slug: 'gran-hotel', name: 'Gran Hotel Nexora', timezone: 'America/Cancun', currency: 'MXN', active: true, createdAt: '2026-10-07T12:00:00Z', staffCount: 2, accessUrl: 'http://localhost:5180/h/gran-hotel' }]),
    },
    adminApi: {
      overview: () => Promise.resolve({
        hotel: { id: 1, slug: 'gran-hotel', name: 'Gran Hotel Nexora', timezone: 'America/Cancun' }, activeStaff: 2, inactiveStaff: 0,
        roles: [{ code: 'ADMIN', name: 'Administrador', users: 1 }], recentLogins: [{ name: 'Mariana Ortega', email: 'admin@granhotel.mx', at: '2026-10-07T12:00:00Z' }],
        recentActivity: [{ id: 1, action: 'LOGIN_SUCCESS', result: 'SUCCESS', actorEmail: 'admin@granhotel.mx', createdAt: '2026-10-07T12:00:00Z' }],
        operations: { arrivalsToday: 3, departuresToday: 1, inHouse: 4, pending: 2, occupiedTonight: 6, activeRooms: 9, blockedTonight: 1 },
      }),
      users: () => Promise.resolve({ content: [user], page: 0, size: 12, totalElements: 1, totalPages: 1 }),
      roles: () => Promise.resolve(roles),
      permissions: () => Promise.resolve(permissions),
      audit: () => Promise.resolve({ content: [{ id: 1, action: 'ROLE_CREATED', result: 'SUCCESS', actorEmail: 'admin@granhotel.mx', createdAt: '2026-10-07T12:00:00Z', after: { name: 'Mantenimiento' } }], page: 0, totalPages: 1 }),
    },
  }
})

function visit(path, session) {
  state.session = session
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  document.documentElement.className = ''
})
afterEach(cleanup)

describe('pantallas', () => {
  it('portada de la plataforma', async () => {
    visit('/', null)
    expect(await screen.findByText(/en perfecto orden/)).toBeInTheDocument()
  })

  it('panel de plataforma del SUPER_ADMIN', async () => {
    visit('/plataforma', SUPER)
    expect(await screen.findByText('Tu red de hoteles')).toBeInTheDocument()
    expect(await screen.findByText('/h/gran-hotel')).toBeInTheDocument()
  })

  it('portada pública del hotel con habitaciones y servicios reales', async () => {
    visit('/h/gran-hotel', null)
    expect(await screen.findByRole('heading', { name: 'Gran Hotel Nexora' })).toBeInTheDocument()
    expect(await screen.findByText('Suite Océano')).toBeInTheDocument()
    expect(await screen.findByText('Desayuno buffet')).toBeInTheDocument()
  })

  it('habitaciones', async () => {
    visit('/h/gran-hotel/panel/habitaciones', ADMIN)
    expect(await screen.findByText('101')).toBeInTheDocument()
    expect(screen.getAllByText('En limpieza').length).toBeGreaterThan(0)
  })

  it('tarifas: simulador y reglas', async () => {
    visit('/h/gran-hotel/panel/tarifas', ADMIN)
    expect(await screen.findByText(/Total de la estancia/)).toBeInTheDocument()
  })

  it('servicios', async () => {
    visit('/h/gran-hotel/panel/servicios', ADMIN)
    expect(await screen.findByText('Desayuno buffet')).toBeInTheDocument()
  })

  it('configuración', async () => {
    visit('/h/gran-hotel/panel/configuracion', ADMIN)
    expect(await screen.findByText('Imágenes de marca')).toBeInTheDocument()
  })

  it('login del hotel', async () => {
    visit('/h/gran-hotel/login', null)
    expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })

  it('panel sin sesión manda al login', async () => {
    visit('/h/gran-hotel/panel', null)
    expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument()
  })

  it('dashboard del administrador', async () => {
    visit('/h/gran-hotel/panel', ADMIN)
    expect(await screen.findByText(/Mariana$/)).toBeInTheDocument()
    expect(await screen.findByText('Habitaciones esta noche')).toBeInTheDocument()
    expect(screen.getByText('Roles y permisos')).toBeInTheDocument()
  })

  it('usuarios', async () => {
    visit('/h/gran-hotel/panel/usuarios', ADMIN)
    expect((await screen.findAllByText('recepcion@granhotel.mx')).length).toBeGreaterThan(0)
    expect(screen.getByText('Nuevo usuario')).toBeInTheDocument()
  })

  it('roles y permisos', async () => {
    visit('/h/gran-hotel/panel/roles', ADMIN)
    expect((await screen.findAllByText('Recepcionista')).length).toBeGreaterThan(0)
    expect(await screen.findByText('0/1 activos')).toBeInTheDocument()
  })

  it('auditoría', async () => {
    visit('/h/gran-hotel/panel/auditoria', ADMIN)
    expect(await screen.findByText('Rol creado')).toBeInTheDocument()
  })

  it('la recepcionista no ve seguridad y no entra a usuarios por URL', async () => {
    visit('/h/gran-hotel/panel/usuarios', RECEPTION)
    expect(await screen.findByText('Llegadas hoy')).toBeInTheDocument()
    expect(screen.queryByText('Roles y permisos')).not.toBeInTheDocument()
    expect(screen.queryByText('Nuevo usuario')).not.toBeInTheDocument()
  })

  it('dashboard con la operación de hoy y la ocupación', async () => {
    visit('/h/gran-hotel/panel', ADMIN)
    expect(await screen.findByText('Llegadas hoy')).toBeInTheDocument()
    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(await screen.findByText('Cobrado este mes')).toBeInTheDocument()
    expect(screen.getByText('3 cuenta(s) con saldo')).toBeInTheDocument()
  })

  it('reportes: indicadores con su significado, detalle con totales y exportación', async () => {
    visit('/h/gran-hotel/panel/reportes', ADMIN)
    expect(await screen.findByRole('heading', { name: 'Ingresos por periodo' })).toBeInTheDocument()
    expect(await screen.findByText('Pagos completados menos reembolsos')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('Cobrado y devengado no se suman.')).toBeInTheDocument()
  })

  it('sin permisos de reportes no hay pantalla ni cifras de dinero', async () => {
    visit('/h/gran-hotel/panel/reportes', RECEPTION)
    expect(await screen.findByText('Llegadas hoy')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ingresos por periodo' })).not.toBeInTheDocument()
    expect(screen.queryByText('Ver reportes')).not.toBeInTheDocument()
  })

  it('reservaciones: tablero de hoy', async () => {
    visit('/h/gran-hotel/panel/reservaciones', ADMIN)
    expect((await screen.findAllByText('Ana López')).length).toBe(2)
    expect(screen.getByText('Nueva reservación')).toBeInTheDocument()
  })

  it('clientes', async () => {
    visit('/h/gran-hotel/panel/clientes', ADMIN)
    expect(await screen.findByText('ana@correo.mx')).toBeInTheDocument()
  })

  it('la recepcionista sin permiso no crea reservaciones ni ve clientes', async () => {
    visit('/h/gran-hotel/panel/reservaciones', RECEPTION)
    expect((await screen.findAllByText('Ana López')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Nueva reservación')).not.toBeInTheDocument()
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
  })

  it('reservación pública: resultados con precio total', async () => {
    visit('/h/gran-hotel/reservar?entrada=2026-12-04&salida=2026-12-06&adultos=2&menores=0', null)
    expect(await screen.findByText('Elige tu habitación')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reservar' })).toBeInTheDocument()
  })

  it('mi reservación con enlace válido', async () => {
    visit('/h/gran-hotel/reservacion/NXH-AB12CD#tok-valido-123456789012345', null)
    expect(await screen.findByText('NXH-AB12CD')).toBeInTheDocument()
    expect(screen.getByText('Cancelar reservación')).toBeInTheDocument()
  })

  it('mi reservación sin token pide folio y correo', async () => {
    visit('/h/gran-hotel/reservacion/NXH-AB12CD', null)
    expect(await screen.findByText('Enviarme el enlace')).toBeInTheDocument()
  })

  it('caja: sin turno abierto pide el fondo inicial', async () => {
    visit('/h/gran-hotel/panel/caja', ADMIN)
    expect(await screen.findByText('Abre tu caja')).toBeInTheDocument()
    expect(screen.getByLabelText('Fondo inicial (MXN)')).toBeInTheDocument()
  })

  it('pagos: neto cobrado por método', async () => {
    visit('/h/gran-hotel/panel/pagos', ADMIN)
    expect(await screen.findByText('Neto cobrado')).toBeInTheDocument()
    expect((await screen.findAllByText('NXH-AB12CD')).length).toBeGreaterThan(0)
  })

  it('la recepcionista sin permiso no ve caja ni pagos', async () => {
    visit('/h/gran-hotel/panel/pagos', RECEPTION)
    expect(await screen.findByText('Llegadas hoy')).toBeInTheDocument()
    expect(screen.queryByText('Neto cobrado')).not.toBeInTheDocument()
  })

  it('regreso de la pasarela: el estado lo da el servidor', async () => {
    visit('/h/gran-hotel/pago/ref-1234567890abcdefghijk', null)
    expect(await screen.findByText('¡Pago recibido!')).toBeInTheDocument()
    expect(screen.getByText('Tu reservación quedó confirmada.')).toBeInTheDocument()
  })

  it('portal: crear cuenta', async () => {
    visit('/h/gran-hotel/cuenta/registro', null)
    expect(await screen.findByText('Crea tu cuenta')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('mi cuenta sin sesión pide iniciar sesión', async () => {
    visit('/h/gran-hotel/cuenta', null)
    expect(await screen.findByText(/Entra a tu cuenta de Gran Hotel Nexora/)).toBeInTheDocument()
  })

  it('mi cuenta del huésped: próximas estancias y saldo', async () => {
    visit('/h/gran-hotel/cuenta', GUEST)
    expect(await screen.findByText('Hola, Lucía')).toBeInTheDocument()
    expect(await screen.findByText('Próximas estancias')).toBeInTheDocument()
    expect(screen.getByText('NXH-AB12CD')).toBeInTheDocument()
  })

  it('el personal no usa "Mi cuenta" de huésped', async () => {
    visit('/h/gran-hotel/cuenta', ADMIN)
    expect(await screen.findByText('Esta sección es para huéspedes')).toBeInTheDocument()
  })

  it('confirmación de correo', async () => {
    visit('/h/gran-hotel/cuenta/verificar/abcdefghijklmnopqrstuvwxyz', null)
    expect(await screen.findByText('¡Cuenta confirmada!')).toBeInTheDocument()
  })

  it('detalle de habitación', async () => {
    visit('/h/gran-hotel/habitaciones/1', null)
    expect(await screen.findByRole('heading', { name: 'Suite Océano' })).toBeInTheDocument()
    expect(screen.getByText('Amenidades')).toBeInTheDocument()
  })

  it('políticas públicas', async () => {
    visit('/h/gran-hotel/politicas', null)
    expect(await screen.findByText('Políticas de Gran Hotel Nexora')).toBeInTheDocument()
    expect(screen.getByText(/Sin costo hasta 48 h/)).toBeInTheDocument()
  })
})
