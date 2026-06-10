// Task 2.2 — GroqAdapter: implements ILLMProvider
import Groq from 'groq-sdk'
import { env } from '../../config/env.js'

const groq = new Groq({ apiKey: env.GROQ_API_KEY })

/**
 * System prompt for intent classification.
 * Instructs the model to always respond with a strict JSON object.
 */
const SYSTEM_PROMPT = `Sos un asistente virtual de Escalia, una empresa de paquetería y envíos.
Tu trabajo es entender lo que el usuario necesita y responder en formato JSON.

SIEMPRE respondé en JSON válido con esta estructura exacta:
{
  "intent": "tracking_query" | "human_agent" | "branch_info" | "business_hours" | "unknown",
  "trackingCode": "string o null",
  "reply": "string con tu respuesta amigable al usuario"
}

Reglas:
- Si el usuario pregunta por un paquete, envío, o da un código de rastreo → intent: "tracking_query", extraé el código en trackingCode
- Si el usuario quiere hablar con una persona, asesor, agente, o dice que el bot no le sirve → intent: "human_agent"
- Si pregunta por sucursales, direcciones, ubicaciones → intent: "branch_info"
- Si pregunta por horarios de atención → intent: "business_hours"
- Si no encaja en ninguna categoría → intent: "unknown"

Ejemplos de códigos de rastreo: ESC-12345, ESC12345, 12345, ABC-789
Si el usuario dice "mi paquete ESC-12345" → trackingCode: "ESC-12345"
Si pregunta por rastreo pero no da código → trackingCode: null y pedile el código amablemente

IMPORTANTE: Respondé SOLO el JSON, sin texto adicional, sin markdown, sin backticks.`

// --- Rate limiting for Groq free tier (30 req/min) ---
let lastCallTime = 0
const MIN_INTERVAL = 2000 // 2 seconds between requests

/**
 * Wait the minimum interval since the last call to Groq.
 */
async function waitForRateLimit() {
  const now = Date.now()
  const elapsed = now - lastCallTime

  if (lastCallTime > 0 && elapsed < MIN_INTERVAL) {
    const waitTime = MIN_INTERVAL - elapsed
    console.log(`[GroqAdapter] Rate limit: esperando ${waitTime}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastCallTime = Date.now()
}

/**
 * Build the messages array for Groq, appending the last N history items as
 * assistant/user turns in the system context block.
 *
 * @param {string} message - Current user message
 * @param {Array<{fromType: string, body: string}>} history - Recent message history
 * @returns {Array<{role: string, content: string}>}
 */
function buildMessages(message, history) {
  const recent = history.slice(-5)

  let systemContent = SYSTEM_PROMPT
  if (recent.length > 0) {
    const historyText = recent
      .map((m) => `${m.fromType === 'user' ? 'Usuario' : 'Bot'}: ${m.body}`)
      .join('\n')
    systemContent += `\n\nContexto de la conversación reciente:\n${historyText}`
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: message },
  ]
}

/**
 * Parse the raw LLM response string into a JSON object.
 * Handles markdown backtick fences and other noise the model might produce.
 *
 * @param {string} raw
 * @returns {{intent: string, trackingCode: string|null, reply: string}}
 */
function parseJsonResponse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    console.warn('[GroqAdapter] Error parseando JSON, intentando limpiar respuesta...')

    const jsonMatch = raw?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // fall through
      }
    }

    console.error('[GroqAdapter] No se pudo parsear la respuesta como JSON')
    return {
      intent: 'unknown',
      trackingCode: null,
      reply: 'Disculpa, tuve un problema procesando tu consulta. ¿Podés reformular tu pregunta?',
    }
  }
}

/**
 * Internal call to Groq API.
 * @param {Array<{role: string, content: string}>} messages
 */
async function callGroq(messages) {
  await waitForRateLimit()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    temperature: 0.1,
    max_tokens: 256,
  })

  const rawResponse = completion.choices[0]?.message?.content?.trim()
  console.log(`[GroqAdapter] Respuesta cruda: ${rawResponse}`)
  return parseJsonResponse(rawResponse)
}

/**
 * @type {import('../../core/ports/ILLMProvider.js').ILLMProvider}
 */
export const GroqAdapter = {
  /**
   * Classify the intent of an incoming message.
   * Appends up to 5 recent history messages as context.
   *
   * @param {string} message - The incoming user message
   * @param {Array<{fromType: string, body: string}>} history - Conversation history
   * @returns {Promise<{intent: string, trackingCode: string|null, reply: string}>}
   */
  async classify(message, history = []) {
    const messages = buildMessages(message, history)

    try {
      return await callGroq(messages)
    } catch (error) {
      console.error('[GroqAdapter] Error en la llamada a Groq:', error.message)

      // Retry once on rate-limit error with 5s backoff
      if (error.status === 429) {
        console.log('[GroqAdapter] Rate limit alcanzado, reintentando en 5 segundos...')
        await new Promise((resolve) => setTimeout(resolve, 5000))

        try {
          return await callGroq(messages)
        } catch (retryError) {
          console.error('[GroqAdapter] Error en reintento:', retryError.message)
          return {
            intent: 'unknown',
            trackingCode: null,
            reply: 'Estamos experimentando alta demanda. Por favor, intenta de nuevo en unos minutos.',
          }
        }
      }

      return {
        intent: 'unknown',
        trackingCode: null,
        reply: 'Disculpa, no pude procesar tu mensaje. ¿Podés intentar de nuevo?',
      }
    }
  },
}
