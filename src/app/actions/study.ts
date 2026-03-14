'use server';

import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cards, reviewLogs, sets } from '@/db/schema';
import { requireUserId } from '@/lib/auth-session';
import {
  buildReviewPreview,
  createFsrsScheduler,
  DRILL_MODES,
  fromFsrsCard,
  getStudyDayWindow,
  ratingFromNumber,
  stateToString,
  toFsrsCard,
  toStudyQueueItem,
  type DrillMode,
  type ReviewType,
  type StudyQueueResult,
} from '@/lib/fsrs';
import {
  applyFailLimitToDueCount,
  buildDueStudyQueue,
  computeSetStudyStats,
  ensureUserSettings,
  getCardsForRecentLapses,
  getNewCardFailLimits,
  getNewCardFailsPerSet,
  getOrCreateDailyStats,
  incrementDailyStats,
} from '@/lib/study-store';

function normalizeSetIds(setIds: string[]) {
  return [...new Set(setIds.filter(Boolean))];
}

async function getOwnedSetIds(setIds: string[], userId: string) {
  if (setIds.length === 0) {
    return [];
  }

  const ownedSets = await db
    .select({ id: sets.id })
    .from(sets)
    .where(and(eq(sets.userId, userId), inArray(sets.id, setIds)));

  return ownedSets.map((set) => set.id);
}

const EMPTY_QUEUE: StudyQueueResult = {
  cards: [],
  counts: { learning: 0, review: 0, new: 0, remainingReviewBudget: 0, remainingNewBudget: 0 },
  studyDate: '',
};

export async function getDueStudyQueue(setIds: string[]) {
  const normalizedSetIds = normalizeSetIds(setIds);
  if (normalizedSetIds.length === 0) return EMPTY_QUEUE;

  const userId = await requireUserId();
  const ownedSetIds = await getOwnedSetIds(normalizedSetIds, userId);
  if (ownedSetIds.length === 0) return EMPTY_QUEUE;

  const settings = await ensureUserSettings(userId);
  return buildDueStudyQueue(userId, ownedSetIds, settings);
}

export async function getReviewPreview(cardId: string, reviewType: ReviewType) {
  void reviewType;
  const userId = await requireUserId();
  const [card, settings] = await Promise.all([
    db.query.cards.findFirst({ where: eq(cards.id, cardId), with: { set: true } }),
    ensureUserSettings(userId),
  ]);

  if (!card || card.set.userId !== userId) {
    throw new Error('Card not found');
  }

  return buildReviewPreview(card, settings, new Date());
}

export async function submitReview(input: {
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  reviewType: ReviewType;
  elapsedMs: number;
}) {
  const userId = await requireUserId();
  const [card, settings] = await Promise.all([
    db.query.cards.findFirst({ where: eq(cards.id, input.cardId), with: { set: true } }),
    ensureUserSettings(userId),
  ]);

  if (!card || card.set.userId !== userId) {
    throw new Error('Card not found');
  }

  const now = new Date();
  const scheduler = createFsrsScheduler(settings);
  const result = scheduler.next(toFsrsCard(card), now, ratingFromNumber(input.rating));
  const nextCardState = fromFsrsCard(result.card);

  await db.insert(reviewLogs).values({
    cardId: card.id,
    rating: input.rating,
    reviewType: input.reviewType,
    stateBefore: card.state,
    stateAfter: stateToString(result.card.state),
    stabilityBefore: card.stability,
    stabilityAfter: result.card.stability,
    difficultyBefore: card.difficulty,
    difficultyAfter: result.card.difficulty,
    elapsedDays: result.log.elapsed_days,
    scheduledDays: result.card.scheduled_days,
    reviewedAt: now,
    elapsedMs: input.elapsedMs,
  });

  if (input.reviewType === 'scheduled') {
    await db
      .update(cards)
      .set({
        ...nextCardState,
        updatedAt: now,
      })
      .where(eq(cards.id, card.id));

    const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);
    await incrementDailyStats(userId, studyDay.key, {
      reviewCount: 1,
      newCardsCount: card.state === 'new' ? 1 : 0,
    });

    revalidatePath('/');
    revalidatePath('/study');
    revalidatePath(`/sets/${card.setId}`);
    revalidatePath(`/sets/${card.setId}/study`);
  }

  // Check if this new-card fail just hit the limit for this set
  let newCardsExhausted = false;
  if (input.reviewType === 'scheduled' && card.state === 'new' && input.rating === 1) {
    const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);
    const [failsPerSet, failLimits] = await Promise.all([
      getNewCardFailsPerSet([card.setId], studyDay.start, studyDay.end),
      getNewCardFailLimits([card.setId], settings.maxNewCardFailsPerDay),
    ]);
    const fails = failsPerSet.get(card.setId) ?? 0;
    const limit = failLimits.get(card.setId) ?? settings.maxNewCardFailsPerDay;
    newCardsExhausted = fails >= limit;
  }

  return {
    reviewType: input.reviewType,
    newCardsExhausted,
    card:
      input.reviewType === 'scheduled'
        ? toStudyQueueItem({ ...card, ...nextCardState }, now, settings.fsrsWeights, card.set.title)
        : toStudyQueueItem(card, now, settings.fsrsWeights, card.set.title),
  };
}

export async function getDrillQueue(setIds: string[], count = 10, mode: DrillMode = 'weakest') {
  const normalizedSetIds = normalizeSetIds(setIds);
  if (normalizedSetIds.length === 0) {
    return [];
  }

  const userId = await requireUserId();
  const ownedSetIds = await getOwnedSetIds(normalizedSetIds, userId);
  if (ownedSetIds.length === 0) {
    return [];
  }

  const dueQueue = await getDueStudyQueue(ownedSetIds);
  if (dueQueue.cards.length > 0) {
    return [];
  }

  const settings = await ensureUserSettings(userId);
  const now = new Date();

  const baseWhere = and(inArray(cards.setId, ownedSetIds), ne(cards.state, 'new'));
  let drillCards =
    mode === 'weakest'
      ? await db.query.cards.findMany({
          with: { set: true },
          where: baseWhere,
          orderBy: [asc(cards.stability), asc(cards.lastReview)],
          limit: count,
        })
      : mode === 'hardest'
        ? await db.query.cards.findMany({
            with: { set: true },
            where: baseWhere,
            orderBy: [desc(cards.difficulty), desc(cards.lastReview)],
            limit: count,
          })
        : mode === 'most_lapsed'
          ? await db.query.cards.findMany({
              with: { set: true },
              where: baseWhere,
              orderBy: [desc(cards.lapses), desc(cards.lastReview)],
              limit: count,
            })
          : mode === 'due_soon'
            ? await db.query.cards.findMany({
                with: { set: true },
                where: baseWhere,
                orderBy: [asc(cards.due)],
                limit: count,
              })
            : mode === 'random'
              ? await db.query.cards.findMany({
                  with: { set: true },
                  where: baseWhere,
                  orderBy: sql`RANDOM()`,
                  limit: count,
                })
              : await getCardsForRecentLapses(ownedSetIds, now, count);

  if (mode === 'recent_lapses' && drillCards.length === 0) {
    drillCards = await db.query.cards.findMany({
      with: { set: true },
      where: baseWhere,
      orderBy: [asc(cards.stability), asc(cards.lastReview)],
      limit: count,
    });
  }

  return drillCards.map((card) => toStudyQueueItem(card, now, settings.fsrsWeights, card.set.title));
}

export async function getSetStudyStats(setId: string) {
  const userId = await requireUserId();
  const [ownedSet, settings] = await Promise.all([
    db.query.sets.findFirst({
      where: and(eq(sets.id, setId), eq(sets.userId, userId)),
      columns: { id: true },
    }),
    ensureUserSettings(userId),
  ]);

  if (!ownedSet) {
    throw new Error('Set not found');
  }

  const now = new Date();
  const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);
  const [rawStats, failsPerSet, failLimits] = await Promise.all([
    computeSetStudyStats(setId),
    getNewCardFailsPerSet([setId], studyDay.start, studyDay.end),
    getNewCardFailLimits([setId], settings.maxNewCardFailsPerDay),
  ]);
  const fails = failsPerSet.get(setId) ?? 0;
  const limit = failLimits.get(setId) ?? settings.maxNewCardFailsPerDay;
  return applyFailLimitToDueCount(rawStats, fails, limit);
}

export async function getDrillModes() {
  return DRILL_MODES;
}
