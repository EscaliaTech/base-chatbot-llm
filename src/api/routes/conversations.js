// Task 3.10 — conversations.js: conversation and messages routes for the CRM panel
// Phase 8 — added internal notes endpoints (D4.S2)
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { db } from '../../infrastructure/db/client.js'
import { conversations, messages, users, contacts, conversationNotes } from '../../infrastructure/db/schema.js'
import { eq, desc, and } from 'drizzle-orm'
import { broadcast } from '../../infrastructure/websocket/WebSocketServer.js'

export function createConversationsRouter() {
  const router = Router()
  router.use(authenticate)

  // GET /api/conversations — list active conversations
  router.get('/', async (req, res) => {
    try {
      const rows = await db
        .select({
          id: conversations.id,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          transferredAt: conversations.transferredAt,
          createdAt: conversations.createdAt,
          contactPhone: contacts.phone,
          contactName: contacts.name,
        })
        .from(conversations)
        .leftJoin(contacts, eq(conversations.contactId, contacts.id))
        .orderBy(desc(conversations.createdAt))

      // Asesor only sees their own assigned conversations
      const filtered = req.user.role === 'asesor'
        ? rows.filter(r => r.assignedTo === req.user.userId)
        : rows

      res.json(filtered)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /api/conversations/:id/messages
  router.get('/:id/messages', async (req, res) => {
    try {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, req.params.id))
        .orderBy(messages.createdAt)
      res.json(msgs)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/conversations/:id/messages — agent sends a message
  router.post('/:id/messages', async (req, res) => {
    try {
      const { body: msgBody } = req.body
      if (!msgBody?.trim()) return res.status(400).json({ error: 'Body required' })

      const [conv] = await db.select().from(conversations).where(eq(conversations.id, req.params.id))
      if (!conv) return res.status(404).json({ error: 'Conversation not found' })

      // Asesor can only reply to their assigned conversations
      if (req.user.role === 'asesor' && conv.assignedTo !== req.user.userId) {
        return res.status(403).json({ error: 'Not your conversation' })
      }

      // Get contact phone
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId))

      // Import and send via Twilio
      const { TwilioAdapter } = await import('../../infrastructure/whatsapp/TwilioAdapter.js')
      await TwilioAdapter.sendMessage(contact.phone, msgBody)

      // Save message
      const msg = {
        id: crypto.randomUUID(),
        conversationId: req.params.id,
        fromType: 'agent',
        body: msgBody,
        whatsappMessageId: null,
        createdAt: new Date(),
      }
      await db.insert(messages).values(msg)

      broadcast({ type: 'new_message', data: { conversationId: req.params.id, message: msg } })

      res.json(msg)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PATCH /api/conversations/:id/status — resolve or close
  router.patch('/:id/status', authorize('admin', 'supervisor', 'asesor'), async (req, res) => {
    try {
      const { status } = req.body
      const allowed = ['resolved', 'closed']
      if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })

      const [conv] = await db.select().from(conversations).where(eq(conversations.id, req.params.id))
      if (!conv) return res.status(404).json({ error: 'Not found' })

      if (req.user.role === 'asesor' && conv.assignedTo !== req.user.userId) {
        return res.status(403).json({ error: 'Not your conversation' })
      }

      await db.update(conversations).set({ status, closedAt: status === 'closed' ? new Date() : null }).where(eq(conversations.id, req.params.id))

      broadcast({ type: 'conversation_status', data: { conversationId: req.params.id, status } })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PATCH /api/conversations/:id/assign — manual assignment
  router.patch('/:id/assign', authorize('admin', 'supervisor'), async (req, res) => {
    try {
      const { agentId } = req.body
      await db.update(conversations).set({ assignedTo: agentId, status: 'in_progress' }).where(eq(conversations.id, req.params.id))
      broadcast({ type: 'conversation_assigned', data: { conversationId: req.params.id, agentId } })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /api/conversations/:id/notes — internal note (NOT sent to WhatsApp)
  router.post('/:id/notes', async (req, res) => {
    try {
      const { body: noteBody } = req.body
      if (!noteBody?.trim()) return res.status(400).json({ error: 'Body required' })

      const note = {
        id: crypto.randomUUID(),
        conversationId: req.params.id,
        userId: req.user.userId,
        body: noteBody,
        createdAt: new Date(),
      }
      await db.insert(conversationNotes).values(note)

      // Broadcast to panel (internal, not to WhatsApp)
      broadcast({ type: 'internal_note', data: { conversationId: req.params.id, note } })

      res.status(201).json(note)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /api/conversations/:id/notes
  router.get('/:id/notes', async (req, res) => {
    try {
      const notes = await db
        .select()
        .from(conversationNotes)
        .where(eq(conversationNotes.conversationId, req.params.id))
        .orderBy(conversationNotes.createdAt)
      res.json(notes)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
