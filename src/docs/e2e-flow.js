/**
 * E2E Flow: Incoming WhatsApp Message
 *
 * 1. Client sends WhatsApp message
 * 2. Twilio forwards to POST /webhook/twilio
 * 3. TwilioAdapter.validateWebhook(req) — HMAC signature check (skipped in development)
 * 4. Respond HTTP 200 immediately (Twilio requires response within 15s)
 * 5. MessageQueue.enqueue('process-message', { from, body, messageId })
 *    — shape from TwilioAdapter.parseIncomingMessage(req.body):
 *      from      = req.body.From       (e.g. "whatsapp:+5491112345678")
 *      body      = req.body.Body       (message text)
 *      messageId = req.body.MessageSid (Twilio dedup key)
 * 6. BullMQ worker picks up job (async, concurrency=5, 3 retries with exponential backoff)
 * 7. Dedup: MessageRepository.existsByWhatsappMessageId(messageId) → skip if already processed
 * 8. ContactRepository.findByPhone(from) — returns existing contact or null
 *    If null: new Contact({ phone: from }) → ContactRepository.save(contact)
 * 9. ConversationRepository.findByContactId(contactId) — finds open|in_progress conversation
 *    If null: new Conversation({ contactId, status: 'open' }) → ConversationRepository.save()
 * 10. MessageRepository.save({ conversationId, fromType: 'user', body, whatsappMessageId })
 * 11. If conversation.isTransferred() → save message only, skip LLM entirely
 * 12. Load history: MessageRepository.findByConversationId(conversationId) → last 5 (excluding current)
 * 13. GroqAdapter.classify(body, history) → { intent, trackingCode, reply }
 *     Rate limit: MIN_INTERVAL=2000ms between requests. On 429: 5s backoff then retry once.
 * 14. Intent handlers:
 *     - tracking_query  → MockTrackingRepository.findByCode(trackingCode) → buildTrackingReply()
 *     - human_agent     → conversation.transfer(null) + ConversationRepository.save()
 *     - branch_info     → BotConfigRepository.get('branches') [Redis TTL=60s] or hardcoded fallback
 *     - business_hours  → BotConfigRepository.get('hours')   [Redis TTL=60s] or hardcoded fallback
 *     - unknown         → use LLM reply directly or generic fallback
 * 15. TwilioAdapter.sendMessage(from, reply)
 * 16. MessageRepository.save({ conversationId, fromType: 'bot', body: reply })
 * 17. broadcast({ type: 'new_message', data: { conversationId, contactPhone, message } })
 *     → WebSocketServer sends to all authenticated CRM clients (JWT-validated on connect)
 *
 * ---
 *
 * E2E Flow: Agent Reply (CRM Panel → WhatsApp)
 *
 * 1. Agent types message in CRM panel → POST /api/conversations/:id/messages
 * 2. authenticate middleware validates Bearer JWT → req.user = { userId, role }
 * 3. authorize('asesor','supervisor','admin') checks role
 *    Asesor scope: can only reply to conversations assigned to them (checked in route handler)
 * 4. TwilioAdapter.sendMessage(contact.phone, body)
 * 5. MessageRepository.save({ conversationId, fromType: 'agent', body })
 * 6. broadcast({ type: 'new_message', data: { conversationId, message } })
 *    → updates all connected CRM clients' message threads in real-time
 *
 * ---
 *
 * E2E Flow: Bot Config Hot-Reload
 *
 * 1. Admin updates config → PUT /api/admin/bot-config/:key { value }
 * 2. BotConfigRepository.set(key, value):
 *    a. Upserts row in bot_config table (Drizzle onConflictDoUpdate)
 *    b. redis.del(`bot_config:${key}`) — immediate cache invalidation
 * 3. Next worker job that hits branch_info or business_hours:
 *    BotConfigRepository.get(key) → Redis MISS → DB query → cache for 60s
 *    New value is used immediately (no restart required)
 *
 * ---
 *
 * Dependency Injection (composition root: src/container.js)
 *
 * buildContainer() is called once in server.js after setupWebSocket().
 * It binds all concrete adapters to ports and starts the BullMQ worker.
 * No other file should instantiate adapters directly.
 *
 * container.js exports: {
 *   whatsappProvider  → TwilioAdapter
 *   llmProvider       → GroqAdapter
 *   jobQueue          → MessageQueue (BullMQ)
 *   conversationRepo  → ConversationRepository (Drizzle)
 *   messageRepo       → MessageRepository (Drizzle)
 *   contactRepo       → ContactRepository (Drizzle)
 *   userRepo          → UserRepository (Drizzle)
 *   trackingRepo      → MockTrackingRepository
 *   jwtService        → JWTService
 *   worker            → BullMQ Worker instance (already consuming)
 *   broadcast         → WebSocketServer.broadcast function
 * }
 */
