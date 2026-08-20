# Listening lesson import

1. Apply all migrations through `db/migrations/0019_durable_lesson_import_queue.sql`.
2. Configure `DATABASE_URL`, Google OAuth credentials, `ADMIN_EMAILS`, and the `LISTENING_AUDIO` R2 binding.
3. Create the import queues once before the first deployment:

   ```bash
   npx wrangler queues create me2listen-lesson-import
   npx wrangler queues create me2listen-lesson-import-dlq
   ```

4. Deploy the Worker, then open `#/admin/listening` as an administrator.

Confirmed imports run through Cloudflare Queues. Delivery is idempotent and retried; a one-minute outbox recovery trigger republishes jobs if a request is interrupted between the database write and Queue publication. Exhausted infrastructure retries are moved through the dead-letter queue and recorded as failed instead of remaining in `PROCESSING`.

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

Use the **Translation only** tab to add or replace one or more languages on an existing lesson. In this mode the selected lesson and language are authoritative; the TXT filename is irrelevant. Validation is completed before the atomic database transaction begins.
