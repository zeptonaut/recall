'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
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
