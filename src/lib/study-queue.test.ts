import '@/lib/test-setup';

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { closeDb, db } from '@/db';
import * as schema from '@/db/schema';
import { applyFailLimitToDueCount, buildDueStudyQueue, getNewCardFailsPerSet, type SetStudyStats } from '@/lib/study-store';
import { getStudyDayWindow, type UserSettingsRecord } from '@/lib/fsrs';

/** Create a test user with default settings and return the user ID. */
async function createTestUser() {
  const [user] = await db
    .insert(schema.users)
    .values({ name: 'Test User', email: `test-${Date.now()}@test.local`, emailVerified: true })
    .returning();
  await db.insert(schema.userSettings).values({ userId: user.id, maxNewCardFailsPerDay: 3 });
  return user.id;
}

/** Create a set with N new cards and return the set ID. */
async function createSetWithNewCards(userId: string, title: string, count: number) {
  const [set] = await db.insert(schema.sets).values({ userId, title }).returning();
  for (let i = 0; i < count; i++) {
    await db.insert(schema.cards).values({
      setId: set.id,
      prompt: `Q${i + 1}`,
      response: `A${i + 1}`,
      position: i,
    });
  }
  return set.id;
}

/** Record a review log for a new card rated "Again". */
async function recordNewCardFail(cardId: string, reviewedAt: Date) {
  await db.insert(schema.reviewLogs).values({
    cardId,
    rating: 1,
    reviewType: 'scheduled',
    stateBefore: 'new',
    stateAfter: 'learning',
    elapsedDays: 0,
    scheduledDays: 0,
    reviewedAt,
  });
}

/** Record a review log for a new card rated "Good". */
async function recordNewCardPass(cardId: string, reviewedAt: Date) {
  await db.insert(schema.reviewLogs).values({
    cardId,
    rating: 3,
    reviewType: 'scheduled',
    stateBefore: 'new',
    stateAfter: 'learning',
    elapsedDays: 0,
    scheduledDays: 0,
    reviewedAt,
  });
}

async function getSettings(userId: string) {
  return db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId),
  }) as Promise<UserSettingsRecord>;
}

/** Count new cards in a queue result. */
function newCardCount(result: Awaited<ReturnType<typeof buildDueStudyQueue>>) {
  return result.cards.filter((c) => c.state === 'new').length;
}

async function getCardIds(setId: string) {
  const rows = await db.query.cards.findMany({
    where: eq(schema.cards.setId, setId),
    orderBy: (c, { asc }) => [asc(c.position)],
    columns: { id: true },
  });
  return rows.map((r) => r.id);
}

async function cleanTestData() {
  await db.execute(sql`DELETE FROM review_logs`);
  await db.execute(sql`DELETE FROM card_attempts`);
  await db.execute(sql`DELETE FROM daily_stats`);
  await db.execute(sql`DELETE FROM set_settings`);
  await db.execute(sql`DELETE FROM cards`);
  await db.execute(sql`DELETE FROM sets`);
  await db.execute(sql`DELETE FROM user_settings`);
  await db.execute(sql`DELETE FROM sessions`);
  await db.execute(sql`DELETE FROM accounts`);
  await db.execute(sql`DELETE FROM users`);
}

describe('study queue: new card fail limit', () => {
  before(async () => {
    await cleanTestData();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  after(async () => {
    await cleanTestData();
    await closeDb();
  });

  test('new cards appear in the queue when under the fail limit', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Test Deck', 5);
    const settings = await getSettings(userId);

    const result = await buildDueStudyQueue(userId, [setId], settings);

    assert.ok(newCardCount(result) > 0, 'should show new cards');
  });

  test('pass, pass, fail, fail, fail → no more new cards', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Test Deck', 10);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const now = new Date();

    // Pass two new cards — should still have new cards
    await recordNewCardPass(cardIds[0], now);
    await recordNewCardPass(cardIds[1], now);
    let result = await buildDueStudyQueue(userId, [setId], settings);
    assert.ok(newCardCount(result) > 0, 'should still show new cards after 2 passes');

    // Fail one — at 1/3 of limit, still good
    await recordNewCardFail(cardIds[2], now);
    result = await buildDueStudyQueue(userId, [setId], settings);
    assert.ok(newCardCount(result) > 0, 'should still show new cards after 1 fail');

    // Fail again — at 2/3, still good
    await recordNewCardFail(cardIds[3], now);
    result = await buildDueStudyQueue(userId, [setId], settings);
    assert.ok(newCardCount(result) > 0, 'should still show new cards after 2 fails');

    // Fail a third time — at 3/3, done
    await recordNewCardFail(cardIds[4], now);
    result = await buildDueStudyQueue(userId, [setId], settings);
    assert.equal(newCardCount(result), 0, 'should stop showing new cards after 3 fails');
  });

  test('only "Again" ratings count toward the limit, not "Good"', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Test Deck', 10);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const now = new Date();

    // Pass all 10 new cards — none of these count toward the fail limit
    for (let i = 0; i < 10; i++) {
      await recordNewCardPass(cardIds[i], now);
    }

    const result = await buildDueStudyQueue(userId, [setId], settings);
    assert.equal(result.counts.new >= 0, true, 'passes should not trigger the fail limit');
  });

  test('fail limit is per-set, not global', async () => {
    const userId = await createTestUser();
    const setA = await createSetWithNewCards(userId, 'Deck A', 5);
    const setB = await createSetWithNewCards(userId, 'Deck B', 5);
    const settings = await getSettings(userId);
    const cardsA = await getCardIds(setA);
    const now = new Date();

    // Exhaust the fail limit on Deck A only
    await recordNewCardFail(cardsA[0], now);
    await recordNewCardFail(cardsA[1], now);
    await recordNewCardFail(cardsA[2], now);

    const result = await buildDueStudyQueue(userId, [setA, setB], settings);

    const newCardsInQueue = result.cards.filter((c) => c.state === 'new');
    const setsWithNewCards = new Set(newCardsInQueue.map((c) => c.setId));

    assert.ok(!setsWithNewCards.has(setA), 'Deck A should be blocked');
    assert.ok(setsWithNewCards.has(setB), 'Deck B should still show new cards');
  });

  test('per-deck override lowers the limit for one set', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Strict Deck', 5);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const now = new Date();

    // Override: only allow 1 fail per day for this set
    await db.insert(schema.setSettings).values({ setId, maxNewCardFailsPerDay: 1 });

    // One fail should exhaust the per-deck limit
    await recordNewCardFail(cardIds[0], now);

    const result = await buildDueStudyQueue(userId, [setId], settings);
    assert.equal(newCardCount(result), 0, 'should stop after 1 fail with per-deck limit of 1');
  });

  test('per-deck override raises the limit for one set', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Lenient Deck', 10);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const now = new Date();

    // Override: allow 5 fails per day for this set (default is 3)
    await db.insert(schema.setSettings).values({ setId, maxNewCardFailsPerDay: 5 });

    // 3 fails — would block with the default, but this set allows 5
    await recordNewCardFail(cardIds[0], now);
    await recordNewCardFail(cardIds[1], now);
    await recordNewCardFail(cardIds[2], now);

    const result = await buildDueStudyQueue(userId, [setId], settings);
    assert.ok(newCardCount(result) > 0, 'should still show new cards with higher per-deck limit');
  });

  test('fails from yesterday do not count toward today', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Test Deck', 5);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 3 fails yesterday
    await recordNewCardFail(cardIds[0], yesterday);
    await recordNewCardFail(cardIds[1], yesterday);
    await recordNewCardFail(cardIds[2], yesterday);

    const result = await buildDueStudyQueue(userId, [setId], settings);
    assert.ok(newCardCount(result) > 0, 'yesterday fails should not affect today');
  });

  test('getNewCardFailsPerSet counts correctly', async () => {
    const userId = await createTestUser();
    const setId = await createSetWithNewCards(userId, 'Test Deck', 5);
    const settings = await getSettings(userId);
    const cardIds = await getCardIds(setId);
    const now = new Date();
    const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);

    // No fails yet
    let fails = await getNewCardFailsPerSet([setId], studyDay.start, studyDay.end);
    assert.equal(fails.get(setId) ?? 0, 0);

    // One fail
    await recordNewCardFail(cardIds[0], now);
    fails = await getNewCardFailsPerSet([setId], studyDay.start, studyDay.end);
    assert.equal(fails.get(setId), 1);

    // A pass doesn't increment the fail count
    await recordNewCardPass(cardIds[1], now);
    fails = await getNewCardFailsPerSet([setId], studyDay.start, studyDay.end);
    assert.equal(fails.get(setId), 1, 'passes should not increment fail count');

    // Another fail
    await recordNewCardFail(cardIds[2], now);
    fails = await getNewCardFailsPerSet([setId], studyDay.start, studyDay.end);
    assert.equal(fails.get(setId), 2);
  });
});

describe('applyFailLimitToDueCount', () => {
  const baseStats: SetStudyStats = {
    totalCards: 20,
    dueNowCount: 8, // 2 learning + 1 review + 5 new
    newCount: 5,
    lastReviewed: new Date(),
    mastery: { new: 5, learning: 10, familiar: 3, mastered: 2 },
  };

  test('returns stats unchanged when under the fail limit', () => {
    const result = applyFailLimitToDueCount(baseStats, 2, 3);
    assert.deepEqual(result, baseStats);
  });

  test('zeros out new cards when at the fail limit', () => {
    const result = applyFailLimitToDueCount(baseStats, 3, 3);
    assert.equal(result.newCount, 0);
    assert.equal(result.dueNowCount, 3, 'should only count learning + review');
  });

  test('zeros out new cards when over the fail limit', () => {
    const result = applyFailLimitToDueCount(baseStats, 5, 3);
    assert.equal(result.newCount, 0);
    assert.equal(result.dueNowCount, 3);
  });

  test('preserves other stats fields', () => {
    const result = applyFailLimitToDueCount(baseStats, 3, 3);
    assert.equal(result.totalCards, baseStats.totalCards);
    assert.deepEqual(result.mastery, baseStats.mastery);
    assert.equal(result.lastReviewed, baseStats.lastReviewed);
  });

  test('handles zero new cards gracefully', () => {
    const noNewStats: SetStudyStats = { ...baseStats, dueNowCount: 3, newCount: 0 };
    const result = applyFailLimitToDueCount(noNewStats, 3, 3);
    assert.equal(result.dueNowCount, 3, 'should not go negative');
    assert.equal(result.newCount, 0);
  });
});
