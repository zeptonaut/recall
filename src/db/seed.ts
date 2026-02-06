import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/** Seed the database with a default user, sample sets, cards, and attempts */
async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log('Seeding database...');

  // Default user
  const [user] = await db.insert(schema.users).values({
    name: 'Charlie',
    email: 'charlie@example.com',
  }).returning();
  console.log('Created user:', user.name);

  // Set 1 - Basic Biology
  const [biologySet] = await db.insert(schema.sets).values({
    userId: user.id,
    title: 'Basic Biology',
    description: 'Fundamental biology concepts',
  }).returning();

  const biologyCards = await db.insert(schema.cards).values([
    { setId: biologySet.id, prompt: 'What organelle is the powerhouse of the cell?', response: 'Mitochondria', position: 0 },
    { setId: biologySet.id, prompt: 'What molecule carries genetic information?', response: 'DNA', position: 1 },
    { setId: biologySet.id, prompt: 'What is the process by which plants make food?', response: 'Photosynthesis', position: 2 },
    { setId: biologySet.id, prompt: 'What is the basic unit of life?', response: 'Cell', position: 3 },
    { setId: biologySet.id, prompt: 'What gas do humans exhale?', response: 'Carbon dioxide', position: 4 },
  ]).returning();
  console.log('Created set:', biologySet.title, `(${biologyCards.length} cards)`);

  // Set 2 - Simple Addition
  const [additionSet] = await db.insert(schema.sets).values({
    userId: user.id,
    title: 'Simple Addition',
    description: 'Basic addition practice',
  }).returning();

  const additionCards = await db.insert(schema.cards).values([
    { setId: additionSet.id, prompt: '7 + 5', response: '12', position: 0 },
    { setId: additionSet.id, prompt: '13 + 9', response: '22', position: 1 },
    { setId: additionSet.id, prompt: '25 + 17', response: '42', position: 2 },
    { setId: additionSet.id, prompt: '48 + 36', response: '84', position: 3 },
    { setId: additionSet.id, prompt: '99 + 1', response: '100', position: 4 },
  ]).returning();
  console.log('Created set:', additionSet.title, `(${additionCards.length} cards)`);

  // Sample card_attempts - Biology cards (~3 attempts each, spread over last week)
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const bioAttempts = biologyCards.flatMap((card) => [
    { cardId: card.id, userId: user.id, isCorrect: false, difficulty: null, createdAt: new Date(now - 7 * day) },
    { cardId: card.id, userId: user.id, isCorrect: true, difficulty: 2, createdAt: new Date(now - 4 * day) },
    { cardId: card.id, userId: user.id, isCorrect: true, difficulty: 3, createdAt: new Date(now - 1 * day) },
  ]);

  // Sample card_attempts - Addition cards (~2 attempts each, mostly correct)
  const addAttempts = additionCards.flatMap((card) => [
    { cardId: card.id, userId: user.id, isCorrect: true, difficulty: 3, createdAt: new Date(now - 3 * day) },
    { cardId: card.id, userId: user.id, isCorrect: true, difficulty: 4, createdAt: new Date(now - 1 * day) },
  ]);

  await db.insert(schema.cardAttempts).values([...bioAttempts, ...addAttempts]);
  console.log(`Created ${bioAttempts.length + addAttempts.length} card attempts`);

  console.log('Seeding complete!');
}

seed().catch(console.error);
