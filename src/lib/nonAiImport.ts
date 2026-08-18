import { parseSrt, validateAlignedSentences, type AlignedSentence } from "./ingestion";
import { slugifyTitle } from "./slug";

export const NON_AI_IMPORT_LIMITS = {
  maxLessons: 100,
  maxAudioBytes: 20 * 1024 * 1024,
  maxSrtBytes: 1024 * 1024,
  maxArchiveBytes: 40 * 1024 * 1024,
  maxExtractedBytes: 64 * 1024 * 1024,
  maxResources: 250,
} as const;

export interface ImportResourceDescriptor {
  name: string;
  size: number;
  kind: "audio" | "srt" | "unsupported";
}

export interface ImportPairCandidate {
  key: string;
  lessonName: string;
  slug: string;
  audioName?: string;
  srtName?: string;
  errors: string[];
}

export function describeImportResource(name: string, size: number): ImportResourceDescriptor {
  const fileName = name.replace(/\\/gu, "/").split("/").at(-1) ?? "";
  const extension = fileName.match(/\.([^.]+)$/u)?.[1]?.toLocaleLowerCase();
  return { name, size, kind: extension === "mp3" ? "audio" : extension === "srt" ? "srt" : "unsupported" };
}

export function normalizeImportBasename(name: string): { key: string; lessonName: string; slug: string } | null {
  const fileName = name.replace(/\\/gu, "/").split("/").at(-1)?.trim() ?? "";
  const basename = fileName.replace(/\.[^.]+$/u, "").normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (!basename || basename === "." || basename === "..") return null;
  const slug = slugifyTitle(basename);
  if (!slug) return null;
  return { key: basename.toLowerCase(), lessonName: basename, slug };
}

export function pairImportResources(resources: ImportResourceDescriptor[]): ImportPairCandidate[] {
  const pairs = new Map<string, ImportPairCandidate>();
  const unsupported: ImportPairCandidate[] = [];
  for (const resource of resources) {
    if (resource.kind === "unsupported") {
      unsupported.push({ key: `unsupported:${resource.name}`, lessonName: resource.name, slug: "", errors: ["unsupported_file_type"] });
      continue;
    }
    const normalized = normalizeImportBasename(resource.name);
    if (!normalized) {
      unsupported.push({ key: `invalid:${resource.name}`, lessonName: resource.name, slug: "", errors: ["invalid_filename"] });
      continue;
    }
    const pair = pairs.get(normalized.key) ?? { ...normalized, errors: [] };
    if (normalized.lessonName.length > 200) pair.errors.push("lesson_name_too_long");
    if (resource.size <= 0) pair.errors.push(resource.kind === "audio" ? "audio_empty" : "srt_empty");
    if (resource.kind === "audio") {
      if (pair.audioName) pair.errors.push("duplicate_audio_file");
      else pair.audioName = resource.name;
      if (resource.size > NON_AI_IMPORT_LIMITS.maxAudioBytes) pair.errors.push("audio_too_large");
    } else {
      if (pair.srtName) pair.errors.push("duplicate_srt_file");
      else pair.srtName = resource.name;
      if (resource.size > NON_AI_IMPORT_LIMITS.maxSrtBytes) pair.errors.push("srt_too_large");
    }
    pairs.set(normalized.key, pair);
  }
  const candidates = [...pairs.values()];
  for (const candidate of candidates) {
    if (!candidate.audioName) candidate.errors.push("missing_mp3");
    if (!candidate.srtName) candidate.errors.push("missing_srt");
  }
  const bySlug = new Map<string, ImportPairCandidate[]>();
  for (const candidate of candidates) bySlug.set(candidate.slug, [...(bySlug.get(candidate.slug) ?? []), candidate]);
  for (const duplicates of bySlug.values()) if (duplicates.length > 1) for (const candidate of duplicates) candidate.errors.push("duplicate_slug_in_batch");
  return [...candidates, ...unsupported].map((candidate) => ({ ...candidate, errors: [...new Set(candidate.errors)] }));
}

export function parseNonAiSrt(srt: string, audioDurationMs?: number): AlignedSentence[] {
  const sentences = parseSrt(srt).map((cue, index) => ({ position: index + 1, text: cue.text, startMs: cue.startMs, endMs: cue.endMs, confidence: 1 }));
  const validationDuration = audioDurationMs && audioDurationMs > 0 ? audioDurationMs : sentences.at(-1)?.endMs ?? 0;
  const errors = validateAlignedSentences(sentences, validationDuration);
  if (errors.length) throw new Error(errors.join(","));
  return sentences;
}
