// Task 3.6 — authenticate: JWT middleware — validates access token from Authorization header
import { JWTService } from '../../infrastructure/auth/JWTService.js'

export function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  const token = auth.slice(7)
  try {
    const payload = JWTService.verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' })
  }
}
