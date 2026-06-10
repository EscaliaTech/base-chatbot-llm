import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 120 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 256 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('asesor'),
  name: varchar('name', { length: 120 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 120 }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id')
    .notNull()
    .references(() => contacts.id),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  transferredAt: timestamp('transferred_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id),
  fromType: varchar('from_type', { length: 10 }).notNull(),
  body: text('body'),
  whatsappMessageId: varchar('whatsapp_message_id', { length: 64 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  token: varchar('token', { length: 512 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const conversationNotes = pgTable('conversation_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const responseTemplates = pgTable('response_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  body: text('body').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const botConfig = pgTable('bot_config', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
