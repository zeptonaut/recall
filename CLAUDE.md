# Recall

Spaced-repetition flashcard app built with Next.js, Drizzle ORM, and PostgreSQL.

## Development

- Dev server: `npm run dev` → http://localhost:4321
- Database reset + seed: `npm run db:reset && npm run db:seed`
- Readonly DB access: `scripts/recall-db "SELECT ..."` (uses `$RECALL_READONLY` from `~/.zshrc`)
