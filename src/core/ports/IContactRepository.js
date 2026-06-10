/**
 * Port: Contact repository abstraction.
 * Implementations: DrizzleContactRepository
 *
 * @typedef {Object} IContactRepository
 * @property {(phone: string) => Promise<import('../domain/entities/Contact.js').Contact | null>} findByPhone
 *   Find a contact by phone number.
 * @property {(contact: import('../domain/entities/Contact.js').Contact) => Promise<import('../domain/entities/Contact.js').Contact>} save
 *   Insert or update a contact. Returns the saved entity.
 */
