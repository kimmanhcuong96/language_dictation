const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

export function parseYouTubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;

  let candidate: string | null = null;
  if (url.hostname === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch") candidate = url.searchParams.get("v");
    else {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(kind)) candidate = id ?? null;
    }
  }
  return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null;
}

export function parseYouTubeLinkText(text: string): string | null {
  const normalized = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = normalized.split(/\r\n|\n|\r/u).filter((line) => line.trim());
  return lines.length === 1 ? parseYouTubeVideoId(lines[0]) : null;
}
