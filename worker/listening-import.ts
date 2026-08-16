import { alignTranscriptToVtt, validateAlignedSentences, type AlignedSentence } from "../src/lib/ingestion";

/**
 * Processing boundary for lesson alignment. It has no request/response concerns,
 * so it can be moved to a Queue consumer without changing the admin API.
 */
export async function alignLessonImport(env: Env, audio: Blob, transcript: string, durationMs: number): Promise<AlignedSentence[]> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = env.CLOUDFLARE_AI_TOKEN?.trim();
  const model = env.CLOUDFLARE_AI_MODEL?.trim();
  if (!accountId || !token || !model) throw new Error("workers_ai_not_configured");
  if (!/^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/u.test(model)) throw new Error("workers_ai_model_invalid");
  const modelPath = model.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": audio.type || "application/octet-stream",
      Accept: "application/json",
    },
    body: await audio.arrayBuffer(),
  });
  if (!response.ok) throw new Error(`workers_ai_request_failed_${response.status}`);
  const payload = await response.json() as { result?: unknown; success?: boolean };
  if (payload.success === false) throw new Error("workers_ai_request_unsuccessful");
  const result = payload.result;
  const vtt = typeof result === "object" && result !== null && "vtt" in result && typeof result.vtt === "string" ? result.vtt : "";
  if (!vtt) throw new Error("workers_ai_missing_vtt");
  const sentences = alignTranscriptToVtt(transcript, vtt, durationMs);
  const errors = validateAlignedSentences(sentences, durationMs);
  if (errors.length) throw new Error(errors.join(","));
  return sentences;
}
