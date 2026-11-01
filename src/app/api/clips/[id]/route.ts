import { authForRoute, fail, json, readJson } from "@/lib/api";
import { findClip } from "@/lib/clips";
import { getStore } from "@/lib/db";
import type { CaptionFont, CaptionPosition, CaptionPreset, Clip, ClipStyle, Quality } from "@/lib/types";
import { clamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRESETS: CaptionPreset[] = ["bold", "karaoke", "clean", "neon", "minimal"];
const FONTS: CaptionFont[] = ["display", "inter", "mono", "serif"];
const POSITIONS: CaptionPosition[] = ["lower", "center", "upper"];
const QUALITIES: Quality[] = ["480p", "720p", "1080p"];

function sanitizeStyle(current: ClipStyle, patch: unknown): ClipStyle {
  const input = (patch ?? {}) as Record<string, unknown>;
  const hex = (value: unknown, fallback: string) =>
    typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

  return {
    preset: PRESETS.includes(input.preset as CaptionPreset) ? (input.preset as CaptionPreset) : current.preset,
    font: FONTS.includes(input.font as CaptionFont) ? (input.font as CaptionFont) : current.font,
    size: typeof input.size === "number" ? clamp(Math.round(input.size), 60, 150) : current.size,
    uppercase: typeof input.uppercase === "boolean" ? input.uppercase : current.uppercase,
    highlight: hex(input.highlight, current.highlight),
    color: hex(input.color, current.color),
    position: POSITIONS.includes(input.position as CaptionPosition)
      ? (input.position as CaptionPosition)
      : current.position,
    background: typeof input.background === "boolean" ? input.background : current.background,
  };
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const location = await findClip(user.id, id);
  if (!location) return fail("Clip not found.", 404);

  const body = await readJson<{
    style?: unknown;
    title?: string;
    quality?: Quality;
    startSec?: number;
    endSec?: number;
  }>(request);
  if (!body) return fail("Invalid request.");

  const { project, clip } = location;
  const sourceEnd = Math.max(5, Math.min(project.source.durationSec, project.transcript.at(-1)?.end ?? project.source.durationSec));

  let startSec = typeof body.startSec === "number" && Number.isFinite(body.startSec) ? body.startSec : clip.startSec;
  let endSec = typeof body.endSec === "number" && Number.isFinite(body.endSec) ? body.endSec : clip.endSec;
  startSec = clamp(startSec, 0, Math.max(0, sourceEnd - 5));
  endSec = clamp(endSec, startSec + 5, sourceEnd);
  if (endSec - startSec > 60) endSec = startSec + 60;

  const captionLines = clip.captionLines
    .filter((line) => line.end > startSec + 0.15 && line.start < endSec - 0.15)
    .map((line) => ({
      ...line,
      start: Math.max(line.start, startSec),
      end: Math.min(line.end, endSec),
      words: line.words.filter((word) => word.end > startSec && word.start < endSec),
    }))
    .filter((line) => line.words.length > 0);

  const nextClip: Clip = {
    ...clip,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 90) : clip.title,
    startSec: Number(startSec.toFixed(2)),
    endSec: Number(endSec.toFixed(2)),
    durationSec: Number((endSec - startSec).toFixed(2)),
    captionLines,
    captionText: captionLines.map((line) => line.words.map((word) => word.text).join(" ")).join("\n"),
    style: sanitizeStyle(clip.style, body.style),
    quality: QUALITIES.includes(body.quality as Quality) ? (body.quality as Quality) : clip.quality,
    transcript: clip.transcript.filter((segment) => segment.end > startSec && segment.start < endSec),
    render: { status: "idle" },
  };

  const clips = project.clips.map((item) => (item.id === id ? nextClip : item));
  await getStore().updateProject(project.id, { clips });
  return json({ clip: nextClip });
}
