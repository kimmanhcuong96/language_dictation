export interface ObjectRange {
  offset?: number;
  length?: number;
  suffix?: number;
}

export interface ResolvedRange {
  start: number;
  length: number;
}

export function resolveObjectRange(range: ObjectRange | undefined, objectSize: number): ResolvedRange | null {
  if (!range || !Number.isSafeInteger(objectSize) || objectSize <= 0) return null;
  if (Number.isSafeInteger(range.suffix) && Number(range.suffix) > 0) {
    const length = Math.min(objectSize, Number(range.suffix));
    return { start: objectSize - length, length };
  }
  if (!Number.isSafeInteger(range.offset) || Number(range.offset) < 0) return null;
  const start = Number(range.offset);
  if (start >= objectSize) return null;
  const available = objectSize - start;
  const requestedLength = Number.isSafeInteger(range.length) && Number(range.length) > 0 ? Number(range.length) : available;
  return { start, length: Math.min(available, requestedLength) };
}
