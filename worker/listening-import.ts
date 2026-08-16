import { alignTranscriptToVtt, validateAlignedSentences, type AlignedSentence } from "../src/lib/ingestion";

/**
 * Processing boundary for lesson alignment. It has no request/response concerns,
 * so it can be moved to a Queue consumer without changing the admin API.
 */
export async function alignLessonImport(env: Env, audio: Blob, transcript: string, durationMs: number): Promise<AlignedSentence[]> {
  const encoded = arrayBufferToBase64(await audio.arrayBuffer());
  const result = await env.AI.run("@cf/openai/whisper", encoded);
  const vtt = typeof result === "object" && result && "vtt" in result && typeof result.vtt === "string" ? result.vtt : "";
  const sentences = alignTranscriptToVtt(transcript, vtt, durationMs);
  const errors = validateAlignedSentences(sentences, durationMs);
  if (errors.length) throw new Error(errors.join(","));
  return sentences;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 32768)));
  }
  return btoa(binary);
}
