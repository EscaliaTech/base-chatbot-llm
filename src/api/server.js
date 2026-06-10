// Task 3.12 — server.js: Express app factory — wires all routes, WebSocket, and worker
// Task 7.3 — Updated to use DI container (buildContainer) instead of direct imports
import express from 'express'
import { createServer } from 'http'
import cookieParser from 'cookie-parser'
import { env } from '../config/env.js'
import { setupWebSocket } from '../infrastructure/websocket/WebSocketServer.js'
import { createWebhookRouter } from './routes/webhook.js'
import { createAuthRouter } from './routes/auth.js'
import { createConversationsRouter } from './routes/conversations.js'
import { createAdminRouter } from './routes/admin.js'
import { createMetricsRouter } from './routes/metrics.js'
import { buildContainer } from '../container.js'

export async function createApp() {
  const app = express()
  const server = createServer(app)

  // Middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // CORS for separate frontend deploy
  const rawOrigin = env.FRONTEND_URL || '*'
  const corsOrigin = rawOrigin === '*'
    ? '*'
    : rawOrigin.startsWith('http')
      ? rawOrigin
      : `https://${rawOrigin}`

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    if (req.method === 'OPTIONS') return res.sendStatus(200)
    next()
  })

  // WebSocket — must come before buildContainer (broadcast references the wss singleton)
  setupWebSocket(server)

  // Wire all dependencies and start BullMQ worker
  buildContainer()

  // Routes
  app.use('/webhook', createWebhookRouter())
  app.use('/api/auth', createAuthRouter())
  app.use('/api/conversations', createConversationsRouter())
  app.use('/api/admin', createAdminRouter())
  app.use('/api/metrics', createMetricsRouter())

  // Health check
  app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

  return { app, server }
}

// Start server if run directly
const isMain = process.argv[1]?.endsWith('server.js')
if (isMain) {
  const { server } = await createApp()
  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`)
  })
}
