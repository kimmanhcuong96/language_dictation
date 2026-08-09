const baseUrl = (import.meta.env.VITE_AUDIO_BASE_URL as string | undefined)?.replace(/\/$/, "");

export const resolveAudioUrl = (path?: string) => {
  if (!path) return undefined;
  return baseUrl ? `${baseUrl}/${path}` : `/audio/${path}`;
};

export const speak = (text: string, rate = 1, accent: "US" | "UK" | "Mandarin" | "Tokyo" = "US") => {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accent === "UK" ? "en-GB" : accent === "Mandarin" ? "zh-CN" : accent === "Tokyo" ? "ja-JP" : "en-US";
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang === utterance.lang) ?? null;
  window.speechSynthesis.speak(utterance);
  return true;
};
