/**
 * @typedef {Object} IncomingMessage
 * @property {string} from - Phone number (e.g. "whatsapp:+5491112345678")
 * @property {string} body - Message text
 * @property {string} messageId - Provider message ID (e.g. Twilio MessageSid)
 */

/**
 * Port: WhatsApp provider abstraction.
 * Implementations: TwilioAdapter, MetaCloudAdapter
 *
 * @typedef {Object} IWhatsAppProvider
 * @property {(to: string, body: string) => Promise<void>} sendMessage
 *   Send a plain text message to a WhatsApp number.
 * @property {(payload: unknown) => IncomingMessage} parseIncomingMessage
 *   Parse the raw webhook payload into a normalized IncomingMessage.
 * @property {(req: import('express').Request) => boolean} validateWebhook
 *   Validate the webhook request signature. Returns true if valid.
 */
