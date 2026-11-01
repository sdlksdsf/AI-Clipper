"use client";

import { ExternalLink } from "lucide-react";
import { ClipPlayer } from "@/components/studio/ClipPlayer";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { Clip, Project } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

export function ClipPreview({ clip, project }: { clip: Clip; project: Project }) {
  const isRendered = clip.render?.status === "ready" && Boolean(clip.render.url);

  return (
    <div className="w-full">
      <div className="relative">
        {isRendered ? (
          <div
            className={cn(
              "relative mx-auto overflow-hidden rounded-2xl border border-white/12 bg-black",
              project.settings.aspect === "9:16" && "max-w-[320px]",
              project.settings.aspect === "1:1" && "max-w-[380px]",
            )}
          >
            <video
              src={clip.render.url}
              controls
              playsInline
              poster={project.source.thumbnail}
              className="group size-full bg-black object-contain"
            />
          </div>
        ) : (
          <ClipPlayer clip={clip} project={project} />
        )}

        <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-2">
          <span className="rounded-full bg-black/55 px-2 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-white/80 backdrop-blur">
            #{String(clip.index + 1).padStart(2, "0")} · {project.settings.aspect}
          </span>
          <div className="rounded-full bg-black/45 p-1 backdrop-blur">
            <ScoreRing score={clip.scores.virality} size={42} stroke={3} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {project.source.watchUrl ? (
          <a
            href={`${project.source.watchUrl}${project.source.platform === "youtube" ? `&t=${Math.floor(clip.startSec)}s` : ""}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-fog transition hover:text-snow"
          >
            <ExternalLink className="size-3" aria-hidden /> Open source at {formatClock(clip.startSec)}
          </a>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-fog-dim">
          {clip.quality} · {Math.round(clip.durationSec)}s
        </span>
      </div>

      {!isRendered ? (
        <p className="mx-auto mt-2 max-w-[340px] text-center text-[10px] leading-relaxed text-fog-dim">
          Playing the real footage for {formatClock(clip.startSec)}–{formatClock(clip.endSec)} with your caption style on
          top. Render the MP4 to download the finished file.
        </p>
      ) : null}
    </div>
  );
}
