import { and, asc, desc, eq, gte, inArray, lte, max, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cards, dailyStats, reviewLogs, setSettings, userSettings } from '@/db/schema';
import {
  getMasteryTier,
  getRetrievability,
  getStudyDayWindow,
  toStudyQueueItem,
  type MasteryTier,
  type StudyQueueResult,
  type UserSettingsRecord,
} from '@/lib/fsrs';

/** Fisher-Yates shuffle, returns a new array. */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface SetStudyStats {
  totalCards: number;
  dueNowCount: number;
  newCount: number;
  lastReviewed: Date | null;
  mastery: Record<MasteryTier, number>;
}

export async function ensureUserSettings(userId: string) {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (existing) return existing;

  const [created] = await db.insert(userSettings).values({ userId }).returning();
  return created;
}

export async function getOrCreateDailyStats(userId: string, studyDate: string) {
  const existing = await db.query.dailyStats.findFirst({
    where: and(eq(dailyStats.userId, userId), eq(dailyStats.studyDate, studyDate)),
  });

  if (existing) return existing;

  const [created] = await db.insert(dailyStats).values({ userId, studyDate }).returning();
  return created;
}

export async function incrementDailyStats(
  userId: string,
  studyDate: string,
  updates: { reviewCount?: number; newCardsCount?: number },
) {
  const current = await getOrCreateDailyStats(userId, studyDate);

  const [updated] = await db
    .update(dailyStats)
    .set({
      reviewCount: current.reviewCount + (updates.reviewCount ?? 0),
      newCardsCount: current.newCardsCount + (updates.newCardsCount ?? 0),
    })
    .where(and(eq(dailyStats.userId, userId), eq(dailyStats.studyDate, studyDate)))
    .returning();

  return updated;
}

export async function getDueCountsForSet(setId: string, now: Date) {
  const [learningCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(and(eq(cards.setId, setId), or(eq(cards.state, 'learning'), eq(cards.state, 'relearning')), lte(cards.due, now)));

  const [reviewCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(and(eq(cards.setId, setId), eq(cards.state, 'review'), lte(cards.due, now)));

  const [newCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .where(and(eq(cards.setId, setId), eq(cards.state, 'new')));

  return {
    learning: Number(learningCount?.count ?? 0),
    review: Number(reviewCount?.count ?? 0),
    new: Number(newCount?.count ?? 0),
  };
}

export async function getLastReviewedAt(setId: string) {
  const [result] = await db
    .select({ lastReviewed: max(reviewLogs.reviewedAt) })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .where(eq(cards.setId, setId));

  return result?.lastReviewed ?? null;
}

export async function getCardsForRecentLapses(setIds: string[], now: Date, count: number) {
  const threshold = new Date(now.getTime() - 7 * 86_400_000);
  return db.query.cards.findMany({
    with: { set: true },
    where: and(
      inArray(cards.setId, setIds),
      ne(cards.state, 'new'),
      sql`exists (
        select 1
        from ${reviewLogs}
        where ${reviewLogs.cardId} = ${cards.id}
          and ${reviewLogs.reviewType} = 'scheduled'
          and ${reviewLogs.rating} = 1
          and ${reviewLogs.reviewedAt} >= ${threshold}
      )`
    ),
    orderBy: [desc(cards.lastReview), desc(cards.lapses)],
    limit: count,
  });
}

export async function computeSetStudyStats(setId: string): Promise<SetStudyStats> {
  const now = new Date();
  const allCards = await db.query.cards.findMany({
    where: eq(cards.setId, setId),
  });
  const dueCounts = await getDueCountsForSet(setId, now);
  const lastReviewed = await getLastReviewedAt(setId);

  const mastery = allCards.reduce<Record<MasteryTier, number>>(
    (acc, card) => {
      acc[getMasteryTier(card)] += 1;
      return acc;
    },
    { new: 0, learning: 0, familiar: 0, mastered: 0 }
  );

  return {
    totalCards: allCards.length,
    dueNowCount: dueCounts.learning + dueCounts.review + dueCounts.new,
    newCount: dueCounts.new,
    lastReviewed,
    mastery,
  };
}

/** Subtract blocked new cards from a set's due count when the fail limit is reached. */
export function applyFailLimitToDueCount(
  stats: SetStudyStats,
  fails: number,
  limit: number,
): SetStudyStats {
  if (fails < limit) return stats;
  return {
    ...stats,
    dueNowCount: stats.dueNowCount - stats.newCount,
    newCount: 0,
  };
}

/** Count how many new cards were rated "Again" today, grouped by set. */
export async function getNewCardFailsPerSet(
  setIds: string[],
  studyDayStart: Date,
  studyDayEnd: Date,
) {
  if (setIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      setId: cards.setId,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(reviewLogs.cardId, cards.id))
    .where(
      and(
        inArray(cards.setId, setIds),
        eq(reviewLogs.rating, 1),
        eq(reviewLogs.stateBefore, 'new'),
        eq(reviewLogs.reviewType, 'scheduled'),
        gte(reviewLogs.reviewedAt, studyDayStart),
        lte(reviewLogs.reviewedAt, studyDayEnd),
      ),
    )
    .groupBy(cards.setId);

  return new Map(rows.map((r) => [r.setId, r.count]));
}

/** Get per-set new card fail limits, falling back to the user-level default. */
export async function getNewCardFailLimits(
  setIds: string[],
  userDefault: number,
) {
  if (setIds.length === 0) return new Map<string, number>();

  const overrides = await db.query.setSettings.findMany({
    where: inArray(setSettings.setId, setIds),
    columns: { setId: true, maxNewCardFailsPerDay: true },
  });

  const limits = new Map<string, number>();
  for (const id of setIds) {
    limits.set(id, userDefault);
  }
  for (const override of overrides) {
    if (override.maxNewCardFailsPerDay !== null) {
      limits.set(override.setId, override.maxNewCardFailsPerDay);
    }
  }

  return limits;
}

/** Build the study queue for the given sets, applying all daily limits. */
export async function buildDueStudyQueue(
  userId: string,
  setIds: string[],
  settings: UserSettingsRecord,
): Promise<StudyQueueResult> {
  const now = new Date();
  const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);
  const stats = await getOrCreateDailyStats(userId, studyDay.key);

  const remainingNewBudget = Math.max(0, settings.maxNewCardsPerDay - stats.newCardsCount);
  const remainingReviewBudget = Math.max(0, settings.maxReviewsPerDay - stats.reviewCount);

  const [learning, reviews, failsPerSet, failLimits] = await Promise.all([
    db.query.cards.findMany({
      with: { set: true },
      where: and(
        inArray(cards.setId, setIds),
        sql`${cards.state} in ('learning', 'relearning')`,
        lte(cards.due, now),
      ),
      orderBy: [asc(cards.due)],
    }),
    db.query.cards.findMany({
      with: { set: true },
      where: and(inArray(cards.setId, setIds), eq(cards.state, 'review'), lte(cards.due, now)),
      orderBy: [asc(cards.due)],
    }),
    getNewCardFailsPerSet(setIds, studyDay.start, studyDay.end),
    getNewCardFailLimits(setIds, settings.maxNewCardFailsPerDay),
  ]);

  const setsAtFailLimit = new Set(
    setIds.filter((id) => {
      const limit = failLimits.get(id) ?? settings.maxNewCardFailsPerDay;
      const fails = failsPerSet.get(id) ?? 0;
      return fails >= limit;
    }),
  );

  const allNewCards = remainingNewBudget
    ? await db.query.cards.findMany({
        with: { set: true },
        where: and(inArray(cards.setId, setIds), eq(cards.state, 'new')),
        orderBy: [asc(cards.createdAt)],
        limit: remainingNewBudget,
      })
    : [];

  const newCards = shuffle(allNewCards.filter((card) => !setsAtFailLimit.has(card.setId)));
  const queue = [...learning, ...reviews, ...newCards].slice(0, remainingReviewBudget);

  return {
    cards: queue.map((card) => toStudyQueueItem(card, now, settings.fsrsWeights, card.set.title)),
    counts: {
      learning: learning.length,
      review: reviews.length,
      new: newCards.length,
      remainingReviewBudget,
      remainingNewBudget,
    },
    studyDate: studyDay.key,
  };
}

export async function getAverageRetrievability(setId: string, settings: UserSettingsRecord) {
  const now = new Date();
  const reviewableCards = await db.query.cards.findMany({
    where: and(eq(cards.setId, setId), ne(cards.state, 'new')),
  });

  if (reviewableCards.length === 0) return null;

  return (
    reviewableCards.reduce((sum, card) => sum + getRetrievability(card, now, settings.fsrsWeights), 0) /
    reviewableCards.length
  );
}
