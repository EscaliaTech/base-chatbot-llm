// Webhook inspector — captures incoming requests for dev debugging (ngrok:4040 style)
// Stores last 50 requests in memory, exposes SSE stream for live UI

const MAX_ENTRIES = 50
const entries = []
const subscribers = new Set()

export function captureWebhookRequest(req, statusCode, durationMs) {
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2),
    ts: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    status: statusCode,
    durationMs,
    headers: req.headers,
    body: req.body,
    rawBody: req.rawBody || null,
  }

  entries.unshift(entry)
  if (entries.length > MAX_ENTRIES) entries.pop()

  for (const send of subscribers) send(entry)
}

export function getEntries() {
  return entries
}

export function subscribe(send) {
  subscribers.add(send)
  return () => subscribers.delete(send)
}
