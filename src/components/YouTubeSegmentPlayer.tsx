import { Pause, Play, RotateCcw } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { lessonT } from "../lessonI18n";
import { createPlaybackSessionController } from "../lib/playbackSession";
import type { UiLocale } from "../types";

interface YouTubePlayerApi {
  destroy(): void;
  getCurrentTime(): number;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    host?: string;
    playerVars?: Record<string, string | number>;
    events: {
      onReady: (event: { target: YouTubePlayerApi }) => void;
      onStateChange: (event: { data: number }) => void;
      onError: () => void;
    };
  }) => YouTubePlayerApi;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | undefined;
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => { youtubeApiPromise=undefined;reject(new Error("youtube_api_timeout")); }, 15_000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("youtube_api_unavailable"));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => { window.clearTimeout(timeout);youtubeApiPromise=undefined;reject(new Error("youtube_api_load_failed")); };
      document.head.append(script);
    }
  });
  return youtubeApiPromise;
}

export interface YouTubeSegmentPlayerHandle {
  replay(): void;
  toggle(): void;
  playSegment(startMs: number, endMs: number): void;
}

interface Props {
  videoId: string;
  startMs: number;
  endMs: number;
  locale: UiLocale;
  playbackRate?: number;
  repeat?: boolean;
  repeatDelayMs?: number;
  onError?: () => void;
  onTimeUpdate?: (timeMs: number) => void;
  onPlaybackComplete?: () => void;
}

const formatTime = (seconds: number) => { const whole = Math.max(0, Math.floor(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`; };

export const YouTubeSegmentPlayer = forwardRef<YouTubeSegmentPlayerHandle, Props>(function YouTubeSegmentPlayer({ videoId, startMs, endMs, locale, playbackRate = 1, repeat = false, repeatDelayMs = 0, onError, onTimeUpdate, onPlaybackComplete }, ref) {
  const containerRef = useRef<HTMLDivElement>(null),playerRef=useRef<YouTubePlayerApi|undefined>(undefined),timerRef=useRef<number|undefined>(undefined),sessionRef=useRef(createPlaybackSessionController());
  const boundsRef=useRef({startMs,endMs}),rateRef=useRef(playbackRate),repeatRef=useRef(repeat),delayRef=useRef(repeatDelayMs),timeUpdateRef=useRef(onTimeUpdate),completionRef=useRef(onPlaybackComplete);
  const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[current,setCurrent]=useState(0),[error,setError]=useState(false);
  boundsRef.current={startMs,endMs};rateRef.current=playbackRate;repeatRef.current=repeat;delayRef.current=repeatDelayMs;timeUpdateRef.current=onTimeUpdate;completionRef.current=onPlaybackComplete;
  const clearTimer=()=>{if(timerRef.current!==undefined)window.clearTimeout(timerRef.current);timerRef.current=undefined;};
  const invalidate=()=>{sessionRef.current.invalidate();clearTimer();};
  const fail=()=>{invalidate();setError(true);setPlaying(false);onError?.();};
  const monitor=(sessionId:number,segmentEndMs:number)=>{if(!sessionRef.current.isActive(sessionId))return;const player=playerRef.current;if(!player)return;const time=player.getCurrentTime();setCurrent(Math.max(0,time-boundsRef.current.startMs/1000));timeUpdateRef.current?.(time*1000);if(time*1000>=segmentEndMs){player.pauseVideo();setPlaying(false);clearTimer();completionRef.current?.();if(repeatRef.current){timerRef.current=window.setTimeout(()=>{if(sessionRef.current.isActive(sessionId))playSegment(boundsRef.current.startMs,boundsRef.current.endMs);},delayRef.current);}return;}timerRef.current=window.setTimeout(()=>monitor(sessionId,segmentEndMs),100);};
  const playSegment=(nextStartMs:number,nextEndMs:number)=>{const player=playerRef.current;if(!player||!ready||error)return;invalidate();boundsRef.current={startMs:nextStartMs,endMs:nextEndMs};const sessionId=sessionRef.current.begin();setCurrent(0);try{player.pauseVideo();player.seekTo(nextStartMs/1000,true);player.setPlaybackRate(rateRef.current);player.playVideo();setPlaying(true);timerRef.current=window.setTimeout(()=>monitor(sessionId,nextEndMs),100);}catch{fail();}};
  const replay=()=>playSegment(boundsRef.current.startMs,boundsRef.current.endMs);
  const pause=()=>{invalidate();playerRef.current?.pauseVideo();setPlaying(false);};
  const toggle=()=>playing?pause():replay();
  useImperativeHandle(ref,()=>({replay,toggle,playSegment}));
  useEffect(()=>{let active=true;const host=containerRef.current;if(!host)return;setReady(false);setError(false);const element=document.createElement("div");host.replaceChildren(element);void loadYouTubeApi().then(api=>{if(!active)return;playerRef.current=new api.Player(element,{videoId,host:"https://www.youtube.com",playerVars:{playsinline:1,rel:0,origin:window.location.origin},events:{onReady:event=>{if(!active)return;playerRef.current=event.target;event.target.setPlaybackRate(rateRef.current);setReady(true);},onStateChange:event=>{if(active)setPlaying(event.data===1);},onError:fail}});}).catch(fail);return()=>{active=false;invalidate();playerRef.current?.destroy();playerRef.current=undefined;host.replaceChildren();};},[videoId]);
  useEffect(()=>{invalidate();playerRef.current?.pauseVideo();setPlaying(false);setCurrent(0);boundsRef.current={startMs,endMs};},[startMs,endMs]);
  useEffect(()=>{if(ready)playerRef.current?.setPlaybackRate(playbackRate);},[playbackRate,ready]);
  const duration=Math.max(0,(endMs-startMs)/1000);
  return <div className={`youtube-segment-player${error?" has-error":""}`}><div className="youtube-player-frame" ref={containerRef}/><div className="segment-player youtube-controls"><button type="button" className={`play-main ${playing?"playing":""}`} onClick={toggle} disabled={!ready||error} aria-label={lessonT(locale,playing?"pauseSentence":"playSentence")}>{playing?<Pause size={27} fill="currentColor"/>:<Play size={29} fill="currentColor"/>}</button><input aria-label={lessonT(locale,"seekSentence")} type="range" min="0" max={Math.max(duration,.01)} step="0.1" value={Math.min(current,duration)} disabled={!ready||error} onChange={event=>{const offset=Number(event.target.value);setCurrent(offset);playerRef.current?.seekTo(startMs/1000+offset,true);}}/><span className="audio-time">{formatTime(current)} / {formatTime(duration)}</span><button type="button" className="audio-replay-button" onClick={replay} disabled={!ready||error} aria-label={lessonT(locale,"repeatSentence")}><RotateCcw size={16}/></button>{error&&<span className="audio-error" role="alert">{lessonT(locale,"audioConnectionError")}</span>}</div></div>;
});
