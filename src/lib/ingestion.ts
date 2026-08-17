export interface AlignedSentence { position: number; text: string; startMs: number; endMs: number; confidence?: number; }
export interface AudioTranscriptAligner { align(input: { audio: ArrayBuffer; transcript: string; language: string }): Promise<AlignedSentence[]>; }
export interface LessonImportInput { audioKey: string; audioDurationMs: number; transcript: string; language: string; }
export interface TimedCue { text: string; startMs: number; endMs: number; }
export interface PreTimedSegment { position?: unknown; text?: unknown; startMs?: unknown; endMs?: unknown; start?: unknown; end?: unknown; }

/** Deterministic source adapter for the preferred one-sentence-per-line format. */
export function splitTranscript(transcript: string): string[] {
  return transcript.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

export function validateAlignedSentences(sentences: AlignedSentence[], audioDurationMs: number): string[] {
  const errors: string[] = [];
  if (audioDurationMs <= 0) errors.push("audio_duration_invalid");
  if (!sentences.length) errors.push("sentences_missing");
  sentences.forEach((sentence, index) => {
    if (sentence.position !== index + 1) errors.push("positions_not_continuous");
    if (!sentence.text.trim()) errors.push(`sentence_${index + 1}_empty`);
    if (sentence.startMs < 0 || sentence.endMs <= sentence.startMs) errors.push(`sentence_${index + 1}_timestamps_invalid`);
    if (index > 0 && sentence.startMs < sentences[index - 1].endMs) errors.push("timestamps_not_ordered");
    if (sentence.endMs > audioDurationMs + 250) errors.push(`sentence_${index + 1}_outside_audio`);
  });
  return [...new Set(errors)];
}

export function parsePreTimedSegments(timingJson: string, transcript: string): AlignedSentence[] {
  let parsed: unknown;
  try { parsed = JSON.parse(timingJson); } catch { throw new Error("pre_timed_json_invalid"); }
  const rawSegments = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { segments?: unknown }).segments) ? (parsed as { segments: unknown[] }).segments : null;
  if (!rawSegments?.length) throw new Error("pre_timed_segments_missing");
  const lines = splitTranscript(transcript);
  if (rawSegments.length !== lines.length) throw new Error("pre_timed_segment_script_count_mismatch");
  const sentences: AlignedSentence[] = [];
  for (let index = 0; index < rawSegments.length; index += 1) {
    const item = rawSegments[index];
    if (!item || typeof item !== "object") throw new Error(`pre_timed_segment_${index + 1}_invalid`);
    const segment = item as PreTimedSegment;
    const position = Number(segment.position ?? index + 1);
    const startMs = toMilliseconds(segment.startMs ?? segment.start);
    const endMs = toMilliseconds(segment.endMs ?? segment.end);
    if (!Number.isInteger(position) || position !== index + 1) throw new Error("pre_timed_positions_invalid");
    if (startMs === null || endMs === null) throw new Error(`pre_timed_segment_${index + 1}_timestamp_invalid`);
    if (segment.text !== undefined && normalizeComparableText(String(segment.text)) !== normalizeComparableText(lines[index])) throw new Error(`pre_timed_segment_${index + 1}_script_mismatch`);
    sentences.push({ position, text: lines[index], startMs, endMs, confidence: 1 });
  }
  return sentences;
}

function toMilliseconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Number.isInteger(value) ? value : Math.round(value * 1000);
  if (typeof value === "string" && value.trim()) return parseTimestamp(value);
  return null;
}

function normalizeComparableText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

export function createDraftSentences(transcript: string, audioDurationMs: number): AlignedSentence[] {
  const lines = splitTranscript(transcript), step = lines.length ? audioDurationMs / lines.length : 0;
  return lines.map((text, index) => ({ position: index + 1, text, startMs: Math.round(index * step), endMs: Math.round((index + 1) * step), confidence: 0 }));
}

const parseTimestamp = (value: string) => {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
};

export function parseVtt(vtt: string): TimedCue[] {
  const cues: TimedCue[] = [];
  for (const block of vtt.replace(/^WEBVTT[^\n]*\n/u, "").split(/\n\s*\n/u)) {
    const lines = block.trim().split(/\r?\n/u); const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [rawStart, rawEnd] = lines[timingIndex].split("-->"); const startMs = parseTimestamp(rawStart); const endMs = parseTimestamp(rawEnd.trim().split(/\s+/u)[0]);
    const text = lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/gu, "").trim();
    if (startMs !== null && endMs !== null && endMs > startMs && text) cues.push({ text, startMs, endMs });
  }
  return cues;
}

/** Keeps the supplied transcript as truth and uses ASR cue density only for boundaries. */
export function alignTranscriptToVtt(transcript: string, vtt: string, audioDurationMs: number): AlignedSentence[] {
  const lines = splitTranscript(transcript), cues = parseVtt(vtt);
  if (!lines.length) return [];
  if (!cues.length) return createDraftSentences(transcript, audioDurationMs);
  const totalWords = lines.reduce((sum, line) => sum + Math.max(1, line.split(/\s+/u).length), 0);
  const first = cues[0].startMs, last = Math.min(audioDurationMs, cues.at(-1)!.endMs); let consumed = 0;
  return lines.map((text, index) => {
    const words = Math.max(1, text.split(/\s+/u).length), startRatio = consumed / totalWords; consumed += words;
    const endRatio = consumed / totalWords, approximateStart = first + (last - first) * startRatio, approximateEnd = first + (last - first) * endRatio;
    const startCue = cues.reduce((best, cue) => Math.abs(cue.startMs - approximateStart) < Math.abs(best.startMs - approximateStart) ? cue : best, cues[0]);
    const endCue = cues.reduce((best, cue) => Math.abs(cue.endMs - approximateEnd) < Math.abs(best.endMs - approximateEnd) ? cue : best, cues.at(-1)!);
    const startMs = index === 0 ? Math.max(0, startCue.startMs) : Math.max(0, Math.round(approximateStart));
    const endMs = index === lines.length - 1 ? Math.min(audioDurationMs, endCue.endMs) : Math.max(startMs + 1, Math.round(approximateEnd));
    return { position: index + 1, text, startMs, endMs, confidence: .5 };
  });
}
