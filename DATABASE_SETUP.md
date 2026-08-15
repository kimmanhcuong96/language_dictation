# Neon database configuration

The Worker uses Neon's edge-compatible `@neondatabase/serverless` driver directly over `DATABASE_URL`.

Local development: copy `.dev.vars.example` to `.dev.vars` and set:

```text
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
DATABASE_TOKEN=
```

`DATABASE_TOKEN` is optional and currently not consumed by the PostgreSQL driver. `DATABASE_URL` is the connection string used by the Worker and by the migration runner.

Apply migrations:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require" corepack pnpm db:migrate
```

For Cloudflare production, store credentials as secrets (never in `wrangler.jsonc`):

```bash
wrangler secret put DATABASE_URL
wrangler secret put DATABASE_TOKEN # optional; only needed if a future API client uses it
```

The Neon serverless driver is designed for edge runtimes such as Cloudflare Workers and exposes tagged-template queries plus transactions. See [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver).
