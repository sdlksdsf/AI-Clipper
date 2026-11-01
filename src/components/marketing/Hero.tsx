"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Captions, Check, Play, Scissors, Sparkles, Video } from "lucide-react";
import { ClipUrlForm } from "@/components/marketing/ClipUrlForm";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { cn } from "@/lib/utils";

const CAPTIONS = [
  { text: "I bet him ten thousand dollars I could do it", highlight: 2 },
  { text: "And on day nineteen, everything changed", highlight: 4 },
  { text: "That clip did eight million views", highlight: 5 },
];

function HeroClip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % CAPTIONS.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  const caption = CAPTIONS[index];

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      {/* main frame */}
      <div className="relative rounded-[26px] border border-white/12 bg-surface p-2.5 shadow-[0_40px_120px_-40px_rgba(124,92,255,0.65)]">
        <div className="relative aspect-[9/15] overflow-hidden rounded-[18px]">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,#4b3a8f_0%,#221a3f_45%,#0b0912_100%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(115deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_9px)]" />
          <div className="absolute -left-10 top-24 size-48 rounded-full bg-violet/40 blur-3xl" />
          <div className="absolute -right-8 bottom-16 size-40 rounded-full bg-lime/20 blur-3xl" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-pink" aria-hidden />
              CLIP 01
            </span>
            <div className="rounded-full bg-black/45 p-1 backdrop-blur">
              <ScoreRing score={92} size={46} stroke={3.5} />
            </div>
          </div>

          {/* fake speaker silhouette */}
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute bottom-[30%] left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/8 blur-2xl" aria-hidden />

          <div className="absolute inset-x-0 bottom-[15%] px-5 text-center">
            <p
              key={index}
              className="animate-pop font-[family-name:var(--font-display)] text-[19px] font-black uppercase leading-[1.1] tracking-[-0.02em] text-white [text-shadow:0_3px_0_rgba(0,0,0,0.9)]"
            >
              {caption.text.split(" ").map((word, wordIndex) => (
                <span
                  key={`${word}-${wordIndex}`}
                  className={cn("mr-1.5 inline-block", wordIndex === caption.highlight && "text-lime")}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <div className="flex items-center gap-1 rounded-lg bg-black/45 px-2.5 py-2 backdrop-blur">
              <Play className="size-3 fill-white text-white" aria-hidden />
              <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-white/70">0:12</span>
              <div className="mx-1 flex flex-1 items-end gap-[2px]" aria-hidden>
                {Array.from({ length: 30 }).map((_, barIndex) => (
                  <span
                    key={barIndex}
                    className="flex-1 rounded-full bg-white/40"
                    style={{
                      height: `${4 + ((barIndex * 7 + index * 5) % 11)}px`,
                      opacity: barIndex % 3 === 0 ? 0.85 : 0.45,
                    }}
                  />
                ))}
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[9.5px] text-white/40">0:34</span>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="animate-float absolute -left-6 top-[22%] hidden rounded-xl border border-line bg-ink-2/95 px-3 py-2.5 shadow-lift backdrop-blur sm:block">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-violet/15 text-violet-soft">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-snow">Hook detected</p>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">score 94 · 0:00</p>
          </div>
        </div>
      </div>

      <div
        className="animate-float absolute -right-4 top-[46%] hidden rounded-xl border border-line bg-ink-2/95 px-3 py-2.5 shadow-lift backdrop-blur sm:block"
        style={{ animationDelay: "1.2s" }}
      >
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fog-dim">Virality</p>
        {[
          ["Hook", 94],
          ["Retention", 88],
        ].map(([label, value]) => (
          <div key={String(label)} className="mb-1.5 last:mb-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10.5px] text-fog">{label}</span>
              <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-lime">{value}</span>
            </div>
            <div className="mt-1 h-1 w-24 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime"
                style={{ width: `${value}%`, boxShadow: "0 0 8px rgba(200,247,81,0.6)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="animate-float absolute -bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-ink-2/95 px-3 py-1.5 shadow-lift backdrop-blur sm:flex"
        style={{ animationDelay: "0.6s" }}
      >
        <Check className="size-3.5 text-lime" aria-hidden />
        <span className="text-[11px] font-medium text-snow">6 clips ready · 1080p</span>
      </div>
    </div>
  );
}

const STATS = [
  { value: "1–6", label: "clips per video" },
  { value: "1080p", label: "max export" },
  { value: "~40s", label: "average clip" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pt-16 md:pb-24 md:pt-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-x-0 top-0 h-[720px]" />
        <div className="glow-orb -left-32 top-[-120px] size-[420px] bg-violet/45" />
        <div className="glow-orb right-[-140px] top-[40px] size-[380px] bg-[#3b1f6e]/50" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,92,255,0.16),transparent_70%)]" />
      </div>

      <div className="wrap grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <Link
            href="/#features"
            className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1 pl-1.5 pr-3 text-[11.5px] text-fog transition hover:border-white/25 hover:text-snow"
          >
            <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
              New
            </span>
            Virality Score 2.0 — explainable, not magic
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <h1 className="mt-6 text-[38px] leading-[0.98] sm:text-[52px] lg:text-[60px]">
            Your stream already
            <br className="hidden sm:block" /> has the clip.{" "}
            <span className="gradient-text">We find it.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-fog sm:text-[16.5px]">
            Paste a link. ClipForge watches the whole video, ranks the moments that actually hold
            attention, then cuts, captions and reframes them for Shorts, Reels and TikTok — all in
            under a minute.
          </p>

          <div className="mt-7 max-w-[560px]">
            <ClipUrlForm size="large" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-fog-dim">
            <span className="inline-flex items-center gap-1.5">
              <Video className="size-3.5" aria-hidden /> YouTube
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Scissors className="size-3.5" aria-hidden /> Twitch
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Captions className="size-3.5" aria-hidden /> Kick
            </span>
            <span>No credit card required</span>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-[family-name:var(--font-mono)] text-[22px] font-semibold text-snow">
                  {stat.value}
                </dt>
                <dd className="mt-0.5 text-[11.5px] text-fog-dim">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <HeroClip />
        </div>
      </div>
    </section>
  );
}
