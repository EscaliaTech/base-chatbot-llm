// Task 3.1 — handleIncomingMessage: main use case triggered by webhook
/**
 * @param {object} deps
 * @param {import('../ports/IContactRepository.js').IContactRepository} deps.contactRepo
 * @param {import('../ports/IConversationRepository.js').IConversationRepository} deps.conversationRepo
 * @param {import('../ports/IMessageRepository.js').IMessageRepository} deps.messageRepo
 * @param {import('../ports/IJobQueue.js').IJobQueue} deps.jobQueue
 */
export function makeHandleIncomingMessage({ contactRepo, conversationRepo, messageRepo, jobQueue }) {
  return async function handleIncomingMessage({ from, body, messageId }) {
    // 1. Dedup check
    const isDuplicate = await messageRepo.existsByWhatsappMessageId(messageId)
    if (isDuplicate) return { duplicate: true }

    // 2. Find or create contact
    let contact = await contactRepo.findByPhone(from)
    if (!contact) {
      const { Contact } = await import('../domain/entities/Contact.js')
      contact = new Contact({ id: crypto.randomUUID(), phone: from, name: null })
      contact = await contactRepo.save(contact)
    }

    // 3. Find or create conversation
    let conversation = await conversationRepo.findByContactId(contact.id)
    if (!conversation) {
      const { Conversation } = await import('../domain/entities/Conversation.js')
      conversation = new Conversation({ id: crypto.randomUUID(), contactId: contact.id })
      conversation = await conversationRepo.save(conversation)
    }

    // 4. Enqueue for async processing
    await jobQueue.enqueue('process-message', {
      from,
      body,
      messageId,
      contactId: contact.id,
      conversationId: conversation.id,
    })

    return { queued: true, conversationId: conversation.id }
  }
}
