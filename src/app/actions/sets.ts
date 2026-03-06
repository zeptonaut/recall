'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cards, sets, users } from '@/db/schema';
import { getMasteryTier, getRetrievability } from '@/lib/fsrs';
import { computeSetStudyStats, ensureUserSettings, getAverageRetrievability } from '@/lib/study-store';

/** List all sets for the default user with scheduler-native stats */
export async function getSets() {
  const settings = await ensureUserSettings();
  const result = await db.query.sets.findMany({
    with: {
      cards: true,
    },
    orderBy: (sets, { asc }) => [asc(sets.updatedAt)],
  });

  return Promise.all(
    result.map(async (set) => {
      const stats = await computeSetStudyStats(set.id, settings);
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
        averageRetrievability: await getAverageRetrievability(set.id, settings),
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
  const stats = await computeSetStudyStats(id, settings);

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
  revalidatePath(`/sets/${id}`);
  revalidatePath(`/sets/${id}/study`);
  return updated;
}

/** Delete a set and its cards (cascades) */
export async function deleteSet(id: string) {
  await db.delete(sets).where(eq(sets.id, id));
  revalidatePath('/');
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
