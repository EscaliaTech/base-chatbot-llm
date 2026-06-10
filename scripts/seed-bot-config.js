/**
 * Seed script: default bot configuration for Grupo GFH
 * Usage: node scripts/seed-bot-config.js
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { botConfig } from '../src/infrastructure/db/schema.js'

const DEFAULTS = [
  {
    key: 'welcome_message',
    value: '¡Hola! 👋 Soy el asistente virtual de Grupo GFH. Puedo ayudarte con:\n\n📦 Rastreo de paquetes\n🏢 Información de sucursales\n🕐 Horarios de atención\n👤 Hablar con un asesor\n\n¿En qué te puedo ayudar hoy?',
  },
  {
    key: 'transfer_message',
    value: 'Te estoy transfiriendo con un asesor humano. En breve alguien del equipo se va a comunicar con vos. ¡Gracias por tu paciencia! 🙏',
  },
  {
    key: 'unknown_message',
    value: 'No entendí bien tu consulta. Puedo ayudarte con:\n\n📦 Rastrear un paquete\n🏢 Información de sucursales\n🕐 Horarios de atención\n👤 Hablar con un asesor\n\n¿En qué te puedo ayudar?',
  },
  {
    key: 'hours',
    value: 'Nuestros horarios de atención:\n\n🕐 *Lunes a Viernes*: 8:00 - 18:00\n🕐 *Sábados*: 9:00 - 13:00\n🕐 *Domingos y feriados*: Cerrado\n\n¡Estamos para ayudarte en ese horario! 😊',
  },
  {
    key: 'branches',
    value: 'Nuestras sucursales:\n\n📍 *Sucursal Centro*\nAv. Corrientes 1234, CABA\nLun-Vie 8:00-18:00 | Sáb 9:00-13:00\n\n📍 *Sucursal Palermo*\nHonduras 4500, CABA\nLun-Vie 8:00-18:00 | Sáb 9:00-13:00\n\n📍 *Sucursal Zona Norte*\nAv. Maipú 2100, Vicente López\nLun-Vie 8:00-18:00',
  },
]

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set.')
    process.exit(1)
  }

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)

  console.log(`\n🌱 Seeding bot config (${DEFAULTS.length} keys)...\n`)

  for (const { key, value } of DEFAULTS) {
    await db
      .insert(botConfig)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: botConfig.key, set: { value, updatedAt: new Date() } })
    console.log(`  ✅ ${key}`)
  }

  console.log('\n✅ Bot config seeded.\n')
  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
