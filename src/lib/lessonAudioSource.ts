import { useCallback, useEffect, useState } from "react";

type AudioSourceState =
  | { status: "idle" | "loading" | "error"; src?: undefined }
  | { status: "ready"; src: string };

type InternalAudioSourceState = AudioSourceState & { source?: string; attempt: number };

export async function downloadLessonAudio(source: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(source, {
    credentials: "same-origin",
    signal,
    headers: { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.1" },
  });
  if (!response.ok) throw new Error(`audio_download_failed_${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("audio_download_empty");
  return blob;
}

export function useLessonAudioSource(source?: string | null): AudioSourceState & { retry(): void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<InternalAudioSourceState>({ status: "idle", attempt: 0 });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!source) {
      setState({ status: "idle", attempt });
      return;
    }
    const controller = new AbortController();
    let active = true, objectUrl: string | undefined;
    setState({ source, status: "loading", attempt });
    void downloadLessonAudio(source, controller.signal).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (!active) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; return; }
      setState({ source, status: "ready", src: objectUrl, attempt });
    }).catch((error: unknown) => {
      if (active && !(error instanceof DOMException && error.name === "AbortError")) setState({ source, status: "error", attempt });
    });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, attempt]);

  const current = state.source === source && state.attempt === attempt
    ? state
    : { status: source ? "loading" as const : "idle" as const };
  return { ...current, retry };
}
