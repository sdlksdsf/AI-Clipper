import type { Clip, Project } from "@/lib/types";
import { srtTime, vttTime } from "@/lib/utils";
import { qualityBitrate, qualityHeight } from "@/lib/plans";

export type ExportFormat = "srt" | "vtt" | "json" | "txt";

export function exportFilename(clip: Clip, format: ExportFormat) {
  const slug = clip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || `clip-${clip.index + 1}`;
  return `clipforge-${slug}.${format}`;
}

export function toSrt(clip: Clip): string {
  return clip.captionLines
    .map((line, index) => {
      const start = Math.max(0, line.start - clip.startSec);
      const end = Math.max(start + 0.4, line.end - clip.startSec);
      const text = line.words.map((word) => word.text).join(" ");
      return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${text}\n`;
    })
    .join("\n");
}

export function toVtt(clip: Clip): string {
  const body = clip.captionLines
    .map((line, index) => {
      const start = Math.max(0, line.start - clip.startSec);
      const end = Math.max(start + 0.4, line.end - clip.startSec);
      const text = line.words.map((word) => word.text).join(" ");
      return `${index + 1}\n${vttTime(start)} --> ${vttTime(end)}\n${text}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function toText(clip: Clip, project: Project): string {
  return [
    `TITLE: ${clip.title}`,
    `HOOK: ${clip.hook}`,
    `SOURCE: ${project.source.title} — ${project.source.author}`,
    `LINK: ${project.source.url}`,
    `RANGE: ${clip.startSec.toFixed(1)}s → ${clip.endSec.toFixed(1)}s (${Math.round(clip.durationSec)}s)`,
    `VIRALITY: ${clip.scores.virality}/100`,
    "",
    "CAPTION SCRIPT",
    "──────────────",
    clip.captionText,
    "",
    "DESCRIPTION",
    "───────────",
    clip.description,
    "",
    "HASHTAGS",
    "────────",
    clip.hashtags.join(" "),
    "",
  ].join("\n");
}

export function toEditDecisionList(clip: Clip, project: Project) {
  const { width, height } = frameSize(project.settings.aspect, clip.quality);
  return {
    schema: "clipforge.edl/1",
    generatedAt: new Date().toISOString(),
    source: {
      url: project.source.url,
      platform: project.source.platform,
      title: project.source.title,
      author: project.source.author,
      durationSec: project.source.durationSec,
    },
    clip: {
      id: clip.id,
      title: clip.title,
      hook: clip.hook,
      startSec: clip.startSec,
      endSec: clip.endSec,
      durationSec: clip.durationSec,
      scores: clip.scores,
      hashtags: clip.hashtags,
      description: clip.description,
    },
    edit: {
      aspect: project.settings.aspect,
      width,
      height,
      quality: clip.quality,
      videoBitrate: qualityBitrate(clip.quality),
      fps: 30,
      captions: clip.captionLines.map((line) => ({
        start: Number((line.start - clip.startSec).toFixed(2)),
        end: Number((line.end - clip.startSec).toFixed(2)),
        text: line.words.map((word) => word.text).join(" "),
        emphasis: line.words.filter((word) => word.emphasis).map((word) => word.text),
      })),
      style: clip.style,
      ffmpeg: [
        `-ss ${clip.startSec}`,
        `-to ${clip.endSec}`,
        `-vf "scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},ass=captions.ass"`,
        `-c:v libx264 -b:v ${qualityBitrate(clip.quality)} -c:a aac -movflags +faststart`,
      ],
    },
  };
}

function frameSize(aspect: "9:16" | "1:1" | "16:9", quality: "480p" | "720p" | "1080p") {
  const base = qualityHeight(quality);
  if (aspect === "16:9") return { width: Math.round((base * 16) / 9), height: base };
  if (aspect === "1:1") return { width: base, height: base };
  return { width: base, height: Math.round((base * 16) / 9) };
}

export function buildExport(clip: Clip, project: Project, format: ExportFormat) {
  switch (format) {
    case "vtt":
      return { body: toVtt(clip), type: "text/vtt; charset=utf-8" };
    case "json":
      return { body: JSON.stringify(toEditDecisionList(clip, project), null, 2), type: "application/json" };
    case "txt":
      return { body: toText(clip, project), type: "text/plain; charset=utf-8" };
    default:
      return { body: toSrt(clip), type: "application/x-subrip; charset=utf-8" };
  }
}
