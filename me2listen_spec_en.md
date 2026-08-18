# ME2 Listening & Dictation — Development Specification

## 1. Objective

Develop the **Listening & Dictation** module on top of the existing codebase.

The application already has:

- A basic frontend/web application.
- Backend running on Cloudflare Workers.
- PostgreSQL running on Neon.
- Working OAuth2 authentication.
- Working user/session/authentication flow.
- Working i18n for the application UI.
- A homepage with 3 language learning platform choices:
  - English
  - Japanese
  - Chinese
- Existing Cloudflare deployment infrastructure.

**Do not rebuild any of the components above.**

Codex must first inspect the existing codebase and identify its conventions, architecture, ORM/query layer, routing, authentication, UI components, and existing infrastructure before implementing the new functionality.

Do not change the current architecture unless there is a strong technical reason to do so.

---

## 2. Current Release Scope

For the current release, only develop resources and learning functionality for:

```text
English
```

Japanese and Chinese currently do **not** require:

```text
lesson resources
dictation-specific normalization
language-specific importers
```

However, the data model and architecture must support adding Japanese and Chinese later without requiring a database redesign.

The content hierarchy is:

```text
Language
    ↓
Category
    ↓
Section
    ↓
Lesson
    ↓
Sentence
```

Example:

```text
English
│
├── Short Stories
│   ├── Section 1
│   │   ├── Lesson 1
│   │   ├── Lesson 2
│   │   └── ...
│   │
│   ├── Section 2
│   └── ...
│
├── Long Listening
│
└── Conversations
```

Additional categories must be addable in the future without changing the database schema:

```text
News
Podcast
IELTS
TOEIC
Business English
Daily English
...
```

Do not hard-code the three initial categories into business logic.

---

## 3. Development Principles

### 3.1. Reuse the Existing Application

Before writing code:

1. Inspect the existing project structure.
2. Identify the existing frontend framework.
3. Identify the routing system.
4. Identify authentication/session handling.
5. Identify the database library or ORM.
6. Identify the migration system.
7. Identify the current i18n system.
8. Identify the Cloudflare Worker entry point.
9. Identify conventions for API/service/repository code.
10. Identify the current design system or UI component library.

Then implement the new module according to the existing project conventions.

### Do not:

- create a new authentication system;
- create another user table if one already exists;
- replace OAuth2;
- replace the i18n system;
- create a separate frontend project;
- create a separate backend;
- migrate from Neon to another database;
- create a duplicate routing system;
- introduce large dependencies when existing dependencies can solve the problem.

---

## 4. Technology Constraints

Continue using:

```text
Frontend       Existing application
Backend        Cloudflare Workers
Database       PostgreSQL / Neon
Audio storage  Cloudflare R2
Auth           Existing OAuth2 implementation
i18n           Existing implementation
```

The application may use:

```text
Cloudflare Queues
Workers AI
```

for content ingestion where appropriate.

Workers AI must **not** be used for runtime dictation answer checking.

---

## 5. Language Model

If the existing codebase already contains a language representation, reuse it.

If not, create:

```sql
languages
```

Minimum fields:

```text
id
code
name
native_name
sort_order
is_enabled
created_at
updated_at
```

Language codes:

```text
en
ja
zh
```

Example:

```text
en | English  | English
ja | Japanese | 日本語
zh | Chinese  | 中文
```

Do not assume `English` is the default language inside domain logic.

Relevant entities must use either:

```text
language_id
```

or:

```text
language_code
```

according to the existing project conventions.

---

## 6. Content Data Model

### 6.1. Categories

One language can contain multiple categories.

Fields:

```text
id
language_id
slug
name
description
sort_order
is_published
created_at
updated_at
```

Constraint:

```text
unique(language_id, slug)
```

Initial English categories:

```text
short-stories
long-listening
conversations
```

Do not use the display name as the identifier.

Use `slug`.

---

## 7. Sections

One category can contain multiple sections.

Fields:

```text
id
category_id
number
title
description
sort_order
is_published
created_at
updated_at
```

Example:

```text
Section 1
Section 2
...
Section N
```

Do not impose a fixed maximum number of sections.

---

## 8. Lessons

One section can contain multiple lessons.

Usually around:

```text
1–20 lessons / section
```

but do not create a database constraint limiting a section to 20 lessons.

Fields:

```text
id
section_id
slug
title
description
level
audio_key
duration_ms
sentence_count
thumbnail_key
metadata
sort_order
is_published
created_at
updated_at
```

`metadata` may use PostgreSQL `jsonb`.

Example metadata:

```json
{
  "accent": "american",
  "speaker": "female",
  "tags": ["weather", "daily-life"]
}
```

Do not move core fields such as title, section, audio key, or publication state into `metadata`.

---

## 9. Sentences

This is the most important entity for dictation.

Fields:

```text
id
lesson_id
position
transcript
normalized_transcript
start_ms
end_ms
metadata
created_at
updated_at
```

Constraint:

```text
unique(lesson_id, position)
```

Example:

```text
lesson audio = 30 seconds
```

Sentence:

```text
position: 4
transcript: "Today is November fifth."
start_ms: 12400
end_ms: 15400
```

Sentence duration:

```text
3000 ms
```

Do not create a separate audio file for each sentence.

---

## 10. Audio Architecture

### Main decision

Each lesson only needs **one original audio file**.

Example:

```text
english/
  short-stories/
    section-1/
      first-snowfall/
        audio.mp3
```

The file is stored in Cloudflare R2.

The database stores only:

```text
audio_key
```

Do not store binary audio in PostgreSQL.

---

## 11. Sentence Audio Playback

Although a lesson has only one audio file, each sentence must behave like an independent audio clip from the user's perspective.

Example:

```text
Full audio:

0 sec ------------------------------- 30 sec
```

Current sentence:

```text
12.4 sec -------- 15.4 sec
```

The user must see:

```text
0:00 -------- 0:03
```

The user must **not** see:

```text
0:12 -------- 0:30
```

---

## 12. AudioSegmentPlayer

Create a reusable component equivalent to:

```tsx
<AudioSegmentPlayer
  src={audioUrl}
  startMs={12400}
  endMs={15400}
/>
```

The exact interface may be adjusted to fit the existing codebase.

The component is responsible for all virtual segment logic.

---

## 13. Virtual Duration

Displayed duration:

```text
virtualDuration =
endMs - startMs
```

Displayed current position:

```text
virtualCurrentTime =
realAudioCurrentTime - startTime
```

Example:

```text
start = 12.4 sec
end = 15.4 sec

real current = 13.9 sec
```

UI:

```text
current = 1.5 sec
duration = 3 sec
progress = 50%
```

---

## 14. Seeking

The user may seek only within the current sentence.

Example: if the user drags the player to:

```text
2 sec / 3 sec
```

Actual audio position becomes:

```text
realTime =
sentenceStart + 2 sec
```

Do not expose the full lesson timeline in the sentence player.

---

## 15. End-of-Segment Handling

When audio reaches:

```text
end_ms
```

the player must:

```text
pause
```

It must not continue into the next sentence.

Do not rely only on the `timeupdate` event if that causes the audio to overshoot the end timestamp significantly.

A combination involving:

```text
requestAnimationFrame
```

or another appropriate mechanism may be used.

Event listeners and animation loops must be cleaned up correctly when:

```text
the sentence changes
the component unmounts
the audio source changes
```

---

## 16. Repeat

When the user presses repeat:

```text
audio.currentTime = startMs / 1000
audio.play()
```

Repeat must always restart from the beginning of the current sentence.

---

## 17. Optional Audio Padding

The player may support a small configurable:

```text
start padding
end padding
```

For example:

```text
50 ms
```

to prevent the alignment boundary from cutting off the first or last phoneme.

Do not modify the original timestamps in the database.

If padding is used:

```text
effectiveStart =
max(0, startMs - padding)

effectiveEnd =
min(audioDuration, endMs + padding)
```

Keep this configurable.

---

## 18. Dictation Lesson UI

When a user opens a lesson, show:

```text
Lesson title

Sentence progress
Example:
Sentence 3 / 15

Audio segment player

Dictation input

Submit / Enter

Answer feedback

Previous / Next
```

The exact design must integrate with the current application's UI.

Do not copy the reference website pixel-for-pixel.

---

## 19. Sentence Flow

Default flow:

```text
Open lesson
    ↓
Sentence 1
    ↓
Play audio
    ↓
User types
    ↓
Press Enter
    ↓
Evaluate
```

---

## 20. Correct Answer Behavior

Example expected answer:

```text
Today is November fifth.
```

User enters:

```text
Today is November fifth
```

If normalization determines that the answer is correct:

```text
CORRECT
```

The UI must:

```text
show the full correct sentence
mark the sentence as completed
allow the user to continue to the next sentence
```

The user may press Enter again to move to the next sentence.

Do not force the user to click a button when keyboard flow can handle it.

---

## 21. Incorrect Answer Behavior

Expected:

```text
Today is November fifth.
```

User enters:

```text
Today is Novembar
```

The application must:

1. identify the correct prefix;
2. identify the nearest incorrect word;
3. provide a hint for the current incorrect position;
4. keep the remaining words hidden.

Example:

```text
Today is November *****
```

Words after the current incorrect word remain hidden.

The user can listen again and continue typing.

Do not automatically move to the next sentence.

---

## 22. Client-Side Checking

There is no need to protect the transcript from the user.

The transcript may be loaded to the frontend together with the lesson.

The target product is a learning application, not an exam or anti-cheating system.

Do not create a dedicated submit API only to hide the answer.

Prioritize:

```text
fast UX
low API traffic
simple architecture
```

Dictation evaluation may happen client-side.

The server only needs to persist learning progress when required.

---

## 23. English Normalization

Create a language-aware normalization architecture.

Example interface:

```ts
interface DictationNormalizer {
  normalize(text: string): string;
}
```

Or use an equivalent abstraction that fits the existing project.

Do not scatter logic such as:

```text
normalizeEnglishEverywhere()
```

across the codebase.

Instead use:

```text
language
   ↓
normalizer
```

For now, implement:

```text
EnglishDictationNormalizer
```

Future implementations may include:

```text
JapaneseDictationNormalizer
ChineseDictationNormalizer
```

---

## 24. English Normal Mode

Normal mode should handle at least:

```text
lowercase
trim whitespace
collapse repeated spaces
normalize Unicode apostrophes
normalize quotation marks
ignore sentence-ending punctuation
```

Example:

```text
"I don't know."
```

and:

```text
i don't know
```

should be considered equivalent.

It is acceptable to treat:

```text
dont
don't
```

as equivalent in normal mode if the implementation does not introduce incorrect matches in other cases.

---

## 25. Do Not Over-Normalize

Do not normalize data so aggressively that genuinely different words become equivalent.

Normalization must live in a dedicated module.

Add unit tests for important edge cases.

---

## 26. Token Comparison

English can be tokenized by words.

Example:

```text
Expected:
Today is November fifth.

Tokens:
today
is
november
fifth
```

User input:

```text
today
is
novembar
```

Result:

```text
today      CORRECT
is         CORRECT
novembar   NEAR_CORRECT
fifth      HIDDEN
```

---

## 27. Near-Correct Word Detection

Implement fuzzy comparison for the current word.

You may use:

```text
Levenshtein distance
```

or another simple equivalent algorithm.

Do not use AI.

Do not make a network request.

Example:

```text
novembar
november
```

should be treated as near-correct.

The threshold must be implemented as a configurable function or constant.

Do not scatter magic numbers throughout the UI.

---

## 28. Possible Token States

The model may use:

```text
CORRECT
NEAR_CORRECT
INCORRECT
HIDDEN
```

The implementation may simplify this if the UI does not require all four states.

---

## 29. Full Transcript Mode

Each lesson should support at least:

```text
Dictation
Full transcript
```

Dictation mode:

```text
sentence-by-sentence
virtual audio segment
input
feedback
```

Full transcript mode:

```text
full lesson audio
complete transcript
timestamp-synchronized active transcript highlighting
```

The full transcript player may display the complete lesson duration. While the full audio is playing or being seeked, the transcript line whose `[start_ms, end_ms)` interval contains the current playback position must be highlighted. The final line includes its exact `end_ms`; gaps between timestamp ranges must not highlight an unrelated line.

Below the listening tip, display a localized, keyboard-accessible next-lesson card whenever another published English lesson exists in manifest order. The card must show the next lesson title and useful context such as category, section, optional level, and sentence count, and navigate through its canonical lesson path. Do not render an inactive or fabricated card for the final English lesson.

In Dictation mode, Enter invokes Check while an answer is available, including when the answer textarea has focus. After a Check attempt, hide Check until the user changes the textarea value; Enter must not resubmit the unchanged answer while Check is hidden. Editing the answer clears the previous feedback state and restores Check. Escape invokes Skip only while Skip is visible. These shortcuts must not fire inside the Settings dialog or conflict with its Escape-to-close behavior. The Check and Skip controls must expose localized shortcut tooltips on pointer hover and keyboard focus.

---

## 30. Content API

Design the API according to the existing project conventions.

The exact routes below are not mandatory if the current codebase already uses another routing standard.

Conceptually, the application needs:

```text
GET language categories

GET category sections

GET section lessons

GET lesson detail
```

Lesson detail must include data equivalent to:

```json
{
  "id": "...",
  "title": "...",
  "audioUrl": "...",
  "durationMs": 30000,
  "sentences": [
    {
      "id": "...",
      "position": 1,
      "transcript": "...",
      "startMs": 0,
      "endMs": 2800
    }
  ]
}
```

Audio URL generation must follow the project's existing R2 access architecture.

---

## 31. Routing

Reuse the existing routing system.

The language selector already exists on the homepage.

When the user selects English, navigate to the English content area.

URLs should be predictable and shareable.

Example:

```text
/en
/en/short-stories
/en/short-stories/section-1
/en/lesson/first-snowfall
```

However, if the existing application uses a different route convention, preserve that architecture.

Do not rewrite routing just to match the examples above.

---

## 32. English Content Landing Page

After the user selects English, display categories such as:

```text
Short Stories
Long Listening
Conversations
```

Categories must be loaded from the database.

Do not hard-code them inside React components.

Categories must support:

```text
sort_order
is_published
```

The All Topics UI should use the category endpoint as the authoritative ordered category list and may combine it with the lesson manifest for derived statistics. Each topic card should show the category name, description when available, the published lesson count, and the available level range. Categories without lessons should still render when published. If no managed topic image exists, use a deterministic lightweight visual fallback rather than a remote or hard-coded category image.

---

## 33. Category Page

Display sections:

```text
Section 1
Section 2
...
```

Sections must be loaded from the database.

The category page should present sections as accessible collapsible panels. All sections are collapsed by default, and each expanded panel shows its published lessons in database order. Search and level filters may automatically expand sections containing matching lessons. Each lesson entry displays its title, sentence count, and optional level. Users can search by lesson title and filter by the levels actually available in the category; filtering must preserve the original section and lesson order and expose a clear empty state. The layout must adapt from three lesson columns on desktop to a single column on small screens while retaining keyboard navigation and visible focus states.

Optionally display:

```text
lesson count
completion
```

if the required data already exists.

---

## 34. Section Page

Display the lesson list.

Each lesson should show at least:

```text
title
level if available
duration if available
progress if available
```

---

## 35. User Progress

Reuse the existing authenticated user.

Do not create a separate authentication system.

Support progress for logged-in users.

At minimum persist:

```text
lesson
current sentence
completed state
last activity
```

The schema may be adjusted to match the existing user ID type and project conventions.

---

## 36. lesson_progress

Suggested model:

```text
id
user_id
lesson_id
current_sentence_position
completed_sentence_count
is_completed
created_at
updated_at
completed_at
```

Unique constraint:

```text
user_id + lesson_id
```

If the project already has a generic progress system, reuse it instead of creating a duplicate.

---

## 37. sentence_progress

Only create this if granular sentence-level progress is actually required.

Suggested model:

```text
id
user_id
sentence_id
attempt_count
is_completed
first_try_correct
created_at
updated_at
completed_at
```

Do not store every text answer the user has typed.

Do not create large attempt-history datasets unless the product actually needs that analytics.

---

## 38. Guest Progress

If the application allows guest users:

```text
localStorage
```

may be used to keep:

```text
current lesson
current sentence
playback preferences
```

If the current application already has a guest state strategy, reuse it.

Guest-to-account progress migration is not a priority for this phase unless the existing application already supports it.

---

## 39. Playback Preferences

Client-side preferences may include:

```text
volume
playbackRate
autoPlay
```

Playback rate should support at least:

```text
0.5x
0.75x
1x
1.25x
1.5x
```

If the current design does not need this UI immediately, implement player capability first.

---

## 40. Keyboard UX

Prioritize keyboard-friendly interaction because users will continuously type while doing dictation.

Minimum behavior:

```text
Enter
```

submits the answer.

When the current sentence is already correct:

```text
Enter
```

may advance to the next sentence.

Do not override dangerous browser/system shortcuts such as:

```text
Ctrl + R
```

for replay.

A shortcut such as:

```text
R
```

may be used when the input is not focused, or use another non-conflicting shortcut.

Keyboard shortcuts are an enhancement and must not interfere with normal typing.

---

## 41. Content Ingestion Objective

Admin/content creators must eventually be able to create new lessons easily from:

```text
audio
+
transcript
```

Target workflow:

```text
Upload audio
Upload/paste transcript
        ↓
automatic processing
        ↓
sentence splitting
        ↓
audio/transcript alignment
        ↓
sentence timestamps
        ↓
review
        ↓
publish
```

---

## 42. Canonical Lesson Representation

Do not make the application depend on the input source format.

The canonical representation should conceptually be:

```text
lesson
audio
sentences[]
```

Each sentence:

```text
position
text
startMs
endMs
```

Future input formats may include:

```text
TXT
JSON
SRT
VTT
CSV
external source
AI generated
```

All inputs must be normalized into the canonical model before persistence.

---

## 43. Import Architecture

Separate the ingestion pipeline into:

```text
Source Adapter
     ↓
Normalizer
     ↓
Audio/Transcript Aligner
     ↓
Validation
     ↓
Persistence
```

Do not put the entire importer inside an HTTP route handler.

The implemented Admin UI exposes two independent adapters:

```text
AI Import: audio + canonical transcript → alignment → draft review → publish
Non-AI Import: MP3/SRT files or ZIP → unified batch validation → preview → confirm
```

Non-AI direct files and ZIP inputs must use one batch pipeline for both a single lesson and multiple lessons. The common MP3/SRT basename supplies the title, the normal slug service supplies the slug, and standard SRT supplies canonical text and timestamps. Invalid items must not block valid items; resume/retry must skip completed items. See `LESSON_IMPORT_SPEC.md` for the current operational contract.

---

## 44. Audio Alignment

Use:

```text
automatic audio + transcript alignment
```

Input:

```text
one full audio file
+
known transcript
```

Output:

```json
[
  {
    "text": "Sentence one.",
    "startMs": 0,
    "endMs": 2200
  },
  {
    "text": "Sentence two.",
    "startMs": 2200,
    "endMs": 5100
  }
]
```

---

## 45. AI Usage

AI may only be used inside the **content ingestion pipeline**.

Do not use AI for:

```text
answer checking
word comparison
sentence navigation
audio playback
runtime progress
```

---

## 46. Audio Aligner Abstraction

Create an abstraction equivalent to:

```ts
interface AudioTranscriptAligner {
  align(input: {
    audio: ...
    transcript: string
    language: string
  }): Promise<AlignedSentence[]>
}
```

Do not make business logic depend directly on one specific model.

The first implementation may be:

```text
Cloudflare Workers AI based aligner
```

if the current infrastructure and available models are appropriate.

The architecture must allow future replacement with:

```text
another Cloudflare model
OpenAI
Whisper
external alignment service
local processing
```

without changing the domain model.

---

## 47. Important Alignment Rule

The transcript provided by the admin/content creator is the **canonical transcript**.

AI speech recognition must not rewrite the transcript based on what it hears.

AI is responsible for:

```text
determining timestamps / alignment
```

It is not responsible for:

```text
rewriting the lesson transcript
```

If speech-to-text output differs from the provided transcript, it may only be used as an alignment aid or confidence signal.

The final sentence text must come from the transcript provided by the content creator.

---

## 48. Alignment Confidence

If confidence scores are available:

```text
store/use confidence during import
```

If a sentence has low alignment confidence:

```text
flag for review
```

Do not automatically publish lessons with suspicious alignment.

---

## 49. Sentence Splitting

The transcript must be split into sentences.

For the English phase, splitting may use:

```text
punctuation
line breaks
```

However, the architecture must not assume that all languages split sentences the same way.

Allow a transcript input format where:

```text
one sentence per line
```

This may be the preferred format for content creators because it is deterministic.

---

## 50. Import Validation

Before publication, validate at least:

```text
audio exists
audio duration > 0
at least one sentence
all sentences contain text
all startMs >= 0
all endMs > startMs
timestamps are ordered
timestamps do not exceed audio duration significantly
sentence positions are continuous
```

If validation fails:

```text
lesson remains draft
show/import error
```

---

## 51. Import Jobs

If the importer does not yet need a full UI, still design the processing service so it can run asynchronously.

Suggested statuses:

```text
UPLOADED
PROCESSING
ALIGNING
VALIDATING
READY_FOR_REVIEW
PUBLISHED
FAILED
```

If the project does not currently use Cloudflare Queues, Queues are not mandatory for the first phase if import processing is not yet implemented.

However, processing logic must be separated from the HTTP request handler so it can be moved to a Queue later.

---

## 52. Admin Scope

If the codebase already has an admin system, integrate with it.

If there is no admin system, do not build a large CMS.

Only build the minimal content management required.

Minimum future workflow:

```text
Choose language
Choose category
Choose section

Title
Level

Upload audio
Paste/upload transcript

Process

Preview sentences + timestamps

Edit if required

Publish
```

---

## 53. Alignment Review UI

Preview example:

```text
Sentence 1
▶
00:00.000 → 00:02.350
Today is November fifth.

Sentence 2
▶
00:02.350 → 00:05.100
It is very cold outside.
```

Admin may:

```text
edit transcript
edit start time
edit end time
play segment
```

Then:

```text
Publish
```

Automatic alignment does not mean automatic publication.

---

## 54. Publication State

The content hierarchy must respect publication state.

If:

```text
lesson.is_published = false
```

normal users must not see the lesson.

The same applies to:

```text
category
section
lesson
```

Draft content must not appear in public learning pages.

Admins may still view it.

---

## 55. Deletion / Resource Lifecycle

When deleting a lesson, avoid leaving orphaned R2 objects if hard deletion is actually used.

Prefer considering:

```text
soft delete / archive
```

according to the existing project conventions.

Do not implement destructive cascade behavior without first reviewing the current project conventions.

---

## 56. Database Indexes

Create indexes for common queries.

Conceptually:

```text
categories(language_id, sort_order)
sections(category_id, sort_order)
lessons(section_id, sort_order)
sentences(lesson_id, position)
lesson_progress(user_id, lesson_id)
```

Do not over-index.

---

## 57. Database Foreign Keys

Use foreign keys if consistent with the current project conventions.

Relationship:

```text
language
  ↓
category
  ↓
section
  ↓
lesson
  ↓
sentence
```

Do not create orphaned content.

---

## 58. R2 Organization

Suggested logical key structure:

```text
listening/
  en/
    lessons/
      {lesson-id-or-slug}/
        audio.mp3
        thumbnail.webp
```

The exact folder structure is not mandatory if the project already has R2 naming conventions.

Prefer a stable identifier instead of the display title.

Do not use localized titles as permanent resource keys.

---

## 59. R2 Abstraction

The frontend should not depend directly on bucket implementation details.

Provide a reusable function/service that handles:

```text
audio key → usable audio URL
```

If the project already has an asset service, reuse it.

---

## 60. Caching

Published content is suitable for caching.

Potentially cache:

```text
categories
sections
lesson lists
lesson metadata
audio
```

User-specific progress data must not be publicly cached.

Do not optimize prematurely if the project does not yet have a caching strategy.

---

## 61. i18n

The existing i18n system is for **application UI**.

For example:

```text
Play
Repeat
Correct
Try again
Section
Lesson
Coming soon
```

must use the existing i18n system.

This includes Admin import mode controls, validation summaries, progress counters, per-item statuses, actions, and known API error codes. Content values such as lesson titles, section names, filenames, slugs, and transcripts must remain unchanged.

Do not use i18n to translate lesson transcripts.

Lesson transcripts are learning content, not interface translations.

---

## 62. Learning Language vs UI Locale

Do not confuse:

```text
UI locale
```

with:

```text
learning language
```

Example:

```text
UI language = Vietnamese
learning language = English
```

is completely valid.

Do not infer lesson language from the UI locale.

---

## 63. Future Japanese Support

The architecture must allow future Japanese support with:

```text
Japanese-specific tokenizer
Japanese-specific normalization
JLPT levels
Japanese sentence segmentation
```

without modifying the English implementation.

---

## 64. Future Chinese Support

The architecture must allow future Chinese support with:

```text
Chinese-specific tokenizer
Chinese-specific normalization
HSK levels
Chinese sentence segmentation
```

without modifying the English implementation.

---

## 65. Level

Do not create a database enum containing only:

```text
A1
A2
B1
B2
C1
C2
```

because future languages may use:

```text
Japanese → N5/N4/N3/N2/N1
Chinese → HSK
```

For now, either use:

```text
level varchar/text
```

or a generic level system if the codebase already has one.

Do not over-engineer this prematurely.

---

## 66. Error Handling

Audio failure:

```text
show recoverable error
allow retry
```

Lesson load failure:

```text
use existing global error pattern
```

Progress save failure:

```text
learning UI should not immediately become unusable
```

Follow the project's existing logging and error-boundary conventions.

---

## 67. Loading States

Provide appropriate loading states for:

```text
category loading
section loading
lesson loading
audio loading
progress saving
```

Do not allow duplicate submissions because of loading race conditions.

---

## 68. Accessibility

Audio controls must be:

```text
keyboard accessible
aria-label where appropriate
visible focus states
```

The dictation input should autofocus appropriately when changing sentences.

Do not cause unwanted scrolling on mobile due to autofocus.

---

## 69. Responsive Behavior

The dictation screen must work well on:

```text
desktop
tablet
mobile
```

Focus on:

```text
audio player
input
feedback
sentence navigation
```

Pixel-perfect replication of the reference screenshot is not required.

---

## 70. State Separation

Do not create one huge component responsible for:

```text
API
audio
dictation evaluation
progress
rendering
```

Separate responsibilities at least conceptually into:

```text
lesson data
audio segment player
dictation engine
dictation UI
progress persistence
```

Still follow the current architecture and avoid excessive abstraction.

---

## 71. Dictation Engine

Keep answer evaluation as pure logic wherever possible.

Conceptually:

```ts
evaluateAnswer({
  expected,
  actual,
  language
})
```

Return a structured result.

Example:

```ts
{
  correct: false,
  tokens: [
    { text: "Today", status: "correct" },
    { text: "is", status: "correct" },
    { text: "November", status: "near-correct" },
    { text: "fifth", status: "hidden" }
  ],
  firstIncorrectIndex: 2
}
```

Do not make comparison logic depend on React.

---

## 72. Sentence Completion

A sentence should only be marked completed when the answer satisfies the `correct` condition.

Do not mark it completed simply because the user navigates forward if the product requires dictation completion.

When the user selects Skip, fill the answer field with the complete canonical sentence and reveal the answer state. Hide Check and Skip, and show Next. Skipping must not mark the sentence as completed or increase completion progress unless a separate skipped state is introduced in persistence later.

The microphone control is a disabled, accessible placeholder for a future spoken-answer feature. It must not request microphone permission or imply that recording is currently available.

The Dictation Settings dialog must configure replay and play/pause shortcuts, automatic replay, delay between automatic replays, smartphone word suggestions, and shortcut-tip visibility. Settings must affect the active player immediately after saving. Authenticated users store validated preferences on their account so they follow the user across devices; guest preferences use an isolated local profile. The dialog must support Escape, focus trapping, focus restoration, backdrop dismissal, keyboard navigation, and localized labels. Conflicting shortcuts are not allowed.

The default replay shortcut is Ctrl. Supported replay choices are Ctrl, Shift, Alt, Command, Ctrl + Shift, Ctrl + Alt, Ctrl + Space, and Ctrl + b. Shortcut persistence uses platform-neutral semantic values so Ctrl and Command work independently of left/right physical key positions.

The play/pause shortcut has exactly one supported value: backtick (`). Existing Space or Enter values must migrate to backtick.

---

## 73. Lesson Completion

A lesson is complete when:

```text
all required sentences completed
```

Update:

```text
lesson_progress.is_completed
lesson_progress.completed_at
```

The operation must be idempotent.

Do not incorrectly increment completion counters after reloads or retries.

---

## 74. Optimistic Progress

The UI may update immediately and persist progress in the background.

If saving fails:

```text
retry / reconcile
```

Sophisticated offline synchronization is not required in this phase.

---

## 75. Security

Reuse the current authentication middleware.

A user may only modify their own progress.

Admin/content management endpoints must use the existing authorization mechanism.

Do not trust a `user_id` sent from the frontend if the session already provides the authenticated identity.

---

## 76. API Validation

Validate:

```text
IDs
pagination
sort parameters
admin import metadata
timestamps
file type
file size
```

Do not trust frontend input.

---

## 77. Performance

A lesson only contains a few dozen sentences, so all sentence data may be returned with lesson details in one request.

Do not use:

```text
one request per sentence
```

Expected:

```text
GET lesson
→ lesson metadata
→ audio URL
→ all sentence timestamps/transcripts
```

This reduces network round trips and makes repeat/next interactions fast.

---

## 78. Audio Preloading

When a lesson loads:

```text
audio metadata
```

may be preloaded.

Do not download duplicate audio segments because all sentences share the same source.

A single HTML audio instance or reusable media state may be used for the current lesson if appropriate.

---

## 79. Important UX Requirement

From the user's perspective:

**every sentence must feel like a separate audio clip.**

Even though the implementation uses the full lesson audio.

The user must not see the timeline outside the current sentence.

Example sentence duration: 3.2 seconds.

Display:

```text
0:00 / 0:03
```

Do not display:

```text
0:14 / 0:30
```

This is an acceptance requirement, not an optional enhancement.

---

## 80. Initial Seed Data

Create or ensure English:

```text
code = en
```

Create three categories:

```text
short-stories
long-listening
conversations
```

If languages or categories already exist, migrations/seeds must be idempotent and must not create duplicates.

No Japanese or Chinese lesson resources are required.

---

## 81. Initial Test Content

A minimal development lesson may be created to verify the flow.

Example:

```text
English
→ Short Stories
→ Section 1
→ Sample Lesson
```

Do not commit copyrighted third-party audio/resources.

If the repository does not contain licensed content, use a dummy/sample asset or a small fixture.

---

## 82. Testing Priorities

Do not write excessive tests.

Prioritize tests for logic that is likely to regress.

### Unit tests

```text
English normalization
word comparison
near-correct detection
dictation evaluation
virtual audio time calculations
```

### Integration tests, if the current infrastructure supports them

```text
lesson loading
progress persistence
admin authorization
```

Do not test every small UI component.

---

## 83. Migration Safety

Codex must:

1. inspect the existing schema;
2. not drop existing tables;
3. not rename user/auth tables unnecessarily;
4. not reset the database;
5. create additive migrations;
6. preserve existing production/development data.

---

## 84. Implementation Phases

Implement in this order.

### Phase 1 — Database / Content Model

Implement:

```text
languages integration if needed
categories
sections
lessons
sentences
migration
seed English categories
```

Verify that the existing application still works.

---

### Phase 2 — Public Content Navigation

Implement:

```text
English landing
category
section list
lesson list
lesson routing
```

Reuse the existing homepage language selector.

English should lead into real content.

Japanese/Chinese should retain their current behavior or remain Coming Soon.

---

### Phase 3 — Dictation Player

Implement:

```text
lesson load
AudioSegmentPlayer
virtual duration
virtual seek
play
pause
repeat
sentence navigation
```

Verify:

```text
full audio = 30 sec
sentence = 3 sec

player user sees only 3 sec
```

---

### Phase 4 — Dictation Engine

Implement:

```text
English normalization
tokenization
correct/incorrect
near-correct
hidden future words
Enter workflow
```

Do not use AI.

---

### Phase 5 — Progress

Integrate with the existing user/auth system.

Implement:

```text
lesson progress
sentence progress if needed
resume lesson
lesson completion
```

---

### Phase 6 — Full Transcript Mode

Implement:

```text
full lesson audio
full transcript
Dictation / Full Transcript switch
```

---

### Phase 7 — R2 Integration

If an asset abstraction does not already exist, implement:

```text
R2 bucket binding
audio upload/storage conventions
audio URL generation
```

Do not alter existing R2 code unnecessarily if the project already uses R2.

---

### Phase 8 — Content Ingestion Foundation

Implement the architecture for:

```text
Importer
Transcript parser
Canonical lesson model
AudioTranscriptAligner interface
Validation
Draft lesson creation
```

---

### Phase 9 — Automatic Alignment

Implement the first automatic alignment provider.

Preferred:

```text
Cloudflare Workers AI
```

if appropriate for the current environment.

AI is only used during ingestion.

The provided transcript remains the source of truth.

---

### Phase 10 — Admin Review

If the project already has an admin area, integrate with it.

Implement:

```text
upload audio
paste transcript
process
preview sentence alignment
adjust timestamps
publish
```

If there is no existing admin area, create a minimal protected content-management route rather than a full CMS.

---

## 85. Out of Scope

Do not implement in this release:

```text
Japanese lesson content
Chinese lesson content
Japanese dictation engine
Chinese dictation engine
recommendation AI
AI answer grading
AI chatbot
spaced repetition
leaderboard
social features
payment
subscription
large gamification system
vector database
semantic search
microservices
separate Node backend
separate PostgreSQL instance
```

Do not add features outside the requested scope.

---

## 86. Code Quality Rules

Codex must:

- follow current lint/format conventions;
- reuse existing shared utilities;
- reuse existing UI components;
- reuse the existing database client;
- reuse existing auth middleware;
- reuse the existing i18n system;
- reuse existing error handling;
- avoid duplicate types/interfaces;
- preserve the project's current TypeScript strictness;
- avoid `any` unless genuinely necessary;
- avoid magic values;
- add comments for difficult audio/alignment logic;
- avoid comments for obvious code.

---

## 87. Backward Compatibility

After implementation:

```text
existing homepage still works
existing OAuth2 still works
existing account/session still works
existing i18n still works
existing Cloudflare deployment still works
existing Neon database data remains intact
```

Do not break existing routes.

---

## 88. Environment Variables / Bindings

Codex must inspect the current environment before making changes.

Only add a new binding/environment variable when required.

Potential additions may include:

```text
R2 listening bucket
Workers AI binding
Queue binding
```

Do not rename existing secrets or environment variables.

If a new variable is required:

- update the example environment/configuration;
- document its purpose;
- do not commit secrets.

---

## 89. Deliverables

After implementation, Codex should provide:

1. Source code implementation.
2. Database migrations.
3. Seed/update seed if required.
4. R2 binding/configuration changes if required.
5. Workers AI/Queue configuration if used.
6. Short documentation describing lesson import.
7. Short summary of the main files changed.
8. Any manual setup steps still required.
9. Do not generate unnecessary long documentation.

---

## 90. Definition of Done — MVP

The MVP is complete when the following flow works:

```text
Homepage
   ↓
English
   ↓
Short Stories
   ↓
Section 1
   ↓
Lesson
   ↓
Dictation
```

Inside Dictation:

```text
Sentence 1 / N

▶ 0:00 / 0:03

[input]
```

The user can:

```text
play
pause
seek within the sentence
repeat
type answer
press Enter
```

If correct:

```text
show full sentence
mark completed
continue
```

If incorrect:

```text
show correct prefix
hint the nearest incorrect word
hide following words
stay on current sentence
```

When moving to the next sentence:

```text
audio player resets to the duration of the new sentence
```

Do not expose the full lesson timeline in the sentence player.

Progress for authenticated users must be saved to the existing account.

---

## 91. Definition of Done — Content Ingestion

The ingestion architecture is considered complete when it can process:

```text
audio.mp3
+
English transcript
```

into:

```text
Lesson
+
Sentence 1
  transcript
  start_ms
  end_ms

Sentence 2
  transcript
  start_ms
  end_ms

...

Sentence N
```

The audio remains:

```text
one original audio file
```

Do not generate:

```text
001.mp3
002.mp3
003.mp3
...
```

Admin must be able to review/correct timestamps before publication.

---

## 92. Final Architectural Target

```text
                         Existing App
                              │
                              ▼
                    Existing Homepage
                              │
                    ┌─────────┼──────────┐
                    │         │          │
                 English   Japanese   Chinese
                    │
                    ▼
                 Category
                    │
                    ▼
                  Section
                    │
                    ▼
                  Lesson
                    │
             ┌──────┴──────┐
             │             │
         Dictation      Transcript
             │
             ▼
          Sentence
             │
      Virtual Audio Segment
             │
       Full lesson audio
             │
             ▼
        Cloudflare R2
```

Backend:

```text
Cloudflare Worker
        │
        ├──────── Neon PostgreSQL
        │
        ├──────── Cloudflare R2
        │
        └──────── Workers AI / Queue
                   ingestion only
```

Content model:

```text
Language
    ↓
Category
    ↓
Section
    ↓
Lesson
    ↓
Sentence
```

Runtime:

```text
NO AI
```

Content ingestion:

```text
AI alignment allowed
```

---

## 93. Instruction to Codex

Do not start by creating a new implementation from scratch.

First inspect the repository and produce a short implementation plan mapping this specification to the existing architecture.

Then implement incrementally.

Whenever this specification shows sample names, routes, interfaces, or folder structures that conflict with established project conventions, preserve the existing project convention while maintaining the required behavior.

Prioritize:

```text
compatibility with existing code
simple architecture
maintainability
easy future content expansion
language extensibility
good dictation UX
```

Do not over-engineer.

Do not introduce unnecessary infrastructure.

Do not replace working existing modules simply because another implementation would be cleaner.

The existing application is the foundation.

This work is an extension of it, not a rewrite.
