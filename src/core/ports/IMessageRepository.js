/**
 * Port: Message repository abstraction.
 * Implementations: DrizzleMessageRepository
 *
 * @typedef {Object} IMessageRepository
 * @property {(message: import('../domain/entities/Message.js').Message) => Promise<import('../domain/entities/Message.js').Message>} save
 *   Persist a message. Returns the saved entity.
 * @property {(conversationId: string, limit?: number) => Promise<import('../domain/entities/Message.js').Message[]>} findByConversationId
 *   Retrieve messages for a conversation, ordered by createdAt ascending. Default limit: 50.
 * @property {(whatsappMessageId: string) => Promise<boolean>} existsByWhatsappMessageId
 *   Check if a message with the given WhatsApp message ID already exists (deduplication).
 */
