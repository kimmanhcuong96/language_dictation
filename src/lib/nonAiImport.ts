import { parseSrt, validateAlignedSentences, type AlignedSentence } from "./ingestion";
import { slugifyTitle } from "./slug";
import { parsePackageTranslationFilename } from "./translationImport";

export const NON_AI_IMPORT_LIMITS = {
  maxLessons: 99,
  maxAudioBytes: 20 * 1024 * 1024,
  maxSrtBytes: 1024 * 1024,
  maxTranslationBytes: 1024 * 1024,
  maxArchiveBytes: 40 * 1024 * 1024,
  maxExtractedBytes: 64 * 1024 * 1024,
  maxResources: 250,
} as const;

export interface ImportResourceDescriptor {
  name: string;
  size: number;
  kind: "audio" | "youtube_link" | "srt" | "translation" | "unsupported";
  translationLanguage?: string;
  translationBasename?: string;
  lessonBasename?: string;
  error?: string;
}

export interface ImportPairCandidate {
  key: string;
  lessonName: string;
  slug: string;
  lessonOrder: number;
  sourceFilename: string;
  sourceType: "audio" | "youtube";
  audioName?: string;
  linkName?: string;
  srtName?: string;
  translations: Record<string, string>;
  errors: string[];
}

export function validateImportCandidateSlugs(
  candidates: ImportPairCandidate[],
  isUsed: (candidate: string) => boolean,
): ImportPairCandidate[] {
  const counts = new Map<string, number>();
  for (const candidate of candidates) if (candidate.slug) counts.set(candidate.slug, (counts.get(candidate.slug) ?? 0) + 1);
  return candidates.map((candidate) => {
    if (!candidate.slug || candidate.errors.length) return { ...candidate };
    const errors = [...candidate.errors];
    if ((counts.get(candidate.slug) ?? 0) > 1) errors.push("duplicate_slug_in_batch");
    if (isUsed(candidate.slug)) errors.push("duplicate_lesson_slug");
    return { ...candidate, errors: [...new Set(errors)] };
  });
}

export function describeImportResource(name: string, size: number): ImportResourceDescriptor {
  const fileName = name.replace(/\\/gu, "/").split("/").at(-1) ?? "";
  if (fileName.endsWith(".link.txt")) return { name, size, kind: "youtube_link", lessonBasename: fileName.slice(0, -".link.txt".length) };
  const rawExtension = fileName.match(/\.([^.]+)$/u)?.[1];
  const extension = rawExtension?.toLocaleLowerCase();
  if (rawExtension !== extension) return { name, size, kind: "unsupported", error: "invalid_lesson_filename" };
  if (extension === "mp3") return { name, size, kind: "audio" };
  if (extension === "srt") return { name, size, kind: "srt" };
  if (extension === "txt") {
    const parsed = parsePackageTranslationFilename(name);
    if (!parsed) return { name, size, kind: "unsupported", error: "invalid_translation_filename" };
    if (!parsed.language) return { name, size, kind: "translation", translationLanguage: parsed.languageCode, translationBasename: parsed.basename, error: `unsupported_translation_language:${parsed.languageCode}` };
    return { name, size, kind: "translation", translationLanguage: parsed.language.code, translationBasename: parsed.basename };
  }
  return { name, size, kind: "unsupported" };
}

export function normalizeImportBasename(name: string): { key: string; lessonName: string; slug: string; lessonOrder: number; sourceFilename: string } | null {
  const fileName = name.replace(/\\/gu, "/").split("/").at(-1) ?? "";
  const basename = fileName.replace(/\.[^.]+$/u, "");
  const match = basename.match(/^([0-9]{2})_(.+)$/u);
  if (!match) return null;
  const lessonOrder = Number(match[1]);
  const lessonName = match[2];
  if (lessonOrder < 1 || lessonOrder > 99 || !lessonName || lessonName === "." || lessonName === "..") return null;
  const slug = slugifyTitle(lessonName);
  if (!slug) return null;
  return { key: basename, lessonName, slug, lessonOrder, sourceFilename: fileName };
}

export function pairImportResources(resources: ImportResourceDescriptor[]): ImportPairCandidate[] {
  const pairs = new Map<string, ImportPairCandidate>();
  const unsupported: ImportPairCandidate[] = [];
  const youtubeBasenames = new Set(resources.filter((resource) => resource.kind === "youtube_link").map((resource) => resource.lessonBasename ?? ""));
  for (const resource of resources) {
    if (resource.kind === "unsupported") {
      unsupported.push({ key: `unsupported:${resource.name}`, lessonName: resource.name, slug: "", lessonOrder: 0, sourceFilename: resource.name, sourceType: "audio", translations: {}, errors: [resource.error ?? "unsupported_file_type"] });
      continue;
    }
    const basename = resource.kind === "translation" ? resource.translationBasename ?? "" : resource.kind === "youtube_link" ? resource.lessonBasename ?? "" : resource.name.replace(/\\/gu, "/").split("/").at(-1)?.replace(/\.[^.]+$/u, "") ?? "";
    const normalized = normalizeImportBasename(basename) ?? (youtubeBasenames.has(basename) ? normalizeYouTubeBasename(basename) : null);
    if (!normalized) {
      unsupported.push({ key: `invalid:${resource.name}`, lessonName: resource.name, slug: "", lessonOrder: 0, sourceFilename: resource.name, sourceType: "audio", translations: {}, errors: ["invalid_lesson_filename"] });
      continue;
    }
    const pair = pairs.get(normalized.key) ?? { ...normalized, sourceType: "audio" as const, translations: {}, errors: [] };
    if (normalized.lessonName.length > 200) pair.errors.push("lesson_name_too_long");
    if (resource.size <= 0 && resource.kind !== "translation") pair.errors.push(resource.kind === "audio" ? "audio_empty" : "srt_empty");
    if (resource.kind === "audio") {
      if (pair.audioName) pair.errors.push("duplicate_audio_file");
      else pair.audioName = resource.name;
      if (resource.size > NON_AI_IMPORT_LIMITS.maxAudioBytes) pair.errors.push("audio_too_large");
    } else if (resource.kind === "youtube_link") {
      pair.sourceType = "youtube";
      if (pair.linkName) pair.errors.push("duplicate_youtube_link_file");
      else pair.linkName = resource.name;
      if (resource.size <= 0) pair.errors.push("youtube_link_empty");
      if (resource.size > NON_AI_IMPORT_LIMITS.maxTranslationBytes) pair.errors.push("youtube_link_too_large");
    } else if (resource.kind === "srt") {
      if (pair.srtName) pair.errors.push("duplicate_srt_file");
      else pair.srtName = resource.name;
      if (resource.size > NON_AI_IMPORT_LIMITS.maxSrtBytes) pair.errors.push("srt_too_large");
    } else {
      const language = resource.translationLanguage!;
      if (resource.error) pair.errors.push(resource.error);
      else if (pair.translations[language]) pair.errors.push(`duplicate_translation_language:${language}`);
      else pair.translations[language] = resource.name;
      if (resource.size <= 0) pair.errors.push(`translation_empty:${language}`);
      if (resource.size > NON_AI_IMPORT_LIMITS.maxTranslationBytes) pair.errors.push(`translation_too_large:${language}`);
    }
    pairs.set(normalized.key, pair);
  }
  const candidates = [...pairs.values()];
  for (const candidate of candidates) {
    if (candidate.sourceType === "youtube") {
      if (candidate.audioName) candidate.errors.push("conflicting_media_sources");
      if (!candidate.linkName) candidate.errors.push("missing_youtube_link");
    } else if (!candidate.audioName) candidate.errors.push("missing_mp3");
    if (!candidate.srtName) candidate.errors.push("missing_srt");
  }
  const orderCounts = new Map<number, number>();
  for (const candidate of candidates) if (candidate.lessonOrder > 0) orderCounts.set(candidate.lessonOrder, (orderCounts.get(candidate.lessonOrder) ?? 0) + 1);
  for (const candidate of candidates) if (candidate.lessonOrder > 0 && (orderCounts.get(candidate.lessonOrder) ?? 0) > 1) candidate.errors.push(`duplicate_lesson_order:${candidate.lessonOrder}`);
  return [...candidates, ...unsupported].map((candidate) => ({ ...candidate, errors: [...new Set(candidate.errors)] }));
}

function normalizeYouTubeBasename(basename: string) {
  if (!basename || basename === "." || basename === "..") return null;
  const slug = slugifyTitle(basename);
  if (!slug) return null;
  return { key: basename, lessonName: basename, slug, lessonOrder: 0, sourceFilename: `${basename}.link.txt` };
}

export function parseNonAiSrt(srt: string, audioDurationMs?: number): AlignedSentence[] {
  const sentences = parseSrt(srt).map((cue, index) => ({ position: index + 1, text: cue.text, startMs: cue.startMs, endMs: cue.endMs, confidence: 1 }));
  const validationDuration = audioDurationMs && audioDurationMs > 0 ? audioDurationMs : sentences.at(-1)?.endMs ?? 0;
  const errors = validateAlignedSentences(sentences, validationDuration);
  if (errors.length) throw new Error(errors.join(","));
  return sentences;
}
