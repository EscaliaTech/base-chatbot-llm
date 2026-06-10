// Task 2.5 — ContactRepository: implements IContactRepository using Drizzle
import { eq } from 'drizzle-orm'
import { db } from '../client.js'
import { contacts } from '../schema.js'
import { Contact } from '../../../core/domain/entities/Contact.js'

/**
 * Map a DB row to a Contact domain entity.
 * @param {Record<string, unknown>} row
 * @returns {Contact}
 */
function toEntity(row) {
  return new Contact({
    id: row.id,
    phone: row.phone,
    name: row.name ?? null,
    createdAt: row.createdAt,
  })
}

/**
 * @type {import('../../../core/ports/IContactRepository.js').IContactRepository}
 */
export const ContactRepository = {
  /**
   * Find a contact by phone number.
   * @param {string} phone
   * @returns {Promise<Contact|null>}
   */
  async findByPhone(phone) {
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, phone))
      .limit(1)

    if (rows.length === 0) return null
    return toEntity(rows[0])
  },

  /**
   * Upsert a contact by phone number.
   * Inserts if phone not found, updates name if already exists.
   * @param {Contact} contact
   * @returns {Promise<Contact>}
   */
  async save(contact) {
    if (!contact.id) {
      // Try insert, on conflict update name
      const upserted = await db
        .insert(contacts)
        .values({
          phone: contact.phone,
          name: contact.name ?? null,
        })
        .onConflictDoUpdate({
          target: contacts.phone,
          set: { name: contact.name ?? null },
        })
        .returning()

      return toEntity(upserted[0])
    }

    // Update by ID
    const updated = await db
      .update(contacts)
      .set({ name: contact.name ?? null })
      .where(eq(contacts.id, contact.id))
      .returning()

    return toEntity(updated[0])
  },
}
