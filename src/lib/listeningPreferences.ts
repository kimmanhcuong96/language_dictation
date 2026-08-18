export const shortcutKeys = ["KeyR", "ControlLeft", "Backquote"] as const;
export const playPauseKeys = ["Space", "Backquote", "Enter"] as const;
export const replayDelays = [0, .5, 1, 2, 3] as const;

export type ReplayShortcut = typeof shortcutKeys[number];
export type PlayPauseShortcut = typeof playPauseKeys[number];
export type ReplayDelay = typeof replayDelays[number];

export interface ListeningPreferences {
  replayKey: ReplayShortcut;
  playPauseKey: PlayPauseShortcut;
  autoReplay: boolean;
  replayDelaySeconds: ReplayDelay;
  wordSuggestions: boolean;
  shortcutTips: boolean;
}

export const defaultListeningPreferences: ListeningPreferences = {
  replayKey: "KeyR",
  playPauseKey: "Space",
  autoReplay: false,
  replayDelaySeconds: .5,
  wordSuggestions: false,
  shortcutTips: true,
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const includes = <T extends string | number>(values: readonly T[], value: unknown): value is T => values.includes(value as T);

export function parseListeningPreferences(value: unknown): ListeningPreferences | null {
  if (!isObject(value) || !includes(shortcutKeys, value.replayKey) || !includes(playPauseKeys, value.playPauseKey) || value.replayKey === value.playPauseKey || !includes(replayDelays, value.replayDelaySeconds) || typeof value.autoReplay !== "boolean" || typeof value.wordSuggestions !== "boolean" || typeof value.shortcutTips !== "boolean") return null;
  return { replayKey:value.replayKey, playPauseKey:value.playPauseKey, autoReplay:value.autoReplay, replayDelaySeconds:value.replayDelaySeconds, wordSuggestions:value.wordSuggestions, shortcutTips:value.shortcutTips };
}

export function normalizeListeningPreferences(value: unknown): ListeningPreferences {
  if (!isObject(value)) return { ...defaultListeningPreferences };
  const normalized: ListeningPreferences = {
    replayKey: includes(shortcutKeys, value.replayKey) ? value.replayKey : defaultListeningPreferences.replayKey,
    playPauseKey: includes(playPauseKeys, value.playPauseKey) ? value.playPauseKey : defaultListeningPreferences.playPauseKey,
    autoReplay: typeof value.autoReplay === "boolean" ? value.autoReplay : defaultListeningPreferences.autoReplay,
    replayDelaySeconds: includes(replayDelays, value.replayDelaySeconds) ? value.replayDelaySeconds : defaultListeningPreferences.replayDelaySeconds,
    wordSuggestions: typeof value.wordSuggestions === "boolean" ? value.wordSuggestions : defaultListeningPreferences.wordSuggestions,
    shortcutTips: typeof value.shortcutTips === "boolean" ? value.shortcutTips : defaultListeningPreferences.shortcutTips,
  };
  if (normalized.replayKey === normalized.playPauseKey) normalized.playPauseKey=defaultListeningPreferences.playPauseKey;
  return normalized;
}

export const shortcutLabel = (key: ReplayShortcut | PlayPauseShortcut) => ({ KeyR:"R", ControlLeft:"Ctrl", Backquote:"`", Space:"Space", Enter:"Enter" })[key];
