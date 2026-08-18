export function normalizeOptionalLevel(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
