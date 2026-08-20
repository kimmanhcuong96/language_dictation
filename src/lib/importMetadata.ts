export function normalizeOptionalLevel(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  return /^[a-c][12]$/iu.test(normalized) ? normalized.toLocaleUpperCase("en") : normalized;
}
