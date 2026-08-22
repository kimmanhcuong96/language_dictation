import { act, render, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeSegmentPlayer, type YouTubeSegmentPlayerHandle } from "./YouTubeSegmentPlayer";

afterEach(() => {
  vi.useRealTimers();
  delete window.YT;
  vi.restoreAllMocks();
  localStorage.removeItem("me2listen-hide-youtube-video");
});

describe("YouTubeSegmentPlayer", () => {
  it("keeps one IFrame Player instance when the active sentence changes", async () => {
    const player={destroy:vi.fn(),getCurrentTime:vi.fn(()=>0),pauseVideo:vi.fn(),playVideo:vi.fn(),seekTo:vi.fn(),setPlaybackRate:vi.fn()};
    const Player=vi.fn(function(){return player;});
    Object.defineProperty(window,"YT",{configurable:true,value:{Player}});
    const view=render(<YouTubeSegmentPlayer videoId="dQw4w9WgXcQ" startMs={1000} endMs={2000} locale="en"/>);
    await waitFor(()=>expect(Player).toHaveBeenCalledTimes(1));
    expect(Player).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({host:"https://www.youtube.com"}));
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

  it("toggles a cover over the video, makes the covered player inert, and remembers the choice", async () => {
    const player={destroy:vi.fn(),getCurrentTime:vi.fn(()=>0),pauseVideo:vi.fn(),playVideo:vi.fn(),seekTo:vi.fn(),setPlaybackRate:vi.fn()};
    const Player=vi.fn(function(){return player;});
    Object.defineProperty(window,"YT",{configurable:true,value:{Player}});
    localStorage.removeItem("me2listen-hide-youtube-video");
    const view=render(<YouTubeSegmentPlayer videoId="dQw4w9WgXcQ" startMs={1000} endMs={2000} locale="en"/>);
    await waitFor(()=>expect(Player).toHaveBeenCalledTimes(1));

    expect(view.container.querySelector(".youtube-video-cover")).toBeNull();
    expect(view.container.querySelector(".youtube-player-frame")).not.toHaveAttribute("inert");

    const switchInput=within(view.container).getByRole("checkbox",{name:"Hide video"});
    act(()=>switchInput.click());
    expect(view.container.querySelector(".youtube-video-cover")).not.toBeNull();
    expect(view.container.querySelector(".youtube-player-frame")).toHaveAttribute("inert");
    expect(localStorage.getItem("me2listen-hide-youtube-video")).toBe("true");

    act(()=>switchInput.click());
    expect(view.container.querySelector(".youtube-video-cover")).toBeNull();
    expect(view.container.querySelector(".youtube-player-frame")).not.toHaveAttribute("inert");
    expect(localStorage.getItem("me2listen-hide-youtube-video")).toBe("false");
    view.unmount();
  });

  it("starts covered when a prior session left the preference set", async () => {
    const player={destroy:vi.fn(),getCurrentTime:vi.fn(()=>0),pauseVideo:vi.fn(),playVideo:vi.fn(),seekTo:vi.fn(),setPlaybackRate:vi.fn()};
    const Player=vi.fn(function(){return player;});
    Object.defineProperty(window,"YT",{configurable:true,value:{Player}});
    localStorage.setItem("me2listen-hide-youtube-video","true");
    const view=render(<YouTubeSegmentPlayer videoId="dQw4w9WgXcQ" startMs={1000} endMs={2000} locale="en"/>);
    await waitFor(()=>expect(Player).toHaveBeenCalledTimes(1));
    expect(view.container.querySelector(".youtube-video-cover")).not.toBeNull();
    localStorage.removeItem("me2listen-hide-youtube-video");
  });
});
