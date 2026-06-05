// Punto de entrada del servidor Express para el bot de WhatsApp de Escalia
import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { handleIncomingMessage } from './handler.js';
import { validateTwilioSignature, sendWhatsAppMessage } from './whatsapp.js';
import { setupWebSocket, broadcast } from './panel.js';
import { getAllConversations, addMessage } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Parsear cuerpo de solicitudes URL-encoded (formato que usa Twilio)
app.use(express.urlencoded({ extended: false }));

// Parsear JSON para los endpoints de la API del panel
app.use(express.json());

// Servir archivos estaticos desde la carpeta public/
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Middleware para validar la firma de Twilio.
 * En desarrollo (NODE_ENV !== 'production') se omite la validacion
 * para facilitar las pruebas locales.
 */
function twilioSignatureMiddleware(req, res, next) {
  // En desarrollo no validamos la firma para facilitar testing con ngrok/etc
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const signature = req.headers['x-twilio-signature'];
  // Construir la URL completa del webhook
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  if (!signature || !validateTwilioSignature(signature, url, req.body)) {
    console.warn('[Twilio] Firma invalida rechazada');
    return res.status(403).send('Firma invalida');
  }

  next();
}

/**
 * Endpoint principal: recibe mensajes de WhatsApp via Twilio webhook.
 * Twilio envia un POST con Body, From, MessageSid, entre otros campos.
 */
// Soportar GET y POST — Twilio usa POST pero algunos configs envian GET
app.all('/webhook/twilio', twilioSignatureMiddleware, async (req, res) => {
  try {
    // Soportar tanto POST (body) como GET (query params)
    const params = req.method === 'GET' ? req.query : req.body;
    const { Body, From, MessageSid } = params;

    console.log(`[Mensaje recibido] De: ${From} | SID: ${MessageSid} | Texto: "${Body}"`);

    // Procesar el mensaje y obtener la respuesta
    const reply = await handleIncomingMessage(From, Body);

    console.log(`[Respuesta enviada] A: ${From} | Texto: "${reply}"`);

    // Responder con TwiML para que Twilio envie el mensaje de vuelta
    res.set('Content-Type', 'text/xml');
    res.send(`<Response><Message>${reply}</Message></Response>`);
  } catch (error) {
    console.error('[Error en webhook]', error.message);

    // Responder con mensaje generico de error para no dejar al usuario sin respuesta
    res.set('Content-Type', 'text/xml');
    res.send(
      '<Response><Message>Disculpa, tuvimos un problema procesando tu mensaje. Intenta de nuevo en unos minutos.</Message></Response>'
    );
  }
});

/**
 * Panel de asesores: sirve el archivo HTML del panel.
 */
app.get('/panel', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/**
 * API: retorna todas las conversaciones activas.
 */
app.get('/api/conversations', (_req, res) => {
  res.json(getAllConversations());
});

/**
 * API: el asesor envia un mensaje a un usuario via Twilio WhatsApp.
 * Guarda el mensaje en el store y lo difunde por WebSocket.
 */
app.post('/api/conversations/:phone/messages', async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacio' });
    }

    // Enviar el mensaje via Twilio WhatsApp
    await sendWhatsAppMessage(phone, message);

    // Guardar en el store como mensaje del asesor
    const agentMsg = addMessage(phone, { from: 'agent', body: message });

    // Notificar a todos los clientes del panel via WebSocket
    broadcast({
      type: 'new_message',
      data: { phone, message: agentMsg },
    });

    console.log(`[Panel] Asesor envio mensaje a ${phone}: "${message}"`);
    res.json({ ok: true, message: agentMsg });
  } catch (error) {
    console.error('[Panel] Error enviando mensaje del asesor:', error.message);
    res.status(500).json({ error: 'Error enviando el mensaje' });
  }
});

/**
 * Health check: endpoint simple para verificar que el servidor esta corriendo.
 * Util para monitoring, load balancers, etc.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Crear servidor HTTP manualmente (necesario para adjuntar WebSocket)
const server = http.createServer(app);

// Inicializar WebSocket adjunto al servidor HTTP
setupWebSocket(server);

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`[Escalia Bot] Servidor corriendo en puerto ${PORT}`);
  console.log(`[Escalia Bot] Webhook URL: POST /webhook/twilio`);
  console.log(`[Escalia Bot] Panel de asesores: GET /panel`);
  console.log(`[Escalia Bot] Health check: GET /health`);
  console.log(`[Escalia Bot] Entorno: ${process.env.NODE_ENV || 'development'}`);
});
