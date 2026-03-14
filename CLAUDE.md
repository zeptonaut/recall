# Recall

Spaced-repetition flashcard app built with Next.js, Drizzle ORM, and PostgreSQL.

## Development

- Dev server: `npm run dev` → http://localhost:4321
- Database reset + seed: `npm run db:reset && npm run db:seed`
- Readonly production DB access: `scripts/recall-db "SELECT ..."` (uses `$RECALL_READONLY` from `~/.zshrc`)

## Testing

- Run all tests: `yarn test`
- Run a single test file: `yarn test:file src/lib/study-queue.test.ts`
- Tests use Node's built-in test runner with `tsx` and hit a real PostgreSQL database (`recall_test` on port 5433)
- Integration tests that use the DB must `import '@/lib/test-setup'` as their first import to load env before `@/db`
- Tests must call `closeDb()` from `@/db` in their `after()` hook to exit cleanly
