import { EyeOff, Headphones, Pause, Play, RotateCcw } from "lucide-react";
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

/** What `new YT.Player()` hands back straight away: the object exists, but its playback methods are
 *  only attached once the iframe finishes loading and `onReady` fires. Typing it as partial keeps
 *  callers from treating a half-built player as usable. */
type YouTubePlayerInstance = Partial<YouTubePlayerApi>;

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
  }) => YouTubePlayerInstance;
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
  playSegment(startMs: number, endMs: number, allowRepeat?: boolean): void;
  resume(): void;
  setBounds(startMs: number, endMs: number): void;
}

interface Props {
  videoId: string;
  startMs: number;
  endMs: number;
  locale: UiLocale;
  playbackRate?: number;
  repeat?: boolean;
  repeatDelayMs?: number;
  showControls?: boolean;
  onError?: () => void;
  onTimeUpdate?: (timeMs: number) => void;
  onPlaybackComplete?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}

const formatTime = (seconds: number) => { const whole = Math.max(0, Math.floor(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`; };
const HIDE_VIDEO_STORAGE_KEY = "me2listen-hide-youtube-video";

export const YouTubeSegmentPlayer = forwardRef<YouTubeSegmentPlayerHandle, Props>(function YouTubeSegmentPlayer({ videoId, startMs, endMs, locale, playbackRate = 1, repeat = false, repeatDelayMs = 0, showControls = true, onError, onTimeUpdate, onPlaybackComplete, onPlayingChange }, ref) {
  // playerRef only ever holds a player that has fired onReady, so every playerRef.current?.x() call
  // below is safe by construction. instanceRef tracks the half-built constructor result purely so
  // teardown can dispose of it.
  const containerRef = useRef<HTMLDivElement>(null),playerRef=useRef<YouTubePlayerApi|undefined>(undefined),instanceRef=useRef<YouTubePlayerInstance|undefined>(undefined),timerRef=useRef<number|undefined>(undefined),sessionRef=useRef(createPlaybackSessionController());
  const boundsRef=useRef({startMs,endMs}),rateRef=useRef(playbackRate),repeatRef=useRef(repeat),delayRef=useRef(repeatDelayMs),timeUpdateRef=useRef(onTimeUpdate),completionRef=useRef(onPlaybackComplete),playingChangeRef=useRef(onPlayingChange),segmentRepeatRef=useRef(repeat),monitorRef=useRef<(sessionId:number,segmentEndMs:number)=>void>(undefined);
  const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[current,setCurrent]=useState(0),[error,setError]=useState(false),[activeBounds,setActiveBounds]=useState({startMs,endMs});
  const [hideVideo,setHideVideo]=useState(()=>{try{return localStorage.getItem(HIDE_VIDEO_STORAGE_KEY)==="true";}catch{return false;}});
  const toggleHideVideo=()=>setHideVideo(value=>{const next=!value;try{localStorage.setItem(HIDE_VIDEO_STORAGE_KEY,String(next));}catch{/* ignore storage errors (private mode, quota) */}return next;});
  boundsRef.current={startMs,endMs};rateRef.current=playbackRate;repeatRef.current=repeat;delayRef.current=repeatDelayMs;timeUpdateRef.current=onTimeUpdate;completionRef.current=onPlaybackComplete;playingChangeRef.current=onPlayingChange;
  const setPlayingState=(value:boolean)=>{setPlaying(value);playingChangeRef.current?.(value);};
  const clearTimer=()=>{if(timerRef.current!==undefined)window.clearTimeout(timerRef.current);timerRef.current=undefined;};
  const invalidate=()=>{sessionRef.current.invalidate();clearTimer();};
  const fail=()=>{invalidate();setError(true);setPlayingState(false);onError?.();};
  const disposePlayer=()=>{const instance=instanceRef.current;instanceRef.current=undefined;playerRef.current=undefined;if(typeof instance?.destroy!=="function")return;try{instance.destroy();}catch{/* the IFrame API can throw when teardown races initialisation */}};
  const monitor=(sessionId:number,segmentEndMs:number)=>{if(!sessionRef.current.isActive(sessionId))return;const player=playerRef.current;if(!player)return;const time=player.getCurrentTime();setCurrent(Math.max(0,time-boundsRef.current.startMs/1000));timeUpdateRef.current?.(time*1000);if(time*1000>=segmentEndMs){player.pauseVideo();setPlayingState(false);clearTimer();completionRef.current?.();if(segmentRepeatRef.current){timerRef.current=window.setTimeout(()=>{if(sessionRef.current.isActive(sessionId))playSegment(boundsRef.current.startMs,boundsRef.current.endMs);},delayRef.current);}return;}timerRef.current=window.setTimeout(()=>monitor(sessionId,segmentEndMs),100);};
  monitorRef.current=monitor;
  const playSegment=(nextStartMs:number,nextEndMs:number,allowRepeat?:boolean)=>{const player=playerRef.current;if(!player||!ready||error)return;invalidate();boundsRef.current={startMs:nextStartMs,endMs:nextEndMs};setActiveBounds({startMs:nextStartMs,endMs:nextEndMs});segmentRepeatRef.current=allowRepeat??repeatRef.current;const sessionId=sessionRef.current.begin();setCurrent(0);try{player.pauseVideo();player.seekTo(nextStartMs/1000,true);player.setPlaybackRate(rateRef.current);player.playVideo();setPlayingState(true);timerRef.current=window.setTimeout(()=>monitor(sessionId,nextEndMs),100);}catch{fail();}};
  const replay=()=>playSegment(boundsRef.current.startMs,boundsRef.current.endMs);
  const pause=()=>{invalidate();playerRef.current?.pauseVideo();setPlayingState(false);};
  const resume=()=>{const player=playerRef.current;if(!player||!ready||error||playing)return;invalidate();const sessionId=sessionRef.current.begin();try{player.setPlaybackRate(rateRef.current);player.playVideo();setPlayingState(true);timerRef.current=window.setTimeout(()=>monitor(sessionId,boundsRef.current.endMs),100);}catch{fail();}};
  const toggle=()=>playing?pause():replay();
  const setBounds=(nextStartMs:number,nextEndMs:number)=>{invalidate();playerRef.current?.pauseVideo();setPlayingState(false);setCurrent(0);boundsRef.current={startMs:nextStartMs,endMs:nextEndMs};setActiveBounds({startMs:nextStartMs,endMs:nextEndMs});};
  useImperativeHandle(ref,()=>({replay,toggle,playSegment,resume,setBounds}));
  useEffect(()=>{let active=true;const host=containerRef.current;if(!host)return;setReady(false);setError(false);const element=document.createElement("div");host.replaceChildren(element);void loadYouTubeApi().then(api=>{if(!active)return;instanceRef.current=new api.Player(element,{videoId,host:"https://www.youtube.com",playerVars:{playsinline:1,rel:0,cc_load_policy:0,origin:window.location.origin},events:{onReady:event=>{if(!active)return;playerRef.current=event.target;instanceRef.current=event.target;event.target.setPlaybackRate(rateRef.current);setReady(true);},onStateChange:event=>{if(!active)return;const isPlaying=event.data===1;setPlayingState(isPlaying);const player=playerRef.current;if(player)timeUpdateRef.current?.(player.getCurrentTime()*1000);if(isPlaying&&timerRef.current===undefined){const sessionId=sessionRef.current.begin();timerRef.current=window.setTimeout(()=>monitorRef.current?.(sessionId,boundsRef.current.endMs),100);}},onError:fail}});}).catch(fail);return()=>{active=false;invalidate();disposePlayer();host.replaceChildren();};},[videoId]);
  useEffect(()=>{invalidate();playerRef.current?.pauseVideo();setPlayingState(false);setCurrent(0);boundsRef.current={startMs,endMs};setActiveBounds({startMs,endMs});},[startMs,endMs]);
  useEffect(()=>{if(!ready)return;const interval=window.setInterval(()=>{const player=playerRef.current;if(!player)return;const time=player.getCurrentTime();setCurrent(Math.max(0,time-boundsRef.current.startMs/1000));timeUpdateRef.current?.(time*1000);},400);return()=>window.clearInterval(interval);},[ready]);
  useEffect(()=>{if(ready)playerRef.current?.setPlaybackRate(playbackRate);},[playbackRate,ready]);
  const duration=Math.max(0,(activeBounds.endMs-activeBounds.startMs)/1000);
  return <div className={`youtube-segment-player${error?" has-error":""}`}>
    <div className="youtube-video-toolbar">
      <label className="youtube-video-switch">
        <EyeOff size={15} aria-hidden="true"/><span>{lessonT(locale,"hideVideo")}</span>
        <span className="switch"><input type="checkbox" checked={hideVideo} onChange={toggleHideVideo}/><i/></span>
      </label>
    </div>
    <div className="youtube-player-shell">
      <div className="youtube-player-frame" ref={containerRef} inert={hideVideo}/>
      {hideVideo&&<div className="youtube-video-cover" role="status"><Headphones size={26} aria-hidden="true"/><span>{lessonT(locale,"videoHiddenMessage")}</span></div>}
    </div>
    {showControls&&<div className="segment-player youtube-controls"><button type="button" className={`play-main ${playing?"playing":""}`} onClick={toggle} disabled={!ready||error} aria-label={lessonT(locale,playing?"pauseSentence":"playSentence")}>{playing?<Pause size={27} fill="currentColor"/>:<Play size={29} fill="currentColor"/>}</button><input aria-label={lessonT(locale,"seekSentence")} type="range" min="0" max={Math.max(duration,.01)} step="0.1" value={Math.min(current,duration)} disabled={!ready||error} onChange={event=>{const offset=Number(event.target.value);setCurrent(offset);const absoluteMs=activeBounds.startMs+offset*1000;playerRef.current?.seekTo(absoluteMs/1000,true);timeUpdateRef.current?.(absoluteMs);}}/><span className="audio-time">{formatTime(current)} / {formatTime(duration)}</span><button type="button" className="audio-replay-button" onClick={replay} disabled={!ready||error} aria-label={lessonT(locale,"repeatSentence")}><RotateCcw size={16}/></button>{error&&<span className="audio-error" role="alert">{lessonT(locale,"audioConnectionError")}</span>}</div>}</div>;
});
