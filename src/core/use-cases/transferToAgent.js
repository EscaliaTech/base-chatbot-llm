// Task 3.2 — transferToAgent: use case for transferring a conversation to a human agent
export function makeTransferToAgent({ conversationRepo, messageRepo, whatsappProvider, broadcast }) {
  return async function transferToAgent({ conversationId, agentId = null }) {
    const conversation = await conversationRepo.findById(conversationId)
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`)

    conversation.transfer(agentId)
    await conversationRepo.save(conversation)

    broadcast({ type: 'conversation_transferred', data: { conversationId, assignedTo: agentId } })

    return conversation
  }
}
