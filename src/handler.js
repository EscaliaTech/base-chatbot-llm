// Logica de enrutamiento de intenciones del bot de WhatsApp
import { classifyMessage } from './llm.js';
import { getConversation, addMessage, isTransferred, markTransferred } from './store.js';
import { broadcast } from './panel.js';

/**
 * Informacion hardcodeada de sucursales (mock para MVP).
 */
const BRANCH_INFO = `Nuestras sucursales:

📍 *Sucursal Centro*
Av. Corrientes 1234, CABA
Tel: (011) 4567-8901

📍 *Sucursal Palermo*
Honduras 4500, CABA
Tel: (011) 4567-8902

📍 *Sucursal Zona Norte*
Av. Maipú 2100, Vicente López
Tel: (011) 4567-8903`;

/**
 * Horarios de atencion hardcodeados.
 */
const BUSINESS_HOURS = `Nuestros horarios de atención:

🕐 *Lunes a Viernes*: 8:00 - 18:00
🕐 *Sábados*: 9:00 - 13:00
🕐 *Domingos y feriados*: Cerrado`;

/**
 * Procesa un mensaje entrante y devuelve la respuesta correspondiente.
 * Clasifica la intencion del usuario via LLM y enruta al handler adecuado.
 *
 * @param {string} from - Numero de telefono del remitente (formato whatsapp:+54...)
 * @param {string} body - Texto del mensaje recibido
 * @returns {Promise<string>} Texto de respuesta para el usuario
 */
export async function handleIncomingMessage(from, body) {
  // Guardar el mensaje del usuario en el store
  const userMsg = addMessage(from, { from: 'user', body });

  // Notificar al panel via WebSocket
  broadcast({
    type: 'new_message',
    data: { phone: from, message: userMsg },
  });

  // Si el usuario ya fue transferido, solo guardar el mensaje (el asesor lo ve en el panel)
  if (isTransferred(from)) {
    console.log(`[Handler] Mensaje de usuario transferido ${from} guardado en store`);
    return 'Tu mensaje fue enviado al asesor. Te va a responder a la brevedad.';
  }

  // Clasificar la intencion del mensaje usando el LLM
  const classification = await classifyMessage(body);
  console.log(`[Handler] Intent: ${classification.intent} | Tracking: ${classification.tracking_code}`);

  let reply;

  switch (classification.intent) {
    case 'tracking_query':
      reply = handleTracking(classification);
      break;

    case 'human_agent':
      reply = handleHumanAgent(from);
      break;

    case 'branch_info':
      reply = BRANCH_INFO;
      break;

    case 'business_hours':
      reply = BUSINESS_HOURS;
      break;

    case 'unknown':
    default:
      reply =
        classification.reply ||
        'No entendí tu consulta. Puedo ayudarte con:\n' +
          '- Rastreo de paquetes\n' +
          '- Información de sucursales\n' +
          '- Horarios de atención\n' +
          '- Hablar con un asesor\n\n' +
          '¿En qué te puedo ayudar?';
      break;
  }

  // Guardar la respuesta del bot en el store
  const botMsg = addMessage(from, { from: 'bot', body: reply });

  // Notificar al panel via WebSocket
  broadcast({
    type: 'new_message',
    data: { phone: from, message: botMsg },
  });

  return reply;
}

/**
 * Maneja consultas de rastreo de paquetes.
 * Si hay codigo de rastreo, retorna info mock. Si no, pide el codigo.
 *
 * @param {{tracking_code: string|null, reply: string}} classification
 * @returns {string}
 */
function handleTracking(classification) {
  if (classification.tracking_code) {
    const code = classification.tracking_code;
    console.log(`[Tracking] Consulta por paquete: ${code}`);

    // Respuesta mock para el MVP
    return (
      `📦 *Estado de tu paquete ${code}*\n\n` +
      `Estado: En tránsito 🚚\n` +
      `Última ubicación: Centro de distribución CABA\n` +
      `Estimado de entrega: mañana entre 9:00 y 14:00 hs\n\n` +
      `Si tenés alguna otra consulta, no dudes en escribirnos.`
    );
  }

  // El LLM deberia haber pedido el codigo en su reply, lo usamos
  return classification.reply || 'Para rastrear tu paquete necesito el código de seguimiento. ¿Podrías enviármelo?';
}

/**
 * Maneja la transferencia a un agente humano.
 * Marca la conversacion como transferida en el store.
 *
 * @param {string} from - Numero de telefono del usuario
 * @returns {string}
 */
function handleHumanAgent(from) {
  // Verificar si ya fue transferido previamente
  if (isTransferred(from)) {
    console.log(`[Handler] Usuario ${from} ya fue transferido previamente`);
    return 'Ya estás en contacto con un asesor. Tu mensaje fue reenviado y te van a responder a la brevedad.';
  }

  console.log(`[Handler] Transfiriendo usuario ${from} a agente humano`);

  // Marcar como transferido en el store
  markTransferred(from);

  // Notificar al panel que hay una nueva conversacion esperando asesor
  broadcast({
    type: 'conversation_update',
    data: { phone: from, transferred: true, transferredAt: new Date().toISOString() },
  });

  return 'Te estoy transfiriendo con un asesor humano. En breve alguien del equipo se va a comunicar con vos. ¡Gracias por tu paciencia!';
}
