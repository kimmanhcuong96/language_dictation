import type { LessonManifestItem } from "./lessonManifest";

export interface LessonSection {
  id: string;
  number: number;
  title: string;
  lessons: LessonManifestItem[];
}

export interface LessonSectionSeed { id: string; number: number; title: string }

export function buildLessonSections(lessons: LessonManifestItem[], language: string, categorySlug: string, sectionSeeds: LessonSectionSeed[] = []): LessonSection[] {
  const sections = new Map<string, LessonSection>();
  for (const section of sectionSeeds) sections.set(section.id, { ...section, lessons: [] });
  for (const lesson of lessons) {
    if (lesson.language !== language || lesson.categorySlug !== categorySlug) continue;
    const section = sections.get(lesson.sectionId) ?? { id: lesson.sectionId, number: lesson.sectionNumber, title: lesson.sectionTitle, lessons: [] };
    section.lessons.push(lesson);
    sections.set(lesson.sectionId, section);
  }
  const ordered = [...sections.values()];
  if (!sectionSeeds.length) ordered.sort((left, right) => left.number - right.number || left.title.localeCompare(right.title));
  return ordered.map(section => ({ ...section, lessons: section.lessons.sort((left, right) => left.order - right.order) }));
}

export function filterLessonSections(sections: LessonSection[], query: string, level: string): LessonSection[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery && level === "all") return sections;
  return sections.flatMap(section => {
    const lessons = section.lessons.filter(lesson => {
      const matchesQuery = !normalizedQuery || lesson.name.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && (level === "all" || lesson.level === level);
    });
    return lessons.length ? [{ ...section, lessons }] : [];
  });
}

export function collectLessonLevels(sections: LessonSection[]): string[] {
  const preferred = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const levels = new Set(sections.flatMap(section => section.lessons.map(lesson => lesson.level).filter((level): level is string => Boolean(level))));
  return [...levels].sort((left, right) => {
    const leftIndex = preferred.indexOf(left), rightIndex = preferred.indexOf(right);
    if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? preferred.length : leftIndex) - (rightIndex < 0 ? preferred.length : rightIndex);
    return left.localeCompare(right, undefined, { numeric: true });
  });
}
