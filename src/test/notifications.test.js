import { describe, expect, it } from 'vitest'
import { parseEvents, readEventStream } from '../utils/eventStream'
import { describe as describeNotice, safeLink } from '../components/notifications'

describe('conexión en vivo (SSE)', () => {
  it('separa eventos, ignora el latido y guarda lo incompleto para el siguiente pedazo', () => {
    const { events, rest } = parseEvents(':ping\n\nevent:ready\ndata:{"unread":2}\n\nevent:notification\ndata:{"a"')
    expect(events).toEqual([{ event: 'ready', data: '{"unread":2}' }])
    expect(rest).toBe('event:notification\ndata:{"a"')
  })

  it('lee una respuesta que llega en pedazos arbitrarios', async () => {
    const text = 'event:ready\ndata:{"unread":0}\n\n:ping\n\nevent:notification\ndata:{"unread":1,"notification":{"id":7}}\n\n'
    const encoder = new TextEncoder()
    const chunks = [text.slice(0, 9), text.slice(9, 40), text.slice(40)]
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)))
        controller.close()
      },
    })
    const seen = []
    await readEventStream(body, (name, data) => seen.push([name, data]))
    expect(seen).toEqual([['ready', { unread: 0 }], ['notification', { unread: 1, notification: { id: 7 } }]])
  })
})

describe('avisos de la campanita', () => {
  it('redacta cada tipo con sus valores', () => {
    const created = describeNotice({ type: 'RESERVATION_CREATED', params: { channel: 'WEB', status: 'PENDING', guest: 'Sofía', folio: 'NXH-AAAAAA', checkIn: '2026-10-12', checkOut: '2026-10-14' } })
    expect(created.title).toBe('Nueva solicitud en línea por confirmar')
    expect(created.body).toContain('Sofía')
    expect(created.detail).toBe('NXH-AAAAAA')

    expect(describeNotice({ type: 'ROOM_READY', params: { room: '101', guest: 'Ana' } }).title).toBe('Habitación 101 lista')
    expect(describeNotice({ type: 'ARRIVALS_TODAY', params: { count: '3' } }).title).toBe('Hoy llegan 3 reservaciones')
    expect(describeNotice({ type: 'PAYMENT_RECEIVED', params: { confirmed: 'true', amount: '1500.00', currency: 'MXN' } }).title)
      .toBe('Pago en línea recibido: reservación confirmada')
    expect(describeNotice({ type: 'RESERVATION_CANCELLED', params: { by: 'GUEST' } }).tone).toBe('amber')
    expect(describeNotice({ type: 'TIPO_NUEVO', params: {} }).title).toBe('Notificación')
  })

  it('solo navega a rutas del panel', () => {
    expect(safeLink('/panel/reservaciones?r=5')).toBe('/panel/reservaciones?r=5')
    expect(safeLink('/panel')).toBe('/panel')
    expect(safeLink('https://otro.sitio/panel')).toBeNull()
    expect(safeLink('//otro.sitio')).toBeNull()
    expect(safeLink('/panelfalso')).toBeNull()
    expect(safeLink(null)).toBeNull()
  })
})
