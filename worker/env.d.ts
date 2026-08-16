// Dashboard secrets are not discoverable by `wrangler types`; this augments only those secret bindings.
interface Env { DATABASE_URL: string; }
