# Listening lesson import

1. Apply all migrations in `db/migrations/` (`corepack pnpm db:migrate`, or `npx wrangler d1`-style tooling is **not** used — see [DATABASE_SETUP.md](./DATABASE_SETUP.md), the project runs on Neon Postgres). The durable import queue schema lands in `0019_durable_lesson_import_queue.sql`; slug reservation (referenced below) requires the later `0022_lesson_import_slug_reservations.sql`, so do not stop partway through.
2. Configure `DATABASE_URL`, Google OAuth credentials, `ADMIN_EMAILS`, and the `LISTENING_AUDIO` R2 binding (bucket `me2listen-audio` in `wrangler.jsonc`).
3. Create the import queues once before the first deployment:

   ```bash
   npx wrangler queues create me2listen-lesson-import
   ```

4. Deploy the Worker, then open `/admin/listening` as an administrator.

Confirmed imports run through Cloudflare Queues. Delivery is idempotent and retried; a one-minute outbox recovery trigger republishes jobs if a request is interrupted between the database write and Queue publication. Cloudflare automatically creates the configured dead-letter queue. After retries are exhausted, the recovery trigger records the item as failed instead of leaving it in `PROCESSING`.

Lesson packages support direct files or ZIP archives:

```text
01_lesson.mp3
01_lesson.srt
01_lesson.vi.txt   # optional
01_lesson.zh.txt   # optional
01_lesson.ja.txt   # optional
01_lesson.ko.txt   # optional
```

The strict `NN_` prefix (`01`–`99`) supplies the Section-scoped lesson order. The SRT supplies all source sentences and timing. Translation files are UTF-8 TXT with exactly one non-empty physical line per SRT cue. A package without translations remains valid. Validation covers the complete input, then valid lessons are imported independently so invalid or failed items do not block the remainder.

Generated slugs are never overwritten. If a slug is already used, import assigns the first available URL-safe suffix (`lesson`, `lesson-1`, `lesson-2`, and so on). PostgreSQL reservations make this allocation safe when multiple batches or browser tabs import concurrently.

Use the **Translation only** tab to add or replace one or more languages on an existing lesson. In this mode the selected lesson and language are authoritative; the TXT filename is irrelevant. Validation is completed before the atomic database transaction begins.
