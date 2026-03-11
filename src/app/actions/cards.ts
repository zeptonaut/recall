'use server';

import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/** List all cards in a set, ordered by position */
export async function getCards(setId: string) {
  return db.query.cards.findMany({
    where: eq(cards.setId, setId),
    orderBy: (cards, { asc }) => [asc(cards.position)],
  });
}

/** Create a new card in a set */
export async function createCard(setId: string, prompt: string, response: string) {
  // Get the next position
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${cards.position}), -1)` })
    .from(cards)
    .where(eq(cards.setId, setId));

  const [newCard] = await db.insert(cards).values({
    setId,
    prompt,
    response,
    position: (maxPos?.max ?? -1) + 1,
  }).returning();

  revalidatePath(`/sets/${setId}`);
  revalidatePath('/study');
  return newCard;
}

/** Update a card's prompt and response */
export async function updateCard(id: string, prompt: string, response: string) {
  const [updated] = await db
    .update(cards)
    .set({ prompt, response, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning();
  if (updated) {
    revalidatePath(`/sets/${updated.setId}`);
    revalidatePath('/study');
  }
  return updated;
}

/** Delete a card */
export async function deleteCard(id: string) {
  const [deleted] = await db
    .delete(cards)
    .where(eq(cards.id, id))
    .returning();
  if (deleted) {
    revalidatePath(`/sets/${deleted.setId}`);
    revalidatePath('/study');
  }
  return deleted;
}
