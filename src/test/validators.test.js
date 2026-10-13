import { describe, expect, it } from 'vitest'
import { email, mxPhone, onlyDigits, personName, slug, strongPassword, toSlug, validate } from '../utils/validators'
import { passwordStrength } from '../utils/passwordStrength'
import { hotelPath, setHotelSlug, stripHotelPrefix } from '../tenant'

// Mismos casos que FieldValidationTest.java: frontend y backend deben coincidir.
describe('validaciones (espejo del backend)', () => {
  it('teléfono MX: exactamente 10 dígitos', () => {
    expect(mxPhone('5512345678')).toBeNull()
    for (const bad of ['551234567', '55123456789', '55-1234-567', '+525512345678']) expect(mxPhone(bad)).not.toBeNull()
    expect(onlyDigits('55 12-34(56)7890123')).toBe('5512345678')
  })

  it('nombres reales con acentos y alfabetos no latinos', () => {
    for (const ok of ['José', 'Ñúñez', 'María José', "O'Connor", 'Ana-Lucía', 'Zoë', '李']) expect(personName(ok)).toBeNull()
    for (const bad of ['Juan3', '<script>', 'Ana  María', '@nita']) expect(personName(bad)).not.toBeNull()
  })

  it('contraseña: 10+, mayúscula, minúscula y número', () => {
    expect(strongPassword('Hotel2026Mx')).toBeNull()
    expect(strongPassword('corta1A')).toMatch(/10/)
    expect(strongPassword('sinmayusculas1')).not.toBeNull()
    expect(passwordStrength('Hotel2026Mx!segura').score).toBeGreaterThanOrEqual(3)
    expect(passwordStrength('password123').score).toBeLessThan(2)
  })

  it('slug de hotel', () => {
    expect(toSlug('Gran Hotel Señorial & Spa')).toBe('gran-hotel-senorial-spa')
    expect(slug('gran-hotel')).toBeNull()
    expect(slug('-mal')).not.toBeNull()
  })

  it('validate devuelve el primer error por campo', () => {
    const errors = validate({ email: 'x', name: '' }, { email: [email], name: [(v) => (!v ? 'requerido' : null)] })
    expect(errors).toEqual({ email: 'El correo no es válido', name: 'requerido' })
  })
})

describe('rutas por hotel', () => {
  it('antepone /h/<slug> solo dentro de un hotel', () => {
    setHotelSlug('casa-del-mar')
    expect(hotelPath('/panel/usuarios')).toBe('/h/casa-del-mar/panel/usuarios')
    expect(hotelPath('/')).toBe('/h/casa-del-mar')
    expect(stripHotelPrefix('/h/casa-del-mar/panel')).toBe('/panel')
    setHotelSlug(null)
    expect(hotelPath('/login')).toBe('/login')
  })

  it('las redirecciones después del login solo aceptan rutas internas', () => {
    expect(stripHotelPrefix('/h/casa-del-mar/panel/pagos')).toBe('/panel/pagos')
    expect(stripHotelPrefix('//evil.com')).toBeNull()
    expect(stripHotelPrefix('/\\evil.com')).toBeNull()
    expect(stripHotelPrefix('/h/casa-del-mar//evil.com')).toBeNull()
    expect(stripHotelPrefix('https://evil.com')).toBeNull()
  })
})
