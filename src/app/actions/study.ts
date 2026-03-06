'use server';

import { and, asc, desc, eq, lte, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { cards, reviewLogs } from '@/db/schema';
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
} from '@/lib/fsrs';
import {
  computeSetStudyStats,
  ensureUserSettings,
  getCardsForRecentLapses,
  getOrCreateDailyStats,
  incrementDailyStats,
} from '@/lib/study-store';

export async function getDueStudyQueue(setId: string) {
  const settings = await ensureUserSettings();
  const now = new Date();
  const studyDay = getStudyDayWindow(now, settings.timezone, settings.newDayStartHour);
  const stats = await getOrCreateDailyStats(studyDay.key);

  const remainingNewBudget = Math.max(0, settings.maxNewCardsPerDay - stats.newCardsCount);
  const remainingReviewBudget = Math.max(0, settings.maxReviewsPerDay - stats.reviewCount);

  const learning = await db.query.cards.findMany({
    where: and(
      eq(cards.setId, setId),
      sql`${cards.state} in ('learning', 'relearning')`,
      lte(cards.due, now)
    ),
    orderBy: [asc(cards.due)],
  });

  const reviews = await db.query.cards.findMany({
    where: and(eq(cards.setId, setId), eq(cards.state, 'review'), lte(cards.due, studyDay.end)),
    orderBy: [asc(cards.due)],
  });

  const newCards = remainingNewBudget
    ? await db.query.cards.findMany({
        where: and(eq(cards.setId, setId), eq(cards.state, 'new')),
        orderBy: [asc(cards.createdAt)],
        limit: remainingNewBudget,
      })
    : [];

  const queue = [...learning, ...reviews, ...newCards].slice(0, remainingReviewBudget);

  return {
    cards: queue.map((card) => toStudyQueueItem(card, now, settings.fsrsWeights)),
    counts: {
      learning: learning.length,
      review: reviews.length,
      new: newCards.length,
      remainingReviewBudget,
      remainingNewBudget,
    },
    studyDate: studyDay.key,
  };
}

export async function getReviewPreview(cardId: string, reviewType: ReviewType) {
  void reviewType;
  const [card, settings] = await Promise.all([
    db.query.cards.findFirst({ where: eq(cards.id, cardId) }),
    ensureUserSettings(),
  ]);

  if (!card) {
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
  const [card, settings] = await Promise.all([
    db.query.cards.findFirst({ where: eq(cards.id, input.cardId) }),
    ensureUserSettings(),
  ]);

  if (!card) {
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
    await incrementDailyStats(studyDay.key, {
      reviewCount: 1,
      newCardsCount: card.state === 'new' ? 1 : 0,
    });

    revalidatePath('/');
    revalidatePath(`/sets/${card.setId}`);
    revalidatePath(`/sets/${card.setId}/study`);
  }

  return {
    reviewType: input.reviewType,
    card: input.reviewType === 'scheduled' ? toStudyQueueItem({ ...card, ...nextCardState }, now, settings.fsrsWeights) : toStudyQueueItem(card, now, settings.fsrsWeights),
  };
}

export async function getDrillQueue(setId: string, count = 10, mode: DrillMode = 'weakest') {
  const dueQueue = await getDueStudyQueue(setId);
  if (dueQueue.cards.length > 0) {
    return [];
  }

  const settings = await ensureUserSettings();
  const now = new Date();

  const baseWhere = and(eq(cards.setId, setId), ne(cards.state, 'new'));
  let drillCards =
    mode === 'weakest'
      ? await db.query.cards.findMany({
          where: baseWhere,
          orderBy: [asc(cards.stability), asc(cards.lastReview)],
          limit: count,
        })
      : mode === 'hardest'
        ? await db.query.cards.findMany({
            where: baseWhere,
            orderBy: [desc(cards.difficulty), desc(cards.lastReview)],
            limit: count,
          })
        : mode === 'most_lapsed'
          ? await db.query.cards.findMany({
              where: baseWhere,
              orderBy: [desc(cards.lapses), desc(cards.lastReview)],
              limit: count,
            })
          : mode === 'due_soon'
            ? await db.query.cards.findMany({
                where: baseWhere,
                orderBy: [asc(cards.due)],
                limit: count,
              })
            : mode === 'random'
              ? await db.query.cards.findMany({
                  where: baseWhere,
                  orderBy: sql`RANDOM()`,
                  limit: count,
                })
              : (await getCardsForRecentLapses(setId, now, count)).map((row) => row.card);

  if (mode === 'recent_lapses' && drillCards.length === 0) {
    drillCards = await db.query.cards.findMany({
      where: baseWhere,
      orderBy: [asc(cards.stability), asc(cards.lastReview)],
      limit: count,
    });
  }

  return drillCards.map((card) => toStudyQueueItem(card, now, settings.fsrsWeights));
}

export async function getSetStudyStats(setId: string) {
  const settings = await ensureUserSettings();
  return computeSetStudyStats(setId, settings);
}

export async function getDrillModes() {
  return DRILL_MODES;
}
