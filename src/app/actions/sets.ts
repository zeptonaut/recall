'use server';

import { and, eq, gte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cards, reviewLogs, sets, users } from '@/db/schema';
import { getMasteryTier, getRetrievability } from '@/lib/fsrs';
import { computeSetStudyStats, ensureUserSettings } from '@/lib/study-store';

/** Fetch daily review counts for a set over the last N days. */
export interface DayActivity {
  review: number;
  learning: number;
  new: number;
}

/** Fetch daily review counts by state for a set over the last N days. */
async function getSetActivity(setId: string, days: number = 28) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      day: sql<string>`date(${reviewLogs.reviewedAt} at time zone 'UTC')`.as('day'),
      stateAfter: reviewLogs.stateAfter,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(reviewLogs.cardId, cards.id))
    .where(and(eq(cards.setId, setId), gte(reviewLogs.reviewedAt, since)))
    .groupBy(sql`day`, reviewLogs.stateAfter)
    .orderBy(sql`day`);

  // Build a lookup: day -> { review, learning, new }
  const byDay = new Map<string, DayActivity>();
  for (const row of rows) {
    const key = row.day;
    if (!byDay.has(key)) byDay.set(key, { review: 0, learning: 0, new: 0 });
    const entry = byDay.get(key)!;
    if (row.stateAfter === 'review') entry.review += row.count;
    else if (row.stateAfter === 'learning' || row.stateAfter === 'relearning') entry.learning += row.count;
    else entry.new += row.count;
  }

  // Fill zero-days for a consistent chart shape
  const result: DayActivity[] = [];
  const d = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = d.toISOString().slice(0, 10);
    result.push(byDay.get(key) ?? { review: 0, learning: 0, new: 0 });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/** List all sets for the default user with scheduler-native stats */
export async function getSets() {
  const result = await db.query.sets.findMany({
    with: {
      cards: true,
    },
    orderBy: (sets, { asc }) => [asc(sets.updatedAt)],
  });

  return Promise.all(
    result.map(async (set) => {
      const [stats, activity] = await Promise.all([
        computeSetStudyStats(set.id),
        getSetActivity(set.id),
      ]);
      return {
        id: set.id,
        title: set.title,
        description: set.description,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        cardCount: set.cards.length,
        dueCount: stats.dueNowCount,
        mastery: stats.mastery,
        lastStudied: stats.lastReviewed,
        activity,
      };
    })
  );
}

/** Get a single set with its cards and derived study metadata */
export async function getSet(id: string) {
  const [set, settings] = await Promise.all([
    db.query.sets.findFirst({
      where: eq(sets.id, id),
      with: { cards: { orderBy: (cards, { asc }) => [asc(cards.position)] } },
    }),
    ensureUserSettings(),
  ]);

  if (!set) return null;

  const now = new Date();
  const stats = await computeSetStudyStats(id);

  return {
    ...set,
    stats,
    cards: set.cards.map((card) => ({
      ...card,
      mastery: getMasteryTier(card),
      retrievability: getRetrievability(card, now, settings.fsrsWeights),
    })),
  };
}

/** Create a new set */
export async function createSet(title: string, description: string) {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) {
    throw new Error('No default user found');
  }

  const [newSet] = await db
    .insert(sets)
    .values({
      userId: user.id,
      title,
      description: description || null,
    })
    .returning();

  revalidatePath('/');
  revalidatePath('/study');
  return newSet;
}

/** Update a set's title and description */
export async function updateSet(id: string, title: string, description: string) {
  const [updated] = await db
    .update(sets)
    .set({ title, description: description || null, updatedAt: new Date() })
    .where(eq(sets.id, id))
    .returning();

  revalidatePath('/');
  revalidatePath('/study');
  revalidatePath(`/sets/${id}`);
  revalidatePath(`/sets/${id}/study`);
  return updated;
}

/** Delete a set and its cards (cascades) */
export async function deleteSet(id: string) {
  await db.delete(sets).where(eq(sets.id, id));
  revalidatePath('/');
  revalidatePath('/study');
}

export async function getSetCardCount(id: string) {
  const set = await db.query.sets.findFirst({
    where: eq(sets.id, id),
    with: { cards: true },
  });

  return set?.cards.length ?? 0;
}

export async function getSetCards(id: string) {
  return db.query.cards.findMany({
    where: eq(cards.setId, id),
    orderBy: [cards.position],
  });
}
