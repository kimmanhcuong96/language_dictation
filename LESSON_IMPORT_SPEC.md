# Lesson Import Specification

This document defines the implemented Admin import contract. It supplements the general ingestion architecture in `me2listen_spec_en.md`.

## Modes

`#/admin/listening` exposes two independent modes:

- **AI Import** accepts one audio file plus an Admin-authored transcript with one sentence per line. AI may determine timestamps only. The submitted transcript is canonical, audio content absent from that transcript is ignored, and the result remains a draft until the Admin reviews the segments and publishes it.
- **Non-AI Import** accepts prepared MP3 and standard SRT pairs. It never calls AI and publishes each valid lesson after explicit batch confirmation.

## Non-AI contract

Each lesson is exactly `<lesson-name>.mp3` plus `<lesson-name>.srt`. The common basename becomes the lesson title and the existing slug generator derives the slug. SRT must remain standard SRT and must not contain Me2Listen metadata.

Direct multi-file upload and ZIP upload are input adapters for one batch pipeline:

```text
normalize → pair by basename → validate all → preview → confirm → process items
```

A single pair is a batch of one. There is no separate single-import persistence path. Pair matching is case-insensitive after path and extension normalization; original names remain visible in validation errors.

## Validation and execution

Before confirmation, the system validates file support and size, exact pairing, safe ZIP paths, SRT syntax/text/order/overlap, audio duration, generated names/slugs, duplicate slugs in the batch, and conflicts in the target section. Invalid items remain visible and do not block valid items.

Each confirmed valid item progresses through `QUEUED`, `PROCESSING`, and either `COMPLETED` or `FAILED`; pre-confirmation failures use `INVALID`. Completed items are not processed again. Interrupted or failed batches can resume/retry from their persisted batch state.

Lesson, sentence, import-job, and R2 persistence reuse the common listening import service. An item failure rolls back that item's database records and R2 object. Batch staging is deleted after all processable items complete; it is retained while failed items need retry.

## UI and i18n

All import controls, progress labels, statuses, validation messages, and known backend error codes must use the selected UI locale (`vi`, `en`, `zh`, or `ja`). Lesson titles, section names, transcripts, filenames, and slugs are content and must not be translated.

The selected section remains visible during preview. AI review provides per-sentence playback and editable text/start/end timestamps before publish.

## Limits and deployment

- 100 lessons per batch.
- 20 MB per MP3.
- 1 MB per SRT.
- 40 MB per ZIP and 64 MB total extracted size.
- 250 input resources.

Apply `db/migrations/0008_batch_lesson_import.sql` before deploying the batch endpoints.
