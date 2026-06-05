// Integracion con Groq SDK para clasificacion de intenciones via LLM
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Prompt del sistema: le indica al modelo como clasificar mensajes
 * y en que formato JSON debe responder.
 */
const SYSTEM_PROMPT = `Sos un asistente virtual de Escalia, una empresa de paquetería y envíos.
Tu trabajo es entender lo que el usuario necesita y responder en formato JSON.

SIEMPRE respondé en JSON válido con esta estructura exacta:
{
  "intent": "tracking_query" | "human_agent" | "branch_info" | "business_hours" | "unknown",
  "tracking_code": "string o null",
  "reply": "string con tu respuesta amigable al usuario"
}

Reglas:
- Si el usuario pregunta por un paquete, envío, o da un código de rastreo → intent: "tracking_query", extraé el código en tracking_code
- Si el usuario quiere hablar con una persona, asesor, agente, o dice que el bot no le sirve → intent: "human_agent"
- Si pregunta por sucursales, direcciones, ubicaciones → intent: "branch_info"
- Si pregunta por horarios de atención → intent: "business_hours"
- Si no encaja en ninguna categoría → intent: "unknown"

Ejemplos de códigos de rastreo: ESC-12345, ESC12345, 12345, ABC-789
Si el usuario dice "mi paquete ESC-12345" → tracking_code: "ESC-12345"
Si pregunta por rastreo pero no da código → tracking_code: null y pedile el código amablemente

IMPORTANTE: Respondé SOLO el JSON, sin texto adicional, sin markdown, sin backticks.`;

// --- Rate limiting basico para el tier gratuito de Groq (30 req/min) ---
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 2000; // Minimo 2 segundos entre requests

/**
 * Espera el tiempo necesario para respetar el rate limit.
 * Si la ultima request fue hace menos de MIN_INTERVAL_MS, espera la diferencia.
 */
async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (lastRequestTime > 0 && elapsed < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - elapsed;
    console.log(`[Rate Limit] Esperando ${waitTime}ms antes de la siguiente request a Groq`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Clasifica un mensaje del usuario usando Groq (LLaMA 3 8B).
 * Retorna un objeto con { intent, tracking_code, reply }.
 *
 * @param {string} userMessage - Mensaje enviado por el usuario
 * @returns {Promise<{intent: string, tracking_code: string|null, reply: string}>}
 */
export async function classifyMessage(userMessage) {
  // Respetar rate limit del tier gratuito
  await waitForRateLimit();

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1, // Baja para clasificacion consistente
      max_tokens: 256,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim();
    console.log(`[LLM] Respuesta cruda: ${rawResponse}`);

    // Intentar parsear el JSON de la respuesta
    return parseJsonResponse(rawResponse);
  } catch (error) {
    console.error('[LLM] Error en la llamada a Groq:', error.message);

    // Si es error de rate limit, esperar y reintentar una vez
    if (error.status === 429) {
      console.log('[LLM] Rate limit alcanzado, reintentando en 5 segundos...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return retryClassification(userMessage);
    }

    // Retornar intent desconocido como fallback
    return {
      intent: 'unknown',
      tracking_code: null,
      reply: 'Disculpa, no pude procesar tu mensaje. ¿Podés intentar de nuevo?',
    };
  }
}

/**
 * Parsea la respuesta JSON del LLM.
 * Intenta limpiar la respuesta si tiene caracteres extra (backticks, etc).
 *
 * @param {string} raw - Respuesta cruda del modelo
 * @returns {{intent: string, tracking_code: string|null, reply: string}}
 */
function parseJsonResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[LLM] Error parseando JSON, intentando limpiar respuesta...');

    // A veces el modelo agrega backticks o texto extra, intentamos extraer el JSON
    const jsonMatch = raw?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // No se pudo parsear ni limpiando
      }
    }

    console.error('[LLM] No se pudo parsear la respuesta como JSON');
    return {
      intent: 'unknown',
      tracking_code: null,
      reply: 'Disculpa, tuve un problema procesando tu consulta. ¿Podés reformular tu pregunta?',
    };
  }
}

/**
 * Reintento unico de clasificacion.
 * Se usa cuando la primera llamada falla por rate limit u otro error transitorio.
 *
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<{intent: string, tracking_code: string|null, reply: string}>}
 */
async function retryClassification(userMessage) {
  try {
    await waitForRateLimit();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim();
    return parseJsonResponse(rawResponse);
  } catch (error) {
    console.error('[LLM] Error en reintento:', error.message);
    return {
      intent: 'unknown',
      tracking_code: null,
      reply: 'Estamos experimentando alta demanda. Por favor, intenta de nuevo en unos minutos.',
    };
  }
}
