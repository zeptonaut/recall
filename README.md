# Recall

Recall is a Next.js spaced-repetition app backed by Postgres via Drizzle.

## Setup

### 1. Install dependencies

```bash
brew bundle
yarn install
```

The Brewfile installs `postgresql@17`.

### 2. Start Postgres

```bash
brew services start postgresql@17
```

### 3. Create separate development and test databases

```bash
createdb recall_development
createdb recall_test
```

### 4. Configure environment files

Development uses `.env.local`. Test uses `.env.test.local`.

```bash
cat <<'EOF' > .env.local
DATABASE_URL=postgres://localhost:5432/recall_development
EOF

cat <<'EOF' > .env.test.local
DATABASE_URL=postgres://localhost:5432/recall_test
EOF
```

This follows the same shape as Rails:

- `development` and `test` have different databases.
- app code always reads `DATABASE_URL`.
- the environment decides which database that means.
- `.env.local` is ignored for `test`, so tests cannot silently reuse the development database.

### 5. Run migrations

```bash
yarn db:migrate
```

`yarn db:migrate` now runs development and test migrations, Rails-style.
If you only want the development database, use `yarn db:migrate:dev`.

To fully rebuild both local databases from scratch and rerun all migrations:

```bash
yarn db:reset
```

`yarn db:reset` resets development and test, then runs migrations for both.
It refuses to run against non-local hosts.

### 6. Seed development data

```bash
yarn db:seed
```

## Running the app

```bash
yarn dev
```

The app runs on [http://localhost:4321](http://localhost:4321).

## Tests

```bash
yarn test
```

The test runner now forces `NODE_ENV=test`, and DB scripts have explicit test variants:

- `yarn db:migrate`
- `yarn db:migrate:test`
- `yarn db:migrate:dev`
- `yarn db:reset`
- `yarn db:reset:test`
- `yarn db:reset:dev`
- `yarn db:studio:test`
- `yarn db:seed:test`

## Environment loading

Non-Next scripts in this repo now use the same env file precedence as Next:

- `.env`
- `.env.development` or `.env.test`
- `.env.local` except in `test`
- `.env.development.local` or `.env.test.local`

That gives you the Rails-style behavior you asked for: local development can point at one database, tests at another, and production can use its own deploy-time `DATABASE_URL`.
