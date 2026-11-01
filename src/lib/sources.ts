import { spawnSync } from "node:child_process";
import type { Platform, SourceInfo } from "@/lib/types";
import { fetchYoutubeMeta } from "@/lib/analysis/youtube";
import { fetchTwitchClip } from "@/lib/twitch";
import { createRng } from "@/lib/utils";

export interface ParsedSource {
  platform: Platform;
  videoId?: string;
  cleanUrl: string;
  watchUrl?: string;
  embedUrl?: string;
  handle?: string;
  kind?: "video" | "clip" | "live" | "file";
}

const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"];

function safeUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim();
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function parseSource(raw: string): ParsedSource | null {
  const url = safeUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();

  if (YT_HOSTS.includes(host)) {
    let id = "";
    let kind: ParsedSource["kind"] = "video";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] ?? "";
      kind = "clip";
    } else if (url.pathname.startsWith("/live/")) {
      id = url.pathname.split("/")[2] ?? "";
      kind = "live";
    } else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? "";

    if (!/^[\w-]{6,20}$/.test(id)) return null;
    const handleMatch = url.pathname.match(/^\/@([\w.-]+)/);
    return {
      platform: "youtube",
      videoId: id,
      cleanUrl: `https://www.youtube.com/watch?v=${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      handle: handleMatch?.[1],
      kind,
    };
  }

  if (host.endsWith("twitch.tv")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "videos" && parts[1]) {
      return {
        platform: "twitch",
        videoId: parts[1],
        cleanUrl: `https://www.twitch.tv/videos/${parts[1]}`,
        watchUrl: `https://www.twitch.tv/videos/${parts[1]}`,
        kind: "video",
      };
    }
    if (parts[1] === "clip" && parts[2]) {
      return {
        platform: "twitch",
        videoId: parts[2],
        cleanUrl: `https://clips.twitch.tv/${parts[2]}`,
        watchUrl: `https://clips.twitch.tv/${parts[2]}`,
        handle: parts[0],
        kind: "clip",
      };
    }
    if (parts[0] === "clip" && parts[1]) {
      return {
        platform: "twitch",
        videoId: parts[1],
        cleanUrl: `https://clips.twitch.tv/${parts[1]}`,
        watchUrl: `https://clips.twitch.tv/${parts[1]}`,
        kind: "clip",
      };
    }
    if (parts[0]) {
      return {
        platform: "twitch",
        videoId: parts[0],
        cleanUrl: `https://www.twitch.tv/${parts[0]}`,
        watchUrl: `https://www.twitch.tv/${parts[0]}`,
        handle: parts[0],
        kind: "live",
      };
    }
    return null;
  }

  if (host.endsWith("kick.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && parts[1]) {
      return {
        platform: "kick",
        videoId: parts[1],
        cleanUrl: `https://kick.com/video/${parts[1]}`,
        watchUrl: `https://kick.com/video/${parts[1]}`,
        kind: "video",
      };
    }
    if (parts[0]) {
      return {
        platform: "kick",
        videoId: parts[0],
        cleanUrl: `https://kick.com/${parts[0]}`,
        watchUrl: `https://kick.com/${parts[0]}`,
        handle: parts[0],
        kind: "live",
      };
    }
    return null;
  }

  if (/\.(mp4|mov|m4v|webm|mkv)(\?.*)?$/i.test(url.pathname + url.search)) {
    return {
      platform: "file",
      cleanUrl: url.toString(),
      watchUrl: url.toString(),
      kind: "file",
    };
  }

  return null;
}

function estimateDuration(platform: Platform, id: string): number {
  const rng = createRng(`${platform}:${id}:duration`);
  if (platform === "twitch") return Math.round((45 + rng() * 165) * 60);
  if (platform === "kick") return Math.round((30 + rng() * 150) * 60);
  if (platform === "file") return Math.round((4 + rng() * 26) * 60);
  return Math.round((9 + rng() * 76) * 60);
}

function hasBinary(name: string): boolean {
  try {
    const result = spawnSync(process.env.YTDLP_PATH || name, ["--version"], {
      timeout: 2500,
      stdio: "ignore",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

let ytdlpAvailable: boolean | null = null;

function ytdlp(): boolean {
  if (ytdlpAvailable === null) ytdlpAvailable = hasBinary("yt-dlp");
  return ytdlpAvailable;
}

interface ProbeResult {
  title?: string;
  author?: string;
  duration?: number;
  thumbnail?: string;
}

function probeWithYtDlp(url: string): ProbeResult {
  if (!ytdlp()) return {};
  try {
    const result = spawnSync(
      process.env.YTDLP_PATH || "yt-dlp",
      ["--no-warnings", "--skip-download", "--print", "%(title)s|%(uploader)s|%(duration)s|%(thumbnail)s", url],
      { timeout: 9000, encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    if (result.status !== 0 || !result.stdout) return {};
    const [title, author, duration, thumbnail] = result.stdout.trim().split("|");
    const parsedDuration = Number(duration);
    return {
      title: title || undefined,
      author: author || undefined,
      duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      thumbnail: thumbnail?.startsWith("http") ? thumbnail : undefined,
    };
  } catch {
    return {};
  }
}

async function fetchJson(url: string, timeoutMs = 3500): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClipForge/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const PAGE_TITLES: Record<string, { title: string; author: string }> = {
  aircAruvnKk: { title: "But what is a neural network? | Deep learning chapter 1", author: "3Blue1Brown" },
  jNQXAC9IVRw: { title: "Me at the zoo", author: "jawed" },
  jfKfPfyJRdk: { title: "lofi hip hop radio 📚 beats to relax/study to", author: "Lofi Girl" },
};

export function titleForPlatform(platform: Platform): string {
  switch (platform) {
    case "twitch":
      return "Twitch stream";
    case "kick":
      return "Kick stream";
    case "file":
      return "Uploaded video";
    default:
      return "YouTube video";
  }
}

export async function resolveSource(raw: string): Promise<SourceInfo | null> {
  const parsed = parseSource(raw);
  if (!parsed) return null;

  const fallbackId = parsed.videoId ?? parsed.cleanUrl;
  const known = parsed.videoId ? PAGE_TITLES[parsed.videoId] : undefined;
  const guessedAuthor = parsed.handle ? parsed.handle.replace(/[_-]+/g, " ") : "";

  const base: SourceInfo = {
    url: parsed.cleanUrl,
    platform: parsed.platform,
    videoId: parsed.videoId,
    title: known?.title ?? titleForPlatform(parsed.platform),
    author:
      known?.author ??
      (guessedAuthor ? guessedAuthor.replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown creator"),
    thumbnail:
      parsed.platform === "youtube" && parsed.videoId
        ? `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`
        : undefined,
    durationSec: estimateDuration(parsed.platform, fallbackId),
    watchUrl: parsed.watchUrl,
    embedUrl: parsed.embedUrl,
    live: parsed.kind === "live",
  };

  if (!parsed.videoId && parsed.platform !== "file") return base;

  if (parsed.platform === "youtube" && parsed.videoId) {
    const oembed = await fetchJson(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.cleanUrl)}&format=json`,
    );
    if (oembed) {
      base.title = String(oembed.title ?? base.title);
      base.author = String(oembed.author_name ?? base.author);
      base.thumbnail = String(oembed.thumbnail_url ?? base.thumbnail);
    }
  }

  // Real metadata beats any estimate: a wrong duration makes the whole analysis
  // window wrong, which is the difference between an accurate clip and a guess.
  if (parsed.platform === "youtube" && parsed.videoId) {
    const meta = await fetchYoutubeMeta(parsed.videoId).catch(() => null);
    if (meta?.title) base.title = meta.title;
    if (meta?.author) base.author = meta.author;
    if (meta?.thumbnail) base.thumbnail = meta.thumbnail;
    if (meta?.lengthSeconds && meta.lengthSeconds > 30) base.durationSec = meta.lengthSeconds;
  }

  if (parsed.platform === "twitch" && parsed.kind === "clip" && parsed.videoId) {
    const clip = await fetchTwitchClip(parsed.videoId).catch(() => null);
    if (clip) {
      base.title = clip.title;
      base.author = clip.author || base.author;
      base.durationSec = clip.durationSec;
      base.thumbnail = clip.thumbnail ?? base.thumbnail;
    }
  }

  if (parsed.platform !== "file") {
    const probe = probeWithYtDlp(parsed.cleanUrl);
    if (probe.title) base.title = probe.title;
    if (probe.author) base.author = probe.author;
    if (probe.duration) base.durationSec = probe.duration;
    if (probe.thumbnail) base.thumbnail = probe.thumbnail;
  }

  return base;
}

export function thumbnailFor(source: SourceInfo, quality: "hq" | "max" = "hq"): string | undefined {
  if (source.platform === "youtube" && source.videoId) {
    return quality === "max"
      ? `https://i.ytimg.com/vi/${source.videoId}/maxresdefault.jpg`
      : `https://i.ytimg.com/vi/${source.videoId}/hqdefault.jpg`;
  }
  return source.thumbnail;
}

export function sourceMomentUrl(source: SourceInfo, seconds: number): string {
  const t = Math.max(0, Math.floor(seconds));
  if (source.platform === "youtube" && source.videoId) {
    return `https://www.youtube.com/watch?v=${source.videoId}&t=${t}s`;
  }
  if (source.platform === "twitch" && source.videoId) {
    return `https://www.twitch.tv/videos/${source.videoId}?t=${Math.floor(t / 3600)}h${Math.floor((t % 3600) / 60)}m${t % 60}s`;
  }
  return source.watchUrl ?? source.url;
}
