// Task 2.11 — WebSocketServer: JWT-authenticated WebSocket server
// Replaces src/panel.js. Exposes setupWebSocket(server) and broadcast(message).
import { WebSocketServer as WSServer } from 'ws'
import { JWTService } from '../auth/JWTService.js'

/** @type {WSServer|null} */
let wss = null

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

/**
 * Attach the WebSocket server to an existing HTTP server.
 * Validates JWT on connection — unauthenticated clients are terminated immediately.
 *
 * Clients connect via: ws://host/ws?token=<access_token>
 *
 * @param {import('http').Server} server - The HTTP server to attach to
 */
export function setupWebSocket(server) {
  wss = new WSServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const token = url.searchParams.get('token')

      if (!token) throw new Error('No token provided')

      const payload = JWTService.verifyAccessToken(token)
      ws.userId = payload.userId
      ws.userRole = payload.role

      clients.add(ws)
      console.log(`[WebSocket] Client connected: userId=${payload.userId} role=${payload.role}`)

      ws.on('close', () => {
        clients.delete(ws)
        console.log(`[WebSocket] Client disconnected: userId=${payload.userId}`)
      })

      ws.on('error', (err) => {
        console.error(`[WebSocket] Client error userId=${payload.userId}:`, err.message)
        clients.delete(ws)
      })
    } catch (err) {
      console.warn('[WebSocket] Rejected unauthenticated connection:', err.message)
      ws.terminate()
    }
  })

  console.log('[WebSocket] Server attached to HTTP server at /ws')
}

/**
 * Broadcast a message to all connected and authenticated WebSocket clients.
 * Skips clients whose connection is not in OPEN state.
 *
 * @param {Record<string, unknown>} message - The payload to broadcast (will be JSON-serialized)
 */
export function broadcast(message) {
  const data = JSON.stringify(message)

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(data)
    }
  }
}

/**
 * Return the current number of connected clients.
 * Useful for health checks and metrics.
 * @returns {number}
 */
export function getConnectedClientsCount() {
  return clients.size
}
