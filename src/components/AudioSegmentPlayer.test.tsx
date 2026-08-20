import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSegmentPlayer, type AudioSegmentPlayerHandle } from "./AudioSegmentPlayer";

afterEach(() => vi.restoreAllMocks());

describe("AudioSegmentPlayer", () => {
  it("streams from the stable lesson URL without creating a Blob source", () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const source = "/api/listening/audio/listening/en/lessons/lesson-id/audio.mp3";
    const { container } = render(<AudioSegmentPlayer locale="en" src={source} startMs={0} endMs={1000} />);
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toBe(source);
    expect(audio?.getAttribute("preload")).toBe("metadata");
  });

  it("invalidates a pending play request when the sentence changes", async () => {
    let resolvePlay!: () => void;
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => new Promise<void>((resolve) => { resolvePlay=resolve; }));
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const requestFrame=vi.spyOn(window,"requestAnimationFrame").mockImplementation(()=>1);
    const ref=createRef<AudioSegmentPlayerHandle>();
    const view=render(<AudioSegmentPlayer ref={ref} locale="en" src="/audio.mp3" startMs={0} endMs={1000}/>);
    act(()=>ref.current?.replay());
    expect(play).toHaveBeenCalledTimes(1);
    view.rerender(<AudioSegmentPlayer ref={ref} locale="en" src="/audio.mp3" startMs={2000} endMs={3000}/>);
    await act(async()=>resolvePlay());
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("emits playback completion after reaching the sentence end", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    let frame:FrameRequestCallback|undefined;
    vi.spyOn(window,"requestAnimationFrame").mockImplementation(callback=>{frame=callback;return 1;});
    const complete=vi.fn(),ref=createRef<AudioSegmentPlayerHandle>();
    const {container}=render(<AudioSegmentPlayer ref={ref} locale="en" src="/audio.mp3" startMs={0} endMs={1000} paddingMs={0} onPlaybackComplete={complete}/>);
    const audio=container.querySelector("audio")!;
    Object.defineProperty(audio,"currentTime",{configurable:true,writable:true,value:0});
    await act(async()=>ref.current?.replay());
    audio.currentTime=1;
    act(()=>frame?.(performance.now()));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
