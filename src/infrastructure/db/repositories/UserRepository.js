// Task 2.6 — UserRepository: implements IUserRepository using Drizzle
import { eq, and } from 'drizzle-orm'
import { db } from '../client.js'
import { users } from '../schema.js'
import { User } from '../../../core/domain/entities/User.js'

/**
 * Map a DB row to a User domain entity.
 * Includes passwordHash for auth flows — callers must never leak this to clients.
 * @param {Record<string, unknown>} row
 * @returns {User & {passwordHash: string}}
 */
function toEntity(row) {
  const user = new User({
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
  })
  // Preserve passwordHash for auth comparison — not part of the domain entity but needed here
  user.passwordHash = row.passwordHash
  return user
}

/**
 * @type {import('../../../core/ports/IUserRepository.js').IUserRepository}
 */
export const UserRepository = {
  /**
   * Find a user by email address (includes passwordHash for auth).
   * @param {string} email
   * @returns {Promise<(User & {passwordHash: string})|null>}
   */
  async findByEmail(email) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (rows.length === 0) return null
    return toEntity(rows[0])
  },

  /**
   * Find a user by ID.
   * @param {string} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toEntity(rows[0])
  },

  /**
   * Return all active users with role 'asesor'.
   * @returns {Promise<User[]>}
   */
  async findAvailableAsesores() {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'asesor'), eq(users.isActive, true)))

    return rows.map(toEntity)
  },

  /**
   * Upsert a user. Inserts if no id, updates if id present.
   * @param {User & {passwordHash?: string}} user
   * @returns {Promise<User>}
   */
  async save(user) {
    if (!user.id) {
      const inserted = await db
        .insert(users)
        .values({
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          name: user.name,
          isActive: user.isActive ?? true,
        })
        .returning()

      return toEntity(inserted[0])
    }

    const updated = await db
      .update(users)
      .set({
        email: user.email,
        role: user.role,
        name: user.name,
        isActive: user.isActive,
        ...(user.passwordHash ? { passwordHash: user.passwordHash } : {}),
      })
      .where(eq(users.id, user.id))
      .returning()

    return toEntity(updated[0])
  },

  /**
   * List all users (for admin panel).
   * @returns {Promise<User[]>}
   */
  async list() {
    const rows = await db.select().from(users)
    return rows.map(toEntity)
  },
}
