# Lesson and translation import

The Admin import page at `/admin/listening` has two independent workflows.

## Lesson package import

A package contains matching `NN_{name}.mp3` and `NN_{name}.srt` files, plus optional UTF-8 translation files named `NN_{name}.{language}.txt`. `NN` must be exactly two digits in the range `01`–`99`; invalid names are rejected without normalization. Supported translation codes are `vi`, `zh`, `ja`, and `ko`. Inputs may be selected directly or supplied in a ZIP.

The shared filename stem pairs the resources. The numeric prefix becomes the stored lesson order, while `{name}` becomes the title and slug source. Order is unique only inside the selected Section; gaps are retained and file selection, archive, and processing order are irrelevant.

The SRT is canonical for sentence order, source text, and timestamps. Every physical line in a translation TXT maps to the SRT cue at the same position. Blank lines, invalid UTF-8, unsupported language codes, duplicate languages, and line-count mismatches invalidate the complete lesson package before publication.

Validation reports unmatched pairs, duplicate orders in the batch, and conflicts with existing lessons in the selected Section per item. Confirmation processes only valid lessons; invalid lessons remain visible and do not block them. Each lesson, its sentences, optional translations, canonical path, and import state are committed in one transaction. A lesson-level failure rolls back that lesson, removes its uploaded audio, and does not stop later valid items.

Lessons are displayed by stored order ascending within their Section. Deletion never renumbers remaining lessons, and the management UI exposes order as read-only.

## Translation-only import

An Admin selects an existing lesson and adds one or more `{language, TXT file}` entries. Filenames are ignored in this workflow. The browser previews the line count and the Worker repeats every validation before writing.

All selected languages are replaced in one transaction. Existing active candidates for those lesson/language pairs are superseded; the imported Admin translations become the single approved set. Audio, source text, sentence positions, and timestamps are never modified.

## Language registry

The centralized import registry is defined in `src/lib/translationImport.ts`. Add future supported languages there and seed/activate the matching database language through a migration; no sentence or translation schema change is required.
