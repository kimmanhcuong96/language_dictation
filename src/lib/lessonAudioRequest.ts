const PAGE_AUDIO_REQUEST_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function buildLessonAudioRequestUrl(source: string, attempt = 0, pageRequestId = PAGE_AUDIO_REQUEST_ID) {
  if (attempt === 0) return source;
  const hashIndex = source.indexOf("#");
  const url = hashIndex === -1 ? source : source.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : source.slice(hashIndex);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}audio_request=${encodeURIComponent(`${pageRequestId}-${attempt}`)}${hash}`;
}
