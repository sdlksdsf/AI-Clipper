import type { TranscriptSegment } from "@/lib/types";

/**
 * Public proxy fallbacks for YouTube.
 *
 * Datacenter IPs (Vercel, Fly, AWS) regularly get `LOGIN_REQUIRED` player
 * responses from YouTube, which hides both captions and stream URLs. Piped and
 * Invidious instances resolve videos from residential-ish egress and expose the
 * same information over a plain JSON API, so they are used as a second opinion
 * before we ever fall back to a generated transcript.
 *
 * Everything here is best-effort: instances go up and down, so each call walks
 * a short list with tight timeouts and remembers which host answered.
 */

export interface ProxyCaption {
  segments: TranscriptSegment[];
  language: string;
  via: string;
}

export interface ProxyStream {
  url: string;
  height: number;
  mimeType: string;
  label: string;
}

export interface ProxySources {
  ok: boolean;
  via: string | null;
  captions: ProxyCaption | null;
  video: ProxyStream | null;
  audio: ProxyStream | null;
  message?: string;
  tried: string[];
}

const PIPED_HOSTS = [
  // Verified reachable from a Vercel container; these instances come and go, so
  // the list is walked with a retry rather than trusted blindly.
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
];

const INVIDIOUS_HOSTS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://iv.melmac.space",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TTL = 8 * 60 * 1000;
const cache = new Map<string, { value: ProxySources; at: number }>();

type Loose = Record<string, unknown>;

function asObject(value: unknown): Loose | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : null;
}

function asArray(value: unknown): Loose[] {
  return Array.isArray(value) ? (value as Loose[]).filter((item) => asObject(item)) : [];
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

/* ───────────────────────────── caption parsing ─────────────────────────── */

function decodeEntities(value: string) {
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

function stampToSeconds(stamp: string) {
  const clean = stamp.trim().replace(",", ".");
  const parts = clean.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

/** Parses WEBVTT, SRT and the timedtext XML flavour into caption segments. */
export function parseCaptionText(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const trimmed = raw.trim();
  if (!trimmed) return segments;

  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as {
        events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }>;
      };
      for (const event of data.events ?? []) {
        const value = decodeEntities((event.segs ?? []).map((seg) => seg.utf8 ?? "").join(""));
        if (!value) continue;
        const start = Math.max(0, num(event.tStartMs) / 1000);
        segments.push({
          start: Number(start.toFixed(2)),
          end: Number((start + Math.max(0.6, num(event.dDurationMs, 1800) / 1000)).toFixed(2)),
          text: value,
          speaker: "Host",
        });
      }
      return segments;
    } catch {
      return segments;
    }
  }

  if (trimmed.startsWith("<")) {
    const pattern = /<text[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(trimmed))) {
      const start = Number(match[1]);
      const value = decodeEntities(match[3]);
      if (!value) continue;
      segments.push({
        start: Number(start.toFixed(2)),
        end: Number((start + Math.max(0.6, Number(match[2] ?? 2.4) || 2.4)).toFixed(2)),
        text: value,
        speaker: "Host",
      });
    }
    return segments;
  }

  // WEBVTT / SRT: blocks separated by blank lines, first cue line holds the timing.
  const blocks = trimmed.replace(/\r/g, "").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    if (!lines.length) continue;
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [from, to] = lines[timingIndex].split("-->");
    const start = stampToSeconds(from ?? "0");
    const end = stampToSeconds((to ?? "").split(/\s+/)[0] ?? "0");
    const value = decodeEntities(lines.slice(timingIndex + 1).join(" "));
    if (!value) continue;
    segments.push({
      start: Number(start.toFixed(2)),
      end: Number((start + Math.max(0.6, end - start)).toFixed(2)),
      text: value,
      speaker: "Host",
    });
  }
  return segments;
}

/** Same merging rule the YouTube path uses, so captions read like speech. */
function tidy(segments: TranscriptSegment[]): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...segment });
      continue;
    }
    const joined = `${last.text} ${segment.text}`.replace(/\s+/g, " ").trim();
    const gap = segment.start - last.end;
    if (joined.split(" ").length <= 26 && gap < 0.7) {
      last.text = joined;
      last.end = segment.end;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged.filter((segment) => segment.text.length > 1);
}

/* ───────────────────────────── fetching ────────────────────────────────── */

async function getJson(url: string, timeoutMs = 7000): Promise<Loose | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as Loose | null;
}

async function getText(url: string, timeoutMs = 9000): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const body = await res.text().catch(() => "");
  return body || null;
}

async function captionsFromUrl(url: string): Promise<TranscriptSegment[]> {
  if (!url) return [];
  const body = await getText(url);
  if (!body) return [];
  const segments = tidy(parseCaptionText(body));
  return segments.length > 4 ? segments : [];
}

function pipedCaptions(payload: Loose): { url: string; language: string } | null {
  const subtitles = asArray(payload.subtitles);
  if (!subtitles.length) return null;
  const pick =
    subtitles.find((track) => text(track.code).startsWith("en") && !track.autoGenerated) ??
    subtitles.find((track) => text(track.code).startsWith("en")) ??
    subtitles[0];
  const url = text(pick.url);
  return url ? { url, language: text(pick.code) || "en" } : null;
}

function pipedStreams(payload: Loose, maxHeight: number): { video: ProxyStream | null; audio: ProxyStream | null } {
  const videos = asArray(payload.videoStreams)
    .map((stream) => ({
      url: text(stream.url),
      height: num(stream.height) || Number(/^(\d+)p/.exec(text(stream.quality))?.[1] ?? 0),
      mimeType: text(stream.mimeType) || "video/mp4",
      label: text(stream.quality) || `${num(stream.height)}p`,
      videoOnly: Boolean(stream.videoOnly),
    }))
    .filter((stream) => stream.url && stream.mimeType.includes("mp4"));

  const progressive = videos
    .filter((stream) => !stream.videoOnly && stream.height <= maxHeight + 4)
    .sort((a, b) => b.height - a.height)[0];
  if (progressive) {
    return {
      video: { url: progressive.url, height: progressive.height, mimeType: progressive.mimeType, label: `${progressive.label} muxed` },
      audio: null,
    };
  }

  const video = videos.filter((stream) => stream.height <= maxHeight + 4).sort((a, b) => b.height - a.height)[0] ?? null;
  const audio = asArray(payload.audioStreams)
    .map((stream) => ({
      url: text(stream.url),
      mimeType: text(stream.mimeType) || "audio/mp4",
      label: `${num(stream.bitrate)}kbps`,
    }))
    .filter((stream) => stream.url && stream.mimeType.includes("mp4"))
    .sort((a, b) => num(b.label.replace("kbps", "")) - num(a.label.replace("kbps", "")))[0];

  return {
    video: video
      ? { url: video.url, height: video.height, mimeType: video.mimeType, label: video.label }
      : null,
    audio: audio ? { url: audio.url, height: 0, mimeType: audio.mimeType, label: `audio ${audio.label}` } : null,
  };
}

function invidiousStreams(payload: Loose, maxHeight: number): { video: ProxyStream | null; audio: ProxyStream | null } {
  const adaptive = asArray(payload.adaptiveFormats);
  const muxed = asArray(payload.formatStreams);

  const toStream = (format: Loose): ProxyStream | null => {
    const url = text(format.url);
    const type = text(format.type) || "video/mp4";
    if (!url || !type.includes("mp4")) return null;
    const height = num(format.height) || Number(/(\d+)p/.exec(text(format.qualityLabel))?.[1] ?? 0);
    return { url, height, mimeType: type, label: text(format.qualityLabel) || `${height}p` };
  };

  const muxedStreams = muxed
    .map(toStream)
    .filter((stream): stream is ProxyStream => Boolean(stream) && stream!.mimeType.includes("video"));
  const progressive = muxedStreams.filter((stream) => stream.height <= maxHeight + 4).sort((a, b) => b.height - a.height)[0];
  if (progressive) return { video: { ...progressive, label: `${progressive.label} muxed` }, audio: null };

  const video = adaptive
    .map(toStream)
    .filter((stream): stream is ProxyStream => Boolean(stream) && stream!.mimeType.includes("video"))
    .filter((stream) => stream.height <= maxHeight + 4)
    .sort((a, b) => b.height - a.height)[0];
  const audio = adaptive
    .map(toStream)
    .filter((stream): stream is ProxyStream => Boolean(stream) && stream!.mimeType.includes("audio"))
    .sort((a, b) => b.height - a.height)[0];

  return { video: video ?? null, audio: audio ?? null };
}

async function fromPiped(host: string, videoId: string, maxHeight: number): Promise<ProxySources | null> {
  const payload = await getJson(`${host}/streams/${videoId}`);
  if (!payload) return null;
  const caption = pipedCaptions(payload);
  const segments = caption ? await captionsFromUrl(caption.url) : [];
  const { video, audio } = pipedStreams(payload, maxHeight);
  const source: ProxySources = {
    ok: Boolean(video || segments.length),
    via: `piped:${host.replace(/^https?:\/\//, "")}`,
    captions: segments.length ? { segments, language: caption?.language ?? "en", via: host } : null,
    video,
    audio,
    tried: [],
  };
  return source.ok ? source : null;
}

async function fromInvidious(host: string, videoId: string, maxHeight: number): Promise<ProxySources | null> {
  const payload = await getJson(`${host}/api/v1/videos/${videoId}?fields=captions,adaptiveFormats,formatStreams,title,lengthSeconds`);
  if (!payload) return null;
  const captions = asArray(payload.captions);
  const pick =
    captions.find((track) => text(track.language_code).startsWith("en")) ?? captions[0] ?? null;
  const segments = pick ? await captionsFromUrl(text(pick.url)) : [];
  const { video, audio } = invidiousStreams(payload, maxHeight);
  const source: ProxySources = {
    ok: Boolean(video || segments.length),
    via: `invidious:${host.replace(/^https?:\/\//, "")}`,
    captions: segments.length ? { segments, language: text(pick?.language_code) || "en", via: host } : null,
    video,
    audio,
    tried: [],
  };
  return source.ok ? source : null;
}

/**
 * One call per video id: walks Piped hosts, then Invidious hosts, stopping as
 * soon as one of them supplies both captions and a playable stream. Partial
 * answers are merged, so captions from one host can pair with streams from another.
 */
export async function fetchProxySources(
  videoId: string,
  maxHeight = 1080,
  force = false,
): Promise<ProxySources> {
  const key = `${videoId}:${maxHeight}`;
  const cached = cache.get(key);
  if (!force && cached && Date.now() - cached.at < TTL) return cached.value;

  const jobs: Array<{ label: string; run: () => Promise<ProxySources | null> }> = [
    ...PIPED_HOSTS.slice(0, 3).map((host) => ({
      label: host.replace(/^https?:\/\//, ""),
      run: () => fromPiped(host, videoId, maxHeight),
    })),
    ...INVIDIOUS_HOSTS.slice(0, 2).map((host) => ({
      label: host.replace(/^https?:\/\//, ""),
      run: () => fromInvidious(host, videoId, maxHeight),
    })),
  ];

  const tried: string[] = [];
  const candidates: ProxySources[] = [];
  for (const job of jobs) {
    let source = await job.run().catch(() => null);
    if (!source) {
      // Instances routinely answer a bot-check once and succeed on a retry.
      await new Promise((resolve) => setTimeout(resolve, 350));
      source = await job.run().catch(() => null);
    }
    tried.push(`${job.label}: ${source ? "ok" : "no"}`);
    if (!source) continue;
    candidates.push(source);
    if (source.captions && source.video) break;
  }

  const captionHost = candidates.find((source) => source.captions) ?? null;
  const videoHost = candidates.find((source) => source.video) ?? null;
  const audioHost = candidates.find((source) => source.audio) ?? null;

  const value: ProxySources = {
    ok: Boolean(captionHost || videoHost),
    via: captionHost?.via ?? videoHost?.via ?? null,
    captions: captionHost?.captions ?? null,
    video: videoHost?.video ?? null,
    audio: videoHost?.audio ?? audioHost?.audio ?? null,
    tried,
    message: captionHost || videoHost ? undefined : "No caption or stream service answered for this video.",
  };
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** Captions only — used by the transcript pipeline. */
export async function fetchProxyCaptions(videoId: string) {
  const sources = await fetchProxySources(videoId, 480).catch(() => null);
  return sources?.captions ?? null;
}

/** Streams only — used by the render pipeline. */
export async function fetchProxyStreams(videoId: string, maxHeight = 1080) {
  const sources = await fetchProxySources(videoId, maxHeight).catch(() => null);
  if (!sources?.video) return null;
  return { video: sources.video, audio: sources.audio, via: sources.via ?? "proxy" };
}

/** Diagnostic snapshot for /api/diag. */
export async function proxyDiag(videoId: string) {
  const sources = await fetchProxySources(videoId, 720, true).catch(() => null);
  return {
    ok: Boolean(sources?.ok),
    via: sources?.via ?? null,
    captions: sources?.captions
      ? {
          language: sources.captions.language,
          segments: sources.captions.segments.length,
          sample: sources.captions.segments.slice(0, 2).map((segment) => `[${segment.start}] ${segment.text}`),
        }
      : null,
    video: sources?.video ? { height: sources.video.height, label: sources.video.label } : null,
    audio: sources?.audio ? { label: sources.audio.label } : null,
    tried: sources?.tried ?? [],
  };
}
