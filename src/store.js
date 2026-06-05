// Store compartido en memoria para el estado de las conversaciones
// Centraliza el acceso a datos de conversaciones entre handler.js y panel.js

/**
 * Mapa de conversaciones en memoria.
 * Clave: numero de telefono (ej: "whatsapp:+5491112345678")
 * Valor: { messages: Array, transferred: boolean, transferredAt: string|null }
 *
 * NOTA: En produccion esto deberia persistirse en una base de datos.
 */
const conversations = new Map();

/**
 * Obtiene la conversacion de un numero de telefono.
 * Si no existe, crea una nueva con valores por defecto.
 *
 * @param {string} phone - Numero de telefono
 * @returns {{ messages: Array, transferred: boolean, transferredAt: string|null }}
 */
export function getConversation(phone) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      messages: [],
      transferred: false,
      transferredAt: null,
    });
  }
  return conversations.get(phone);
}

/**
 * Agrega un mensaje a la conversacion de un numero de telefono.
 *
 * @param {string} phone - Numero de telefono
 * @param {{ from: 'user'|'bot'|'agent', body: string }} message - Mensaje a agregar
 * @returns {{ from: string, body: string, timestamp: string }} Mensaje con timestamp
 */
export function addMessage(phone, message) {
  const conversation = getConversation(phone);
  const fullMessage = {
    ...message,
    timestamp: new Date().toISOString(),
  };
  conversation.messages.push(fullMessage);
  return fullMessage;
}

/**
 * Retorna todas las conversaciones como un objeto plano.
 * Clave: numero de telefono, Valor: datos de la conversacion.
 *
 * @returns {Object.<string, { messages: Array, transferred: boolean, transferredAt: string|null }>}
 */
export function getAllConversations() {
  const result = {};
  for (const [phone, data] of conversations) {
    result[phone] = data;
  }
  return result;
}

/**
 * Marca una conversacion como transferida a un agente humano.
 *
 * @param {string} phone - Numero de telefono
 */
export function markTransferred(phone) {
  const conversation = getConversation(phone);
  conversation.transferred = true;
  conversation.transferredAt = new Date().toISOString();
}

/**
 * Verifica si una conversacion fue transferida a un agente humano.
 *
 * @param {string} phone - Numero de telefono
 * @returns {boolean}
 */
export function isTransferred(phone) {
  const conversation = conversations.get(phone);
  return conversation?.transferred ?? false;
}
