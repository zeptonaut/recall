import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);
export const reviewTypeEnum = pgEnum('review_type', ['scheduled', 'drill']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
});

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
});

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id, { onDelete: 'cascade' }).notNull(),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  position: integer('position'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  due: timestamptz('due').defaultNow().notNull(),
  stability: doublePrecision('stability').default(0).notNull(),
  difficulty: doublePrecision('difficulty').default(0).notNull(),
  elapsedDays: integer('elapsed_days').default(0).notNull(),
  scheduledDays: integer('scheduled_days').default(0).notNull(),
  learningSteps: integer('learning_steps').default(0).notNull(),
  reps: integer('reps').default(0).notNull(),
  lapses: integer('lapses').default(0).notNull(),
  state: cardStateEnum('state').default('new').notNull(),
  lastReview: timestamptz('last_review'),
});

export const cardAttempts = pgTable('card_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  difficulty: integer('difficulty'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
});

export const reviewLogs = pgTable('review_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  rating: smallint('rating').notNull(),
  reviewType: reviewTypeEnum('review_type').default('scheduled').notNull(),
  stateBefore: cardStateEnum('state_before').notNull(),
  stateAfter: cardStateEnum('state_after').notNull(),
  stabilityBefore: doublePrecision('stability_before'),
  stabilityAfter: doublePrecision('stability_after'),
  difficultyBefore: doublePrecision('difficulty_before'),
  difficultyAfter: doublePrecision('difficulty_after'),
  elapsedDays: integer('elapsed_days').default(0).notNull(),
  scheduledDays: integer('scheduled_days').default(0).notNull(),
  reviewedAt: timestamptz('reviewed_at').defaultNow().notNull(),
  elapsedMs: integer('elapsed_ms').default(0).notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  desiredRetention: doublePrecision('desired_retention').default(0.9).notNull(),
  maximumInterval: integer('maximum_interval').default(36500).notNull(),
  enableFuzz: boolean('enable_fuzz').default(true).notNull(),
  enableShortTerm: boolean('enable_short_term').default(true).notNull(),
  fsrsWeights: doublePrecision('fsrs_weights').array(),
  maxNewCardsPerDay: integer('max_new_cards_per_day').default(20).notNull(),
  maxReviewsPerDay: integer('max_reviews_per_day').default(200).notNull(),
  learningSteps: text('learning_steps')
    .array()
    .default(sql`ARRAY['1m', '10m']::text[]`)
    .notNull(),
  relearningSteps: text('relearning_steps')
    .array()
    .default(sql`ARRAY['10m']::text[]`)
    .notNull(),
  timezone: text('timezone').default('UTC').notNull(),
  newDayStartHour: integer('new_day_start_hour').default(4).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
});

export const dailyStats = pgTable('daily_stats', {
  studyDate: date('study_date', { mode: 'string' }).primaryKey(),
  newCardsCount: integer('new_cards_count').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
});

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
  reviewLogs: many(reviewLogs),
}));

export const cardAttemptsRelations = relations(cardAttempts, ({ one }) => ({
  card: one(cards, { fields: [cardAttempts.cardId], references: [cards.id] }),
  user: one(users, { fields: [cardAttempts.userId], references: [users.id] }),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  card: one(cards, { fields: [reviewLogs.cardId], references: [cards.id] }),
}));
