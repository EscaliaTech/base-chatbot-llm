// Task 3.3 — resolveConversation: use case for marking a conversation as resolved
export function makeResolveConversation({ conversationRepo, broadcast }) {
  return async function resolveConversation({ conversationId }) {
    const conversation = await conversationRepo.findById(conversationId)
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`)

    conversation.resolve()
    await conversationRepo.save(conversation)

    broadcast({ type: 'conversation_resolved', data: { conversationId } })

    return conversation
  }
}
