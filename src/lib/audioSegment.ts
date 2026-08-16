export interface SegmentBounds { startSeconds: number; endSeconds: number; durationSeconds: number; }

export function getSegmentBounds(startMs: number, endMs: number, audioDurationSeconds?: number, paddingMs = 0): SegmentBounds {
  const safeStart = Math.max(0, startMs - Math.max(0, paddingMs)) / 1000;
  const rawEnd = Math.max(startMs, endMs) + Math.max(0, paddingMs);
  const safeEnd = audioDurationSeconds && Number.isFinite(audioDurationSeconds) ? Math.min(audioDurationSeconds, rawEnd / 1000) : rawEnd / 1000;
  return { startSeconds: safeStart, endSeconds: Math.max(safeStart, safeEnd), durationSeconds: Math.max(0, safeEnd - safeStart) };
}

export const toVirtualTime = (realTimeSeconds: number, startSeconds: number, durationSeconds: number) => Math.min(durationSeconds, Math.max(0, realTimeSeconds - startSeconds));
export const toRealTime = (virtualTimeSeconds: number, startSeconds: number, durationSeconds: number) => startSeconds + Math.min(durationSeconds, Math.max(0, virtualTimeSeconds));
