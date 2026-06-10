/**
 * Seed script: loads default response templates for Grupo GFH
 * Usage: node scripts/seed-templates.js
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { responseTemplates } from '../src/infrastructure/db/schema.js'

const TEMPLATES = [
  // Saludos y apertura
  {
    title: 'Saludo inicial',
    body: '¡Hola! 👋 Soy {nombre} del equipo de Grupo GFH. ¿En qué puedo ayudarte hoy?',
    sortOrder: 1,
  },
  {
    title: 'Retomando conversación',
    body: 'Hola, te escribo del equipo de soporte de Grupo GFH. Estoy revisando tu consulta, dame un momento.',
    sortOrder: 2,
  },
  // Rastreo de paquetes
  {
    title: 'Pedido de código de seguimiento',
    body: 'Para rastrearte el paquete necesito el número de seguimiento. Lo encontrás en el email de confirmación o en el comprobante de envío. ¿Lo tenés a mano?',
    sortOrder: 3,
  },
  {
    title: 'Paquete en tránsito',
    body: 'Tu paquete está en camino 🚚. El tiempo estimado de entrega es de 24 a 48 horas hábiles. Te avisamos cuando esté en reparto.',
    sortOrder: 4,
  },
  {
    title: 'Paquete demorado',
    body: 'Lamentamos el inconveniente. Tu envío tiene una demora operativa. Estamos gestionando la situación y te vamos a contactar en cuanto tengamos novedades concretas.',
    sortOrder: 5,
  },
  {
    title: 'Paquete entregado pero no recibido',
    body: 'El sistema indica que el paquete fue entregado el {fecha}. ¿Podés confirmar si alguien en tu domicilio lo recibió? Si no fue así, abrimos un reclamo formal de inmediato.',
    sortOrder: 6,
  },
  // Gestión y reclamos
  {
    title: 'Apertura de reclamo',
    body: 'Entendido. Voy a abrir un reclamo formal con el número {código}. El tiempo de resolución es de 48 a 72 horas hábiles. Te mantenemos informado por este mismo canal.',
    sortOrder: 7,
  },
  {
    title: 'Solicitud de datos para reclamo',
    body: 'Para procesar tu reclamo necesito: nombre completo, DNI, número de envío y descripción del problema. ¿Me los compartís?',
    sortOrder: 8,
  },
  {
    title: 'Reclamo resuelto',
    body: '¡Buenas noticias! 🎉 Tu reclamo fue resuelto. {detalle}. Si necesitás algo más, estamos disponibles.',
    sortOrder: 9,
  },
  // Cierre y despedida
  {
    title: 'Cierre de conversación',
    body: '¡Perfecto! Fue un placer ayudarte. Si necesitás algo más no dudes en escribirnos. ¡Que tengas un excelente día! 😊',
    sortOrder: 10,
  },
  {
    title: 'Sin respuesta del cliente',
    body: 'Hola, te escribimos para seguir con tu consulta. Si todavía necesitás ayuda, respondé este mensaje y con gusto te atendemos.',
    sortOrder: 11,
  },
  {
    title: 'Derivación a sucursal',
    body: 'Para este trámite necesitás acercarte a la sucursal más cercana. Podés ver las direcciones y horarios en nuestra web o preguntarme por la sucursal de tu zona.',
    sortOrder: 12,
  },
]

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set.')
    process.exit(1)
  }

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)

  console.log(`\n🌱 Seeding ${TEMPLATES.length} templates...\n`)

  for (const t of TEMPLATES) {
    await db
      .insert(responseTemplates)
      .values({ id: crypto.randomUUID(), ...t })
      .onConflictDoNothing()
    console.log(`  ✅ ${t.title}`)
  }

  console.log('\n✅ Templates seeded.\n')
  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
