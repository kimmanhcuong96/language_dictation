import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadLessonAudio, useLessonAudioSource } from "./lessonAudioSource";

afterEach(() => vi.restoreAllMocks());

describe("lesson audio download", () => {
  it("downloads the complete MP3 without a Range header", async () => {
    const blob = new Blob(["mp3"], { type: "audio/mpeg" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, blob: async () => blob } as Response);
    const result = await downloadLessonAudio("/api/listening/audio/lesson.mp3", new AbortController().signal);
    expect(result).toBe(blob);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("headers.Range");
  });

  it("creates one reusable Blob URL and releases it on unmount", async () => {
    const blob = new Blob(["mp3"], { type: "audio/mpeg" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, blob: async () => blob } as Response);
    const createObjectURL = vi.fn(() => "blob:lesson-audio"), revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const { result, unmount } = renderHook(() => useLessonAudioSource("/api/listening/audio/lesson.mp3"));
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", src: "blob:lesson-audio" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:lesson-audio");
  });

  it("exposes a retry after a failed download", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 503 } as Response).mockResolvedValueOnce({ ok: true, status: 200, blob: async () => new Blob(["mp3"]) } as Response);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:retried-audio") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const { result } = renderHook(() => useLessonAudioSource("/api/listening/audio/lesson.mp3"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
