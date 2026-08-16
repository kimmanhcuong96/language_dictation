# Listening lesson import

The listening library stores metadata and sentence timestamps in Neon and keeps one original audio object per lesson in the `LISTENING_AUDIO` R2 bucket.

## Setup

1. Create the configured bucket: `pnpm exec wrangler r2 bucket create me2listen-audio`.
2. Apply database migrations with `pnpm db:migrate` in the intended environment.
3. Set `DATABASE_URL`, Google OAuth secrets, `ADMIN_EMAILS`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_AI_TOKEN` as Worker secrets or environment variables. The AI token needs Workers AI Read/Write permissions. Do not commit their values.
4. Deploy the Worker. The `LISTENING_AUDIO` binding is declared in `wrangler.jsonc`; Workers AI is called through the Cloudflare REST API.

## Import and publish

1. Sign in with an email listed in `ADMIN_EMAILS` and open `#/admin/listening` from the account menu.
2. Select the English section, enter lesson metadata, choose an MP3/WAV/M4A/OGG/WebM audio file, and paste the canonical transcript with one sentence per line.
3. Choose **Process**. The Worker uploads the original file once, uses Workers AI transcription only to align timestamps, and creates an unpublished draft. The supplied transcript remains unchanged and authoritative.
4. Play each generated segment and correct its text or `start_ms`/`end_ms` values. Timestamps must be ordered, non-overlapping, positive, and within the lesson duration.
5. Choose **Publish**. Only published lessons appear in public APIs and the English library.

Imports are limited to 20 MB, 1 hour, 1,000 sentences, and 50,000 transcript characters. A failed alignment remains recorded as a failed import job; retry by starting a new import.
