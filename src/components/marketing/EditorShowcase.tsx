"use client";

import { useState } from "react";
import { AlignCenter, AlignEndVertical, AlignStartVertical, Ban, Check, Sparkles } from "lucide-react";
import { CaptionOverlay } from "@/components/ui/CaptionOverlay";
import type { CaptionFont, CaptionPosition, CaptionPreset, ClipStyle, Quality } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS: { id: CaptionPreset; label: string }[] = [
  { id: "bold", label: "Bold pop" },
  { id: "karaoke", label: "Karaoke" },
  { id: "clean", label: "Clean" },
  { id: "neon", label: "Neon" },
  { id: "minimal", label: "Minimal" },
];

const FONTS: { id: CaptionFont; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "inter", label: "Inter" },
  { id: "mono", label: "Mono" },
  { id: "serif", label: "Serif" },
];

const HIGHLIGHTS: { value: string; label: string }[] = [
  { value: "#c8f751", label: "Lime" },
  { value: "#a78bfa", label: "Violet" },
  { value: "#58e6d9", label: "Cyan" },
  { value: "#ff5c8a", label: "Pink" },
  { value: "#ffffff", label: "White" },
];

const QUALITIES: Quality[] = ["480p", "720p", "1080p"];

export function EditorShowcase() {
  const [preset, setPreset] = useState<CaptionPreset>("bold");
  const [font, setFont] = useState<CaptionFont>("display");
  const [highlight, setHighlight] = useState("#c8f751");
  const [position, setPosition] = useState<CaptionPosition>("lower");
  const [uppercase, setUppercase] = useState(true);
  const [background, setBackground] = useState(false);
  const [size, setSize] = useState(100);
  const [quality, setQuality] = useState<Quality>("1080p");

  const style: ClipStyle = {
    preset,
    font,
    size,
    uppercase,
    highlight,
    color: "#ffffff",
    position,
    background,
  };

  const line = {
    start: 0,
    end: 5,
    words: [
      { text: "That", start: 0, end: 0.3 },
      { text: "clip", start: 0.3, end: 0.6 },
      { text: "did", start: 0.6, end: 0.9 },
      { text: "eight", start: 0.9, end: 1.2, emphasis: true },
      { text: "million", start: 1.2, end: 1.5, emphasis: true },
      { text: "views", start: 1.5, end: 1.8, emphasis: true },
    ],
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
      <div className="relative order-2 lg:order-1">
        <div className="card p-4">
          <div className="rounded-xl border border-line bg-ink-2/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-violet/15 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] text-violet-soft">
                <Sparkles className="size-3" aria-hidden /> live preview
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">9:16 · {quality}</span>
            </div>

            <div
              className="relative mx-auto max-w-[260px] overflow-hidden rounded-xl border border-white/10 [container-type:inline-size]"
              style={{
                aspectRatio: "9/15",
                background: "radial-gradient(120% 90% at 30% 0%,#3d2f78 0%,#1e1738 45%,#0a0810 100%)",
              }}
            >
              <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(120deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_9px)]" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[8.5px] uppercase text-white/70">
                  Clip 01
                </span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[8.5px] text-lime">
                  96
                </span>
              </div>
              <CaptionOverlay line={line} style={style} time={1.35} compact />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {QUALITIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuality(item)}
                  className="chip h-7 flex-1 justify-center rounded-md px-2 text-[11px]"
                  data-active={quality === item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-violet/10 blur-2xl" aria-hidden />
      </div>

      <div className="order-1 lg:order-2">
        <div className="space-y-5">
          <div>
            <p className="label">Caption style</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className="chip"
                  data-active={preset === item.id}
                  aria-pressed={preset === item.id}
                >
                  {preset === item.id ? <Check className="size-3" aria-hidden /> : null}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Font</p>
              <div className="flex flex-wrap gap-1.5">
                {FONTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFont(item.id)}
                    className="chip h-8 px-2.5 text-[12px]"
                    data-active={font === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Highlight</p>
              <div className="flex gap-1.5">
                {HIGHLIGHTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setHighlight(item.value)}
                    aria-label={item.label}
                    aria-pressed={highlight === item.value}
                    className={cn(
                      "size-8 rounded-lg border transition",
                      highlight === item.value ? "border-white/70" : "border-white/15 hover:border-white/40",
                    )}
                    style={{ backgroundColor: item.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="label mb-0">Text size</p>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-fog">{size}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={140}
              step={5}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              aria-label="Caption size"
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-violet"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line p-0.5">
              {[
                { id: "upper" as CaptionPosition, icon: AlignStartVertical, label: "Top" },
                { id: "center" as CaptionPosition, icon: AlignCenter, label: "Middle" },
                { id: "lower" as CaptionPosition, icon: AlignEndVertical, label: "Bottom" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPosition(item.id)}
                  aria-label={item.label}
                  aria-pressed={position === item.id}
                  className={cn(
                    "grid size-8 place-items-center rounded-md transition",
                    position === item.id ? "bg-white/12 text-snow" : "text-fog-dim hover:text-snow",
                  )}
                >
                  <item.icon className="size-3.5" aria-hidden />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUppercase((value) => !value)}
              className="chip"
              data-active={uppercase}
              aria-pressed={uppercase}
            >
              AA uppercase
            </button>
            <button
              type="button"
              onClick={() => setBackground((value) => !value)}
              className="chip"
              data-active={background}
              aria-pressed={background}
            >
              {background ? <Check className="size-3" aria-hidden /> : <Ban className="size-3" aria-hidden />}
              Backing box
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
