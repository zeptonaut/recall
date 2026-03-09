import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { createSqlClient } from './client';
import { loadEnvironment } from './env';

loadEnvironment();

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type SeedCard = {
  prompt: string;
  response: string;
  position: number;
  state?: 'new' | 'learning' | 'review' | 'relearning';
  stability?: number;
  difficulty?: number;
  elapsedDays?: number;
  scheduledDays?: number;
  learningSteps?: number;
  reps?: number;
  lapses?: number;
  due?: Date;
  lastReview?: Date | null;
  reviewLog?: {
    rating: 1 | 2 | 3 | 4;
    stateBefore: 'new' | 'learning' | 'review' | 'relearning';
    stateAfter: 'new' | 'learning' | 'review' | 'relearning';
    reviewedAt: Date;
    elapsedDays: number;
    scheduledDays: number;
  };
};

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

function daysFromNow(now: Date, days: number) {
  return new Date(now.getTime() + days * DAY_MS);
}

async function seedSet(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userId: string,
  config: {
    title: string;
    description: string;
    cards: SeedCard[];
  }
) {
  const [set] = await db
    .insert(schema.sets)
    .values({
      userId,
      title: config.title,
      description: config.description,
    })
    .returning();

  const insertedCards = await db
    .insert(schema.cards)
    .values(
      config.cards.map((card) => ({
        setId: set.id,
        prompt: card.prompt,
        response: card.response,
        position: card.position,
        state: card.state,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsedDays,
        scheduledDays: card.scheduledDays,
        learningSteps: card.learningSteps,
        reps: card.reps,
        lapses: card.lapses,
        due: card.due,
        lastReview: card.lastReview,
      }))
    )
    .returning();

  const reviewLogs = insertedCards
    .map((card, index) => {
      const reviewLog = config.cards[index]?.reviewLog;
      if (!reviewLog) return null;
      return {
        cardId: card.id,
        rating: reviewLog.rating,
        stateBefore: reviewLog.stateBefore,
        stateAfter: reviewLog.stateAfter,
        stabilityBefore: null,
        stabilityAfter: card.stability,
        difficultyBefore: null,
        difficultyAfter: card.difficulty,
        elapsedDays: reviewLog.elapsedDays,
        scheduledDays: reviewLog.scheduledDays,
        reviewedAt: reviewLog.reviewedAt,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (reviewLogs.length > 0) {
    await db.insert(schema.reviewLogs).values(reviewLogs);
  }

  console.log('Created set:', set.title, `(${insertedCards.length} cards)`);
}

/** Seed the database with a default user, sample sets, cards, and default settings. */
async function seed() {
  const client = createSqlClient();
  const db = drizzle({ client, schema });

  try {
    console.log('Seeding database...');

    const [user] = await db
      .insert(schema.users)
      .values({
        name: 'Charlie',
        email: 'charlie@example.com',
      })
      .returning();
    console.log('Created user:', user.name);

    await db.insert(schema.userSettings).values({});
    console.log('Created default study settings');

    const now = new Date();

    await seedSet(db, user.id, {
      title: 'Basic Biology',
      description: 'Fundamental biology concepts with a mix of new, learning, and mature cards.',
      cards: [
        {
          prompt: 'What organelle is the powerhouse of the cell?',
          response: 'Mitochondria',
          position: 0,
        },
        {
          prompt: 'What molecule carries genetic information?',
          response: 'DNA',
          position: 1,
          state: 'learning',
          stability: 1.6,
          difficulty: 6.8,
          elapsedDays: 0,
          scheduledDays: 0,
          learningSteps: 1,
          reps: 1,
          lapses: 0,
          due: new Date(now.getTime() - 30 * 60_000),
          lastReview: new Date(now.getTime() - 90 * 60_000),
          reviewLog: {
            rating: 3,
            stateBefore: 'new',
            stateAfter: 'learning',
            reviewedAt: new Date(now.getTime() - 90 * 60_000),
            elapsedDays: 0,
            scheduledDays: 0,
          },
        },
        {
          prompt: 'What is the process by which plants make food?',
          response: 'Photosynthesis',
          position: 2,
          state: 'review',
          stability: 8.2,
          difficulty: 5.7,
          elapsedDays: 4,
          scheduledDays: 6,
          learningSteps: 0,
          reps: 4,
          lapses: 1,
          due: daysFromNow(now, 2),
          lastReview: daysAgo(now, 4),
          reviewLog: {
            rating: 3,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 4),
            elapsedDays: 4,
            scheduledDays: 6,
          },
        },
        {
          prompt: 'What is the basic unit of life?',
          response: 'Cell',
          position: 3,
          state: 'review',
          stability: 27,
          difficulty: 4.1,
          elapsedDays: 10,
          scheduledDays: 24,
          learningSteps: 0,
          reps: 11,
          lapses: 0,
          due: daysFromNow(now, 14),
          lastReview: daysAgo(now, 10),
          reviewLog: {
            rating: 4,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 10),
            elapsedDays: 10,
            scheduledDays: 24,
          },
        },
        {
          prompt: 'What gas do humans exhale?',
          response: 'Carbon dioxide',
          position: 4,
          state: 'relearning',
          stability: 2.1,
          difficulty: 7.9,
          elapsedDays: 1,
          scheduledDays: 1,
          learningSteps: 1,
          reps: 7,
          lapses: 3,
          due: new Date(now.getTime() - 2 * HOUR_MS),
          lastReview: daysAgo(now, 1),
          reviewLog: {
            rating: 1,
            stateBefore: 'review',
            stateAfter: 'relearning',
            reviewedAt: daysAgo(now, 1),
            elapsedDays: 1,
            scheduledDays: 1,
          },
        },
        {
          prompt: 'Which blood cells carry oxygen?',
          response: 'Red blood cells',
          position: 5,
          state: 'review',
          stability: 5.4,
          difficulty: 6.2,
          elapsedDays: 2,
          scheduledDays: 4,
          learningSteps: 0,
          reps: 3,
          lapses: 0,
          due: new Date(now.getTime() - 6 * HOUR_MS),
          lastReview: daysAgo(now, 2),
          reviewLog: {
            rating: 2,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 2),
            elapsedDays: 2,
            scheduledDays: 4,
          },
        },
      ],
    });

    await seedSet(db, user.id, {
      title: 'Simple Addition',
      description: 'Basic addition practice with varied review history.',
      cards: [
        {
          prompt: '7 + 5',
          response: '12',
          position: 0,
        },
        {
          prompt: '13 + 9',
          response: '22',
          position: 1,
          state: 'learning',
          stability: 2.4,
          difficulty: 6.1,
          elapsedDays: 0,
          scheduledDays: 0,
          learningSteps: 2,
          reps: 2,
          lapses: 0,
          due: new Date(now.getTime() - 10 * 60_000),
          lastReview: new Date(now.getTime() - 50 * 60_000),
          reviewLog: {
            rating: 3,
            stateBefore: 'learning',
            stateAfter: 'learning',
            reviewedAt: new Date(now.getTime() - 50 * 60_000),
            elapsedDays: 0,
            scheduledDays: 0,
          },
        },
        {
          prompt: '25 + 17',
          response: '42',
          position: 2,
          state: 'review',
          stability: 6.8,
          difficulty: 5.4,
          elapsedDays: 3,
          scheduledDays: 5,
          learningSteps: 0,
          reps: 5,
          lapses: 1,
          due: daysFromNow(now, 1),
          lastReview: daysAgo(now, 3),
          reviewLog: {
            rating: 3,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 3),
            elapsedDays: 3,
            scheduledDays: 5,
          },
        },
        {
          prompt: '48 + 36',
          response: '84',
          position: 3,
          state: 'review',
          stability: 32,
          difficulty: 3.8,
          elapsedDays: 15,
          scheduledDays: 30,
          learningSteps: 0,
          reps: 16,
          lapses: 0,
          due: daysFromNow(now, 20),
          lastReview: daysAgo(now, 15),
          reviewLog: {
            rating: 4,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 15),
            elapsedDays: 15,
            scheduledDays: 30,
          },
        },
        {
          prompt: '99 + 1',
          response: '100',
          position: 4,
          state: 'relearning',
          stability: 1.3,
          difficulty: 8.1,
          elapsedDays: 0,
          scheduledDays: 1,
          learningSteps: 1,
          reps: 9,
          lapses: 4,
          due: new Date(now.getTime() - HOUR_MS),
          lastReview: new Date(now.getTime() - 5 * HOUR_MS),
          reviewLog: {
            rating: 1,
            stateBefore: 'review',
            stateAfter: 'relearning',
            reviewedAt: new Date(now.getTime() - 5 * HOUR_MS),
            elapsedDays: 0,
            scheduledDays: 1,
          },
        },
        {
          prompt: '125 + 75',
          response: '200',
          position: 5,
          state: 'review',
          stability: 11.5,
          difficulty: 4.9,
          elapsedDays: 6,
          scheduledDays: 10,
          learningSteps: 0,
          reps: 7,
          lapses: 1,
          due: daysFromNow(now, 4),
          lastReview: daysAgo(now, 6),
          reviewLog: {
            rating: 3,
            stateBefore: 'review',
            stateAfter: 'review',
            reviewedAt: daysAgo(now, 6),
            elapsedDays: 6,
            scheduledDays: 10,
          },
        },
      ],
    });

    console.log('Seeding complete!');
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
