// Task 3.7 — authorize: RBAC middleware factory
import { UserRole } from '../../core/domain/value-objects/UserRole.js'

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
