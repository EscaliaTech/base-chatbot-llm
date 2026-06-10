// Task 3.8 — webhook.js: POST /webhook/twilio — receives incoming WhatsApp messages
import { Router } from 'express'
import { TwilioAdapter } from '../../infrastructure/whatsapp/TwilioAdapter.js'
import { MessageQueue } from '../../infrastructure/queue/MessageQueue.js'

export function createWebhookRouter() {
  const router = Router()

  router.post('/twilio', (req, res) => {
    // Validate webhook signature
    if (!TwilioAdapter.validateWebhook(req)) {
      return res.status(403).send('Forbidden')
    }

    // Respond immediately (Twilio requires fast response)
    res.status(200).send('')

    // Enqueue for async processing
    const incoming = TwilioAdapter.parseIncomingMessage(req.body)
    MessageQueue.enqueue('process-message', incoming).catch(console.error)
  })

  return router
}
