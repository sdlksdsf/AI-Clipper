"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { CaptionOverlay, activeLine, aspectRatioValue } from "@/components/ui/CaptionOverlay";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Thumb } from "@/components/ui/Thumb";
import type { Clip, Project } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

export function ClipPreview({ clip, project }: { clip: Clip; project: Project }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);

  const duration = Math.max(1, clip.durationSec);

  useEffect(() => {
    setTime(0);
    setPlaying(true);
  }, [clip.id]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTime((value) => (value + 0.1 >= duration ? 0 : value + 0.1));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, duration]);

  const absoluteTime = clip.startSec + Math.min(time, duration);
  const line = useMemo(() => activeLine(clip.captionLines, absoluteTime), [clip.captionLines, absoluteTime]);
  const isRendered = clip.render?.status === "ready" && clip.render.url;
  const progress = Math.min(100, (time / duration) * 100);

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-2xl border border-white/12 bg-ink-2 [container-type:inline-size]",
          project.settings.aspect === "9:16" && "max-w-[300px]",
          project.settings.aspect === "1:1" && "max-w-[380px]",
          project.settings.aspect === "16:9" && "w-full",
        )}
        style={{ aspectRatio: aspectRatioValue(project.settings.aspect) }}
      >
        {isRendered ? (
          <video
            src={clip.render.url}
            controls
            playsInline
            className="absolute inset-0 size-full bg-black object-contain"
          />
        ) : (
          <>
            <Thumb
              src={project.source.thumbnail}
              alt={project.source.title}
              seed={project.id.length}
              className="absolute inset-0 size-full scale-110 opacity-50 blur-[3px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/25 to-ink/85" />
            <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(120deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_10px)]" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
              <span className="rounded-full bg-black/45 px-2 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-white/80 backdrop-blur">
                #{String(clip.index + 1).padStart(2, "0")} · {project.settings.aspect}
              </span>
              <div className="rounded-full bg-black/45 p-1 backdrop-blur">
                <ScoreRing score={clip.scores.virality} size={42} stroke={3} />
              </div>
            </div>

            {project.settings.captions ? (
              <CaptionOverlay line={line} style={clip.style} time={absoluteTime} compact />
            ) : null}

            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="flex items-center gap-2 rounded-lg bg-black/55 px-2.5 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  className="grid size-7 place-items-center rounded-full bg-white text-ink"
                  aria-label={playing ? "Pause preview" : "Play preview"}
                >
                  {playing ? <Pause className="size-3.5 fill-ink" /> : <Play className="size-3.5 fill-ink" />}
                </button>
                <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-white/70">
                  {formatClock(time)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={time}
                  onChange={(event) => setTime(Number(event.target.value))}
                  aria-label="Preview position"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                />
                <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-white/40">
                  {formatClock(duration)}
                </span>
                <Volume2 className="size-3 text-white/40" aria-hidden />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            setTime(0);
            setPlaying(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-fog transition hover:text-snow"
        >
          <RotateCcw className="size-3" aria-hidden /> Replay
        </button>
        {project.source.watchUrl ? (
          <a
            href={`${project.source.watchUrl}${project.source.platform === "youtube" ? `&t=${Math.floor(clip.startSec)}s` : ""}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-fog transition hover:text-snow"
          >
            <ExternalLink className="size-3" aria-hidden /> Source at {formatClock(clip.startSec)}
          </a>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[10.5px] text-fog-dim">
          {clip.quality} · {Math.round(duration)}s
        </span>
      </div>

      {!isRendered ? (
        <p className="mx-auto mt-2 max-w-[320px] text-center text-[10px] leading-relaxed text-fog-dim">
          Caption preview runs on the real clip timings. Render the MP4 to watch the final file.
        </p>
      ) : null}
    </div>
  );
}
