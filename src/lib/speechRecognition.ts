export const SPEECH_RECOGNITION_LOCALES = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
} as const;

export type SpeechRecognitionErrorKind = "permission" | "noSpeech" | "audioCapture" | "network" | "languageUnsupported" | "unknown";

interface SpeechRecognitionAlternativeLike { transcript: string; }
interface SpeechRecognitionResultLike { readonly length: number; readonly isFinal: boolean; readonly [index: number]: SpeechRecognitionAlternativeLike; }
export interface SpeechRecognitionResultListLike { readonly length: number; readonly [index: number]: SpeechRecognitionResultLike; }
export interface SpeechRecognitionEventLike extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultListLike; }
export interface SpeechRecognitionErrorEventLike extends Event { readonly error: string; readonly message?: string; }

export interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionLocale(languageCode: unknown): string | null {
  if (typeof languageCode !== "string") return null;
  const normalized = languageCode.trim().toLocaleLowerCase().split("-")[0] as keyof typeof SPEECH_RECOGNITION_LOCALES;
  return SPEECH_RECOGNITION_LOCALES[normalized] ?? null;
}

export function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function collectRecognizedSpeech(results: SpeechRecognitionResultListLike, languageCode: string): string {
  const separator = usesWordSpacing(languageCode) ? " " : "";
  const transcripts: string[] = [];
  for (let index = 0; index < results.length; index += 1) {
    const transcript = results[index]?.[0]?.transcript?.trim();
    if (transcript) transcripts.push(transcript);
  }
  return transcripts.join(separator).trim();
}

export function mergeRecognizedSpeech(existingText: string, recognizedText: string, languageCode: string): string {
  const recognized = recognizedText.trim();
  if (!recognized) return existingText;
  if (!existingText) return recognized;
  const separator = usesWordSpacing(languageCode) && !/\s$/u.test(existingText) ? " " : "";
  return `${existingText}${separator}${recognized}`;
}

export function classifySpeechRecognitionError(error: string): SpeechRecognitionErrorKind | null {
  if (error === "aborted") return null;
  if (error === "not-allowed" || error === "service-not-allowed") return "permission";
  if (error === "no-speech") return "noSpeech";
  if (error === "audio-capture") return "audioCapture";
  if (error === "network") return "network";
  if (error === "language-not-supported") return "languageUnsupported";
  return "unknown";
}

export function abortSpeechRecognition(recognition: BrowserSpeechRecognition | null): void {
  if (!recognition) return;
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try { recognition.abort(); } catch { /* The browser may already have ended the session. */ }
}

function usesWordSpacing(languageCode: string) {
  const normalized = languageCode.trim().toLocaleLowerCase().split("-")[0];
  return normalized !== "zh" && normalized !== "ja";
}
