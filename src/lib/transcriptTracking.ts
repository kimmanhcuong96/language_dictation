export interface TimedTranscriptLine {
  start_ms: number;
  end_ms: number;
}

export function findActiveTranscriptIndex(lines: TimedTranscriptLine[], currentTimeMs: number): number {
  if (!Number.isFinite(currentTimeMs) || currentTimeMs < 0) return -1;

  return lines.findIndex((line, index) => {
    if (!Number.isFinite(line.start_ms) || !Number.isFinite(line.end_ms) || line.end_ms < line.start_ms) return false;
    const isLastLine = index === lines.length - 1;
    return currentTimeMs >= line.start_ms && (currentTimeMs < line.end_ms || (isLastLine && currentTimeMs <= line.end_ms));
  });
}
