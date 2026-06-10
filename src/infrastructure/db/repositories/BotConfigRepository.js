// BotConfigRepository: Redis-cached bot_config accessor with 60s TTL
import { eq } from 'drizzle-orm'
import { db } from '../client.js'
import { botConfig } from '../schema.js'
import redis from '../../redis/client.js'

const CACHE_TTL = 60 // seconds

/**
 * Repository for bot_config table with Redis-backed caching.
 * When an admin updates a config key, calling set() invalidates the
 * Redis cache immediately, so the worker picks up the new value on the
 * very next request (instead of waiting for TTL expiry).
 */
export const BotConfigRepository = {
  /**
   * Get a config value by key.
   * Checks Redis first (TTL=60s), falls back to DB on miss.
   *
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    // Try Redis cache first
    const cached = await redis.get(`bot_config:${key}`)
    if (cached !== null) return cached

    // Cache miss → fetch from DB
    const [row] = await db
      .select()
      .from(botConfig)
      .where(eq(botConfig.key, key))
      .limit(1)

    const value = row?.value ?? null

    // Populate cache for subsequent requests
    if (value !== null) {
      await redis.set(`bot_config:${key}`, value, 'EX', CACHE_TTL)
    }

    return value
  },

  /**
   * Upsert a config value and immediately invalidate its Redis cache.
   * Ensures the worker picks up new values without delay.
   *
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    // Upsert into DB
    await db
      .insert(botConfig)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: botConfig.key, set: { value, updatedAt: new Date() } })

    // Invalidate Redis cache immediately so next get() fetches fresh from DB
    await redis.del(`bot_config:${key}`)
  },

  /**
   * Return all config key/value pairs as a plain object.
   * Used by the admin GET /bot-config endpoint.
   *
   * @returns {Promise<Record<string, string>>}
   */
  async getAll() {
    const rows = await db.select().from(botConfig)
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
}
