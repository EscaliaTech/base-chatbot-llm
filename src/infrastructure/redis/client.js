import Redis from 'ioredis'

// General-purpose Redis client (cache, dedup, etc.)
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
})

redis.on('connect', () => {
  console.log('[Redis] Connected')
})

export default redis

// BullMQ requires a separate connection with maxRetriesPerRequest: null
// We export the connection options so Queue and Worker can create their own instances
export const bullmqConnection = {
  host: new URL(process.env.REDIS_URL).hostname,
  port: Number(new URL(process.env.REDIS_URL).port),
  username: new URL(process.env.REDIS_URL).username || undefined,
  password: new URL(process.env.REDIS_URL).password || undefined,
  maxRetriesPerRequest: null,
}
