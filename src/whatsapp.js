// Integracion con Twilio SDK para envio de mensajes y validacion de firma
import twilio from 'twilio';

// Cliente de Twilio para enviar mensajes
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Envia un mensaje de WhatsApp usando la API de Twilio.
 * Util para enviar mensajes proactivos (fuera del flujo de webhook/TwiML).
 *
 * @param {string} to - Numero destino en formato "whatsapp:+5491112345678"
 * @param {string} message - Texto del mensaje a enviar
 * @returns {Promise<object>} Respuesta de la API de Twilio con el SID del mensaje
 */
export async function sendWhatsAppMessage(to, message) {
  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to,
      body: message,
    });

    console.log(`[WhatsApp] Mensaje enviado a ${to} | SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error(`[WhatsApp] Error enviando mensaje a ${to}:`, error.message);
    throw error;
  }
}

/**
 * Valida la firma de una solicitud entrante de Twilio.
 * Asegura que el request realmente proviene de Twilio y no fue falsificado.
 *
 * @param {string} signature - Valor del header X-Twilio-Signature
 * @param {string} url - URL completa del webhook
 * @param {object} params - Parametros del body de la solicitud
 * @returns {boolean} true si la firma es valida
 */
export function validateTwilioSignature(signature, url, params) {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  );
}
