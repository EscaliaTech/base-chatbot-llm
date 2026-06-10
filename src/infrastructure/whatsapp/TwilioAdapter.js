// Task 2.1 — TwilioAdapter: implements IWhatsAppProvider
import twilio from 'twilio'
import { env } from '../../config/env.js'

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

/**
 * @type {import('../../core/ports/IWhatsAppProvider.js').IWhatsAppProvider}
 */
export const TwilioAdapter = {
  /**
   * Send a plain text WhatsApp message via Twilio.
   * @param {string} to - Destination number (e.g. "whatsapp:+5491112345678")
   * @param {string} body - Message text
   */
  async sendMessage(to, body) {
    try {
      const result = await client.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to,
        body,
      })
      console.log(`[TwilioAdapter] Mensaje enviado a ${to} | SID: ${result.sid}`)
    } catch (error) {
      console.error(`[TwilioAdapter] Error enviando mensaje a ${to}:`, error.message)
      throw error
    }
  },

  /**
   * Parse raw Twilio webhook payload (urlencoded req.body) into a normalized IncomingMessage.
   * @param {Record<string, string>} payload - req.body from Twilio webhook
   * @returns {import('../../core/ports/IWhatsAppProvider.js').IncomingMessage}
   */
  parseIncomingMessage(payload) {
    return {
      from: payload.From,
      body: payload.Body,
      messageId: payload.MessageSid,
      profileName: payload.ProfileName || null,
    }
  },

  /**
   * Validate the Twilio HMAC webhook signature.
   * In development mode always returns true.
   * @param {import('express').Request} req
   * @returns {boolean}
   */
  validateWebhook(req) {
    if (env.NODE_ENV === 'development') return true
    const signature = req.headers['x-twilio-signature']
    // Use x-forwarded-proto when behind Railway's reverse proxy (req.protocol would be 'http')
    const proto = req.headers['x-forwarded-proto'] || req.protocol
    const url = `${proto}://${req.get('host')}${req.originalUrl}`
    return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body)
  },
}
