export const shortcutKeys = ["Control", "Shift", "Alt", "Meta", "Control+Shift", "Control+Alt", "Control+Space", "Control+KeyB"] as const;
export const playPauseKeys = ["Backquote"] as const;
export const replayDelays = [0, .5, 1, 2, 3] as const;

export type ReplayShortcut = typeof shortcutKeys[number];
export type PlayPauseShortcut = typeof playPauseKeys[number];
export type ReplayDelay = typeof replayDelays[number];
export interface ReplayKeyboardEvent { key:string; code:string; ctrlKey:boolean; shiftKey:boolean; altKey:boolean; metaKey:boolean }

export interface ListeningPreferences {
  replayKey: ReplayShortcut;
  playPauseKey: PlayPauseShortcut;
  autoReplay: boolean;
  replayDelaySeconds: ReplayDelay;
  wordSuggestions: boolean;
  shortcutTips: boolean;
}

export const defaultListeningPreferences: ListeningPreferences = {
  replayKey: "Control",
  playPauseKey: "Backquote",
  autoReplay: false,
  replayDelaySeconds: .5,
  wordSuggestions: false,
  shortcutTips: true,
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const includes = <T extends string | number>(values: readonly T[], value: unknown): value is T => values.includes(value as T);

export function parseListeningPreferences(value: unknown): ListeningPreferences | null {
  if (!isObject(value) || !includes(shortcutKeys, value.replayKey) || !includes(playPauseKeys, value.playPauseKey) || !includes(replayDelays, value.replayDelaySeconds) || typeof value.autoReplay !== "boolean" || typeof value.wordSuggestions !== "boolean" || typeof value.shortcutTips !== "boolean") return null;
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
  return normalized;
}

export const shortcutLabel = (key: ReplayShortcut | PlayPauseShortcut) => ({ Control:"Ctrl", Shift:"Shift", Alt:"Alt", Meta:"Command", "Control+Shift":"Ctrl + Shift", "Control+Alt":"Ctrl + Alt", "Control+Space":"Ctrl + Space", "Control+KeyB":"Ctrl + b", Backquote:"`", Space:"Space", Enter:"Enter" })[key];

export function matchesReplayShortcut(event: ReplayKeyboardEvent, shortcut: ReplayShortcut): boolean {
  if (shortcut==="Control") return event.key==="Control"&&!event.shiftKey&&!event.altKey&&!event.metaKey;
  if (shortcut==="Shift") return event.key==="Shift"&&!event.ctrlKey&&!event.altKey&&!event.metaKey;
  if (shortcut==="Alt") return event.key==="Alt"&&!event.ctrlKey&&!event.shiftKey&&!event.metaKey;
  if (shortcut==="Meta") return event.key==="Meta"&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;
  if (shortcut==="Control+Shift") return event.ctrlKey&&event.shiftKey&&!event.altKey&&!event.metaKey&&(event.key==="Control"||event.key==="Shift");
  if (shortcut==="Control+Alt") return event.ctrlKey&&event.altKey&&!event.shiftKey&&!event.metaKey&&(event.key==="Control"||event.key==="Alt");
  if (shortcut==="Control+Space") return event.code==="Space"&&event.ctrlKey&&!event.shiftKey&&!event.altKey&&!event.metaKey;
  return event.code==="KeyB"&&event.ctrlKey&&!event.shiftKey&&!event.altKey&&!event.metaKey;
}
