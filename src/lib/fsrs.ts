import type { InferSelectModel } from 'drizzle-orm';
import {
  createEmptyCard,
  forgetting_curve,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRSParameters,
} from 'ts-fsrs';
import { cards, userSettings, cardStateEnum } from '@/db/schema';

export type CardState = (typeof cardStateEnum.enumValues)[number];
export type ReviewType = 'scheduled' | 'drill';
export type DrillMode = 'weakest' | 'recent_lapses' | 'most_lapsed' | 'hardest' | 'due_soon' | 'random';
export type MasteryTier = 'new' | 'learning' | 'familiar' | 'mastered';

export type CardRecord = InferSelectModel<typeof cards>;
export type UserSettingsRecord = InferSelectModel<typeof userSettings>;

export interface ReviewPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

export interface StudyQueueItem {
  id: string;
  prompt: string;
  response: string;
  due: Date;
  state: CardState;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
  mastery: MasteryTier;
  retrievability: number;
}

export interface StudyQueueCounts {
  learning: number;
  review: number;
  new: number;
  remainingReviewBudget: number;
  remainingNewBudget: number;
}

export interface StudyQueueResult {
  cards: StudyQueueItem[];
  counts: StudyQueueCounts;
  studyDate: string;
}

const cardStateToFsrsState: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const fsrsStateToCardState: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

export const DRILL_MODES: { id: DrillMode; label: string; description: string }[] = [
  { id: 'weakest', label: 'Weakest', description: 'Lowest stability first' },
  { id: 'recent_lapses', label: 'Recent Lapses', description: 'Scheduled Again ratings from the last week' },
  { id: 'most_lapsed', label: 'Most Lapsed', description: 'Cards with the most failures' },
  { id: 'hardest', label: 'Hardest', description: 'Highest FSRS difficulty first' },
  { id: 'due_soon', label: 'Due Soon', description: 'Cards closest to their next due date' },
  { id: 'random', label: 'Random', description: 'A random practice set' },
];

export function toFsrsCard(card: CardRecord): FsrsCard {
  if (card.state === 'new' && card.reps === 0 && card.learningSteps === 0 && !card.lastReview) {
    return createEmptyCard(card.due);
  }

  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: cardStateToFsrsState[card.state],
    last_review: card.lastReview ?? undefined,
  };
}

export function fromFsrsCard(card: FsrsCard) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: fsrsStateToCardState[card.state],
    lastReview: card.last_review ?? null,
  };
}

export function getMasteryTier(card: Pick<CardRecord, 'state' | 'reps' | 'stability' | 'lapses' | 'difficulty'>): MasteryTier {
  if (card.state === 'new' || card.reps === 0) return 'new';
  if (card.state === 'learning' || card.state === 'relearning' || card.stability < 3) return 'learning';
  if (card.stability >= 21 && card.lapses <= 3 && card.difficulty < 7) return 'mastered';
  return 'familiar';
}

export function getRetrievability(
  card: Pick<CardRecord, 'state' | 'lastReview' | 'stability'>,
  now: Date,
  weights?: number[] | null
) {
  if (card.state === 'new' || !card.lastReview || card.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (now.getTime() - card.lastReview.getTime()) / 86_400_000);
  return weights ? forgetting_curve(weights, elapsedDays, card.stability) : forgetting_curve(0.1542, elapsedDays, card.stability);
}

export function getFsrsParameters(settings: UserSettingsRecord): FSRSParameters {
  return generatorParameters({
    request_retention: settings.desiredRetention,
    maximum_interval: settings.maximumInterval,
    enable_fuzz: settings.enableFuzz,
    enable_short_term: settings.enableShortTerm,
    w: settings.fsrsWeights ?? undefined,
    learning_steps: settings.learningSteps as `${number}${'m' | 'h' | 'd'}`[],
    relearning_steps: settings.relearningSteps as `${number}${'m' | 'h' | 'd'}`[],
  });
}

export function createFsrsScheduler(settings: UserSettingsRecord) {
  return fsrs(getFsrsParameters(settings));
}

export function stateToString(state: State): CardState {
  return fsrsStateToCardState[state];
}

export function ratingFromNumber(rating: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  return rating;
}

export function formatInterval(target: Date, now: Date) {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 60) return `${Math.max(1, minutes)}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.round(days / 30);
  if (months < 24) return `${months}mo`;

  const years = Math.round(months / 12);
  return `${years}y`;
}

export function buildReviewPreview(card: CardRecord, settings: UserSettingsRecord, now: Date): ReviewPreview {
  const preview = createFsrsScheduler(settings).repeat(toFsrsCard(card), now);
  return {
    again: formatInterval(preview[Rating.Again].card.due, now),
    hard: formatInterval(preview[Rating.Hard].card.due, now),
    good: formatInterval(preview[Rating.Good].card.due, now),
    easy: formatInterval(preview[Rating.Easy].card.due, now),
  };
}

export function toStudyQueueItem(card: CardRecord, now: Date, weights?: number[] | null): StudyQueueItem {
  return {
    id: card.id,
    prompt: card.prompt,
    response: card.response,
    due: card.due,
    state: card.state,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.lastReview ?? null,
    mastery: getMasteryTier(card),
    retrievability: getRetrievability(card, now, weights),
  };
}

function getOffsetParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return parts.timeZoneName ?? 'GMT+00:00';
}

function parseOffsetString(offset: string) {
  if (offset === 'GMT' || offset === 'UTC') return 0;

  const match = offset.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;

  const [, sign, hour, minute] = match;
  const totalMinutes = Number(hour) * 60 + Number(minute);
  return (sign === '+' ? 1 : -1) * totalMinutes * 60_000;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  return parseOffsetString(getOffsetParts(date, timeZone));
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstPass, timeZone);
  if (firstOffset === secondOffset) return firstPass;
  return new Date(utcGuess.getTime() - secondOffset);
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function shiftUtcDate(base: Date, amount: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function formatStudyDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getStudyDayWindow(now: Date, timeZone: string, newDayStartHour: number) {
  const local = getZonedParts(now, timeZone);
  let studyDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  if (local.hour < newDayStartHour) {
    studyDate = shiftUtcDate(studyDate, -1);
  }

  const start = zonedDateTimeToUtc(
    studyDate.getUTCFullYear(),
    studyDate.getUTCMonth() + 1,
    studyDate.getUTCDate(),
    newDayStartHour,
    0,
    0,
    timeZone
  );
  const endStudyDate = shiftUtcDate(studyDate, 1);
  const end = zonedDateTimeToUtc(
    endStudyDate.getUTCFullYear(),
    endStudyDate.getUTCMonth() + 1,
    endStudyDate.getUTCDate(),
    newDayStartHour,
    0,
    0,
    timeZone
  );

  return {
    key: formatStudyDate(studyDate),
    start,
    end,
  };
}
