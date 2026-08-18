// Dashboard-managed variables and secrets are intentionally absent from wrangler.jsonc.
interface Env {
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  APP_ORIGIN: string;
  ADMIN_EMAILS: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_TOKEN: string;
  CLOUDFLARE_AI_MODEL: string;
  GOOGLE_TRANSLATE_API_KEY: string;
}
