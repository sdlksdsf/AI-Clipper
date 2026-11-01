"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { CaptionOverlay, activeLine } from "@/components/ui/CaptionOverlay";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { CaptionLine, ClipStyle } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

interface DemoClip {
  title: string;
  hook: string;
  score: number;
  subscores: [string, number][];
  duration: number;
  tags: string[];
  captions: CaptionLine[];
  style: ClipStyle;
  background: string;
  accent: string;
}

function words(text: string, start: number, end: number, emphasis: number[]): CaptionLine["words"] {
  const parts = text.split(" ");
  const step = (end - start) / parts.length;
  return parts.map((part, index) => ({
    text: part,
    start: Number((start + step * index).toFixed(2)),
    end: Number((start + step * (index + 1)).toFixed(2)),
    emphasis: emphasis.includes(index),
  }));
}

const BASE_STYLE: ClipStyle = {
  preset: "bold",
  font: "display",
  size: 100,
  uppercase: true,
  highlight: "#c8f751",
  color: "#ffffff",
  position: "lower",
  background: false,
};

const DEMO: DemoClip[] = [
  {
    title: "The $10,000 bet that started everything",
    hook: "Nineteen viewers. One impossible bet.",
    score: 94,
    subscores: [
      ["Hook", 96],
      ["Retention", 92],
      ["Emotion", 88],
      ["Shareability", 90],
    ],
    duration: 34,
    tags: ["#story", "#money", "#shorts"],
    background:
      "radial-gradient(120% 90% at 20% 0%,#4b3a8f 0%,#241c47 42%,#0b0912 100%)",
    accent: "#c8f751",
    style: BASE_STYLE,
    captions: [
      { start: 0, end: 2.6, words: words("I BET HIM TEN THOUSAND DOLLARS", 0, 2.6, [3, 4]) },
      { start: 2.6, end: 5.4, words: words("THAT I COULDN'T DO IT", 2.6, 5.4, [3]) },
      { start: 5.4, end: 8.4, words: words("AND EVERYBODY SAID IT WAS IMPOSSIBLE", 5.4, 8.4, [4]) },
      { start: 8.4, end: 11.5, words: words("I WAS STREAMING TO NINETEEN PEOPLE", 8.4, 11.5, [5]) },
      { start: 11.5, end: 14.6, words: words("DAY ONE, I LOST FOUR HUNDRED DOLLARS", 11.5, 14.6, [4, 5]) },
      { start: 14.6, end: 17.6, words: words("THEN EVERYTHING CHANGED", 14.6, 17.6, [2]) },
    ],
  },
  {
    title: "AI won't take your job — this will",
    hook: "The take that made chat furious.",
    score: 89,
    subscores: [
      ["Hook", 88],
      ["Retention", 91],
      ["Emotion", 84],
      ["Shareability", 93],
    ],
    duration: 28,
    tags: ["#ai", "#hotake", "#creator"],
    background: "radial-gradient(120% 90% at 80% 0%,#12525a 0%,#0e2b31 45%,#07100f 100%)",
    accent: "#58e6d9",
    style: { ...BASE_STYLE, preset: "neon", highlight: "#58e6d9" },
    captions: [
      { start: 0, end: 2.8, words: words("AI WON'T TAKE YOUR JOB", 0, 2.8, [0, 1]) },
      { start: 2.8, end: 6.2, words: words("SOMEONE USING AI WILL", 2.8, 6.2, [3]) },
      { start: 6.2, end: 9.4, words: words("I DID FORTY CLIPS BEFORE LUNCH", 6.2, 9.4, [2, 3]) },
      { start: 9.4, end: 12.6, words: words("AND THEY WERE BETTER THAN MINE", 9.4, 12.6, [5]) },
      { start: 12.6, end: 15.8, words: words("TASTE IS THE ENTIRE MOAT", 12.6, 15.8, [2, 4]) },
    ],
  },
  {
    title: "The round I'll never live down",
    hook: "One shot. One corner. Everything on it.",
    score: 91,
    subscores: [
      ["Hook", 93],
      ["Retention", 94],
      ["Emotion", 95],
      ["Shareability", 86],
    ],
    duration: 31,
    tags: ["#gaming", "#clutch", "#streamer"],
    background: "radial-gradient(120% 90% at 50% 0%,#5e2a45 0%,#2b1322 45%,#0f070c 100%)",
    accent: "#ff5c8a",
    style: { ...BASE_STYLE, preset: "karaoke", highlight: "#ff5c8a" },
    captions: [
      { start: 0, end: 2.4, words: words("THREE OF US LEFT. THEY HAVE THE MAP.", 0, 2.4, [2, 6]) },
      { start: 2.4, end: 5.6, words: words("I'M TAKING ONE FIGHT AND WE WIN THE ROUND", 2.4, 5.6, [3, 8]) },
      { start: 5.6, end: 8.2, words: words("MOVE. MOVE NOW. NOW.", 5.6, 8.2, [1, 2, 3]) },
      { start: 8.2, end: 11.4, words: words("I HEAR FOOTSTEPS. HE'S ON THE STAIRS.", 8.2, 11.4, [2, 5]) },
      { start: 11.4, end: 14.6, words: words("HE PEEKED. OH MY GOD.", 11.4, 14.6, [1, 4]) },
    ],
  },
];

export function DemoClips() {
  const [active, setActive] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const clip = DEMO[active];

  useEffect(() => {
    setTime(0);
    setPlaying(true);
  }, [active]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTime((value) => {
        const next = value + 0.1;
        return next > (clip.captions.at(-1)?.end ?? 15) + 2 ? 0 : next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, clip]);

  const line = useMemo(() => activeLine(clip.captions, time), [clip, time]);
  const progress = Math.min(100, (time / clip.duration) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="order-2 grid gap-3 lg:order-1">
        <div className="flex items-center justify-between px-1">
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-fog-dim">
            Ranked by virality
          </p>
          <p className="text-[11px] text-fog-dim">{DEMO.length} of 6 clips</p>
        </div>
        {DEMO.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "group flex items-center gap-3.5 rounded-xl border p-3 text-left transition",
              index === active
                ? "border-violet/50 bg-violet/[0.08]"
                : "border-line bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.04]",
            )}
            aria-pressed={index === active}
          >
            <ScoreRing score={item.score} size={46} stroke={3.5} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">
                  #{String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">
                  {formatClock(item.duration)}
                </span>
              </div>
              <p className="mt-1 truncate text-[13.5px] font-medium text-snow">{item.title}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-fog-dim">{item.hook}</p>
            </div>
            <Play
              className={cn(
                "size-4 shrink-0 transition",
                index === active ? "text-violet-soft" : "text-fog-dim group-hover:text-fog",
              )}
              aria-hidden
            />
          </button>
        ))}

        <div className="mt-1 grid gap-2 rounded-xl border border-line bg-white/[0.02] p-3.5 sm:grid-cols-2">
          {clip.subscores.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-[74px] text-[11px] text-fog-dim">{label}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${value}%`, backgroundColor: clip.accent }}
                />
              </div>
              <span className="w-6 text-right font-[family-name:var(--font-mono)] text-[10.5px] text-fog">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div
          className="relative mx-auto max-w-[300px] overflow-hidden rounded-2xl border border-white/12 [container-type:inline-size]"
          style={{ aspectRatio: "9/15", background: clip.background }}
        >
          <div className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(120deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_10px)]" />
          <div
            className="absolute -left-8 top-16 size-40 rounded-full blur-3xl"
            style={{ backgroundColor: `${clip.accent}33` }}
          />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="rounded-full bg-black/45 px-2 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-white/75 backdrop-blur">
              Preview
            </span>
            <span
              className="rounded-full px-2 py-1 font-[family-name:var(--font-mono)] text-[9.5px] font-semibold backdrop-blur"
              style={{ backgroundColor: `${clip.accent}22`, color: clip.accent }}
            >
              {clip.score}/100
            </span>
          </div>

          <CaptionOverlay line={line} style={clip.style} time={time} compact />

          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-2 backdrop-blur">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="grid size-6 place-items-center rounded-full bg-white text-ink"
                aria-label={playing ? "Pause preview" : "Play preview"}
              >
                {playing ? (
                  <Pause className="size-3 fill-ink" aria-hidden />
                ) : (
                  <Play className="size-3 fill-ink" aria-hidden />
                )}
              </button>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/70">
                {formatClock(Math.min(time, clip.duration))}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <Volume2 className="size-3 text-white/50" aria-hidden />
            </div>
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-[300px] text-center text-[10.5px] leading-relaxed text-fog-dim">
          Style, timing and scores shown here are generated by the same engine that runs in the studio.
        </p>
        <button
          type="button"
          onClick={() => {
            setTime(0);
            setPlaying(true);
          }}
          className="mx-auto mt-2 flex items-center gap-1.5 text-[11px] text-fog transition hover:text-snow"
        >
          <RotateCcw className="size-3" aria-hidden /> Replay
        </button>
      </div>
    </div>
  );
}
