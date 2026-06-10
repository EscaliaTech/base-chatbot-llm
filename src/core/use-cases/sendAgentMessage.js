// Task 3.4 — sendAgentMessage: use case for when an asesor sends a reply from the CRM panel
export function makeSendAgentMessage({ conversationRepo, messageRepo, contactRepo, whatsappProvider, broadcast }) {
  return async function sendAgentMessage({ conversationId, agentId, body }) {
    const conversation = await conversationRepo.findById(conversationId)
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`)

    const contact = await contactRepo.findById ? await contactRepo.findById(conversation.contactId) : null

    // Send via WhatsApp
    if (contact) {
      await whatsappProvider.sendMessage(contact.phone, body)
    }

    // Save message
    const { Message } = await import('../domain/entities/Message.js')
    const message = new Message({
      id: crypto.randomUUID(),
      conversationId,
      fromType: 'agent',
      body,
      whatsappMessageId: null,
    })
    const saved = await messageRepo.save(message)

    broadcast({ type: 'new_message', data: { conversationId, message: saved } })

    return saved
  }
}
