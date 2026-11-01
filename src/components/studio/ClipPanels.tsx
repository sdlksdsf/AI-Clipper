"use client";

import { useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  FileJson,
  FileText,
  Film,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { CaptionFont, CaptionPosition, CaptionPreset, Clip, ClipStyle, Project } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

const PRESETS: CaptionPreset[] = ["bold", "karaoke", "clean", "neon", "minimal"];
const FONTS: { id: CaptionFont; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "inter", label: "Inter" },
  { id: "mono", label: "Mono" },
  { id: "serif", label: "Serif" },
];
const HIGHLIGHTS = ["#c8f751", "#a78bfa", "#58e6d9", "#ff5c8a", "#ffffff"];
const QUALITIES = ["480p", "720p", "1080p"] as const;
const POSITIONS: { id: CaptionPosition; label: string }[] = [
  { id: "upper", label: "Top" },
  { id: "center", label: "Middle" },
  { id: "lower", label: "Bottom" },
];

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-fog-dim">{children}</p>
      {hint ? <span className="text-[10.5px] text-fog-dim">{hint}</span> : null}
    </div>
  );
}

export function ClipStylePanel({
  clip,
  onUpdate,
}: {
  clip: Clip;
  onUpdate: (patch: { style?: Partial<ClipStyle>; quality?: Clip["quality"] }) => void;
}) {
  const style = clip.style;
  const setStyle = (patch: Partial<ClipStyle>) => onUpdate({ style: patch });

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Caption preset</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setStyle({ preset, uppercase: preset === "bold" || preset === "neon" })}
              data-active={style.preset === preset}
              className="chip capitalize"
              aria-pressed={style.preset === preset}
            >
              {style.preset === preset ? <Check className="size-3" aria-hidden /> : null}
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle>Font</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setStyle({ font: font.id })}
                data-active={style.font === font.id}
                className="chip h-8 px-2.5 text-[11.5px]"
                aria-pressed={style.font === font.id}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Highlight</SectionTitle>
          <div className="flex gap-1.5">
            {HIGHLIGHTS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setStyle({ highlight: color })}
                className={cn(
                  "size-7 rounded-md border transition",
                  style.highlight === color ? "border-white/70" : "border-white/15 hover:border-white/40",
                )}
                style={{ backgroundColor: color }}
                aria-label={`Highlight ${color}`}
                aria-pressed={style.highlight === color}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle hint={`${style.size}%`}>Text size</SectionTitle>
        <input
          type="range"
          min={60}
          max={150}
          step={5}
          value={style.size}
          onChange={(event) => setStyle({ size: Number(event.target.value) })}
          aria-label="Caption size"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-violet"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {POSITIONS.map((position) => (
          <button
            key={position.id}
            type="button"
            onClick={() => setStyle({ position: position.id })}
            data-active={style.position === position.id}
            className="chip h-8 px-2.5 text-[11.5px]"
            aria-pressed={style.position === position.id}
          >
            {position.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStyle({ uppercase: !style.uppercase })}
          data-active={style.uppercase}
          className="chip h-8 px-2.5 text-[11.5px]"
          aria-pressed={style.uppercase}
        >
          AA
        </button>
        <button
          type="button"
          onClick={() => setStyle({ background: !style.background })}
          data-active={style.background}
          className="chip h-8 px-2.5 text-[11.5px]"
          aria-pressed={style.background}
        >
          Box
        </button>
      </div>

      <div className="border-t border-line pt-4">
        <SectionTitle>Export quality</SectionTitle>
        <div className="flex gap-1.5">
          {QUALITIES.map((quality) => (
            <button
              key={quality}
              type="button"
              onClick={() => onUpdate({ quality })}
              data-active={clip.quality === quality}
              className="chip h-8 flex-1 justify-center px-2 text-[11.5px]"
              aria-pressed={clip.quality === quality}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClipTimingPanel({
  clip,
  bounds,
  onUpdate,
}: {
  clip: Clip;
  bounds: { start: number; end: number };
  onUpdate: (patch: { startSec?: number; endSec?: number }) => void;
}) {
  const maxStart = Math.max(0, clip.endSec - 5);
  const minEnd = clip.startSec + 5;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-fog">Clip window</span>
          <span className="font-[family-name:var(--font-mono)] text-snow">
            {formatClock(clip.startSec)} → {formatClock(clip.endSec)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-fog-dim">Duration</span>
          <span className="font-[family-name:var(--font-mono)] text-[13px] font-semibold text-lime">
            {clip.durationSec.toFixed(1)}s
          </span>
        </div>
      </div>

      <div>
        <SectionTitle hint={formatClock(clip.startSec)}>Start</SectionTitle>
        <input
          type="range"
          min={Math.max(bounds.start, 0)}
          max={maxStart}
          step={0.5}
          value={clip.startSec}
          onChange={(event) => onUpdate({ startSec: Number(event.target.value) })}
          aria-label="Clip start"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-violet"
        />
      </div>

      <div>
        <SectionTitle hint={formatClock(clip.endSec)}>End</SectionTitle>
        <input
          type="range"
          min={minEnd}
          max={Math.min(bounds.end, clip.startSec + 60)}
          step={0.5}
          value={clip.endSec}
          onChange={(event) => onUpdate({ endSec: Number(event.target.value) })}
          aria-label="Clip end"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-violet"
        />
      </div>

      <p className="text-[11px] leading-relaxed text-fog-dim">
        Captions outside the new window are trimmed automatically. Keep it under 60 seconds for
        Shorts, Reels and TikTok.
      </p>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-fog-dim">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 text-[10.5px] text-fog transition hover:text-snow"
        >
          {copied ? <Check className="size-3 text-lime" aria-hidden /> : <Clipboard className="size-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-snow">{value}</p>
    </div>
  );
}

export function ClipCopyPanel({
  clip,
  onTitleChange,
}: {
  clip: Clip;
  onTitleChange: (title: string) => void;
}) {
  const [title, setTitle] = useState(clip.title);

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle hint="editable">Title</SectionTitle>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== clip.title && onTitleChange(title.trim())}
          maxLength={90}
          className="field h-10 text-[13px]"
          aria-label="Clip title"
        />
      </div>

      <CopyRow label="Hook" value={clip.hook} />
      <CopyRow label="Caption script" value={clip.captionText} />
      <CopyRow label="Description" value={clip.description} />
      <CopyRow label="Hashtags" value={clip.hashtags.join(" ")} />

      <div>
        <SectionTitle>Alternative titles</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {clip.titleIdeas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => {
                setTitle(idea);
                onTitleChange(idea);
              }}
              className="max-w-full truncate rounded-full border border-line px-2.5 py-1 text-left text-[11px] text-fog transition hover:border-violet/40 hover:text-snow"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClipExportPanel({
  clip,
  project,
  onRender,
  rendering,
}: {
  clip: Clip;
  project: Project;
  onRender: () => void;
  rendering: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const renderReady = clip.render?.status === "ready" && clip.render.url;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white/[0.02] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-snow">MP4 export</p>
            <p className="mt-0.5 text-[11.5px] text-fog">
              {clip.quality} · {project.settings.aspect} · burned-in captions
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px]",
              renderReady
                ? "border-lime/30 bg-lime/10 text-lime"
                : "border-line bg-white/5 text-fog-dim",
            )}
          >
            {renderReady ? "Ready" : clip.render?.status === "failed" ? "Failed" : "Not rendered"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {renderReady ? (
            <a href={clip.render.url} download className="btn btn-primary btn-sm">
              <Download className="size-3.5" aria-hidden /> Download MP4
            </a>
          ) : (
            <button type="button" onClick={onRender} disabled={rendering} className="btn btn-primary btn-sm">
              {rendering ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Film className="size-3.5" aria-hidden />}
              {rendering ? "Rendering…" : "Render MP4"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotice("Render uses ffmpeg + yt-dlp on the host. On serverless hosting the clip kit below is the export path.")}
            className="btn btn-ghost btn-sm"
          >
            How rendering works
          </button>
        </div>

        {clip.render?.message ? (
          <p className="mt-2.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[11px] leading-relaxed text-fog">
            {clip.render.message}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-2.5 text-[11px] leading-relaxed text-fog-dim">{notice}</p>
        ) : null}
      </div>

      <div>
        <SectionTitle hint="no server needed">Clip kit</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            { format: "srt", label: "Captions .srt", icon: FileText },
            { format: "vtt", label: "Captions .vtt", icon: FileText },
            { format: "txt", label: "Copy sheet .txt", icon: FileText },
            { format: "json", label: "Edit list .json", icon: FileJson },
          ].map((item) => (
            <a
              key={item.format}
              href={`/api/clips/${clip.id}/download?format=${item.format}`}
              className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-[11.5px] text-fog transition hover:border-violet/40 hover:text-snow"
            >
              <item.icon className="size-3.5 text-violet-soft" aria-hidden />
              {item.label}
              <Download className="ml-auto size-3 opacity-50" aria-hidden />
            </a>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-fog-dim">
          The edit list includes timings, style tokens and the exact ffmpeg recipe, so you can finish
          the clip in Resolve, Premiere or CapCut.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-violet/25 bg-violet/[0.07] px-3 py-2.5">
        <Sparkles className="size-3.5 shrink-0 text-violet-soft" aria-hidden />
        <p className="text-[11px] leading-relaxed text-fog">
          Tip: post the top-scoring clip first — the ranking is based on how the first three seconds
          hold attention.
        </p>
      </div>
    </div>
  );
}
