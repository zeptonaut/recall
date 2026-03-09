import { and, desc, eq, lte, max, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cards, dailyStats, reviewLogs, userSettings } from '@/db/schema';
import { getMasteryTier, getRetrievability, type MasteryTier, type UserSettingsRecord } from '@/lib/fsrs';

export interface SetStudyStats {
  totalCards: number;
  dueNowCount: number;
  newCount: number;
  lastReviewed: Date | null;
  mastery: Record<MasteryTier, number>;
}

export async function ensureUserSettings() {
  const existing = await db.query.userSettings.findFirst();
  if (existing) return existing;

  const [created] = await db.insert(userSettings).values({}).returning();
  return created;
}

export async function getOrCreateDailyStats(studyDate: string) {
  const existing = await db.query.dailyStats.findFirst({
    where: eq(dailyStats.studyDate, studyDate),
  });

  if (existing) return existing;

  const [created] = await db.insert(dailyStats).values({ studyDate }).returning();
  return created;
}

export async function incrementDailyStats(studyDate: string, updates: { reviewCount?: number; newCardsCount?: number }) {
  const current = await getOrCreateDailyStats(studyDate);

  const [updated] = await db
    .update(dailyStats)
    .set({
      reviewCount: current.reviewCount + (updates.reviewCount ?? 0),
      newCardsCount: current.newCardsCount + (updates.newCardsCount ?? 0),
    })
    .where(eq(dailyStats.studyDate, studyDate))
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

export async function getCardsForRecentLapses(setId: string, now: Date, count: number) {
  const threshold = new Date(now.getTime() - 7 * 86_400_000);
  return db
    .select({ card: cards })
    .from(cards)
    .where(
      and(
        eq(cards.setId, setId),
        ne(cards.state, 'new'),
        sql`exists (
          select 1
          from ${reviewLogs}
          where ${reviewLogs.cardId} = ${cards.id}
            and ${reviewLogs.reviewType} = 'scheduled'
            and ${reviewLogs.rating} = 1
            and ${reviewLogs.reviewedAt} >= ${threshold}
        )`
      )
    )
    .orderBy(desc(cards.lastReview), desc(cards.lapses))
    .limit(count);
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
