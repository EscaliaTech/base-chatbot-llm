import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { db } from '../../infrastructure/db/client.js'
import { conversations } from '../../infrastructure/db/schema.js'

export function createMetricsRouter() {
  const router = Router()
  router.use(authenticate)
  router.use(authorize('admin', 'supervisor'))

  router.get('/', async (req, res) => {
    try {
      const all = await db.select().from(conversations)
      const total = all.length
      const byStatus = all.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1
        return acc
      }, {})

      res.json({ total, byStatus })
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
