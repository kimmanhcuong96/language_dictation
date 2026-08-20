# YouTube lesson import

## Deployment order

Use `pnpm cf:deploy` for production deployment. This command applies every
pending PostgreSQL migration before building and deploying the Worker, so a
Worker version that queries the YouTube media columns cannot become active
before migration `0015_youtube_lessons.sql`.

`pnpm cf:deploy:dry` remains non-mutating and does not apply database
migrations.

Migration `0014_lesson_filename_ordering.sql` records every repaired legacy
order in `listening_lesson_order_migration_audit`. Operators can inspect the
original order, assigned order, reason, and migration timestamp after rollout.

## Optional proper names

Both Audio and YouTube imports may include `<lesson>.name.json`. `position` is
the one-based sentence position produced after parsing the SRT, not a physical
line number in the file.

```json
{
  "sentences": [
    {
      "position": 1,
      "names": [
        "Marie Curie",
        "John"
      ]
    }
  ]
}
```

Each `names` entry is a non-empty string. When the file is present, every
imported sentence receives an explicit
`metadata.properNames` array; omitted positions receive an empty array and do
not fall back to heuristic detection.

YouTube lessons reuse the existing SRT sentence model, translation parser, batch validation, and per-lesson database transaction. The Worker stores only the 11-character YouTube video ID; it never downloads, proxies, or writes YouTube media to R2.

## Single import

In Admin → Lesson Import → Single lesson, choose Audio or YouTube before entering source-specific fields. Both choices are normalized into a one-lesson package and pass through the existing preview/confirmation pipeline.

## Batch format

A YouTube group contains:

```text
<name>.link.txt       required; one supported HTTPS YouTube URL
<name>.srt            required; canonical text and timing
<name>.vi.txt         optional
<name>.zh.txt         optional
<name>.ja.txt         optional
<name>.ko.txt         optional
```

`.link.txt` is detected before generic translation TXT parsing. Groups are validated independently, so an invalid group remains visible without blocking valid groups. Existing `NN_<name>.mp3` + `NN_<name>.srt` audio packages are unchanged. A YouTube basename with an `NN_` prefix uses that order; otherwise the importer assigns the first free `01`–`99` slot in deterministic basename order.

## Stored model

Audio lessons are backfilled to `template_type = 'audio'` and `media_type = 'r2_audio'`. YouTube lessons store `template_type = 'media'`, `media_type = 'youtube'`, and `youtube_video_id`. Apply `db/migrations/0015_youtube_lessons.sql` before deploying the corresponding Worker.

The client selects the renderer from `templateType`. `MediaLessonTemplate` owns one YouTube IFrame Player instance per mounted lesson and uses a new playback-session token for every sentence request. It polls the video timeline every 100 ms and pauses at the unchanged SRT end time.
