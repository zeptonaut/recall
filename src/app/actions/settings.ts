'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureUserSettings } from '@/lib/study-store';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function getUserSettings() {
  return ensureUserSettings();
}

export async function updateUserSettings(input: {
  desiredRetention: number;
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
  timezone: string;
  newDayStartHour: number;
}) {
  const settings = await ensureUserSettings();
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
    .where(eq(userSettings.id, settings.id))
    .returning();

  revalidatePath('/');
  revalidatePath('/settings');

  return updated;
}
