import { Pause, Play, RotateCcw } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { getSegmentBounds, toRealTime, toVirtualTime } from "../lib/audioSegment";

export interface AudioSegmentPlayerHandle { replay(): void; toggle(): void; }
interface Props { src: string; startMs: number; endMs: number; playbackRate?: number; repeat?: boolean; paddingMs?: number; onError?: () => void; }

const formatTime = (seconds: number) => { const whole = Math.max(0, Math.floor(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`; };

export const AudioSegmentPlayer = forwardRef<AudioSegmentPlayerHandle, Props>(function AudioSegmentPlayer({ src, startMs, endMs, playbackRate = 1, repeat = false, paddingMs = 50, onError }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null); const frameRef = useRef<number | undefined>(undefined);
  const [audioDuration, setAudioDuration] = useState<number>(); const [playing, setPlaying] = useState(false); const [current, setCurrent] = useState(0); const [error, setError] = useState(false);
  const bounds = useMemo(() => getSegmentBounds(startMs, endMs, audioDuration, paddingMs), [startMs, endMs, audioDuration, paddingMs]);
  const stopLoop = () => { if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current); frameRef.current = undefined; };
  const pause = () => { stopLoop(); audioRef.current?.pause(); setPlaying(false); };
  const monitor = () => { const audio = audioRef.current; if (!audio) return; const virtual = toVirtualTime(audio.currentTime, bounds.startSeconds, bounds.durationSeconds); setCurrent(virtual); if (audio.currentTime >= bounds.endSeconds - .01) { audio.pause(); setPlaying(false); stopLoop(); if (repeat) replay(); else { audio.currentTime = bounds.endSeconds; setCurrent(bounds.durationSeconds); } return; } frameRef.current = requestAnimationFrame(monitor); };
  const replay = () => { const audio = audioRef.current; if (!audio || error) return; stopLoop(); audio.currentTime = bounds.startSeconds; audio.playbackRate = playbackRate; void audio.play().then(() => { setPlaying(true); frameRef.current = requestAnimationFrame(monitor); }).catch(() => { setError(true); onError?.(); }); };
  const toggle = () => playing ? pause() : replay();
  useImperativeHandle(ref, () => ({ replay, toggle }));
  useEffect(() => { const audio = audioRef.current; pause(); setCurrent(0); setError(false); if (audio) audio.currentTime = bounds.startSeconds; return stopLoop; }, [src, bounds.startSeconds, bounds.endSeconds]);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);
  return <div className={`segment-player ${error ? "has-error" : ""}`}><audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)} onError={() => { pause(); setError(true); onError?.(); }} /><button type="button" className={`play-main ${playing ? "playing" : ""}`} onClick={toggle} disabled={error} aria-label={playing ? "Pause sentence" : "Play sentence"}>{playing ? <Pause size={27} fill="currentColor" /> : <Play size={29} fill="currentColor" />}</button><input aria-label="Seek within sentence" type="range" min="0" max={Math.max(bounds.durationSeconds, .01)} step="0.01" value={Math.min(current, bounds.durationSeconds)} disabled={error} onChange={(event) => { const value = Number(event.target.value); setCurrent(value); if (audioRef.current) audioRef.current.currentTime = toRealTime(value, bounds.startSeconds, bounds.durationSeconds); }} /><span className="audio-time">{formatTime(current)} / {formatTime(bounds.durationSeconds)}</span><button type="button" onClick={replay} disabled={error} aria-label="Repeat sentence"><RotateCcw size={16} /></button>{error && <span className="audio-error" role="alert">Audio unavailable. Retry after checking your connection.</span>}</div>;
});
