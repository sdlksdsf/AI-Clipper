import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Aspect, Clip, Project, Quality } from "@/lib/types";
import { binaryExists, run } from "@/lib/proc";
import { qualityBitrate, qualityHeight } from "@/lib/plans";

export interface RendererStatus {
  ffmpeg: boolean;
  ytdlp: boolean;
  enabled: boolean;
  dir: string;
}

const RENDER_DIR = process.env.RENDER_DIR || path.join(os.tmpdir(), "clipforge-renders");
let cachedStatus: { value: RendererStatus; at: number } | null = null;

export async function rendererStatus(force = false): Promise<RendererStatus> {
  if (!force && cachedStatus && Date.now() - cachedStatus.at < 5 * 60 * 1000) {
    return cachedStatus.value;
  }
  const [ffmpeg, ytdlp] = await Promise.all([
    binaryExists(process.env.FFMPEG_PATH || "ffmpeg"),
    binaryExists(process.env.YTDLP_PATH || "yt-dlp"),
  ]);
  const value: RendererStatus = { ffmpeg, ytdlp, enabled: ffmpeg && ytdlp, dir: RENDER_DIR };
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
  inter: "Inter",
  mono: "JetBrains Mono",
  serif: "Georgia",
};

function assTime(seconds: number) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss(clip: Clip, height: number) {
  const style = clip.style;
  const fontSize = Math.round((style.size / 100) * height * 0.072);
  const outline = style.preset === "minimal" ? 0 : Math.max(2, Math.round(height * 0.004));
  const marginV = style.position === "lower" ? Math.round(height * 0.16) : Math.round(height * 0.45);
  const alignment = style.position === "lower" ? 2 : style.position === "upper" ? 8 : 5;
  const borderStyle = style.background ? 3 : 1;
  const backColor = style.background ? "&H99000000" : "&H00000000";

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${Math.round((height * 9) / 16)}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Clip,${FONT_MAP[style.font] ?? "Inter"},${fontSize},${assColor(style.color)},${assColor(style.highlight)},&H00000000,${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outline},1,${alignment},40,40,${marginV},1

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
}

/**
 * Real MP4 render: cuts the section, reframes to the requested aspect, burns
 * the styled captions and encodes at the chosen quality (max 1080p).
 * Requires ffmpeg + yt-dlp on the host — probed, never assumed.
 */
export async function renderClip(project: Project, clip: Clip): Promise<RenderResult> {
  const status = await rendererStatus();
  if (!status.enabled) {
    return {
      ok: false,
      unsupported: true,
      message:
        "MP4 rendering needs ffmpeg and yt-dlp on the server. This host runs in preview mode — use the clip kit (SRT, VTT, edit list) or connect a render worker.",
    };
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `clipforge-${clip.id}-`));
  const sourcePath = path.join(workDir, "source.mp4");
  const assPath = path.join(workDir, "captions.ass");
  const outName = renderFileName(clip.id);
  const outPath = path.join(RENDER_DIR, outName);
  const { width, height } = outputSize(project.settings.aspect, clip.quality);

  try {
    await fs.mkdir(RENDER_DIR, { recursive: true });

    const download = await run(
      process.env.YTDLP_PATH || "yt-dlp",
      [
        "--no-warnings",
        "--no-playlist",
        "--force-keyframes-at-cuts",
        "--download-sections",
        `*${clip.startSec}-${clip.endSec}`,
        "-f",
        "bv*[height<=1080]+ba/b[height<=1080]/b",
        "--merge-output-format",
        "mp4",
        "-o",
        sourcePath,
        project.source.url,
      ],
      { timeoutMs: 8 * 60 * 1000 },
    );
    if (download.code !== 0) {
      return { ok: false, message: "Could not download that section of the source video." };
    }

    await fs.writeFile(assPath, buildAss(clip, height), "utf8");
    const filter = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      `ass=${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}`,
    ].join(",");

    const encode = await run(
      process.env.FFMPEG_PATH || "ffmpeg",
      [
        "-y",
        "-i",
        sourcePath,
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
        outPath,
      ],
      { timeoutMs: 10 * 60 * 1000 },
    );

    if (encode.code !== 0) {
      return { ok: false, message: "The encoder rejected this clip. Try a shorter length." };
    }

    const stat = await fs.stat(outPath);
    if (!stat.size) return { ok: false, message: "Render produced an empty file." };

    return {
      ok: true,
      url: `/api/renders/${outName}`,
      fileName: `clipforge-${clip.index + 1}-${clip.id}.mp4`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "render_failed" };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
