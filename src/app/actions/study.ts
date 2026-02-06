'use server';

import { db } from '@/db';
import { cards, cardAttempts } from '@/db/schema';
import { eq, count, max, sql } from 'drizzle-orm';

/** Fetch all cards for a set (client will shuffle) */
export async function getStudyCards(setId: string) {
  return db.query.cards.findMany({
    where: eq(cards.setId, setId),
  });
}

/** Record a study attempt for a card */
export async function recordAttempt(
  cardId: string,
  isCorrect: boolean,
  difficulty: number | null
) {
  const userId = await db.execute<{ id: string }>(
    sql`SELECT id FROM users LIMIT 1`
  );
  await db.insert(cardAttempts).values({
    cardId,
    userId: userId.rows[0].id,
    isCorrect,
    difficulty,
  });
}

/** Get aggregate stats for a set */
export async function getSetStats(setId: string) {
  const [stats] = await db
    .select({
      totalAttempts: count(cardAttempts.id),
      correctAttempts: count(
        sql`CASE WHEN ${cardAttempts.isCorrect} = true THEN 1 END`
      ),
      lastStudied: max(cardAttempts.createdAt),
    })
    .from(cardAttempts)
    .innerJoin(cards, eq(cards.id, cardAttempts.cardId))
    .where(eq(cards.setId, setId));

  return {
    totalAttempts: Number(stats?.totalAttempts ?? 0),
    correctAttempts: Number(stats?.correctAttempts ?? 0),
    accuracy: stats?.totalAttempts
      ? Math.round((Number(stats.correctAttempts) / Number(stats.totalAttempts)) * 100)
      : null,
    lastStudied: stats?.lastStudied ?? null,
  };
}
