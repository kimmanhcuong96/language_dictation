import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeSegmentPlayer, type YouTubeSegmentPlayerHandle } from "./YouTubeSegmentPlayer";

afterEach(() => {
  vi.useRealTimers();
  delete window.YT;
  vi.restoreAllMocks();
});

describe("YouTubeSegmentPlayer", () => {
  it("keeps one IFrame Player instance when the active sentence changes", async () => {
    const player={destroy:vi.fn(),getCurrentTime:vi.fn(()=>0),pauseVideo:vi.fn(),playVideo:vi.fn(),seekTo:vi.fn(),setPlaybackRate:vi.fn()};
    const Player=vi.fn(function(){return player;});
    Object.defineProperty(window,"YT",{configurable:true,value:{Player}});
    const view=render(<YouTubeSegmentPlayer videoId="dQw4w9WgXcQ" startMs={1000} endMs={2000} locale="en"/>);
    await waitFor(()=>expect(Player).toHaveBeenCalledTimes(1));
    view.rerender(<YouTubeSegmentPlayer videoId="dQw4w9WgXcQ" startMs={3000} endMs={4000} locale="en"/>);
    expect(Player).toHaveBeenCalledTimes(1);
  });

  it("completes only the active playback session", async () => {
    vi.useFakeTimers();
    let currentTime=0;
    const player={destroy:vi.fn(),getCurrentTime:vi.fn(()=>currentTime),pauseVideo:vi.fn(),playVideo:vi.fn(),seekTo:vi.fn(),setPlaybackRate:vi.fn()};
    const Player=vi.fn(function(_element:HTMLElement,options:{events:{onReady:(event:{target:typeof player})=>void}}){options.events.onReady({target:player});return player;});
    Object.defineProperty(window,"YT",{configurable:true,value:{Player}});
    const complete=vi.fn(),ref=createRef<YouTubeSegmentPlayerHandle>();
    render(<YouTubeSegmentPlayer ref={ref} videoId="dQw4w9WgXcQ" startMs={1000} endMs={2000} locale="en" onPlaybackComplete={complete}/>);
    await act(async()=>Promise.resolve());
    act(()=>{ref.current?.playSegment(1000,2000);ref.current?.playSegment(3000,4000);});
    currentTime=4;
    act(()=>vi.advanceTimersByTime(100));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
