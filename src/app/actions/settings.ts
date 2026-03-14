'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { setSettings, sets, userSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireUserId } from '@/lib/auth-session';
import { ensureUserSettings } from '@/lib/study-store';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function getUserSettings() {
  const userId = await requireUserId();
  return ensureUserSettings(userId);
}

export async function updateUserSettings(input: {
  desiredRetention: number;
  maxNewCardsPerDay: number;
  maxNewCardFailsPerDay: number;
  maxReviewsPerDay: number;
  timezone: string;
  newDayStartHour: number;
}) {
  const userId = await requireUserId();
  const settings = await ensureUserSettings(userId);
  const [updated] = await db
    .update(userSettings)
    .set({
      desiredRetention: clamp(input.desiredRetention, 0.7, 0.99),
      maxNewCardsPerDay: clamp(Math.round(input.maxNewCardsPerDay), 0, 500),
      maxNewCardFailsPerDay: clamp(Math.round(input.maxNewCardFailsPerDay), 0, 100),
      maxReviewsPerDay: clamp(Math.round(input.maxReviewsPerDay), 0, 1000),
      timezone: input.timezone.trim() || 'UTC',
      newDayStartHour: clamp(Math.round(input.newDayStartHour), 0, 23),
      updatedAt: new Date(),
    })
    .where(and(eq(userSettings.id, settings.id), eq(userSettings.userId, userId)))
    .returning();

  revalidatePath('/');
  revalidatePath('/settings');

  return updated;
}

/** Update or create per-deck settings (null clears the override). */
export async function updateSetSettings(
  setId: string,
  input: { maxNewCardFailsPerDay: number | null },
) {
  const userId = await requireUserId();
  const set = await db.query.sets.findFirst({
    where: and(eq(sets.id, setId), eq(sets.userId, userId)),
    columns: { id: true },
  });
  if (!set) throw new Error('Set not found');

  const clamped =
    input.maxNewCardFailsPerDay !== null
      ? clamp(Math.round(input.maxNewCardFailsPerDay), 0, 100)
      : null;

  await db
    .insert(setSettings)
    .values({ setId, maxNewCardFailsPerDay: clamped })
    .onConflictDoUpdate({
      target: setSettings.setId,
      set: { maxNewCardFailsPerDay: clamped, updatedAt: new Date() },
    });

  revalidatePath(`/sets/${setId}`);
  revalidatePath(`/sets/${setId}/study`);
}
