// Task 3.9 — auth.js: POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../../infrastructure/db/client.js'
import { users, refreshTokens } from '../../infrastructure/db/schema.js'
import { JWTService } from '../../infrastructure/auth/JWTService.js'
import { eq } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'

export function createAuthRouter() {
  const router = Router()

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

      const [user] = await db.select().from(users).where(eq(users.email, email))
      if (!user) return res.status(401).json({ error: 'Invalid credentials' })

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

      if (!user.isActive) return res.status(401).json({ error: 'Account disabled' })

      const payload = { userId: user.id, role: user.role, name: user.name }
      const accessToken = JWTService.generateAccessToken(payload)
      const refreshToken = JWTService.generateRefreshToken(payload)

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await db.insert(refreshTokens).values({ id: crypto.randomUUID(), userId: user.id, token: refreshToken, expiresAt })

      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/auth/refresh
  router.post('/refresh', async (req, res) => {
    try {
      const token = req.cookies?.refreshToken
      if (!token) return res.status(401).json({ error: 'No refresh token' })

      const payload = JWTService.verifyRefreshToken(token)

      // Check token exists in DB and not expired
      const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token))
      if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ error: 'Refresh token invalid or expired' })

      const newPayload = { userId: payload.userId, role: payload.role, name: payload.name }
      const accessToken = JWTService.generateAccessToken(newPayload)

      res.json({
        accessToken,
        user: { id: payload.userId, role: payload.role, name: payload.name },
      })
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' })
    }
  })

  // POST /api/auth/logout
  router.post('/logout', authenticate, async (req, res) => {
    const token = req.cookies?.refreshToken
    if (token) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
    }
    res.clearCookie('refreshToken')
    res.json({ ok: true })
  })

  return router
}
