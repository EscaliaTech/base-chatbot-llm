# Escalia Bot — MVP Avanzado

WhatsApp bot with AI for logistics/package tracking with CRM agent panel.

## Architecture

Hexagonal (Ports & Adapters). WhatsApp provider (Twilio) and LLM provider (Groq) are swappable adapters.

## Stack

**Backend**: Node.js + Express + PostgreSQL (Drizzle ORM) + Redis (BullMQ) + Twilio + Groq
**Frontend**: React + Tailwind v4 + ShadCN/Coss + TanStack Query + Zustand

## Setup

### Prerequisites
- Node.js 20+
- Railway account (or local PostgreSQL + Redis)

### 1. Clone and install
```bash
npm install
cd frontend && npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| TWILIO_ACCOUNT_SID | Twilio account SID |
| TWILIO_AUTH_TOKEN | Twilio auth token |
| TWILIO_WHATSAPP_NUMBER | WhatsApp number (whatsapp:+1...) |
| GROQ_API_KEY | Groq API key |
| JWT_SECRET | Min 32 chars random string |
| JWT_REFRESH_SECRET | Min 32 chars random string (different from JWT_SECRET) |
| FRONTEND_URL | Frontend URL for CORS (e.g. http://localhost:5173) |

### 3. Run database migrations
```bash
npm run db:generate
npm run db:migrate
```

### 4. Start development

Backend:
```bash
npm run dev
```

Frontend (separate terminal):
```bash
cd frontend && npm run dev
```

## Swapping providers

### WhatsApp: Twilio → Meta Cloud API
1. Create `src/infrastructure/whatsapp/MetaCloudAdapter.js` implementing `IWhatsAppProvider`
2. In `src/container.js`, replace `TwilioAdapter` with `MetaCloudAdapter`
3. Update webhook route if needed

### LLM: Groq → OpenAI/Claude
1. Create `src/infrastructure/llm/OpenAIAdapter.js` implementing `ILLMProvider`
2. In `src/container.js`, replace `GroqAdapter` with `OpenAIAdapter`
