// Task 2.3 — ConversationRepository: implements IConversationRepository using Drizzle
import { eq, or, desc, and } from 'drizzle-orm'
import { db } from '../client.js'
import { conversations, contacts } from '../schema.js'
import { Conversation } from '../../../core/domain/entities/Conversation.js'

/**
 * Map a DB row to a Conversation domain entity.
 * @param {Record<string, unknown>} row
 * @returns {Conversation}
 */
function toEntity(row) {
  return new Conversation({
    id: row.id,
    contactId: row.contactId,
    status: row.status,
    assignedTo: row.assignedTo ?? null,
    transferredAt: row.transferredAt ?? null,
    closedAt: row.closedAt ?? null,
    createdAt: row.createdAt,
  })
}

/**
 * @type {import('../../../core/ports/IConversationRepository.js').IConversationRepository}
 */
export const ConversationRepository = {
  /**
   * Find the most recent open or in_progress conversation for a contact.
   * @param {string} contactId
   * @returns {Promise<Conversation|null>}
   */
  async findByContactId(contactId) {
    const rows = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.contactId, contactId),
          or(eq(conversations.status, 'open'), eq(conversations.status, 'in_progress'))
        )
      )
      .orderBy(desc(conversations.createdAt))
      .limit(1)

    if (rows.length === 0) return null
    return toEntity(rows[0])
  },

  /**
   * Find a conversation by ID.
   * @param {string} id
   * @returns {Promise<Conversation|null>}
   */
  async findById(id) {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)

    if (rows.length === 0) return null
    return toEntity(rows[0])
  },

  /**
   * Upsert a conversation. Inserts if no id, updates if id present.
   * @param {Conversation} conversation
   * @returns {Promise<Conversation>}
   */
  async save(conversation) {
    if (!conversation.id) {
      // Insert new
      const inserted = await db
        .insert(conversations)
        .values({
          contactId: conversation.contactId,
          status: conversation.status,
          assignedTo: conversation.assignedTo,
          transferredAt: conversation.transferredAt,
          closedAt: conversation.closedAt,
        })
        .returning()

      return toEntity(inserted[0])
    }

    // Update existing
    const updated = await db
      .update(conversations)
      .set({
        status: conversation.status,
        assignedTo: conversation.assignedTo,
        transferredAt: conversation.transferredAt,
        closedAt: conversation.closedAt,
      })
      .where(eq(conversations.id, conversation.id))
      .returning()

    return toEntity(updated[0])
  },

  /**
   * List all non-closed conversations with their contact info.
   * @returns {Promise<Array<Conversation & {contact: import('../../../core/domain/entities/Contact.js').Contact}>>}
   */
  async listActive() {
    const rows = await db
      .select({
        id: conversations.id,
        contactId: conversations.contactId,
        status: conversations.status,
        assignedTo: conversations.assignedTo,
        transferredAt: conversations.transferredAt,
        closedAt: conversations.closedAt,
        createdAt: conversations.createdAt,
        contactPhone: contacts.phone,
        contactName: contacts.name,
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(
        or(eq(conversations.status, 'open'), eq(conversations.status, 'in_progress'))
      )
      .orderBy(desc(conversations.createdAt))

    return rows.map((row) => {
      const convo = toEntity(row)
      convo.contact = { phone: row.contactPhone, name: row.contactName }
      return convo
    })
  },
}
