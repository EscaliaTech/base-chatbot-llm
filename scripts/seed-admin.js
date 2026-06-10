/**
 * Seed script: creates the first admin user
 * Usage: node scripts/seed-admin.js
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD env vars, or edit the defaults below.
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from '../src/infrastructure/db/schema.js'

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@grupogfh.com'
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Administrador'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GrupoGFH2024!'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Check your .env file.')
    process.exit(1)
  }

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)

  console.log(`\n🌱 Seeding admin user...`)
  console.log(`   Email:    ${ADMIN_EMAIL}`)
  console.log(`   Name:     ${ADMIN_NAME}`)
  console.log(`   Password: ${ADMIN_PASSWORD}\n`)

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: 'admin',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: ADMIN_NAME, passwordHash, role: 'admin', isActive: true },
    })
    .returning({ id: users.id, email: users.email, role: users.role })

  console.log('✅ Admin user ready:', user)
  console.log('\n⚠️  Change the password after first login!\n')

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
