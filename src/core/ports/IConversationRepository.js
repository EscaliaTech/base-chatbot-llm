/**
 * Port: Conversation repository abstraction.
 * Implementations: DrizzleConversationRepository, InMemoryConversationRepository
 *
 * @typedef {Object} IConversationRepository
 * @property {(phone: string) => Promise<import('../domain/entities/Conversation.js').Conversation | null>} findByPhone
 *   Find the most recent open or in-progress conversation for a phone number.
 * @property {(id: string) => Promise<import('../domain/entities/Conversation.js').Conversation | null>} findById
 *   Find a conversation by its ID.
 * @property {(conversation: import('../domain/entities/Conversation.js').Conversation) => Promise<import('../domain/entities/Conversation.js').Conversation>} save
 *   Insert or update a conversation. Returns the saved entity.
 * @property {() => Promise<import('../domain/entities/Conversation.js').Conversation[]>} listActive
 *   List all conversations with status open or in_progress.
 */
