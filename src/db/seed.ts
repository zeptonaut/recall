import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { createSqlClient } from './client';
import { loadEnvironment } from './env';

loadEnvironment();

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

    const [biologySet] = await db
      .insert(schema.sets)
      .values({
        userId: user.id,
        title: 'Basic Biology',
        description: 'Fundamental biology concepts',
      })
      .returning();

    const biologyCards = await db
      .insert(schema.cards)
      .values([
        { setId: biologySet.id, prompt: 'What organelle is the powerhouse of the cell?', response: 'Mitochondria', position: 0 },
        { setId: biologySet.id, prompt: 'What molecule carries genetic information?', response: 'DNA', position: 1 },
        { setId: biologySet.id, prompt: 'What is the process by which plants make food?', response: 'Photosynthesis', position: 2 },
        { setId: biologySet.id, prompt: 'What is the basic unit of life?', response: 'Cell', position: 3 },
        { setId: biologySet.id, prompt: 'What gas do humans exhale?', response: 'Carbon dioxide', position: 4 },
      ])
      .returning();
    console.log('Created set:', biologySet.title, `(${biologyCards.length} cards)`);

    const [additionSet] = await db
      .insert(schema.sets)
      .values({
        userId: user.id,
        title: 'Simple Addition',
        description: 'Basic addition practice',
      })
      .returning();

    const additionCards = await db
      .insert(schema.cards)
      .values([
        { setId: additionSet.id, prompt: '7 + 5', response: '12', position: 0 },
        { setId: additionSet.id, prompt: '13 + 9', response: '22', position: 1 },
        { setId: additionSet.id, prompt: '25 + 17', response: '42', position: 2 },
        { setId: additionSet.id, prompt: '48 + 36', response: '84', position: 3 },
        { setId: additionSet.id, prompt: '99 + 1', response: '100', position: 4 },
      ])
      .returning();
    console.log('Created set:', additionSet.title, `(${additionCards.length} cards)`);

    console.log('Seeding complete!');
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
