import assert from 'node:assert/strict';
import test from 'node:test';
import { State } from 'ts-fsrs';
import {
  buildReviewPreview,
  fromFsrsCard,
  getMasteryTier,
  getRetrievability,
  isScheduledCardDueNow,
  getStudyDayWindow,
  toFsrsCard,
  type CardRecord,
  type UserSettingsRecord,
} from '@/lib/fsrs';

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: 'card-1',
    setId: 'set-1',
    prompt: 'Q',
    response: 'A',
    position: 0,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    due: new Date('2026-03-06T12:00:00Z'),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: null,
    ...overrides,
  };
}

function makeSettings(overrides: Partial<UserSettingsRecord> = {}): UserSettingsRecord {
  return {
    id: 'settings-1',
    desiredRetention: 0.9,
    maximumInterval: 36500,
    enableFuzz: true,
    enableShortTerm: true,
    fsrsWeights: null,
    maxNewCardsPerDay: 20,
    maxReviewsPerDay: 200,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    timezone: 'America/Detroit',
    newDayStartHour: 4,
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  };
}

test('getMasteryTier classifies cards by state and stability', () => {
  assert.equal(getMasteryTier(makeCard()), 'new');
  assert.equal(getMasteryTier(makeCard({ state: 'learning', reps: 1, stability: 1 })), 'learning');
  assert.equal(
    getMasteryTier(makeCard({ state: 'review', reps: 12, stability: 30, lapses: 1, difficulty: 5 })),
    'mastered'
  );
  assert.equal(
    getMasteryTier(makeCard({ state: 'review', reps: 12, stability: 30, lapses: 5, difficulty: 5 })),
    'familiar'
  );
});

test('getRetrievability returns 0 for unseen cards and a bounded probability for reviews', () => {
  assert.equal(getRetrievability(makeCard(), new Date('2026-03-06T12:00:00Z')), 0);

  const retrievability = getRetrievability(
    makeCard({
      state: 'review',
      reps: 5,
      stability: 10,
      lastReview: new Date('2026-03-01T12:00:00Z'),
    }),
    new Date('2026-03-06T12:00:00Z')
  );

  assert.ok(retrievability > 0);
  assert.ok(retrievability < 1);
});

test('getStudyDayWindow respects timezone and new-day cutoff', () => {
  const beforeCutoff = getStudyDayWindow(new Date('2026-01-10T07:30:00Z'), 'America/New_York', 4);
  assert.equal(beforeCutoff.key, '2026-01-09');

  const afterCutoff = getStudyDayWindow(new Date('2026-01-10T10:30:00Z'), 'America/New_York', 4);
  assert.equal(afterCutoff.key, '2026-01-10');
  assert.ok(afterCutoff.end.getTime() > afterCutoff.start.getTime());
});

test('toFsrsCard and fromFsrsCard preserve persisted scheduler state', () => {
  const original = makeCard({
    state: 'review',
    reps: 9,
    lapses: 2,
    stability: 15,
    difficulty: 6,
    elapsedDays: 5,
    scheduledDays: 7,
    learningSteps: 1,
    lastReview: new Date('2026-03-01T12:00:00Z'),
  });

  const fsrsCard = toFsrsCard(original);
  assert.equal(fsrsCard.state, State.Review);

  const roundTrip = fromFsrsCard(fsrsCard);
  assert.equal(roundTrip.state, 'review');
  assert.equal(roundTrip.reps, original.reps);
  assert.equal(roundTrip.learningSteps, original.learningSteps);
});

test('buildReviewPreview returns interval labels for all four ratings', () => {
  const preview = buildReviewPreview(makeCard(), makeSettings(), new Date('2026-03-06T12:00:00Z'));
  assert.ok(preview.again.length > 0);
  assert.ok(preview.hard.length > 0);
  assert.ok(preview.good.length > 0);
  assert.ok(preview.easy.length > 0);
});

test('isScheduledCardDueNow only returns true for non-new cards whose due date has arrived', () => {
  const now = new Date('2026-03-06T12:00:00Z');

  assert.equal(
    isScheduledCardDueNow(makeCard({ state: 'review', due: new Date('2026-03-06T11:59:00Z') }), now),
    true
  );
  assert.equal(
    isScheduledCardDueNow(makeCard({ state: 'review', due: new Date('2026-03-06T12:01:00Z') }), now),
    false
  );
  assert.equal(
    isScheduledCardDueNow(makeCard({ state: 'new', due: new Date('2026-03-06T11:59:00Z') }), now),
    false
  );
});
