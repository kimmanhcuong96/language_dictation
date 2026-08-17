export interface AlignedSentence { position: number; text: string; startMs: number; endMs: number; confidence?: number; }
export interface AudioTranscriptAligner { align(input: { audio: ArrayBuffer; transcript: string; language: string }): Promise<AlignedSentence[]>; }
export interface LessonImportInput { audioKey: string; audioDurationMs: number; transcript: string; language: string; }
export interface TimedCue { text: string; startMs: number; endMs: number; }

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

export function parseSrt(srt: string): TimedCue[] {
  const blocks = srt.replace(/^\uFEFF/u, "").trim().split(/\r?\n\s*\r?\n/u).filter(Boolean);
  if (!blocks.length) throw new Error("pre_timed_srt_empty");
  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/u).map((line) => line.trim());
    if (lines[0] !== String(index + 1)) throw new Error(`pre_timed_srt_sequence_invalid_${index + 1}`);
    const timing = lines[1]?.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})(?:\s+.*)?$/u);
    if (!timing) throw new Error(`pre_timed_srt_timing_invalid_${index + 1}`);
    const startMs = parseTimestamp(timing[1]), endMs = parseTimestamp(timing[2]);
    const text = lines.slice(2).join(" ").replace(/<[^>]+>/gu, "").trim();
    if (startMs === null || endMs === null || endMs <= startMs) throw new Error(`pre_timed_srt_timing_invalid_${index + 1}`);
    if (!text) throw new Error(`pre_timed_srt_text_missing_${index + 1}`);
    return { text, startMs, endMs };
  });
}

export function parsePreTimedSrt(srt: string, transcript: string): AlignedSentence[] {
  const cues = parseSrt(srt), lines = splitTranscript(transcript);
  if (cues.length !== lines.length) throw new Error("pre_timed_srt_script_count_mismatch");
  return cues.map((cue, index) => {
    if (normalizeComparableText(cue.text) !== normalizeComparableText(lines[index])) throw new Error(`pre_timed_srt_script_mismatch_${index + 1}`);
    return { position: index + 1, text: lines[index], startMs: cue.startMs, endMs: cue.endMs, confidence: 1 };
  });
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
