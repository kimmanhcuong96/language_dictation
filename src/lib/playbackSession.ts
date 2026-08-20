export interface PlaybackSessionController {
  begin(): number;
  invalidate(): void;
  isActive(sessionId: number): boolean;
}

export function createPlaybackSessionController(): PlaybackSessionController {
  let activeSessionId = 0;
  return {
    begin: () => ++activeSessionId,
    invalidate: () => { activeSessionId += 1; },
    isActive: (sessionId) => sessionId === activeSessionId,
  };
}
