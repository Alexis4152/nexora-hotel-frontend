import api from './client'

const data = (p) => p.then((r) => r.data.data)
const full = (p) => p.then((r) => r.data)

export const authApi = {
  login: (email, password) => data(api.post('/auth/login', { email, password })),
  logout: () => api.post('/auth/logout'),
  me: () => data(api.get('/auth/me')),
  forgotPassword: (email) => full(api.post('/auth/forgot-password', { email })),
  resetPassword: (token, newPassword) => full(api.post('/auth/reset-password', { token, newPassword })),
  changePassword: (currentPassword, newPassword) =>
    data(api.post('/auth/change-password', { currentPassword, newPassword })),
}

export const publicApi = {
  hotel: () => data(api.get('/public/hotel')),
  roomTypes: () => data(api.get('/public/room-types')),
  services: () => data(api.get('/public/services')),
  policies: () => data(api.get('/public/policies')),
}

export const platformApi = {
  hotels: () => data(api.get('/platform/hotels')),
  createHotel: (payload) => data(api.post('/platform/hotels', payload)),
  updateHotel: (id, payload) => data(api.put(`/platform/hotels/${id}`, payload)),
  resetAdminPassword: (id) => data(api.post(`/platform/hotels/${id}/admin-password`)),
}

export const adminApi = {
  overview: () => data(api.get('/admin/overview')),
  users: (params) => data(api.get('/admin/users', { params })),
  user: (id) => data(api.get(`/admin/users/${id}`)),
  createUser: (payload) => data(api.post('/admin/users', payload)),
  updateUser: (id, payload) => data(api.put(`/admin/users/${id}`, payload)),
  setUserActive: (id, active) => data(api.patch(`/admin/users/${id}/active`, { active })),
  resetUserPassword: (id) => data(api.post(`/admin/users/${id}/reset-password`)),
  setUserOverrides: (id, overrides, reason) => data(api.put(`/admin/users/${id}/permissions`, { overrides, reason })),
  roles: () => data(api.get('/admin/roles')),
  permissions: () => data(api.get('/admin/permissions')),
  createRole: (payload) => data(api.post('/admin/roles', payload)),
  updateRole: (id, payload) => data(api.put(`/admin/roles/${id}`, payload)),
  deleteRole: (id) => full(api.delete(`/admin/roles/${id}`)),
  audit: (params) => data(api.get('/admin/audit', { params })),
}

/** Subida multipart: un archivo (campo "file") o varios (campo "files"). */
function upload(url, files, field = 'files') {
  const form = new FormData()
  ;[].concat(files).forEach((f) => form.append(field, f))
  return data(api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }))
}

export const settingsApi = {
  operation: () => data(api.get('/admin/settings/operation')),
  updateOperation: (p) => data(api.put('/admin/settings/operation', p)),
  identity: () => data(api.get('/admin/settings/identity')),
  updateIdentity: (p) => data(api.put('/admin/settings/identity', p)),
  updateTheme: (p) => data(api.put('/admin/settings/theme', p)),
  uploadImage: (kind, file) => upload(`/admin/settings/images/${kind}`, file, 'file'),
  removeImage: (kind) => data(api.delete(`/admin/settings/images/${kind}`)),
  policies: () => data(api.get('/admin/settings/policies')),
  updatePolicies: (p) => data(api.put('/admin/settings/policies', p)),
}

export const inventoryApi = {
  amenities: () => data(api.get('/admin/amenities')),
  createAmenity: (p) => data(api.post('/admin/amenities', p)),
  updateAmenity: (id, p) => data(api.put(`/admin/amenities/${id}`, p)),
  deleteAmenity: (id) => full(api.delete(`/admin/amenities/${id}`)),
  roomTypes: () => data(api.get('/admin/room-types')),
  createRoomType: (p) => data(api.post('/admin/room-types', p)),
  updateRoomType: (id, p) => data(api.put(`/admin/room-types/${id}`, p)),
  setRoomTypeActive: (id, active) => data(api.patch(`/admin/room-types/${id}/active`, { active })),
  rooms: () => data(api.get('/admin/rooms')),
  createRoom: (p) => data(api.post('/admin/rooms', p)),
  updateRoom: (id, p) => data(api.put(`/admin/rooms/${id}`, p)),
  setRoomActive: (id, active) => data(api.patch(`/admin/rooms/${id}/active`, { active })),
  changeStatus: (id, status, notes) => data(api.patch(`/admin/rooms/${id}/status`, { status, notes })),
  statusHistory: (id) => data(api.get(`/admin/rooms/${id}/status-history`)),
  blocks: (id) => data(api.get(`/admin/rooms/${id}/blocks`)),
  block: (id, p) => data(api.post(`/admin/rooms/${id}/blocks`, p)),
  release: (id, blockId, notes) => data(api.post(`/admin/rooms/${id}/blocks/${blockId}/release`, { notes })),
  // owner: 'room-types' | 'rooms'
  addImages: (owner, id, files) => upload(`/admin/${owner}/${id}/images`, files),
  reorderImages: (owner, id, imageIds) => data(api.put(`/admin/${owner}/${id}/images/order`, { imageIds })),
  deleteImage: (owner, id, imageId) => data(api.delete(`/admin/${owner}/${id}/images/${imageId}`)),
}

export const ratesApi = {
  seasons: () => data(api.get('/admin/seasons')),
  saveSeason: (id, p) => data(id ? api.put(`/admin/seasons/${id}`, p) : api.post('/admin/seasons', p)),
  deleteSeason: (id) => full(api.delete(`/admin/seasons/${id}`)),
  rules: () => data(api.get('/admin/rate-rules')),
  saveRule: (id, p) => data(id ? api.put(`/admin/rate-rules/${id}`, p) : api.post('/admin/rate-rules', p)),
  deleteRule: (id) => full(api.delete(`/admin/rate-rules/${id}`)),
  taxes: () => data(api.get('/admin/taxes')),
  saveTax: (id, p) => data(id ? api.put(`/admin/taxes/${id}`, p) : api.post('/admin/taxes', p)),
  deleteTax: (id) => full(api.delete(`/admin/taxes/${id}`)),
  quote: (p) => data(api.post('/admin/rates/quote', p)),
  services: () => data(api.get('/admin/extra-services')),
  saveService: (id, p) => data(id ? api.put(`/admin/extra-services/${id}`, p) : api.post('/admin/extra-services', p)),
  deleteService: (id) => full(api.delete(`/admin/extra-services/${id}`)),
}

export const reservationsApi = {
  availability: (params) => data(api.get('/admin/reservations/availability', { params })),
  list: (params) => data(api.get('/admin/reservations', { params, paramsSerializer: { indexes: null } })),
  board: () => data(api.get('/admin/reservations/board')),
  calendar: (from, to) => data(api.get('/admin/reservations/calendar', { params: { from, to } })),
  detail: (id) => data(api.get(`/admin/reservations/${id}`)),
  create: (p) => data(api.post('/admin/reservations', p)),
  confirm: (id) => data(api.post(`/admin/reservations/${id}/confirm`)),
  cancel: (id, p) => data(api.post(`/admin/reservations/${id}/cancel`, p)),
  modify: (id, p) => data(api.put(`/admin/reservations/${id}`, p)),
  notes: (id, p) => data(api.put(`/admin/reservations/${id}/notes`, p)),
  resend: (id) => full(api.post(`/admin/reservations/${id}/resend`)),
  receipt: (id) => api.get(`/admin/reservations/${id}/receipt.pdf`, { responseType: 'blob' }).then((r) => r.data),
}

export const customersApi = {
  list: (params) => data(api.get('/admin/customers', { params })),
  detail: (id) => data(api.get(`/admin/customers/${id}`)),
  create: (p) => data(api.post('/admin/customers', p)),
  update: (id, p) => data(api.put(`/admin/customers/${id}`, p)),
}

export const emailApi = {
  settings: () => data(api.get('/admin/email-settings')),
  update: (p) => data(api.put('/admin/email-settings', p)),
  test: (to) => full(api.post('/admin/email-settings/test', { to })),
  templates: () => data(api.get('/admin/notification-templates')),
  updateTemplate: (event, p) => data(api.put(`/admin/notification-templates/${event}`, p)),
  resetTemplate: (event) => full(api.delete(`/admin/notification-templates/${event}`)),
  outbox: () => data(api.get('/admin/notifications/outbox')),
}

/** Reservación en línea. El token del huésped viaja en header, nunca en la URL de la API. */
export const bookingApi = {
  availability: (params) => data(api.get('/public/availability', { params })),
  create: (p) => data(api.post('/public/reservations', p)),
  view: (folio, token) => data(api.get(`/public/reservations/${encodeURIComponent(folio)}`, { headers: { 'X-Reservation-Token': token } })),
  cancel: (folio, token, p) => data(api.post(`/public/reservations/${encodeURIComponent(folio)}/cancel`, p, { headers: { 'X-Reservation-Token': token } })),
  lookup: (folio, email) => full(api.post('/public/reservations/lookup', { folio, email })),
  pay: (folio, token, purpose) => data(api.post(`/public/reservations/${encodeURIComponent(folio)}/payments`, { purpose },
    { headers: { 'X-Reservation-Token': token } })),
  paymentStatus: (ref) => data(api.get(`/public/payments/${encodeURIComponent(ref)}`)),
  paymentOptions: () => data(api.get('/public/payment-options')),
}

// ── Fase 7: estancia, cobros, caja y configuración de cobro ─────────────────────────
const res = (id) => `/admin/reservations/${id}`

export const stayApi = {
  checkInPreview: (id) => data(api.get(`${res(id)}/check-in-preview`)),
  checkIn: (id, p) => data(api.post(`${res(id)}/check-in`, p)),
  checkOut: (id, p) => data(api.post(`${res(id)}/check-out`, p)),
  noShow: (id, p) => data(api.post(`${res(id)}/no-show`, p)),
  /** La llave evita el doble cobro si se reintenta (doble clic, red lenta). */
  pay: (id, p, key) => data(api.post(`${res(id)}/payments`, p, { headers: { 'Idempotency-Key': key } })),
  link: (id, p) => data(api.post(`${res(id)}/payment-link`, p)),
  verify: (id, paymentId) => data(api.post(`${res(id)}/payments/${paymentId}/verify`)),
  reverse: (id, paymentId, reason) => data(api.post(`${res(id)}/payments/${paymentId}/reverse`, { reason })),
  refund: (id, p) => data(api.post(`${res(id)}/refunds`, p)),
  addCharge: (id, p) => data(api.post(`${res(id)}/charges`, p)),
  voidCharge: (id, chargeId, reason) => data(api.post(`${res(id)}/charges/${chargeId}/void`, { reason })),
}

export const paymentsApi = {
  list: (params) => data(api.get('/admin/payments', { params })),
  reconciliation: () => data(api.get('/admin/payments/reconciliation')),
}

export const cashApi = {
  current: () => data(api.get('/admin/cash/current')),
  open: (p) => data(api.post('/admin/cash/open', p)),
  adjust: (id, p) => data(api.post(`/admin/cash/${id}/adjust`, p)),
  close: (id, p) => data(api.post(`/admin/cash/${id}/close`, p)),
  sessions: (params) => data(api.get('/admin/cash/sessions', { params })),
  session: (id) => data(api.get(`/admin/cash/sessions/${id}`)),
}

export const paymentSettingsApi = {
  get: () => data(api.get('/admin/payment-settings')),
  update: (p) => data(api.put('/admin/payment-settings', p)),
  test: () => full(api.post('/admin/payment-settings/test')),
  regenerateWebhook: () => data(api.post('/admin/payment-settings/webhook')),
}

// ── Fase 8: cuenta del huésped ──────────────────────────────────────────────────────
const blob = (p) => p.then((r) => r.data)
const acc = (folio) => `/account/reservations/${encodeURIComponent(folio)}`

export const publicAccountApi = {
  register: (p) => full(api.post('/public/account/register', p)),
  verify: (token) => full(api.post('/public/account/verify', { token })),
  resend: (email) => full(api.post('/public/account/resend', { email })),
}

export const accountApi = {
  profile: () => data(api.get('/account/profile')),
  updateProfile: (p) => data(api.put('/account/profile', p)),
  reservations: () => data(api.get('/account/reservations')),
  reservation: (folio) => data(api.get(acc(folio))),
  cancel: (folio, p) => data(api.post(`${acc(folio)}/cancel`, p)),
  pay: (folio, purpose) => data(api.post(`${acc(folio)}/payments`, { purpose })),
  receipt: (folio) => blob(api.get(`${acc(folio)}/receipt.pdf`, { responseType: 'blob' })),
  payments: () => data(api.get('/account/payments')),
  exportData: () => blob(api.get('/account/data-export', { responseType: 'blob' })),
  dataRequest: (p) => full(api.post('/account/data-requests', p)),
}

/** Campanita del panel (cada quien ve solo sus avisos). La conexión en vivo vive en context/NotificationsContext. */
export const notificationsApi = {
  list: (params) => data(api.get('/notifications', { params })),
  unreadCount: () => data(api.get('/notifications/unread-count')),
  markRead: (id) => data(api.post(`/notifications/${id}/read`)),
  markAllRead: () => data(api.post('/notifications/read-all')),
}

export const dataRequestsApi = {
  list: (status) => data(api.get('/admin/data-requests', { params: { status: status || undefined } })),
  resolve: (id, p) => data(api.post(`/admin/data-requests/${id}/resolve`, p)),
}

/** Nombre del archivo desde Content-Disposition (acepta filename*=UTF-8''…). */
function filenameFrom(header, fallback) {
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header || '')
  if (star) return decodeURIComponent(star[1])
  const plain = /filename="?([^";]+)"?/i.exec(header || '')
  return plain ? plain[1] : fallback
}

export const reportsApi = {
  dashboard: () => data(api.get('/admin/dashboard')),
  catalog: () => data(api.get('/admin/reports')),
  run: (type, params) => data(api.get(`/admin/reports/${type}`, { params })),
  export: (type, format, params) =>
    api.get(`/admin/reports/${type}/export`, { params: { ...params, format }, responseType: 'blob' })
      .then((r) => ({ blob: r.data, filename: filenameFrom(r.headers['content-disposition'], `${type}.${format}`) })),
}
