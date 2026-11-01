import type { TranscriptSegment } from "@/lib/types";

/**
 * Real YouTube metadata + captions.
 *
 * Three independent paths, cheapest first, because datacenter IPs get treated
 * differently by YouTube from run-of-the-mill browsers:
 *   1. the watch page (`ytInitialPlayerResponse` embedded in the HTML)
 *   2. the InnerTube player endpoint with WEB / ANDROID clients
 *   3. the legacy timedtext endpoint
 * Whatever answers first wins; results are memoised so one analysis never
 * re-downloads the same page.
 */

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: string;
}

export interface YoutubeMeta {
  videoId: string;
  title?: string;
  author?: string;
  lengthSeconds?: number;
  thumbnail?: string;
  captionTracks: CaptionTrack[];
  playability?: string;
  reason?: string;
  via: "watch" | "innertube-web" | "innertube-android";
}

interface CacheEntry<T> {
  value: T;
  at: number;
}

const META_TTL = 10 * 60 * 1000;
const CAPTION_TTL = 10 * 60 * 1000;
const metaCache = new Map<string, CacheEntry<YoutubeMeta | null>>();
const captionCache = new Map<string, CacheEntry<TranscriptSegment[]>>();

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const WEB_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

/* ───────────────────────────── helpers ─────────────────────────────────── */

/** Extracts a balanced JSON object that starts at `from` (must point at "{"). */
function sliceJson(source: string, from: number): string | null {
  if (source[from] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return null;
}

function grabPlayerResponse(html: string): Record<string, unknown> | null {
  for (const marker of ["ytInitialPlayerResponse\\s*=\\s*", '"ytInitialPlayerResponse":']) {
    const pattern = marker.startsWith('"') ? marker : marker;
    const match = new RegExp(pattern).exec(html);
    if (!match) continue;
    const braceIndex = html.indexOf("{", match.index + match[0].length - 1);
    if (braceIndex < 0) continue;
    const raw = sliceJson(html, braceIndex);
    if (!raw) continue;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // keep looking
    }
  }
  return null;
}

type Loose = Record<string, unknown>;

function asObject(value: unknown): Loose | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : null;
}

function readMeta(player: Loose, videoId: string, via: YoutubeMeta["via"]): YoutubeMeta {
  const details = asObject(player.videoDetails) ?? {};
  const captions = asObject(player.captions);
  const list = asObject(captions?.playerCaptionsTracklistRenderer);
  const tracks = Array.isArray(list?.captionTracks) ? (list?.captionTracks as Loose[]) : [];
  const status = asObject(player.playabilityStatus);
  return {
    videoId,
    title: typeof details.title === "string" ? details.title : undefined,
    author: typeof details.author === "string" ? details.author : undefined,
    lengthSeconds: Number(details.lengthSeconds) || undefined,
    thumbnail:
      typeof details.thumbnail === "string"
        ? details.thumbnail
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    captionTracks: tracks
      .map((track) => ({
        baseUrl: String(track.baseUrl ?? ""),
        languageCode: String(track.languageCode ?? ""),
        kind: typeof track.kind === "string" ? track.kind : undefined,
        name: asObject(track.name) ? String((asObject(track.name)?.simpleText ?? asObject(track.name)?.runs) ?? "") : undefined,
      }))
      .filter((track) => track.baseUrl),
    playability: typeof status?.status === "string" ? status.status : undefined,
    reason: typeof status?.reason === "string" ? status.reason : undefined,
    via,
  };
}

export function youtubeVideoIdFromUrl(url: string): string | null {
  const match = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(url);
  return match ? match[1] : null;
}

/* ───────────────────────────── fetching ────────────────────────────────── */

async function fromWatchPage(videoId: string): Promise<YoutubeMeta | null> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&has_verified=1&bpctr=9999999999`, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const html = await res.text();
  const player = grabPlayerResponse(html);
  if (!player) return null;
  return readMeta(player, videoId, "watch");
}

async function fromInnerTube(videoId: string, client: "WEB" | "ANDROID"): Promise<YoutubeMeta | null> {
  const context =
    client === "WEB"
      ? {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240726.00.00",
            hl: "en",
            gl: "US",
            userAgent: BROWSER_HEADERS["User-Agent"],
          },
        }
      : {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.44.38",
            androidSdkVersion: 30,
            hl: "en",
            gl: "US",
            userAgent: "com.google.android.youtube/19.44.38 (Linux; U; Android 11) gzip",
          },
        };
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${WEB_KEY}&prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": context.client.userAgent,
      "X-YouTube-Client-Name": client === "WEB" ? "1" : "3",
      "X-YouTube-Client-Version": context.client.clientVersion,
      Origin: "https://www.youtube.com",
    },
    body: JSON.stringify({ context, videoId, contentCheckOk: true, racyCheckOk: true }),
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json().catch(() => null)) as Loose | null;
  if (!data) return null;
  return readMeta(data, videoId, client === "WEB" ? "innertube-web" : "innertube-android");
}

/** Metadata (title, author, duration, caption tracks) for a YouTube video. */
export async function fetchYoutubeMeta(videoId: string): Promise<YoutubeMeta | null> {
  const cached = metaCache.get(videoId);
  if (cached && Date.now() - cached.at < META_TTL) return cached.value;

  let best: YoutubeMeta | null = null;
  for (const attempt of [() => fromWatchPage(videoId), () => fromInnerTube(videoId, "ANDROID"), () => fromInnerTube(videoId, "WEB")]) {
    const meta = await attempt().catch(() => null);
    if (!meta) continue;
    if (!best || (!best.captionTracks.length && meta.captionTracks.length)) best = meta;
    if (meta.captionTracks.length && meta.lengthSeconds) break;
  }

  metaCache.set(videoId, { value: best, at: Date.now() });
  return best;
}

const LANGUAGE_PREFERENCE = ["en", "en-US", "en-GB", "en-CA", "en-AU"];

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;
  for (const language of LANGUAGE_PREFERENCE) {
    const exact = tracks.find((track) => track.languageCode === language && track.kind !== "asr");
    if (exact) return exact;
    const asr = tracks.find((track) => track.languageCode === language);
    if (asr) return asr;
  }
  const english = tracks.find((track) => track.languageCode.startsWith("en"));
  return english ?? tracks[0];
}

function withFormat(baseUrl: string, format: "json3" | "srv1"): string {
  const url = baseUrl.startsWith("//") ? `https:${baseUrl}` : baseUrl;
  if (/[?&]fmt=/.test(url)) return url.replace(/([?&])fmt=[^&]*/, `$1fmt=${format}`);
  return `${url}${url.includes("?") ? "&" : "?"}fmt=${format}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJson3(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let data: { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };
  try {
    data = JSON.parse(raw);
  } catch {
    return segments;
  }
  for (const event of data.events ?? []) {
    const text = decodeEntities((event.segs ?? []).map((seg) => seg.utf8 ?? "").join(""));
    if (!text || text === " ") continue;
    const start = Math.max(0, (event.tStartMs ?? 0) / 1000);
    const duration = Math.max(0.6, (event.dDurationMs ?? 1800) / 1000);
    segments.push({
      start: Number(start.toFixed(2)),
      end: Number((start + duration).toFixed(2)),
      text,
      speaker: "Host",
    });
  }
  return segments;
}

function parseXml(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const pattern = /<text[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    const start = Number(match[1]);
    const duration = Number(match[2] ?? 2.4) || 2.4;
    const text = decodeEntities(match[3]);
    if (!text) continue;
    segments.push({
      start: Number(start.toFixed(2)),
      end: Number((start + Math.max(0.6, duration)).toFixed(2)),
      text,
      speaker: "Host",
    });
  }
  return segments;
}

/** Merges micro-cues into readable caption lines (YouTube ASR emits 1–3 words at a time). */
function tidy(segments: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    const words = segment.text.split(/\s+/).filter(Boolean).length;
    if (!last) {
      merged.push({ ...segment });
      continue;
    }
    const joined = `${last.text} ${segment.text}`;
    const joinedWords = joined.split(/\s+/).filter(Boolean).length;
    const gap = segment.start - last.end;
    if (joinedWords <= 24 && gap < 0.65 && (words < 9 || last.text.split(/\s+/).length < 9)) {
      last.text = joined.replace(/\s+/g, " ").trim();
      last.end = segment.end;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged.filter((segment) => segment.text.length > 1);
}

async function fetchTrack(baseUrl: string): Promise<TranscriptSegment[]> {
  for (const format of ["json3", "srv1"] as const) {
    const res = await fetch(withFormat(baseUrl, format), {
      headers: { ...BROWSER_HEADERS, Referer: "https://www.youtube.com/" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    }).catch(() => null);
    if (!res?.ok) continue;
    const raw = await res.text();
    const segments = format === "json3" ? parseJson3(raw) : parseXml(raw);
    if (segments.length > 8) return tidy(segments);
  }
  return [];
}

/** Real captions for a YouTube video, in the best available language. */
export async function fetchYoutubeCaptions(
  videoId: string,
): Promise<{ segments: TranscriptSegment[]; language: string; meta: YoutubeMeta | null }> {
  const cached = captionCache.get(videoId);
  if (cached && Date.now() - cached.at < CAPTION_TTL) {
    return { segments: cached.value, language: "en", meta: metaCache.get(videoId)?.value ?? null };
  }

  const meta = await fetchYoutubeMeta(videoId);
  const track = meta ? pickTrack(meta.captionTracks) : null;
  if (track) {
    const segments = await fetchTrack(track.baseUrl);
    if (segments.length > 8) {
      captionCache.set(videoId, { value: segments, at: Date.now() });
      return { segments, language: track.languageCode || "en", meta };
    }
  }

  // Last resort: the legacy endpoint, which sometimes still answers without a signature.
  for (const suffix of ["", "&kind=asr"]) {
    const res = await fetch(
      `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3${suffix}`,
      { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000), cache: "no-store" },
    ).catch(() => null);
    if (!res?.ok) continue;
    const raw = await res.text();
    const segments = raw.trim().startsWith("{") ? parseJson3(raw) : parseXml(raw);
    if (segments.length > 8) {
      const tidied = tidy(segments);
      captionCache.set(videoId, { value: tidied, at: Date.now() });
      return { segments: tidied, language: "en", meta };
    }
  }

  return { segments: [], language: "en", meta };
}

/** Diagnostic snapshot used by /api/diag to prove what this host can reach. */
export async function youtubeDiag(videoId: string) {
  const started = Date.now();
  const watch = await fromWatchPage(videoId).catch(() => null);
  const android = await fromInnerTube(videoId, "ANDROID").catch(() => null);
  const web = await fromInnerTube(videoId, "WEB").catch(() => null);
  const meta = watch ?? android ?? web;
  const captions = await fetchYoutubeCaptions(videoId).catch(() => ({
    segments: [] as TranscriptSegment[],
    language: "en",
    meta: null,
  }));
  return {
    ms: Date.now() - started,
    watch: watch ? { ok: true, tracks: watch.captionTracks.length, length: watch.lengthSeconds } : { ok: false },
    innertubeAndroid: android
      ? { ok: true, tracks: android.captionTracks.length, playability: android.playability }
      : { ok: false },
    innertubeWeb: web ? { ok: true, tracks: web.captionTracks.length, playability: web.playability } : { ok: false },
    title: meta?.title,
    author: meta?.author,
    duration: meta?.lengthSeconds,
    captionSegments: captions.segments.length,
    captionSample: captions.segments.slice(0, 3).map((segment) => `[${segment.start}] ${segment.text}`),
  };
}
