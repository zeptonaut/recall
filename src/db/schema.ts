import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);
export const reviewTypeEnum = pgEnum('review_type', ['scheduled', 'drill']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

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
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  desiredRetention: doublePrecision('desired_retention').default(0.9).notNull(),
  maximumInterval: integer('maximum_interval').default(36500).notNull(),
  enableFuzz: boolean('enable_fuzz').default(true).notNull(),
  enableShortTerm: boolean('enable_short_term').default(true).notNull(),
  fsrsWeights: doublePrecision('fsrs_weights').array(),
  maxNewCardsPerDay: integer('max_new_cards_per_day').default(20).notNull(),
  maxNewCardFailsPerDay: integer('max_new_card_fails_per_day').default(3).notNull(),
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
}, (table) => [
  uniqueIndex('user_settings_user_id_idx').on(table.userId),
]);

export const setSettings = pgTable('set_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id, { onDelete: 'cascade' }).notNull(),
  maxNewCardFailsPerDay: integer('max_new_card_fails_per_day'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('set_settings_set_id_idx').on(table.setId),
]);

export const dailyStats = pgTable('daily_stats', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  studyDate: date('study_date', { mode: 'string' }).notNull(),
  newCardsCount: integer('new_cards_count').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.studyDate] }),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamptz('expires_at').notNull(),
  token: text('token').notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  uniqueIndex('sessions_token_idx').on(table.token),
  index('sessions_user_id_idx').on(table.userId),
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamptz('access_token_expires_at'),
  refreshTokenExpiresAt: timestamptz('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
}, (table) => [
  index('accounts_user_id_idx').on(table.userId),
]);

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamptz('expires_at').notNull(),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
}, (table) => [
  index('verifications_identifier_idx').on(table.identifier),
]);

export const apikey = pgTable('apikey', {
  id: uuid('id').primaryKey().defaultRandom(),
  configId: text('config_id').default('default').notNull(),
  name: text('name'),
  start: text('start'),
  referenceId: uuid('reference_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  prefix: text('prefix'),
  key: text('key').notNull(),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: timestamptz('last_refill_at'),
  enabled: boolean('enabled').default(true).notNull(),
  rateLimitEnabled: boolean('rate_limit_enabled').default(true).notNull(),
  rateLimitTimeWindow: integer('rate_limit_time_window'),
  rateLimitMax: integer('rate_limit_max'),
  requestCount: integer('request_count').default(0).notNull(),
  remaining: integer('remaining'),
  lastRequest: timestamptz('last_request'),
  expiresAt: timestamptz('expires_at'),
  createdAt: timestamptz('created_at').defaultNow().notNull(),
  updatedAt: timestamptz('updated_at').defaultNow().notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
}, (table) => [
  index('apikey_config_id_idx').on(table.configId),
  index('apikey_reference_id_idx').on(table.referenceId),
  uniqueIndex('apikey_key_idx').on(table.key),
]);

export const user = users;
export const session = sessions;
export const account = accounts;
export const verification = verifications;

export const usersRelations = relations(users, ({ many }) => ({
  sets: many(sets),
  cardAttempts: many(cardAttempts),
  sessions: many(sessions),
  accounts: many(accounts),
  settings: many(userSettings),
  dailyStats: many(dailyStats),
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  user: one(users, { fields: [sets.userId], references: [users.id] }),
  cards: many(cards),
  settings: one(setSettings),
}));

export const setSettingsRelations = relations(setSettings, ({ one }) => ({
  set: one(sets, { fields: [setSettings.setId], references: [sets.id] }),
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

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const dailyStatsRelations = relations(dailyStats, ({ one }) => ({
  user: one(users, { fields: [dailyStats.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
