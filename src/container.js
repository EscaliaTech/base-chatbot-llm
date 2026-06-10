// Composition root — wires all dependencies together
// This is the ONLY place where concrete implementations are bound to ports.

import { TwilioAdapter } from './infrastructure/whatsapp/TwilioAdapter.js'
import { GroqAdapter } from './infrastructure/llm/GroqAdapter.js'
import { ConversationRepository } from './infrastructure/db/repositories/ConversationRepository.js'
import { MessageRepository } from './infrastructure/db/repositories/MessageRepository.js'
import { ContactRepository } from './infrastructure/db/repositories/ContactRepository.js'
import { UserRepository } from './infrastructure/db/repositories/UserRepository.js'
import { MockTrackingRepository } from './infrastructure/db/repositories/MockTrackingRepository.js'
import { MessageQueue } from './infrastructure/queue/MessageQueue.js'
import { JWTService } from './infrastructure/auth/JWTService.js'
import { broadcast } from './infrastructure/websocket/WebSocketServer.js'
import { createWorker } from './infrastructure/queue/MessageWorker.js'

export function buildContainer() {
  // Ports → Adapters
  const whatsappProvider = TwilioAdapter
  const llmProvider = GroqAdapter
  const jobQueue = MessageQueue

  // Repositories
  const conversationRepo = ConversationRepository
  const messageRepo = MessageRepository
  const contactRepo = ContactRepository
  const userRepo = UserRepository
  const trackingRepo = MockTrackingRepository

  // Services
  const jwtService = JWTService

  // Worker (starts consuming jobs immediately)
  const worker = createWorker({
    whatsappProvider,
    llmProvider,
    conversationRepo,
    messageRepo,
    contactRepo,
    trackingRepo,
    jobQueue,
    broadcast,
  })

  return {
    whatsappProvider,
    llmProvider,
    jobQueue,
    conversationRepo,
    messageRepo,
    contactRepo,
    userRepo,
    trackingRepo,
    jwtService,
    worker,
    broadcast,
  }
}
