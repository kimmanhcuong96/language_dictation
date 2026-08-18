export interface LessonManifestItem {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string;
  language: string;
  level: string | null;
  categorySlug: string;
  categoryName: string;
  sectionId: string;
  sectionNumber: number;
  sectionTitle: string;
  order: number;
  sentenceCount: number;
  updatedAt: string;
}

export interface LessonManifest { version: string; lessons: LessonManifestItem[]; }
const CACHE_KEY = "me2listen-lesson-manifest-v2";

export function findNextLesson(manifest: LessonManifest | undefined, currentLessonId: string, language = "en"): LessonManifestItem | undefined {
  if (!manifest) return undefined;
  const lessons = manifest.lessons.filter((lesson) => lesson.language === language);
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId);
  return currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;
}

export async function loadLessonManifest(): Promise<LessonManifest> {
  const cached = readManifest();
  const url = cached ? `/api/listening/manifest?version=${encodeURIComponent(cached.version)}` : "/api/listening/manifest";
  const response = await fetch(url, { credentials: "same-origin" });
  if (response.status === 304 && cached) return cached;
  const body = await response.json() as LessonManifest & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "manifest_request_failed");
  localStorage.setItem(CACHE_KEY, JSON.stringify(body));
  return body;
}

function readManifest(): LessonManifest | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as LessonManifest | null;
    return parsed && typeof parsed.version === "string" && Array.isArray(parsed.lessons) ? parsed : null;
  } catch { return null; }
}
