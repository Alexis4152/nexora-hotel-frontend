import {
  BedDouble, BarChart3, CalendarCheck2, CalendarSearch, ClipboardList, CreditCard, Gauge, KeyRound, Mail,
  Receipt, ScrollText, Settings, ShieldCheck, Sparkles, Tags, Users, Wallet, Contact, Landmark,
} from 'lucide-react'
import { tx } from '../i18n'

/**
 * Presentación del catálogo de permisos (el catálogo real lo entrega el backend: GET /api/admin/permissions).
 * Aquí solo vive cómo se ve cada módulo y acción en la matriz de "Roles y permisos".
 */
export const MODULES = {
  DASHBOARD: { label: tx('Panel'), icon: Gauge },
  AVAILABILITY: { label: tx('Disponibilidad'), icon: CalendarSearch },
  RESERVATIONS: { label: tx('Reservaciones'), icon: CalendarCheck2 },
  ROOMS: { label: tx('Habitaciones'), icon: BedDouble },
  HOUSEKEEPING: { label: tx('Limpieza'), icon: Sparkles },
  RATES: { label: tx('Tarifas'), icon: Tags },
  SERVICES: { label: tx('Servicios'), icon: ClipboardList },
  CUSTOMERS: { label: tx('Clientes'), icon: Contact },
  PAYMENTS: { label: tx('Pagos'), icon: CreditCard },
  CASH: { label: tx('Caja'), icon: Wallet },
  REPORTS: { label: tx('Reportes'), icon: BarChart3 },
  USERS: { label: tx('Usuarios'), icon: Users },
  ROLES: { label: tx('Roles y permisos'), icon: ShieldCheck },
  AUDIT: { label: tx('Auditoría'), icon: ScrollText },
  SETTINGS: { label: tx('Configuración'), icon: Settings },
  POLICIES: { label: tx('Políticas'), icon: Landmark },
  NOTIFICATIONS: { label: tx('Notificaciones'), icon: Mail },
  EMAIL_SETTINGS: { label: tx('Correo (SMTP)'), icon: Mail },
  PAYMENT_SETTINGS: { label: tx('Pasarela de pago'), icon: Receipt },
}

export const ACTIONS = {
  VIEW: tx('Ver'),
  CREATE: tx('Crear'),
  UPDATE: tx('Editar'),
  DELETE: tx('Desactivar'),
  MANAGE: tx('Administrar'),
  CONFIRM: tx('Confirmar'),
  CANCEL: tx('Cancelar'),
  CHECK_IN: tx('Check-in'),
  CHECK_OUT: tx('Check-out'),
  RESEND: tx('Reenviar'),
  APPLY_DISCOUNT: tx('Descuentos'),
  OVERRIDE: tx('Excepciones'),
  BLOCK: tx('Bloquear'),
  RELEASE_BLOCK: tx('Liberar bloqueos'),
  VIEW_SENSITIVE: tx('Datos sensibles'),
  EXPORT: tx('Exportar'),
  CREATE_LINK: tx('Enlace de pago'),
  REVERSE: tx('Reversar'),
  REFUND: tx('Reembolsar'),
  REFUND_EXTRAORDINARY: tx('Reembolso especial'),
  OPERATE: tx('Operar caja'),
  VIEW_ALL: tx('Ver todas'),
  ADJUST: tx('Ajustes'),
  OPERATIONAL: tx('Operativos'),
  FINANCIAL: tx('Financieros'),
}

export const moduleIcon = (module) => MODULES[module]?.icon || KeyRound
export const moduleLabel = (module) => MODULES[module]?.label || module
export const actionLabel = (action) => ACTIONS[action] || action

/** Etiquetas legibles de la bitácora. */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: tx('Inicio de sesión'),
  REPORT_EXPORTED: tx('Reporte exportado'),
  LOGIN_FAILED: tx('Intento fallido'),
  LOGIN_BLOCKED: tx('Acceso bloqueado'),
  LOGIN_DENIED: tx('Acceso denegado'),
  ACCOUNT_LOCKED: tx('Cuenta bloqueada'),
  LOGOUT: tx('Cierre de sesión'),
  PASSWORD_CHANGED: tx('Cambio de contraseña'),
  PASSWORD_RESET: tx('Restablecimiento de contraseña'),
  PASSWORD_RESET_REQUESTED: tx('Solicitud de recuperación'),
  REFRESH_TOKEN_REUSE: tx('Reutilización de sesión'),
  USER_CREATED: tx('Usuario creado'),
  USER_UPDATED: tx('Usuario editado'),
  USER_ROLES_CHANGED: tx('Cambio de roles'),
  USER_ACTIVATED: tx('Usuario activado'),
  USER_DEACTIVATED: tx('Usuario desactivado'),
  USER_PASSWORD_RESET: tx('Contraseña temporal'),
  USER_PERMISSIONS_CHANGED: tx('Ajuste de permisos'),
  ROLE_CREATED: tx('Rol creado'),
  ROLE_PERMISSIONS_CHANGED: tx('Permisos de rol'),
  ROLE_DELETED: tx('Rol eliminado'),
  HOTEL_CREATED: tx('Hotel creado'),
  HOTEL_UPDATED: tx('Hotel actualizado'),
  HOTEL_DEACTIVATED: tx('Hotel desactivado'),
  HOTEL_ADMIN_PASSWORD_RESET: tx('Contraseña de admin'),
}

