import type { SourceInfo } from "@/lib/types";

/**
 * Source resolution for rendering.
 *
 * YouTube needs a signed stream URL before ffmpeg can read it, and doing that in
 * JavaScript (rather than shelling out to yt-dlp) means real MP4 export works on
 * hosts that have no Python — including serverless. Progressive streams are
 * preferred (one file, audio included); DASH falls back to separate video and
 * audio inputs that ffmpeg muxes together.
 */

export interface RenderInput {
  url: string;
  kind: "network";
  label: string;
}

export interface ResolveResult {
  ok: boolean;
  inputs: RenderInput[];
  message?: string;
  via?: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function ytdlAvailable() {
  return true;
}

type Info = {
  formats: Array<{
    url?: string;
    itag: number;
    mimeType: string;
    hasVideo: boolean;
    hasAudio: boolean;
    height?: number;
    audioBitrate?: number;
    qualityLabel?: string;
    container?: string;
  }>;
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function headers() {
  const extra: Record<string, string> = {};
  if (process.env.YOUTUBE_COOKIE) extra.cookie = process.env.YOUTUBE_COOKIE;
  return { "user-agent": UA, "accept-language": "en-US,en;q=0.9", ...extra };
}

async function resolveYouTube(url: string, maxHeight: number): Promise<ResolveResult> {
  const ytdl = (await import("@distube/ytdl-core").catch(() => null)) as unknown as {
    getInfo: (url: string, options?: Record<string, unknown>) => Promise<Info>;
  } | null;
  if (!ytdl?.getInfo) return { ok: false, inputs: [], message: "The stream resolver isn't available on this host." };

  let info: Info;
  try {
    info = await withTimeout(ytdl.getInfo(url, { requestOptions: { headers: headers() } }), 25_000, "ytdl");
  } catch (error) {
    const text = String((error as Error)?.message ?? error);
    if (/sign in|bot|confirm you/i.test(text)) {
      return {
        ok: false,
        inputs: [],
        message:
          "YouTube is asking this server to prove it isn't a bot. Set YOUTUBE_COOKIE (or run on a host with yt-dlp) to unlock MP4 export for this video.",
      };
    }
    return { ok: false, inputs: [], message: `Couldn't read that video's streams (${text.slice(0, 120)}).` };
  }

  const formats = info.formats.filter((format) => Boolean(format.url));
  const usable = (format: Info["formats"][number]) => {
    const height = format.height ?? 0;
    return height <= maxHeight + 4;
  };

  const progressive = formats
    .filter((format) => format.hasVideo && format.hasAudio && format.mimeType.includes("mp4") && usable(format))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  if (progressive.length) {
    const best = progressive[0];
    return {
      ok: true,
      inputs: [{ url: best.url!, kind: "network", label: `progressive ${best.qualityLabel ?? best.itag}` }],
      via: `progressive ${best.itag}`,
    };
  }

  const video = formats
    .filter((format) => format.hasVideo && !format.hasAudio && format.mimeType.includes("mp4") && usable(format))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
  const audio = formats
    .filter((format) => !format.hasVideo && format.hasAudio && format.mimeType.includes("mp4"))
    .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))[0];

  if (video?.url && audio?.url) {
    return {
      ok: true,
      inputs: [
        { url: video.url, kind: "network", label: `video ${video.qualityLabel ?? video.itag}` },
        { url: audio.url, kind: "network", label: `audio ${audio.itag}` },
      ],
      via: `dash ${video.itag}+${audio.itag}`,
    };
  }

  if (video?.url) {
    return { ok: true, inputs: [{ url: video.url, kind: "network", label: "video only" }], via: "video-only" };
  }

  return { ok: false, inputs: [], message: "No downloadable stream was offered for that video." };
}

export async function resolveSources(source: SourceInfo, maxHeight: number): Promise<ResolveResult> {
  if (source.platform === "youtube" && source.videoId) {
    return resolveYouTube(source.url, maxHeight);
  }

  if (source.platform === "file" || /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i.test(source.url)) {
    return { ok: true, inputs: [{ url: source.url, kind: "network", label: "direct" }], via: "direct" };
  }

  if (process.env.YTDLP_PATH) {
    return {
      ok: false,
      inputs: [],
      message:
        "This platform needs its own downloader (yt-dlp). YouTube and direct video links render here; Twitch needs a yt-dlp worker.",
    };
  }

  return {
    ok: false,
    inputs: [],
    message:
      "Rendering this platform needs a downloader that isn't configured. YouTube and direct video links export here — Twitch clips need a yt-dlp worker.",
  };
}
