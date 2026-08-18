# Listening lesson import

The listening library stores metadata and sentence timestamps in Neon and keeps one original audio object per lesson in the `LISTENING_AUDIO` R2 bucket.

## Setup

1. Create the configured bucket: `pnpm exec wrangler r2 bucket create me2listen-audio`.
2. Apply database migrations with `pnpm db:migrate` in the intended environment.
3. Set `DATABASE_URL`, Google OAuth secrets, `ADMIN_EMAILS`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN`, and `CLOUDFLARE_AI_MODEL` as Worker secrets or environment variables. All three Cloudflare AI variables are required; the AI token needs Workers AI Read/Write permissions. Do not commit their values.
4. Deploy the Worker. The `LISTENING_AUDIO` binding is declared in `wrangler.jsonc`; Workers AI is called through the Cloudflare REST API.

## Import and publish

Sign in with an email listed in `ADMIN_EMAILS` and open `#/admin/listening`. The page has two separate modes and localizes its UI/status/error messages from the selected interface locale; imported learning content is never translated.

### AI Import

1. Select the target section and level, enter the title, choose an audio file, and paste the canonical transcript with one sentence per line.
2. Choose **Process with AI**. Workers AI is used only to map timestamps to the submitted lines. Speech present in the audio but absent from the transcript is ignored, and recognized speech never replaces the Admin's text.
3. Play each generated segment and correct its text or `start_ms`/`end_ms` values.
4. Choose **Publish**. The draft is public only after this explicit review step.

AI imports are limited to 20 MB, 1 hour, 1,000 sentences, and 50,000 transcript characters. Alignment failures create no database or R2 resources. Persistence failures remove the lesson, sentence, import-job, and audio resources so the generated slug can be retried.

### Non-AI Import

Choose one or more matching `<lesson-name>.mp3`/`<lesson-name>.srt` pairs, or one ZIP containing such pairs. Direct files and ZIPs normalize into the same batch pipeline, including a batch of one. Validate the whole input, inspect the per-item preview, then explicitly confirm the valid lessons. Valid items publish independently; invalid/failed items remain visible and do not stop the batch. Resume and retry skip completed items.

Apply `db/migrations/0008_batch_lesson_import.sql` before deploying this mode. The full contract is in [LESSON_IMPORT_SPEC.md](./LESSON_IMPORT_SPEC.md), with operating steps in [NON_AI_IMPORT.md](./NON_AI_IMPORT.md).
