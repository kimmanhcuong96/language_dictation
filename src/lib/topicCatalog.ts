import type { LessonManifestItem } from "./lessonManifest";

export interface TopicSummary {
  slug: string;
  name: string;
  description: string | null;
  lessonCount: number;
  levels: string[];
  initials: string;
  hue: number;
}

export interface TopicCategory { slug: string; name: string; description: string | null }

/** Static snapshot of the published EN categories, rendered on first paint (before the live /api/listening/categories response lands) so crawlers and users see real content immediately instead of a loading state. Overwritten as soon as the API responds. */
export const DEFAULT_TOPIC_CATEGORIES: TopicCategory[] = [
  { slug: "short-stories", name: "Short Stories", description: null },
  { slug: "long-listening", name: "Long Listening", description: null },
  { slug: "conversations", name: "Conversations", description: null },
  { slug: "podcast", name: "Podcast", description: null },
  { slug: "ted-talks", name: "TED Talks", description: null },
  { slug: "ielts-listening", name: "IELTS Listening", description: null },
];

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function buildTopicSummaries(lessons: LessonManifestItem[], language: string, categories: TopicCategory[] = []): TopicSummary[] {
  const topics = new Map<string, TopicSummary>();
  for (const category of categories) topics.set(category.slug, {
    slug: category.slug,
    name: category.name,
    description: category.description?.trim() || null,
    lessonCount: 0,
    levels: [],
    initials: topicInitials(category.name),
    hue: topicHue(category.slug),
  });
  for (const lesson of lessons) {
    if (lesson.language !== language) continue;
    const current = topics.get(lesson.categorySlug) ?? {
      slug: lesson.categorySlug,
      name: lesson.categoryName,
      description: null,
      lessonCount: 0,
      levels: [],
      initials: topicInitials(lesson.categoryName),
      hue: topicHue(lesson.categorySlug),
    };
    current.lessonCount += 1;
    const level = lesson.level?.trim();
    if (level && !current.levels.includes(level)) current.levels.push(level);
    topics.set(lesson.categorySlug, current);
  }
  return [...topics.values()].map(topic => ({ ...topic, levels: topic.levels.sort(compareLevels) }));
}

export function formatLevelRange(levels: string[], emptyLabel: string) {
  if (!levels.length) return emptyLabel;
  if (levels.length === 1) return levels[0];
  return `${levels[0]}–${levels.at(-1)}`;
}

function compareLevels(left: string, right: string) {
  const leftIndex = LEVEL_ORDER.indexOf(left.toUpperCase()), rightIndex = LEVEL_ORDER.indexOf(right.toUpperCase());
  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function topicInitials(name: string) {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) ?? "EN").toUpperCase();
}

const HUE_OVERRIDES: Record<string, number> = { podcast: 205, "ted-talks": 285, "ielts-listening": 35 };

function topicHue(slug: string) {
  return HUE_OVERRIDES[slug] ?? stableHue(slug);
}

function stableHue(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return hash;
}
