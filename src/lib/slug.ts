export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80)
    .replace(/-+$/gu, "");
}

export function uniqueSlug(baseSlug: string, isUsed: (candidate: string) => boolean): string {
  if (!isUsed(baseSlug)) return baseSlug;
  for (let suffix = 1; suffix < 100_000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${baseSlug.slice(0, Math.max(1, 80 - suffixText.length)).replace(/-+$/gu, "")}${suffixText}`;
    if (!isUsed(candidate)) return candidate;
  }
  throw new Error("slug_space_exhausted");
}
