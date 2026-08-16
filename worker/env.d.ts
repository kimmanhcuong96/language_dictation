// Dashboard secrets are not discoverable by `wrangler types`; this augments only those secret bindings.
interface Env {
  DATABASE_URL: string;
  ADMIN_EMAILS: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_TOKEN: string;
  CLOUDFLARE_AI_MODEL: string;
}
