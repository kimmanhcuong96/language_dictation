export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(), url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration * 1000); cleanup();
      Number.isFinite(duration) && duration > 0 ? resolve(duration) : reject(new Error("invalid_audio_duration"));
    };
    audio.onerror = () => { cleanup(); reject(new Error("audio_metadata_unreadable")); };
    audio.src = url;
  });
}
