// Task 2.9 — MessageWorker: BullMQ Worker that processes incoming WhatsApp messages
// Task 7.2 — Updated to use BotConfigRepository (Redis-cached) instead of direct DB queries
import { Worker } from 'bullmq'
import { bullmqConnection } from '../redis/client.js'
import { Conversation } from '../../core/domain/entities/Conversation.js'
import { Contact } from '../../core/domain/entities/Contact.js'
import { Message } from '../../core/domain/entities/Message.js'
import { BotConfigRepository } from '../db/repositories/BotConfigRepository.js'

/**
 * Build the bot reply for a tracking query.
 * @param {string} trackingCode
 * @param {import('../../core/ports/ITrackingRepository.js').TrackingResult|null} result
 * @param {string} llmReply - LLM fallback reply if no tracking code yet
 * @returns {string}
 */
function buildTrackingReply(trackingCode, result, llmReply) {
  if (!trackingCode) {
    return llmReply || 'Para rastrear tu paquete necesito el código de seguimiento. ¿Podés enviármelo?'
  }

  if (!result) {
    return `No encontré el paquete con el código *${trackingCode}*. Verificá que el código sea correcto o escribinos para que un asesor te ayude.`
  }

  let reply = `📦 *Estado de tu paquete ${result.trackingCode}*\n\n`
  reply += `Estado: ${result.status}\n`
  reply += `Última ubicación: ${result.lastLocation}\n`
  if (result.estimatedDelivery) {
    reply += `Estimado de entrega: ${result.estimatedDelivery}\n`
  }
  reply += '\nSi tenés alguna otra consulta, no dudes en escribirnos.'
  return reply
}

/**
 * Factory that creates a BullMQ Worker with injected dependencies.
 * Dependency injection makes this testable and swappable.
 *
 * @param {{
 *   whatsappProvider: import('../../core/ports/IWhatsAppProvider.js').IWhatsAppProvider,
 *   llmProvider: import('../../core/ports/ILLMProvider.js').ILLMProvider,
 *   conversationRepo: import('../../core/ports/IConversationRepository.js').IConversationRepository,
 *   messageRepo: import('../../core/ports/IMessageRepository.js').IMessageRepository,
 *   contactRepo: import('../../core/ports/IContactRepository.js').IContactRepository,
 *   trackingRepo: import('../../core/ports/ITrackingRepository.js').ITrackingRepository,
 * }} deps
 * @returns {Worker}
 */
export function createWorker(deps) {
  const {
    whatsappProvider,
    llmProvider,
    conversationRepo,
    messageRepo,
    contactRepo,
    trackingRepo,
  } = deps

  const worker = new Worker(
    'whatsapp-messages',
    async (job) => {
      const { from, body, messageId } = job.data

      // --- Step 1: Deduplication ---
      if (messageId) {
        const exists = await messageRepo.existsByWhatsappMessageId(messageId)
        if (exists) {
          console.log(`[Worker] Duplicate message skipped: ${messageId}`)
          return
        }
      }

      // --- Step 2: Find or create Contact ---
      let contact = await contactRepo.findByPhone(from)
      if (!contact) {
        const newContact = new Contact({ phone: from })
        contact = await contactRepo.save(newContact)
        console.log(`[Worker] New contact created: ${from}`)
      }

      // --- Step 3: Find or create Conversation ---
      let conversation = await conversationRepo.findByContactId(contact.id)
      if (!conversation) {
        const newConversation = new Conversation({ contactId: contact.id, status: 'open' })
        conversation = await conversationRepo.save(newConversation)
        console.log(`[Worker] New conversation created for contact: ${contact.id}`)
      }

      // --- Step 4: Save incoming user message ---
      const userMessage = new Message({
        conversationId: conversation.id,
        fromType: 'user',
        body,
        whatsappMessageId: messageId ?? null,
      })
      await messageRepo.save(userMessage)

      // --- Step 5: If conversation is transferred to an asesor, skip LLM ---
      if (conversation.isTransferred()) {
        console.log(`[Worker] Conversation ${conversation.id} is transferred — skipping LLM`)
        return
      }

      // --- Step 6: Load history and classify intent ---
      const allMessages = await messageRepo.findByConversationId(conversation.id)
      // Exclude the message we just saved (last item) to use as history context
      const history = allMessages.slice(0, -1).slice(-5)

      const classification = await llmProvider.classify(body, history)
      console.log(`[Worker] Intent: ${classification.intent} | Tracking: ${classification.trackingCode}`)

      // --- Step 7: Handle intent and build reply ---
      let reply

      switch (classification.intent) {
        case 'tracking_query': {
          const trackingResult = classification.trackingCode
            ? await trackingRepo.findByCode(classification.trackingCode)
            : null
          reply = buildTrackingReply(classification.trackingCode, trackingResult, classification.reply)
          break
        }

        case 'human_agent': {
          conversation.transfer(null) // null = no specific asesor assigned yet (round-robin TBD)
          await conversationRepo.save(conversation)
          reply = 'Te estoy transfiriendo con un asesor humano. En breve alguien del equipo se va a comunicar con vos. ¡Gracias por tu paciencia!'
          break
        }

        case 'branch_info': {
          // Read from bot_config via Redis-cached repository
          const branches = await BotConfigRepository.get('branches')
          reply = branches ??
            `Nuestras sucursales:\n\n📍 *Sucursal Centro*\nAv. Corrientes 1234, CABA\n\n📍 *Sucursal Palermo*\nHonduras 4500, CABA\n\n📍 *Sucursal Zona Norte*\nAv. Maipú 2100, Vicente López`
          break
        }

        case 'business_hours': {
          // Read from bot_config via Redis-cached repository
          const hours = await BotConfigRepository.get('hours')
          reply = hours ??
            `Nuestros horarios de atención:\n\n🕐 *Lunes a Viernes*: 8:00 - 18:00\n🕐 *Sábados*: 9:00 - 13:00\n🕐 *Domingos y feriados*: Cerrado`
          break
        }

        case 'unknown':
        default: {
          reply = classification.reply ||
            'No entendí tu consulta. Puedo ayudarte con:\n- Rastreo de paquetes\n- Información de sucursales\n- Horarios de atención\n- Hablar con un asesor\n\n¿En qué te puedo ayudar?'
          break
        }
      }

      // --- Step 8: Send reply via WhatsApp ---
      await whatsappProvider.sendMessage(from, reply)

      // --- Step 9: Save bot message ---
      const botMessage = new Message({
        conversationId: conversation.id,
        fromType: 'bot',
        body: reply,
      })
      await messageRepo.save(botMessage)

      // --- Step 10: Broadcast to WebSocket clients ---
      try {
        const { broadcast } = await import('../websocket/WebSocketServer.js')
        broadcast({
          type: 'new_message',
          data: {
            conversationId: conversation.id,
            contactPhone: from,
            message: { fromType: 'bot', body: reply },
          },
        })
      } catch {
        // WebSocket broadcast is best-effort — never block message processing
      }

      console.log(`[Worker] Job complete for conversation ${conversation.id}`)
    },
    {
      connection: bullmqConnection,
      concurrency: 5,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}

