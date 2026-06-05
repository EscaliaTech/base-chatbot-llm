// Modulo del panel de asesores — WebSocket server para comunicacion en tiempo real
import { WebSocketServer } from 'ws';

/** @type {WebSocketServer|null} */
let wss = null;

/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP.
 * Los clientes del panel se conectan aca para recibir actualizaciones en tiempo real.
 *
 * @param {import('http').Server} server - Servidor HTTP de Express
 */
export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[Panel] Nuevo cliente WebSocket conectado');

    ws.on('close', () => {
      console.log('[Panel] Cliente WebSocket desconectado');
    });

    ws.on('error', (error) => {
      console.error('[Panel] Error en WebSocket:', error.message);
    });
  });

  console.log('[Panel] Servidor WebSocket inicializado');
}

/**
 * Envia un mensaje a todos los clientes WebSocket conectados.
 * Formato: { type: 'new_message'|'conversation_update', data: {...} }
 *
 * @param {{ type: string, data: object }} message - Mensaje a difundir
 */
export function broadcast(message) {
  if (!wss) return;

  const payload = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN === 1
      client.send(payload);
    }
  }
}
