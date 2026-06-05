# Software Design Document — Escalia WhatsApp Bot MVP

> **Proyecto:** Bot de WhatsApp para empresa de courier/paquetería Escalia
> **Versión:** 1.0 — MVP
> **Fecha:** 2026-06-04
> **Stack:** Node.js · Express · Groq (Llama 3) · Twilio · Chatwoot · ngrok

---

## Tabla de Contenidos

1. [Diagrama de Arquitectura](#1-diagrama-de-arquitectura)
2. [Flujo de Conversación Paso a Paso](#2-flujo-de-conversación-paso-a-paso)
3. [Intenciones del Bot](#3-intenciones-del-bot)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Archivo .env.example](#5-archivo-envexample)
6. [System Prompt para Groq/Llama](#6-system-prompt-para-groqllama)
7. [Esquema de Respuesta JSON del LLM](#7-esquema-de-respuesta-json-del-llm)
8. [Lógica de Enrutamiento por Intención](#8-lógica-de-enrutamiento-por-intención)
9. [Cómo Twilio Entrega el Mensaje al Webhook](#9-cómo-twilio-entrega-el-mensaje-al-webhook)
10. [Cómo Responder a Twilio](#10-cómo-responder-a-twilio)
11. [Integración con Chatwoot](#11-integración-con-chatwoot)
12. [Checklist MVP en 5 Horas](#12-checklist-mvp-en-5-horas)
13. [Restricciones del MVP](#13-restricciones-del-mvp)

---

## 1. Diagrama de Arquitectura

```
┌─────────────────┐
│   Usuario        │
│   WhatsApp       │
└────────┬────────┘
         │  Mensaje de texto
         ▼
┌─────────────────┐
│   Twilio         │
│   WhatsApp       │
│   Sandbox        │
└────────┬────────┘
         │  POST /webhook (application/x-www-form-urlencoded)
         │  Headers: X-Twilio-Signature
         │  Body: { Body, From, To, MessageSid, ... }
         ▼
┌─────────────────┐
│   ngrok          │     Solo en desarrollo local.
│   (túnel HTTPS)  │     En producción se reemplaza por
└────────┬────────┘     la URL pública de Railway/Render.
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                    Express.js (Node.js)                   │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  Webhook      │───▶│  LLM Module  │───▶│  Intent    │ │
│  │  /webhook     │    │  (Groq SDK)  │    │  Router    │ │
│  │              │    │              │    │  handler.js│ │
│  └──────────────┘    └──────┬───────┘    └─────┬──────┘ │
│                             │                   │        │
│                             ▼                   ▼        │
│                    ┌──────────────┐    ┌──────────────┐  │
│                    │  Groq API    │    │  Respuesta   │  │
│                    │  (Llama 3    │    │  al usuario  │  │
│                    │   8b-8192)   │    │  vía Twilio  │  │
│                    └──────────────┘    └──────┬───────┘  │
│                                               │          │
│                    ┌──────────────────────────┘          │
│                    │                                      │
│                    ▼                                      │
│           ┌──────────────┐                               │
│           │  Chatwoot     │  (solo para intent            │
│           │  API          │   "human_agent")              │
│           │  chatwoot.js  │                               │
│           └──────────────┘                               │
└──────────────────────────────────────────────────────────┘

Flujo de respuesta:
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Intent Router ──▶ whatsapp.js ──▶ Twilio REST API      │
│       │                               │                  │
│       │                               ▼                  │
│       │                        Usuario WhatsApp          │
│       │                                                  │
│       └──▶ chatwoot.js ──▶ Chatwoot Panel ──▶ Agente    │
│                                    │                     │
│                                    ▼                     │
│                            Chatwoot Webhook              │
│                            POST /chatwoot-webhook        │
│                                    │                     │
│                                    ▼                     │
│                            whatsapp.js ──▶ Twilio        │
│                                           ──▶ Usuario   │
└──────────────────────────────────────────────────────────┘
```

**Resumen del flujo:**

1. El usuario manda un mensaje por WhatsApp.
2. Twilio recibe el mensaje y hace un `POST` al webhook configurado.
3. En desarrollo, ngrok tuneliza el request al server local.
4. Express valida la firma de Twilio (`X-Twilio-Signature`).
5. El cuerpo del mensaje se envía a Groq (Llama 3) con un system prompt estructurado.
6. El LLM devuelve un JSON con `intent`, `tracking_code` y `reply`.
7. El Intent Router despacha la acción correspondiente.
8. La respuesta se envía al usuario vía Twilio REST API.
9. Si el intent es `human_agent`, se crea contacto y conversación en Chatwoot.

---

## 2. Flujo de Conversación Paso a Paso

### Paso 1 — El usuario envía un mensaje por WhatsApp

El usuario escribe algo como:

> "Hola, quiero saber dónde está mi paquete. Mi código es ESC-2024-00742"

### Paso 2 — Twilio recibe el mensaje y hace POST al webhook

Twilio hace un `POST` a la URL configurada (ej: `https://abc123.ngrok-free.app/webhook`) con los siguientes datos:

```
Content-Type: application/x-www-form-urlencoded

Body=Hola%2C+quiero+saber+d%C3%B3nde+est%C3%A1+mi+paquete.+Mi+c%C3%B3digo+es+ESC-2024-00742
From=whatsapp%3A%2B50412345678
To=whatsapp%3A%2B14155238886
MessageSid=SM1234567890abcdef1234567890abcdef
NumMedia=0
ProfileName=Juan+P%C3%A9rez
WaId=50412345678
SmsMessageSid=SM1234567890abcdef1234567890abcdef
AccountSid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 3 — Validación de firma de Twilio

Antes de procesar cualquier cosa, el servidor valida que el request viene genuinamente de Twilio:

```javascript
const twilio = require("twilio");

function validateTwilioSignature(req) {
  const signature = req.headers["x-twilio-signature"];
  const url = `${process.env.WEBHOOK_BASE_URL}/webhook`;
  const params = req.body;

  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    params
  );
}
```

Si la firma no es válida, se responde `403 Forbidden` y se corta el flujo.

### Paso 4 — Extracción de datos del mensaje

```javascript
const { Body: userMessage, From: fromNumber, MessageSid: messageSid } = req.body;
// userMessage = "Hola, quiero saber dónde está mi paquete. Mi código es ESC-2024-00742"
// fromNumber  = "whatsapp:+50412345678"
// messageSid  = "SM1234567890abcdef1234567890abcdef"
```

### Paso 5 — Envío al LLM (Groq con Llama 3)

Se arma el request a Groq con:
- El **system prompt** (ver sección 6) que instruye al modelo a responder en JSON.
- El **mensaje del usuario** como `user` message.

```javascript
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const completion = await groq.chat.completions.create({
  model: "llama3-8b-8192",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ],
  temperature: 0.3,
  max_tokens: 512,
  response_format: { type: "json_object" },
});

const llmResponse = JSON.parse(completion.choices[0].message.content);
```

### Paso 6 — El LLM devuelve JSON estructurado

```json
{
  "intent": "tracking_query",
  "tracking_code": "ESC-2024-00742",
  "reply": "¡Hola! Estoy buscando la información de tu paquete con código ESC-2024-00742. Un momento por favor."
}
```

### Paso 7 — Intent Router procesa la intención

El `handler.js` recibe el JSON y decide qué hacer:

```javascript
switch (llmResponse.intent) {
  case "tracking_query":
    responseText = handleTracking(llmResponse.tracking_code);
    break;
  case "human_agent":
    responseText = await handleHumanAgent(fromNumber, userMessage);
    break;
  case "branch_info":
    responseText = handleBranchInfo();
    break;
  case "business_hours":
    responseText = handleBusinessHours();
    break;
  default:
    responseText = llmResponse.reply;
}
```

### Paso 8 — Respuesta al usuario vía Twilio

```javascript
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

await client.messages.create({
  from: process.env.TWILIO_WHATSAPP_NUMBER,
  to: fromNumber,
  body: responseText,
});
```

### Paso 9 — (Condicional) Handoff a Chatwoot

Si el intent es `human_agent`:
1. Se crea un contacto en Chatwoot con el número de teléfono.
2. Se crea una conversación asociada al inbox de WhatsApp.
3. Se envía el mensaje original como primer mensaje de la conversación.
4. Se le avisa al usuario que un agente lo va a atender.

---

## 3. Intenciones del Bot

| # | Intent | Descripción | Ejemplo de mensaje del usuario |
|---|--------|-------------|-------------------------------|
| 1 | `tracking_query` | El usuario pregunta por el estado de un paquete/envío. Puede incluir o no un código de rastreo. | "¿Dónde está mi paquete ESC-2024-00742?" / "Quiero rastrear mi envío" |
| 2 | `human_agent` | El usuario quiere hablar con una persona real. | "Quiero hablar con un agente" / "Necesito ayuda de un humano" / "Operador" |
| 3 | `branch_info` | El usuario pregunta por ubicaciones de sucursales u oficinas. | "¿Dónde queda la sucursal más cercana?" / "¿Tienen oficina en San Pedro Sula?" |
| 4 | `business_hours` | El usuario pregunta por horarios de atención. | "¿A qué hora abren?" / "¿Cuál es el horario de atención?" |
| 5 | `unknown` | Cualquier mensaje que no encaje en las categorías anteriores. El bot responde amigablemente y sugiere opciones. | "¿Venden cajas?" / "asdfghjkl" / "Hola" (saludo genérico) |

### Criterios de clasificación

- Si el usuario menciona palabras como "paquete", "envío", "rastrear", "tracking", "código", "estado" → `tracking_query`.
- Si menciona "agente", "humano", "persona", "operador", "ayuda real" → `human_agent`.
- Si menciona "sucursal", "oficina", "dirección", "ubicación", "dónde queda" → `branch_info`.
- Si menciona "horario", "hora", "abren", "cierran", "atención" → `business_hours`.
- Todo lo demás → `unknown`.

**Nota:** La clasificación la hace el LLM, no reglas hardcodeadas. Estos criterios son orientativos para el system prompt.

---

## 4. Estructura de Carpetas

```
bot/
├── src/
│   ├── index.js          # Servidor Express + webhook de Twilio + webhook de Chatwoot
│   ├── llm.js            # Integración con Groq SDK (envío de mensajes al LLM)
│   ├── handler.js        # Lógica de enrutamiento por intención (switch de intents)
│   ├── whatsapp.js       # Envío de mensajes vía Twilio SDK
│   └── chatwoot.js       # Integración con Chatwoot API (contactos, conversaciones, mensajes)
├── .env.example          # Variables de entorno requeridas (template)
├── .env                  # Variables de entorno reales (NO comitear, en .gitignore)
├── .gitignore
├── package.json          # Dependencias y scripts
├── SDD.md                # Este documento
└── README.md             # Instrucciones de setup y uso
```

### Descripción de cada archivo

| Archivo | Responsabilidad |
|---------|----------------|
| `src/index.js` | Punto de entrada. Levanta Express, define los endpoints `/webhook` (Twilio) y `/chatwoot-webhook` (Chatwoot). Valida la firma de Twilio. Orquesta el flujo: recibir mensaje → LLM → handler → respuesta. |
| `src/llm.js` | Encapsula la comunicación con la API de Groq. Exporta una función `classifyMessage(userMessage)` que devuelve el JSON parseado del LLM. Contiene el system prompt. |
| `src/handler.js` | Recibe el JSON del LLM y ejecuta la lógica correspondiente a cada intent. Exporta `handleIntent(llmResponse, fromNumber, userMessage)`. |
| `src/whatsapp.js` | Wrapper del SDK de Twilio para enviar mensajes. Exporta `sendWhatsAppMessage(to, body)`. |
| `src/chatwoot.js` | Funciones para interactuar con la API REST de Chatwoot: crear contacto, crear conversación, enviar mensaje. |

---

## 5. Archivo .env.example

```bash
# ─────────────────────────────────────────────
# Twilio
# ─────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ─────────────────────────────────────────────
# Groq (LLM)
# ─────────────────────────────────────────────
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────
# Chatwoot
# ─────────────────────────────────────────────
CHATWOOT_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CHATWOOT_BASE_URL=https://app.chatwoot.com
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1

# ─────────────────────────────────────────────
# Servidor
# ─────────────────────────────────────────────
PORT=3000

# ─────────────────────────────────────────────
# Webhook (necesario para validar firma Twilio)
# En dev: la URL de ngrok
# En prod: la URL pública del deploy
# ─────────────────────────────────────────────
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
```

### Notas sobre las variables

| Variable | Dónde se obtiene |
|----------|-----------------|
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com/) → Dashboard |
| `TWILIO_AUTH_TOKEN` | [Twilio Console](https://console.twilio.com/) → Dashboard |
| `TWILIO_WHATSAPP_NUMBER` | Sandbox: `whatsapp:+14155238886`. En producción: número propio aprobado por Twilio. |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/) → API Keys |
| `CHATWOOT_API_KEY` | Chatwoot → Settings → Account → API (Access Token del agente/admin) |
| `CHATWOOT_BASE_URL` | URL base de tu instancia de Chatwoot. Si es cloud: `https://app.chatwoot.com` |
| `CHATWOOT_ACCOUNT_ID` | Chatwoot → URL del dashboard (ej: `/app/accounts/1/...` → el `1` es el ID) |
| `CHATWOOT_INBOX_ID` | Chatwoot → Settings → Inboxes → seleccionar inbox → ID en la URL |
| `WEBHOOK_BASE_URL` | La URL pública que apunta a tu servidor. En dev es la URL de ngrok. |

---

## 6. System Prompt para Groq/Llama

```
Sos el asistente virtual de Escalia, una empresa de courier y paquetería. Tu nombre es "Esca" y tu trabajo es ayudar a los clientes por WhatsApp.

## Reglas OBLIGATORIAS

1. SIEMPRE respondé en formato JSON válido. No agregues texto antes ni después del JSON.
2. Usá el siguiente esquema JSON exacto:

{
  "intent": "tracking_query | human_agent | branch_info | business_hours | unknown",
  "tracking_code": "string | null",
  "reply": "string"
}

3. El campo "intent" DEBE ser uno de estos cinco valores exactos:
   - "tracking_query": cuando el usuario pregunta por el estado, ubicación o seguimiento de un paquete o envío.
   - "human_agent": cuando el usuario quiere hablar con un agente humano, operador o persona real.
   - "branch_info": cuando el usuario pregunta por sucursales, oficinas, direcciones o ubicaciones de Escalia.
   - "business_hours": cuando el usuario pregunta por horarios de atención, a qué hora abren o cierran.
   - "unknown": para cualquier otro tipo de mensaje, incluyendo saludos genéricos.

4. El campo "tracking_code" debe contener el código de rastreo si el usuario lo menciona. Si no hay código, usá null.
   - Los códigos de rastreo de Escalia tienen el formato: ESC-YYYY-NNNNN (ejemplo: ESC-2024-00742).
   - Si el usuario da un código en otro formato, extraelo tal cual.
   - Si dice algo como "mi código es 00742", interpretalo como un código parcial y ponelo tal cual.

5. El campo "reply" es la respuesta que se le va a mostrar al usuario. Debe ser:
   - Amigable, profesional y concisa.
   - En español (puede ser neutro o latinoamericano, pero no de España).
   - No más de 2-3 oraciones.
   - Si es un tracking_query, mencioná que estás buscando la información del paquete.
   - Si es un human_agent, avisale que lo vas a conectar con un agente.
   - Si es branch_info o business_hours, respondé que vas a darle la información.
   - Si es unknown, respondé amigablemente y mencioná lo que podés hacer (rastrear paquetes, dar info de sucursales, horarios, o conectar con un agente).

## Ejemplos

Usuario: "Hola, quiero rastrear mi paquete ESC-2024-00742"
Respuesta:
{
  "intent": "tracking_query",
  "tracking_code": "ESC-2024-00742",
  "reply": "¡Hola! Estoy buscando la información de tu paquete con código ESC-2024-00742. Un momento por favor."
}

Usuario: "Necesito hablar con alguien de servicio al cliente"
Respuesta:
{
  "intent": "human_agent",
  "tracking_code": null,
  "reply": "¡Claro! Te voy a conectar con uno de nuestros agentes. En unos momentos alguien te va a atender."
}

Usuario: "¿Dónde queda la oficina de Tegucigalpa?"
Respuesta:
{
  "intent": "branch_info",
  "tracking_code": null,
  "reply": "¡Con gusto! Te paso la información de nuestra sucursal en Tegucigalpa."
}

Usuario: "¿A qué hora atienden?"
Respuesta:
{
  "intent": "business_hours",
  "tracking_code": null,
  "reply": "¡Claro! Te comparto nuestros horarios de atención."
}

Usuario: "Hola"
Respuesta:
{
  "intent": "unknown",
  "tracking_code": null,
  "reply": "¡Hola! Soy Esca, el asistente virtual de Escalia. Puedo ayudarte a rastrear un paquete, darte información de nuestras sucursales, horarios de atención, o conectarte con un agente. ¿En qué te puedo ayudar?"
}
```

---

## 7. Esquema de Respuesta JSON del LLM

### Esquema

```json
{
  "intent": "string (enum)",
  "tracking_code": "string | null",
  "reply": "string"
}
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `intent` | `string` | Sí | Uno de: `tracking_query`, `human_agent`, `branch_info`, `business_hours`, `unknown` |
| `tracking_code` | `string \| null` | Sí | Código de rastreo extraído del mensaje. `null` si no hay código. |
| `reply` | `string` | Sí | Respuesta amigable para el usuario en español. |

### Ejemplos por intención

#### tracking_query (con código)

```json
{
  "intent": "tracking_query",
  "tracking_code": "ESC-2024-00742",
  "reply": "¡Hola! Estoy buscando la información de tu paquete con código ESC-2024-00742. Un momento por favor."
}
```

#### tracking_query (sin código)

```json
{
  "intent": "tracking_query",
  "tracking_code": null,
  "reply": "¡Hola! Para poder rastrear tu paquete necesito el código de seguimiento. ¿Lo tenés a mano? Tiene un formato como ESC-2024-XXXXX."
}
```

#### human_agent

```json
{
  "intent": "human_agent",
  "tracking_code": null,
  "reply": "¡Claro! Te voy a conectar con uno de nuestros agentes. En unos momentos alguien te va a atender."
}
```

#### branch_info

```json
{
  "intent": "branch_info",
  "tracking_code": null,
  "reply": "¡Con gusto! Te paso la información de nuestras sucursales."
}
```

#### business_hours

```json
{
  "intent": "business_hours",
  "tracking_code": null,
  "reply": "¡Claro! Te comparto nuestros horarios de atención."
}
```

#### unknown

```json
{
  "intent": "unknown",
  "tracking_code": null,
  "reply": "¡Hola! Soy Esca, el asistente de Escalia. Puedo ayudarte a rastrear paquetes, darte info de sucursales, horarios, o conectarte con un agente. ¿Qué necesitás?"
}
```

### Manejo de errores de parseo

Si el LLM devuelve algo que no es JSON válido (raro con `response_format: json_object`, pero posible):

```javascript
function parseLLMResponse(raw) {
  try {
    const parsed = JSON.parse(raw);

    // Validar que tenga los campos requeridos
    if (!parsed.intent || !parsed.reply) {
      throw new Error("Campos requeridos faltantes");
    }

    // Validar que el intent sea válido
    const validIntents = ["tracking_query", "human_agent", "branch_info", "business_hours", "unknown"];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = "unknown";
    }

    // Asegurar que tracking_code exista (aunque sea null)
    if (parsed.tracking_code === undefined) {
      parsed.tracking_code = null;
    }

    return parsed;
  } catch (error) {
    console.error("Error parseando respuesta del LLM:", error.message);
    return {
      intent: "unknown",
      tracking_code: null,
      reply: "Disculpá, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?",
    };
  }
}
```

---

## 8. Lógica de Enrutamiento por Intención

### Diagrama de flujo

```
            JSON del LLM
                │
                ▼
        ┌───────────────┐
        │  intent === ?  │
        └───────┬───────┘
                │
    ┌───────────┼───────────┬───────────────┬──────────────┐
    ▼           ▼           ▼               ▼              ▼
tracking    human_agent  branch_info  business_hours    unknown
    │           │           │               │              │
    ▼           ▼           ▼               ▼              ▼
 Buscar     Crear       Devolver        Devolver       Devolver
 paquete    contacto    sucursales      horarios       reply del
 (mock)     + conv en                                  LLM
            Chatwoot
    │           │           │               │              │
    ▼           ▼           ▼               ▼              ▼
 Enviar     Enviar      Enviar          Enviar         Enviar
 estado     "te         info            horarios       fallback
 vía        conecto"    hardcodeada     hardcodeados   amigable
 Twilio     vía Twilio  vía Twilio      vía Twilio     vía Twilio
```

### Intent: `tracking_query`

```javascript
function handleTracking(trackingCode) {
  if (!trackingCode) {
    return "Para rastrear tu paquete necesito el código de seguimiento. " +
           "Tiene un formato como ESC-2024-XXXXX. ¿Lo tenés?";
  }

  // MVP: datos mock en un Map en memoria.
  // En producción esto consultaría la base de datos o API del sistema de tracking.
  const mockTrackingData = new Map([
    ["ESC-2024-00742", {
      status: "En tránsito",
      location: "Centro de distribución Tegucigalpa",
      estimatedDelivery: "2024-12-20",
      lastUpdate: "2024-12-18 14:30",
    }],
    ["ESC-2024-00891", {
      status: "Entregado",
      location: "San Pedro Sula",
      estimatedDelivery: "2024-12-15",
      lastUpdate: "2024-12-15 10:22",
    }],
  ]);

  const data = mockTrackingData.get(trackingCode);

  if (!data) {
    return `No encontré información para el código ${trackingCode}. ` +
           "Verificá que esté bien escrito o contactá a un agente para más ayuda.";
  }

  return `📦 *Paquete ${trackingCode}*\n` +
         `• Estado: ${data.status}\n` +
         `• Ubicación: ${data.location}\n` +
         `• Última actualización: ${data.lastUpdate}\n` +
         `• Entrega estimada: ${data.estimatedDelivery}`;
}
```

### Intent: `human_agent`

```javascript
async function handleHumanAgent(fromNumber, userMessage) {
  try {
    // 1. Crear o buscar contacto en Chatwoot
    const phoneNumber = fromNumber.replace("whatsapp:", "");
    const contact = await chatwoot.findOrCreateContact(phoneNumber);

    // 2. Crear conversación en Chatwoot
    const conversation = await chatwoot.createConversation(contact.id, userMessage);

    // 3. Notificar al usuario
    return "¡Perfecto! Te estoy conectando con uno de nuestros agentes. " +
           "En unos minutos alguien te va a atender por este mismo chat. " +
           "Mientras tanto, si tenés más detalles de tu consulta, escribilos acá.";
  } catch (error) {
    console.error("Error en handoff a Chatwoot:", error);
    return "Disculpá, no pude conectarte con un agente en este momento. " +
           "Podés llamarnos al +504 XXXX-XXXX o escribirnos a soporte@escalia.com.";
  }
}
```

### Intent: `branch_info`

```javascript
function handleBranchInfo() {
  // MVP: información hardcodeada.
  // En producción se consultaría desde una API o base de datos.
  return "🏢 *Sucursales Escalia*\n\n" +
         "📍 *Tegucigalpa (Casa Matriz)*\n" +
         "   Blvd. Morazán, Torre Escalia, Piso 3\n" +
         "   Tel: +504 2222-1111\n\n" +
         "📍 *San Pedro Sula*\n" +
         "   Av. Circunvalación, Plaza Nova, Local 12\n" +
         "   Tel: +504 2555-3333\n\n" +
         "📍 *La Ceiba*\n" +
         "   Calle Principal, frente al Parque Central\n" +
         "   Tel: +504 2443-5555";
}
```

### Intent: `business_hours`

```javascript
function handleBusinessHours() {
  return "🕐 *Horarios de Atención — Escalia*\n\n" +
         "📅 *Lunes a Viernes*\n" +
         "   8:00 AM — 6:00 PM\n\n" +
         "📅 *Sábados*\n" +
         "   8:00 AM — 1:00 PM\n\n" +
         "📅 *Domingos y Feriados*\n" +
         "   Cerrado\n\n" +
         "📞 Para emergencias fuera de horario: +504 XXXX-XXXX";
}
```

### Intent: `unknown` (fallback)

```javascript
function handleUnknown(llmReply) {
  // Se usa el reply generado por el LLM, que ya es amigable y sugiere opciones.
  // Si por alguna razón el reply está vacío, se usa un fallback genérico.
  return llmReply ||
    "¡Hola! Soy Esca, el asistente de Escalia. Puedo ayudarte con:\n\n" +
    "📦 Rastrear un paquete\n" +
    "🏢 Información de sucursales\n" +
    "🕐 Horarios de atención\n" +
    "👤 Conectarte con un agente\n\n" +
    "¿En qué te puedo ayudar?";
}
```

### Función principal del handler

```javascript
// handler.js
const { sendWhatsAppMessage } = require("./whatsapp");
const chatwoot = require("./chatwoot");

async function handleIntent(llmResponse, fromNumber, userMessage) {
  let responseText;

  switch (llmResponse.intent) {
    case "tracking_query":
      responseText = handleTracking(llmResponse.tracking_code);
      break;

    case "human_agent":
      responseText = await handleHumanAgent(fromNumber, userMessage);
      break;

    case "branch_info":
      responseText = handleBranchInfo();
      break;

    case "business_hours":
      responseText = handleBusinessHours();
      break;

    case "unknown":
    default:
      responseText = handleUnknown(llmResponse.reply);
      break;
  }

  // Enviar respuesta al usuario
  await sendWhatsAppMessage(fromNumber, responseText);

  return responseText;
}

module.exports = { handleIntent };
```

---

## 9. Cómo Twilio Entrega el Mensaje al Webhook

### Configuración del Webhook

En la consola de Twilio (Sandbox Settings), se configura la URL del webhook:

```
https://abc123.ngrok-free.app/webhook
```

Método: **POST**

### Content-Type

```
Content-Type: application/x-www-form-urlencoded
```

Twilio **no envía JSON**. Envía datos URL-encoded como un formulario HTML. Express necesita el middleware correspondiente:

```javascript
app.use(express.urlencoded({ extended: false }));
```

### Campos del POST body

| Campo | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| `MessageSid` | string | `SM1234567890abcdef...` | ID único del mensaje en Twilio. |
| `AccountSid` | string | `ACxxxxxxxx...` | ID de tu cuenta Twilio. |
| `From` | string | `whatsapp:+50412345678` | Número del usuario en formato WhatsApp. |
| `To` | string | `whatsapp:+14155238886` | Tu número de Twilio (sandbox o producción). |
| `Body` | string | `Hola, quiero rastrear mi paquete` | Texto del mensaje del usuario. |
| `NumMedia` | string | `0` | Cantidad de archivos multimedia adjuntos. |
| `ProfileName` | string | `Juan Pérez` | Nombre del perfil de WhatsApp del usuario. |
| `WaId` | string | `50412345678` | Número de WhatsApp sin el prefijo `whatsapp:+`. |
| `SmsMessageSid` | string | `SM1234567890abcdef...` | Mismo valor que `MessageSid`. |
| `SmsStatus` | string | `received` | Estado del mensaje. |

### Validación de la firma (`X-Twilio-Signature`)

Twilio firma cada request con un HMAC-SHA1 usando tu `Auth Token`. Este es el proceso de validación:

1. Twilio toma la URL completa del webhook.
2. Ordena los parámetros del POST body alfabéticamente.
3. Concatena cada clave + valor al final de la URL.
4. Genera un HMAC-SHA1 del string resultante usando tu `Auth Token` como clave.
5. El resultado en Base64 es el valor de `X-Twilio-Signature`.

**Implementación con el SDK de Twilio:**

```javascript
const twilio = require("twilio");

// Middleware de validación
function twilioValidation(req, res, next) {
  const signature = req.headers["x-twilio-signature"];
  const url = `${process.env.WEBHOOK_BASE_URL}/webhook`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    console.warn("Firma de Twilio inválida. Request rechazado.");
    return res.status(403).send("Forbidden");
  }

  next();
}
```

**Importante:** La URL usada para validar debe coincidir EXACTAMENTE con la URL configurada en Twilio. Si usás ngrok, cada vez que reiniciás ngrok te da una URL nueva → tenés que actualizar tanto Twilio como `WEBHOOK_BASE_URL`.

---

## 10. Cómo Responder a Twilio

Hay dos formas de enviar la respuesta al usuario. Para el MVP usamos la **Opción B** (REST API) porque es más flexible y permite enviar mensajes asincrónicos.

### Opción A — Respuesta TwiML (sincrónica)

Se responde directamente al request HTTP de Twilio con XML (TwiML):

```javascript
const { twiml } = require("twilio");

app.post("/webhook", (req, res) => {
  const response = new twiml.MessagingResponse();
  response.message("¡Hola! Soy Esca, el asistente de Escalia.");

  res.type("text/xml");
  res.send(response.toString());
});
```

El XML generado:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>¡Hola! Soy Esca, el asistente de Escalia.</Message>
</Response>
```

**Ventajas:**
- Simple, no requiere llamada extra a la API.
- No consume créditos adicionales de API.

**Desventajas:**
- La respuesta debe ser inmediata (antes del timeout HTTP).
- Si el procesamiento con Groq tarda, Twilio puede cortarla.
- Solo se puede enviar UNA respuesta.

### Opción B — REST API (asincrónica) ← Recomendada para el MVP

Se responde con un 200 vacío al webhook y se envía el mensaje por separado usando la REST API de Twilio:

```javascript
// whatsapp.js
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(to, body) {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: to, // formato: whatsapp:+50412345678
      body: body,
    });

    console.log(`Mensaje enviado: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Error enviando mensaje por WhatsApp:", error.message);
    throw error;
  }
}

module.exports = { sendWhatsAppMessage };
```

**En el webhook:**

```javascript
app.post("/webhook", async (req, res) => {
  // Responder a Twilio inmediatamente para evitar timeout
  res.status(200).send();

  // Procesar el mensaje asincrónicamente
  try {
    const { Body: userMessage, From: fromNumber } = req.body;
    const llmResponse = await classifyMessage(userMessage);
    await handleIntent(llmResponse, fromNumber, userMessage);
  } catch (error) {
    console.error("Error procesando mensaje:", error);
  }
});
```

**Ventajas:**
- No hay problema de timeout, Groq puede tardar lo que necesite.
- Se pueden enviar múltiples mensajes como respuesta.
- Permite lógica asincrónica compleja.

**Desventajas:**
- Cada mensaje enviado consume una llamada a la API de Twilio.
- Levemente más complejo.

---

## 11. Integración con Chatwoot

### Objetivo

Cuando el usuario pide hablar con un humano (`intent: human_agent`), el bot:

1. Crea un contacto en Chatwoot con el número de WhatsApp.
2. Crea una conversación en el inbox correspondiente.
3. Envía el mensaje original como primer mensaje de la conversación.
4. Los agentes ven la conversación en el panel de Chatwoot y responden.
5. Un webhook de Chatwoot envía la respuesta del agente de vuelta al bot.
6. El bot reenvía la respuesta al usuario por WhatsApp.

### Headers comunes

Todas las peticiones a Chatwoot usan estos headers:

```
Content-Type: application/json
api_access_token: <CHATWOOT_API_KEY>
```

### 11.1 — Crear contacto

**Endpoint:**

```
POST {CHATWOOT_BASE_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/contacts
```

**Body:**

```json
{
  "name": "WhatsApp +50412345678",
  "phone_number": "+50412345678",
  "identifier": "whatsapp:+50412345678"
}
```

**Respuesta exitosa (200):**

```json
{
  "payload": {
    "contact": {
      "id": 42,
      "name": "WhatsApp +50412345678",
      "phone_number": "+50412345678",
      "identifier": "whatsapp:+50412345678",
      "email": null,
      "created_at": "2024-12-18T10:00:00.000Z"
    }
  }
}
```

**Nota:** Si el contacto ya existe (mismo `identifier` o `phone_number`), Chatwoot devuelve un error 422. En ese caso hay que buscar el contacto existente.

### 11.2 — Buscar contacto existente

**Endpoint:**

```
GET {CHATWOOT_BASE_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/contacts/search?q=+50412345678
```

**Respuesta:**

```json
{
  "payload": [
    {
      "id": 42,
      "name": "WhatsApp +50412345678",
      "phone_number": "+50412345678"
    }
  ]
}
```

### 11.3 — Crear conversación

**Endpoint:**

```
POST {CHATWOOT_BASE_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/conversations
```

**Body:**

```json
{
  "contact_id": 42,
  "inbox_id": 1,
  "message": {
    "content": "El cliente quiere hablar con un agente. Mensaje original: \"Necesito ayuda con mi envío\""
  },
  "status": "open"
}
```

**Respuesta exitosa (200):**

```json
{
  "id": 101,
  "inbox_id": 1,
  "contact_id": 42,
  "status": "open",
  "messages": [
    {
      "id": 501,
      "content": "El cliente quiere hablar con un agente...",
      "message_type": "incoming"
    }
  ]
}
```

### 11.4 — Enviar mensaje a conversación existente

**Endpoint:**

```
POST {CHATWOOT_BASE_URL}/api/v1/accounts/{CHATWOOT_ACCOUNT_ID}/conversations/{CONVERSATION_ID}/messages
```

**Body:**

```json
{
  "content": "Mensaje del bot o del cliente",
  "message_type": "incoming",
  "private": false
}
```

**Tipos de mensaje:**
- `incoming`: Mensaje del cliente (lo que el usuario escribió).
- `outgoing`: Mensaje del agente al cliente.

### 11.5 — Webhook de Chatwoot (agente responde)

Cuando un agente responde desde el panel de Chatwoot, se configura un webhook que notifica al bot:

**Configuración en Chatwoot:** Settings → Integrations → Webhook → URL: `https://abc123.ngrok-free.app/chatwoot-webhook`

**Payload que recibe el bot:**

```json
{
  "event": "message_created",
  "message_type": "outgoing",
  "content": "Hola Juan, tu paquete está en camino...",
  "conversation": {
    "id": 101,
    "contact_inbox": {
      "contact": {
        "phone_number": "+50412345678",
        "identifier": "whatsapp:+50412345678"
      }
    }
  },
  "sender": {
    "type": "user",
    "name": "Agente María"
  }
}
```

**Handler del webhook de Chatwoot:**

```javascript
app.post("/chatwoot-webhook", async (req, res) => {
  res.status(200).send();

  const { event, message_type, content, conversation } = req.body;

  // Solo procesar mensajes salientes (del agente al cliente)
  if (event !== "message_created" || message_type !== "outgoing") {
    return;
  }

  // Solo procesar si el sender es un agente (type: "user"), no el bot
  if (req.body.sender?.type !== "user") {
    return;
  }

  try {
    const phoneNumber = conversation?.contact_inbox?.contact?.phone_number;
    if (!phoneNumber) return;

    const whatsappNumber = `whatsapp:${phoneNumber}`;
    await sendWhatsAppMessage(whatsappNumber, content);
  } catch (error) {
    console.error("Error reenviando mensaje de Chatwoot:", error);
  }
});
```

### 11.6 — Implementación del módulo chatwoot.js

```javascript
// chatwoot.js
const axios = require("axios");

const BASE_URL = process.env.CHATWOOT_BASE_URL;
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const API_KEY = process.env.CHATWOOT_API_KEY;
const INBOX_ID = process.env.CHATWOOT_INBOX_ID;

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}`,
  headers: {
    "Content-Type": "application/json",
    api_access_token: API_KEY,
  },
});

async function findOrCreateContact(phoneNumber) {
  // Intentar buscar primero
  try {
    const searchRes = await api.get(`/contacts/search`, {
      params: { q: phoneNumber },
    });

    if (searchRes.data.payload.length > 0) {
      return searchRes.data.payload[0];
    }
  } catch (err) {
    console.warn("Error buscando contacto:", err.message);
  }

  // Si no existe, crear
  const createRes = await api.post("/contacts", {
    name: `WhatsApp ${phoneNumber}`,
    phone_number: phoneNumber,
    identifier: `whatsapp:${phoneNumber}`,
  });

  return createRes.data.payload.contact;
}

async function createConversation(contactId, initialMessage) {
  const res = await api.post("/conversations", {
    contact_id: contactId,
    inbox_id: parseInt(INBOX_ID),
    message: {
      content: `Cliente solicita atención humana.\nMensaje original: "${initialMessage}"`,
    },
    status: "open",
  });

  return res.data;
}

async function sendMessage(conversationId, content, messageType = "incoming") {
  const res = await api.post(`/conversations/${conversationId}/messages`, {
    content,
    message_type: messageType,
    private: false,
  });

  return res.data;
}

module.exports = {
  findOrCreateContact,
  createConversation,
  sendMessage,
};
```

---

## 12. Checklist MVP en 5 Horas

### Hora 1 — Setup del proyecto y cuentas (60 min)

- [ ] Crear carpeta del proyecto y correr `npm init -y`
- [ ] Instalar dependencias: `npm install express twilio groq-sdk axios dotenv`
- [ ] Crear estructura de carpetas (`src/`)
- [ ] Crear archivo `.env` a partir de `.env.example`
- [ ] Crear cuenta en [Groq Console](https://console.groq.com/) y obtener API key
- [ ] Configurar Twilio WhatsApp Sandbox:
  - [ ] Ir a Twilio Console → Messaging → Try it out → Send a WhatsApp Message
  - [ ] Enviar el código de activación desde tu WhatsApp al sandbox
  - [ ] Anotar el número del sandbox: `whatsapp:+14155238886`
- [ ] Instalar y correr ngrok: `ngrok http 3000`
- [ ] Configurar la URL de ngrok como webhook en Twilio Sandbox

### Hora 2 — Servidor Express + Webhook de Twilio (60 min)

- [ ] Crear `src/index.js` con Express básico
- [ ] Agregar middleware `express.urlencoded({ extended: false })`
- [ ] Crear endpoint `POST /webhook`
- [ ] Implementar validación de firma de Twilio (middleware)
- [ ] Crear `src/whatsapp.js` con la función `sendWhatsAppMessage()`
- [ ] Probar: enviar mensaje desde WhatsApp y verificar que el webhook lo recibe
- [ ] Probar: responder con un mensaje fijo y verificar que llega al WhatsApp

### Hora 3 — Integración con Groq LLM (60 min)

- [ ] Crear `src/llm.js` con la función `classifyMessage()`
- [ ] Escribir el system prompt completo (copiar de la sección 6)
- [ ] Configurar el modelo `llama3-8b-8192`
- [ ] Configurar `temperature: 0.3` y `response_format: { type: "json_object" }`
- [ ] Implementar parseo y validación del JSON de respuesta
- [ ] Implementar fallback si el LLM devuelve JSON inválido
- [ ] Probar con distintos mensajes y verificar que clasifica correctamente
- [ ] Verificar que extrae códigos de tracking del texto natural

### Hora 4 — Intent Router + Lógica de negocio (60 min)

- [ ] Crear `src/handler.js` con el switch de intents
- [ ] Implementar `handleTracking()` con datos mock
- [ ] Implementar `handleBranchInfo()` con datos hardcodeados
- [ ] Implementar `handleBusinessHours()` con datos hardcodeados
- [ ] Implementar fallback para `unknown`
- [ ] Conectar todo: webhook → LLM → handler → respuesta
- [ ] Probar el flujo completo end-to-end con cada intent
- [ ] Verificar que los mensajes llegan formateados correctamente

### Hora 5 — Integración Chatwoot + Testing final (60 min)

- [ ] Crear cuenta en Chatwoot (cloud o self-hosted)
- [ ] Crear inbox de tipo API en Chatwoot
- [ ] Obtener API key, account ID e inbox ID
- [ ] Crear `src/chatwoot.js` con las funciones de contacto y conversación
- [ ] Implementar `handleHumanAgent()` en el handler
- [ ] Configurar webhook de Chatwoot → `POST /chatwoot-webhook`
- [ ] Crear endpoint `POST /chatwoot-webhook` en `src/index.js`
- [ ] Probar flujo completo de handoff:
  - [ ] Usuario pide agente → bot crea conversación en Chatwoot
  - [ ] Agente responde en Chatwoot → mensaje llega al usuario por WhatsApp
- [ ] Test final: probar los 5 intents desde WhatsApp
- [ ] Revisar logs y manejar edge cases encontrados

---

## 13. Restricciones del MVP

### Almacenamiento

- **No hay base de datos.** Todo se maneja en memoria.
- Los datos de tracking son un `Map` hardcodeado en `handler.js`.
- Las conversaciones activas con Chatwoot se pueden trackear con un `Map<phoneNumber, conversationId>` en memoria.
- **Consecuencia:** Si el servidor se reinicia, se pierde todo el estado en memoria. Para el MVP esto es aceptable.

### Autenticación y seguridad

- **No hay autenticación de usuarios.** El bot responde a cualquier número que le escriba al sandbox.
- La única validación de seguridad es la **firma de Twilio** (`X-Twilio-Signature`) para asegurar que los requests vienen de Twilio.
- El webhook de Chatwoot **no tiene validación de firma** en este MVP. En producción habría que validar el token de Chatwoot.
- Las variables sensibles van en `.env` que está en `.gitignore`.

### Rate limiting de Groq (tier gratuito)

| Límite | Valor |
|--------|-------|
| Requests por minuto | 30 |
| Tokens por minuto | 14,400 |
| Tokens por día | 500,000 |

**Implicaciones para el MVP:**
- Máximo ~30 mensajes por minuto pueden ser procesados por el LLM.
- Si se excede el límite, Groq devuelve `429 Too Many Requests`.
- Implementar un manejo básico del rate limit:

```javascript
async function classifyMessage(userMessage) {
  try {
    const completion = await groq.chat.completions.create({
      // ...config
    });
    return parseLLMResponse(completion.choices[0].message.content);
  } catch (error) {
    if (error.status === 429) {
      console.warn("Rate limit de Groq alcanzado");
      return {
        intent: "unknown",
        tracking_code: null,
        reply: "Estamos recibiendo muchos mensajes en este momento. " +
               "¿Podés intentar de nuevo en un minutito?",
      };
    }
    throw error;
  }
}
```

### Código y calidad

- **Código simple, lineal, bien comentado.** No es necesario abstraer más de lo que ya está.
- **Sin TypeScript.** JavaScript puro (CommonJS con `require`) para velocidad de desarrollo.
- **Sin tests automatizados.** Testing manual vía WhatsApp.
- **Sin CI/CD.** Deploy manual a Railway/Render.
- **Sin logging estructurado.** `console.log` y `console.error` son suficientes.

### Twilio Sandbox

- El sandbox de Twilio requiere que el usuario haya enviado el código de activación (`join <word>`) antes de poder recibir mensajes.
- El sandbox expira después de 72 horas de inactividad. Hay que reactivarlo.
- Solo funciona con un número de Twilio compartido (`+14155238886`).
- En producción se necesita un número aprobado por WhatsApp Business API.

### Limitaciones funcionales

- **No hay historial de conversación.** Cada mensaje se procesa de forma aislada, sin contexto de mensajes anteriores.
- **No hay manejo de multimedia.** Solo se procesan mensajes de texto. Imágenes, audio, documentos se ignoran.
- **No hay cola de mensajes.** Si Groq está lento o caído, los mensajes se pierden.
- **No hay retry automático.** Si falla el envío por Twilio, no se reintenta.
- **No hay métricas ni analytics.** No se miden tiempos de respuesta, volumen de mensajes, etc.

### Deploy

- **Railway o Render** en tier gratuito/básico.
- La URL pública del deploy reemplaza a ngrok.
- Actualizar `WEBHOOK_BASE_URL` en `.env` y la URL del webhook en Twilio Console.
- Variables de entorno se configuran desde el dashboard del servicio de hosting.

---

## Apéndice A — Dependencias del proyecto

```json
{
  "name": "escalia-whatsapp-bot",
  "version": "1.0.0",
  "description": "Bot de WhatsApp para Escalia - Courier y Paquetería",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "dotenv": "^16.4.0",
    "express": "^4.21.0",
    "groq-sdk": "^0.8.0",
    "twilio": "^5.3.0"
  }
}
```

---

## Apéndice B — Ejemplo completo de `src/index.js`

```javascript
require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const { classifyMessage } = require("./llm");
const { handleIntent } = require("./handler");
const { sendWhatsAppMessage } = require("./whatsapp");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear body URL-encoded (Twilio envía así)
app.use(express.urlencoded({ extended: false }));

// Middleware para parsear JSON (Chatwoot envía así)
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Escalia WhatsApp Bot" });
});

// Webhook de Twilio — recibe mensajes de WhatsApp
app.post("/webhook", async (req, res) => {
  // Validar firma de Twilio
  const signature = req.headers["x-twilio-signature"];
  const url = `${process.env.WEBHOOK_BASE_URL}/webhook`;

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    console.warn("⚠️ Firma de Twilio inválida");
    return res.status(403).send("Forbidden");
  }

  // Responder 200 inmediatamente para evitar timeout
  res.status(200).send();

  const { Body: userMessage, From: fromNumber } = req.body;
  console.log(`📩 Mensaje de ${fromNumber}: ${userMessage}`);

  try {
    // Clasificar con LLM
    const llmResponse = await classifyMessage(userMessage);
    console.log(`🤖 Intent: ${llmResponse.intent}`);

    // Enrutar y responder
    await handleIntent(llmResponse, fromNumber, userMessage);
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error);
    await sendWhatsAppMessage(
      fromNumber,
      "Disculpá, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?"
    );
  }
});

// Webhook de Chatwoot — recibe respuestas de agentes
app.post("/chatwoot-webhook", async (req, res) => {
  res.status(200).send();

  const { event, message_type, content, conversation } = req.body;

  // Solo mensajes salientes de agentes
  if (event !== "message_created" || message_type !== "outgoing") return;
  if (req.body.sender?.type !== "user") return;

  try {
    const phoneNumber = conversation?.contact_inbox?.contact?.phone_number;
    if (!phoneNumber) return;

    const whatsappNumber = `whatsapp:${phoneNumber}`;
    await sendWhatsAppMessage(whatsappNumber, content);
    console.log(`📤 Mensaje de agente reenviado a ${whatsappNumber}`);
  } catch (error) {
    console.error("❌ Error reenviando mensaje de Chatwoot:", error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Escalia Bot corriendo en puerto ${PORT}`);
});
```

---

> **Fin del documento.**
> Este SDD cubre todo lo necesario para construir el MVP del bot de WhatsApp de Escalia en ~5 horas.
> Cualquier decisión de arquitectura más allá del MVP (base de datos, historial, colas, auth) se difiere a una segunda iteración.
