/**
 * Port: User repository abstraction.
 * Implementations: DrizzleUserRepository
 *
 * @typedef {Object} IUserRepository
 * @property {(email: string) => Promise<import('../domain/entities/User.js').User | null>} findByEmail
 *   Find a user by email address.
 * @property {(id: string) => Promise<import('../domain/entities/User.js').User | null>} findById
 *   Find a user by ID.
 * @property {() => Promise<import('../domain/entities/User.js').User[]>} findAvailableAsesores
 *   List all active users with role "asesor".
 * @property {(user: import('../domain/entities/User.js').User) => Promise<import('../domain/entities/User.js').User>} save
 *   Insert or update a user. Returns the saved entity.
 */
