export class Message {
  constructor({
    id,
    conversationId,
    fromType,
    body,
    whatsappMessageId = null,
    createdAt = new Date(),
  }) {
    this.id = id
    this.conversationId = conversationId
    this.fromType = fromType // 'user' | 'bot' | 'agent'
    this.body = body
    this.whatsappMessageId = whatsappMessageId
    this.createdAt = createdAt
  }
}
