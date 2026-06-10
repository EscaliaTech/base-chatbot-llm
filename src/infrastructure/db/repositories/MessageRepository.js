// Task 2.4 — MessageRepository: implements IMessageRepository using Drizzle
import { eq, asc, isNotNull } from 'drizzle-orm'
import { db } from '../client.js'
import { messages } from '../schema.js'
import { Message } from '../../../core/domain/entities/Message.js'

/**
 * Map a DB row to a Message domain entity.
 * @param {Record<string, unknown>} row
 * @returns {Message}
 */
function toEntity(row) {
  return new Message({
    id: row.id,
    conversationId: row.conversationId,
    fromType: row.fromType,
    body: row.body,
    whatsappMessageId: row.whatsappMessageId ?? null,
    createdAt: row.createdAt,
  })
}

/**
 * @type {import('../../../core/ports/IMessageRepository.js').IMessageRepository}
 */
export const MessageRepository = {
  /**
   * Persist a message and return the saved entity.
   * @param {Message} message
   * @returns {Promise<Message>}
   */
  async save(message) {
    const inserted = await db
      .insert(messages)
      .values({
        conversationId: message.conversationId,
        fromType: message.fromType,
        body: message.body,
        whatsappMessageId: message.whatsappMessageId ?? null,
      })
      .returning()

    return toEntity(inserted[0])
  },

  /**
   * Retrieve all messages for a conversation, ordered by createdAt ascending.
   * @param {string} conversationId
   * @returns {Promise<Message[]>}
   */
  async findByConversationId(conversationId) {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    return rows.map(toEntity)
  },

  /**
   * Check if a message with the given WhatsApp message ID already exists.
   * Used for deduplication of incoming Twilio webhooks.
   * @param {string} whatsappMessageId
   * @returns {Promise<boolean>}
   */
  async existsByWhatsappMessageId(whatsappMessageId) {
    const rows = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.whatsappMessageId, whatsappMessageId))
      .limit(1)

    return rows.length > 0
  },
}
