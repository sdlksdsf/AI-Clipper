import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Aspect, Clip, Project, Quality } from "@/lib/types";
import { binaryExists, run } from "@/lib/proc";
import { qualityBitrate, qualityHeight } from "@/lib/plans";

export interface RendererStatus {
  ffmpeg: boolean;
  ffmpegPath: string | null;
  downloader: boolean;
  storage: "supabase" | "local";
  enabled: boolean;
  dir: string;
}

const RENDER_DIR = process.env.RENDER_DIR || path.join(os.tmpdir(), "clipforge-renders");
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
let cachedStatus: { value: RendererStatus; at: number } | null = null;
let cachedFfmpeg: { value: string | null; at: number } | null = null;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * ffmpeg resolution order: explicit env override → bundled static build
 * (`@ffmpeg-installer`, which ships the binary inside the deployment) → PATH.
 */
export async function ffmpegPath(force = false): Promise<string | null> {
  if (!force && cachedFfmpeg && Date.now() - cachedFfmpeg.at < 5 * 60 * 1000) return cachedFfmpeg.value;

  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  try {
    const installer = (await import("@ffmpeg-installer/ffmpeg")) as unknown as { path?: string };
    if (installer.path) candidates.push(installer.path);
  } catch {
    // package not installed — fall through to PATH
  }
  candidates.push("ffmpeg");

  for (const candidate of candidates) {
    if (candidate === "ffmpeg") {
      if (await binaryExists("ffmpeg")) {
        cachedFfmpeg = { value: "ffmpeg", at: Date.now() };
        return "ffmpeg";
      }
      continue;
    }
    try {
      await fs.access(candidate, (await import("node:fs")).constants.X_OK);
      const probe = await run(candidate, ["-hide_banner", "-version"], { timeoutMs: 4000 });
      if (probe.code === 0) {
        cachedFfmpeg = { value: candidate, at: Date.now() };
        return candidate;
      }
    } catch {
      // try next
    }
  }
  cachedFfmpeg = { value: null, at: Date.now() };
  return null;
}

export async function rendererStatus(force = false): Promise<RendererStatus> {
  if (!force && cachedStatus && Date.now() - cachedStatus.at < 5 * 60 * 1000) return cachedStatus.value;
  const binary = await ffmpegPath(force);
  const { ytdlAvailable } = await import("./download");
  const value: RendererStatus = {
    ffmpeg: Boolean(binary),
    ffmpegPath: binary,
    downloader: ytdlAvailable(),
    storage: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local",
    enabled: Boolean(binary),
    dir: RENDER_DIR,
  };
  cachedStatus = { value, at: Date.now() };
  return value;
}

export function renderFileName(clipId: string) {
  return `${clipId}.mp4`;
}

export function renderDir() {
  return RENDER_DIR;
}

function outputSize(aspect: Aspect, quality: Quality) {
  const base = qualityHeight(quality);
  if (aspect === "1:1") return { width: base, height: base };
  if (aspect === "16:9") {
    const height = base;
    return { width: Math.round((height * 16) / 9 / 2) * 2, height };
  }
  const height = Math.round((base * 16) / 9 / 2) * 2;
  return { width: base, height };
}

function assColor(hex: string) {
  const clean = hex.replace("#", "");
  const r = clean.slice(0, 2) || "FF";
  const g = clean.slice(2, 4) || "FF";
  const b = clean.slice(4, 6) || "FF";
  return `&H00${b}${g}${r}`.toUpperCase();
}

const FONT_MAP: Record<string, string> = {
  display: "Instrument Sans",
  inter: "Instrument Sans",
  mono: "Instrument Sans",
  serif: "Instrument Sans",
};

function assTime(seconds: number) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss(clip: Clip, width: number, height: number) {
  const style = clip.style;
  const fontSize = Math.round((style.size / 100) * height * 0.072);
  const outline = style.preset === "minimal" ? 0 : Math.max(2, Math.round(height * 0.004));
  const marginV = style.position === "lower" ? Math.round(height * 0.16) : Math.round(height * 0.45);
  const alignment = style.position === "lower" ? 2 : style.position === "upper" ? 8 : 5;
  const borderStyle = style.background ? 3 : 1;
  const backColor = style.background ? "&H99000000" : "&H00000000";

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Clip,${FONT_MAP[style.font] ?? "Instrument Sans"},${fontSize},${assColor(style.color)},${assColor(style.highlight)},&H00000000,${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outline},1,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = clip.captionLines
    .map((line) => {
      const start = Math.max(0, line.start - clip.startSec);
      const end = Math.max(start + 0.4, line.end - clip.startSec);
      const text = line.words
        .map((word) => {
          const content = style.uppercase ? word.text.toUpperCase() : word.text;
          return word.emphasis
            ? `{\\c${assColor(style.highlight)}}${content}{\\c${assColor(style.color)}}`
            : content;
        })
        .join(" ")
        .replace(/\{/g, "(")
        .replace(/\}/g, ")");
      return `Dialogue: 0,${assTime(start)},${assTime(end)},Clip,,0,0,0,,${text}`;
    })
    .join("\n");

  return `${header}\n${events}\n`;
}

export interface RenderResult {
  ok: boolean;
  url?: string;
  fileName?: string;
  message?: string;
  unsupported?: boolean;
  bytes?: number;
}

async function uploadToStorage(localPath: string, fileName: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const bucket = process.env.SUPABASE_RENDER_BUCKET || "clipforge-renders";
  try {
    const body = await fs.readFile(localPath);
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "video/mp4",
        "x-upsert": "true",
        "cache-control": "public, max-age=31536000",
      },
      body,
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return null;
    return `${url}/storage/v1/object/public/${bucket}/${fileName}`;
  } catch {
    return null;
  }
}

/**
 * Renders a clip for real: pulls the exact source range, reframes to the chosen
 * aspect, burns the styled captions and encodes H.264/AAC at the chosen quality.
 * The finished file goes to Supabase Storage when configured, so the link works
 * from any function instance; otherwise it stays in the local render dir.
 */
export async function renderClip(project: Project, clip: Clip): Promise<RenderResult> {
  const binary = await ffmpegPath();
  if (!binary) {
    return {
      ok: false,
      unsupported: true,
      message:
        "The encoder isn't installed on this host, so MP4 export is off. The clip still plays in the studio and the caption files download fine.",
    };
  }

  const { resolveSources } = await import("./download");
  const sources = await resolveSources(project.source, Math.max(480, qualityHeight(clip.quality)));
  if (!sources.ok) return { ok: false, message: sources.message };

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `clipforge-${clip.id}-`));
  const assPath = path.join(workDir, "captions.ass");
  const outName = renderFileName(clip.id);
  const outPath = path.join(RENDER_DIR, outName);
  const { width, height } = outputSize(project.settings.aspect, clip.quality);
  const duration = Math.max(1, Math.min(60, clip.endSec - clip.startSec));

  try {
    await fs.mkdir(RENDER_DIR, { recursive: true });
    await fs.writeFile(assPath, buildAss(clip, width, height), "utf8");
    await fs.mkdir(FONT_DIR, { recursive: true }).catch(() => undefined);

    const inputArgs: string[] = [];
    for (const input of sources.inputs) {
      inputArgs.push("-ss", clip.startSec.toFixed(2), "-t", duration.toFixed(2));
      if (input.kind === "network") {
        inputArgs.push("-user_agent", BROWSER_UA, "-headers", "Referer: https://www.youtube.com/\r\n");
      }
      inputArgs.push("-i", input.url);
    }

    const maps = sources.inputs.length > 1 ? ["-map", "0:v:0", "-map", "1:a:0"] : [];
    const filter = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      `ass=${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}:fontsdir=${FONT_DIR.replace(/\\/g, "/").replace(/:/g, "\\:")}`,
    ].join(",");

    const encode = await run(
      binary,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        ...inputArgs,
        ...maps,
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-b:v",
        qualityBitrate(clip.quality),
        "-maxrate",
        qualityBitrate(clip.quality),
        "-bufsize",
        "12M",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        "-t",
        duration.toFixed(2),
        outPath,
      ],
      { timeoutMs: 4 * 60 * 1000 },
    );

    if (encode.code !== 0) {
      const detail = encode.stderr.split("\n").filter(Boolean).slice(-2).join(" ").replace(/https?:\/\/\S+/g, "[url]");
      return {
        ok: false,
        message: encode.timedOut
          ? "The render ran out of time — try a shorter clip length."
          : `The encoder rejected this clip${detail ? `: ${detail}` : "."}`,
      };
    }

    const stat = await fs.stat(outPath);
    if (!stat.size) return { ok: false, message: "Render produced an empty file." };

    const hosted = await uploadToStorage(outPath, outName);
    if (!hosted) {
      // Local/dev or storage unavailable: keep the file and serve it from /api/renders.
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      return {
        ok: true,
        url: `/api/renders/${outName}`,
        fileName: `clipforge-${clip.index + 1}-${clip.id}.mp4`,
        bytes: stat.size,
      };
    }

    return {
      ok: true,
      url: hosted,
      fileName: `clipforge-${clip.index + 1}-${clip.id}.mp4`,
      bytes: stat.size,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "render_failed" };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
