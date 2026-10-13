import {
  BarChart3, BedDouble, CalendarCheck2, ConciergeBell, Contact, CreditCard, Gauge, ScrollText, Settings, ShieldCheck,
  Tags, Users, Wallet,
} from 'lucide-react'
import { tx } from '../i18n'

/**
 * Menú del panel del hotel. Cada entrada se muestra solo si el usuario tiene alguno de sus permisos.
 * Las marcadas {@code soon} todavía no tienen backend: se muestran deshabilitadas (sin pantallas vacías ni
 * datos falsos) para que el personal vea qué módulos vienen.
 */
export const NAVIGATION = [
  {
    section: tx('Operación'),
    items: [
      { to: '/panel', label: tx('Panel'), icon: Gauge, any: ['DASHBOARD:VIEW'], end: true },
      { to: '/panel/reservaciones', label: tx('Reservaciones'), icon: CalendarCheck2, any: ['RESERVATIONS:VIEW'] },
      { to: '/panel/habitaciones', label: tx('Habitaciones'), icon: BedDouble, any: ['ROOMS:VIEW', 'HOUSEKEEPING:VIEW'] },
      { to: '/panel/clientes', label: tx('Clientes'), icon: Contact, any: ['CUSTOMERS:VIEW'] },
      { to: '/panel/caja', label: tx('Caja'), icon: Wallet, any: ['CASH:OPERATE', 'CASH:VIEW_ALL'] },
      { to: '/panel/pagos', label: tx('Pagos'), icon: CreditCard, any: ['PAYMENTS:VIEW'] },
    ],
  },
  {
    section: tx('Gestión'),
    items: [
      { to: '/panel/tarifas', label: tx('Tarifas'), icon: Tags, any: ['RATES:VIEW'] },
      { to: '/panel/servicios', label: tx('Servicios'), icon: ConciergeBell, any: ['SERVICES:VIEW'] },
      { to: '/panel/reportes', label: tx('Reportes'), icon: BarChart3, any: ['REPORTS:OPERATIONAL', 'REPORTS:FINANCIAL'] },
      { to: '/panel/configuracion', label: tx('Configuración'), icon: Settings, any: ['SETTINGS:VIEW', 'POLICIES:MANAGE'] },
    ],
  },
  {
    section: tx('Seguridad'),
    items: [
      { to: '/panel/usuarios', label: tx('Usuarios'), icon: Users, any: ['USERS:VIEW'] },
      { to: '/panel/roles', label: tx('Roles y permisos'), icon: ShieldCheck, any: ['ROLES:MANAGE'] },
      { to: '/panel/auditoria', label: tx('Auditoría'), icon: ScrollText, any: ['AUDIT:VIEW'] },
    ],
  },
]
