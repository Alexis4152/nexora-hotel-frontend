/**
 * Lector de Server-Sent Events sobre fetch. No se usa EventSource porque no permite mandar el encabezado
 * Authorization (y el token nunca va en la URL, donde quedaría en bitácoras de proxies).
 */

/** Separa un bloque de texto SSE en eventos {event, data}; devuelve también lo que quedó incompleto. */
export function parseEvents(buffer) {
  const events = []
  const blocks = buffer.split(/\r?\n\r?\n/)
  const rest = blocks.pop()
  for (const block of blocks) {
    let event = 'message'
    const data = []
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue // comentario: latido del servidor
      const colon = line.indexOf(':')
      const field = colon < 0 ? line : line.slice(0, colon)
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    if (data.length) events.push({ event, data: data.join('\n') })
  }
  return { events, rest }
}

/** Lee la respuesta hasta que el servidor la cierre; llama onEvent(nombre, datos) por cada evento. */
export async function readEventStream(body, onEvent) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseEvents(buffer)
    buffer = rest
    for (const e of events) {
      let data = e.data
      try { data = JSON.parse(e.data) } catch { /* texto plano */ }
      onEvent(e.event, data)
    }
  }
}
