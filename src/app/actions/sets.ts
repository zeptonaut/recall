'use server';

import { db } from '@/db';
import { sets, cards, cardAttempts } from '@/db/schema';
import { eq, count, max, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/** List all sets for the default user with card count and stats */
export async function getSets() {
  const result = await db
    .select({
      id: sets.id,
      title: sets.title,
      description: sets.description,
      createdAt: sets.createdAt,
      updatedAt: sets.updatedAt,
      cardCount: count(cards.id),
    })
    .from(sets)
    .leftJoin(cards, eq(cards.setId, sets.id))
    .groupBy(sets.id)
    .orderBy(sets.updatedAt);

  // Get stats for each set
  const setsWithStats = await Promise.all(
    result.map(async (s) => {
      const stats = await db
        .select({
          lastStudied: max(cardAttempts.createdAt),
          totalAttempts: count(cardAttempts.id),
          correctAttempts: count(
            sql`CASE WHEN ${cardAttempts.isCorrect} = true THEN 1 END`
          ),
        })
        .from(cardAttempts)
        .innerJoin(cards, eq(cards.id, cardAttempts.cardId))
        .where(eq(cards.setId, s.id));

      const stat = stats[0];
      const accuracy = stat?.totalAttempts
        ? Math.round((Number(stat.correctAttempts) / Number(stat.totalAttempts)) * 100)
        : null;

      return {
        ...s,
        lastStudied: stat?.lastStudied ?? null,
        accuracy,
      };
    })
  );

  return setsWithStats;
}

/** Get a single set with its cards */
export async function getSet(id: string) {
  const result = await db.query.sets.findFirst({
    where: eq(sets.id, id),
    with: { cards: { orderBy: (cards, { asc }) => [asc(cards.position)] } },
  });
  return result ?? null;
}

/** Create a new set */
export async function createSet(title: string, description: string) {
  const userId = await db.execute<{ id: string }>(
    sql`SELECT id FROM users LIMIT 1`
  );
  const [newSet] = await db.insert(sets).values({
    userId: userId.rows[0].id,
    title,
    description: description || null,
  }).returning();
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
  return updated;
}

/** Delete a set and its cards (cascades) */
export async function deleteSet(id: string) {
  await db.delete(sets).where(eq(sets.id, id));
  revalidatePath('/');
}
