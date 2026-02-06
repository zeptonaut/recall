import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id, { onDelete: 'cascade' }).notNull(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  position: integer('position'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cardAttempts = pgTable('card_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  difficulty: integer('difficulty'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  sets: many(sets),
  cardAttempts: many(cardAttempts),
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  user: one(users, { fields: [sets.userId], references: [users.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  set: one(sets, { fields: [cards.setId], references: [sets.id] }),
  attempts: many(cardAttempts),
}));

export const cardAttemptsRelations = relations(cardAttempts, ({ one }) => ({
  card: one(cards, { fields: [cardAttempts.cardId], references: [cards.id] }),
  user: one(users, { fields: [cardAttempts.userId], references: [users.id] }),
}));
