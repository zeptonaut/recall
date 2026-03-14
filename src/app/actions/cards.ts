'use server';

import { db } from '@/db';
import { cards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth-session';

async function requireOwnedSet(setId: string, userId: string) {
  const set = await db.query.sets.findFirst({
    where: (setsTable, { and, eq }) => and(eq(setsTable.id, setId), eq(setsTable.userId, userId)),
    columns: { id: true },
  });

  if (!set) {
    throw new Error('Set not found');
  }
}

async function requireOwnedCard(cardId: string, userId: string) {
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: {
      set: true,
    },
  });

  if (!card || card.set.userId !== userId) {
    throw new Error('Card not found');
  }

  return card;
}

/** List all cards in a set, ordered by position */
export async function getCards(setId: string) {
  const userId = await requireUserId();
  await requireOwnedSet(setId, userId);

  return db.query.cards.findMany({
    where: eq(cards.setId, setId),
    orderBy: (cards, { asc }) => [asc(cards.position)],
  });
}

/** Create a new card in a set */
export async function createCard(setId: string, prompt: string, response: string) {
  const userId = await requireUserId();
  await requireOwnedSet(setId, userId);

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
  const userId = await requireUserId();
  const card = await requireOwnedCard(id, userId);
  const [updated] = await db
    .update(cards)
    .set({ prompt, response, updatedAt: new Date() })
    .where(eq(cards.id, id))
    .returning();
  if (updated) {
    revalidatePath(`/sets/${card.setId}`);
    revalidatePath('/study');
  }
  return updated;
}

/** Delete a card */
export async function deleteCard(id: string) {
  const userId = await requireUserId();
  const card = await requireOwnedCard(id, userId);
  const [deleted] = await db
    .delete(cards)
    .where(eq(cards.id, id))
    .returning();
  if (deleted) {
    revalidatePath(`/sets/${card.setId}`);
    revalidatePath('/study');
  }
  return deleted;
}
