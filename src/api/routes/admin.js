// Task 3.11 — admin.js: admin routes — user management, bot config, response templates
// Task 7.2 — Updated PUT /bot-config/:key to use BotConfigRepository (Redis cache invalidation)
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { db } from '../../infrastructure/db/client.js'
import { users, responseTemplates } from '../../infrastructure/db/schema.js'
import { BotConfigRepository } from '../../infrastructure/db/repositories/BotConfigRepository.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export function createAdminRouter() {
  const router = Router()
  router.use(authenticate)

  // === USERS ===
  // GET /api/admin/users
  router.get('/users', authorize('admin', 'supervisor'), async (req, res) => {
    const rows = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt }).from(users)
    res.json(rows)
  })

  // POST /api/admin/users
  router.post('/users', authorize('admin'), async (req, res) => {
    try {
      const { email, name, password, role } = req.body
      if (!email || !name || !password || !role) return res.status(400).json({ error: 'All fields required' })
      const passwordHash = await bcrypt.hash(password, 12)
      const [user] = await db.insert(users).values({ id: crypto.randomUUID(), email, name, passwordHash, role }).returning({ id: users.id, email: users.email, name: users.name, role: users.role })
      res.status(201).json(user)
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' })
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PATCH /api/admin/users/:id
  router.patch('/users/:id', authorize('admin'), async (req, res) => {
    try {
      const { name, role, isActive } = req.body
      const updates = {}
      if (name !== undefined) updates.name = name
      if (role !== undefined) updates.role = role
      if (isActive !== undefined) updates.isActive = isActive
      await db.update(users).set(updates).where(eq(users.id, req.params.id))
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // === BOT CONFIG ===
  // GET /api/admin/bot-config
  router.get('/bot-config', authorize('admin', 'supervisor'), async (req, res) => {
    try {
      const config = await BotConfigRepository.getAll()
      res.json(config)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PUT /api/admin/bot-config/:key
  // Uses BotConfigRepository.set() to upsert DB AND invalidate Redis cache immediately
  router.put('/bot-config/:key', authorize('admin'), async (req, res) => {
    try {
      const { value } = req.body
      if (value === undefined) return res.status(400).json({ error: 'value is required' })
      await BotConfigRepository.set(req.params.key, value)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // === TEMPLATES ===
  // GET /api/admin/templates
  router.get('/templates', authenticate, async (req, res) => {
    const rows = await db.select().from(responseTemplates).orderBy(responseTemplates.sortOrder)
    res.json(rows)
  })

  // POST /api/admin/templates
  router.post('/templates', authorize('admin', 'supervisor'), async (req, res) => {
    const { title, body } = req.body
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' })
    const [tmpl] = await db.insert(responseTemplates).values({ id: crypto.randomUUID(), title, body }).returning()
    res.status(201).json(tmpl)
  })

  // DELETE /api/admin/templates/:id
  router.delete('/templates/:id', authorize('admin'), async (req, res) => {
    await db.delete(responseTemplates).where(eq(responseTemplates.id, req.params.id))
    res.json({ ok: true })
  })

  return router
}
