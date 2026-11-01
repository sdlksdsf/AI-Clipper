"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Captions,
  Check,
  ChevronRight,
  Clock,
  Film,
  Link2,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { Aspect, CaptionFont, CaptionPreset, LengthPreset, ProjectSettings, Quality } from "@/lib/types";
import { cn } from "@/lib/utils";

const SAMPLES = [
  { label: "Long-form video", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
  { label: "Stream VOD", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { label: "Twitch clip", url: "https://clips.twitch.tv/TangentialBillowingJalapenoYee-ccA2oB1pEYh4CHWJ" },
];

const LENGTHS: { value: LengthPreset; label: string; hint: string }[] = [
  { value: 0, label: "Auto", hint: "AI picks" },
  { value: 15, label: "15s", hint: "Hooks" },
  { value: 30, label: "30s", hint: "Shorts" },
  { value: 45, label: "45s", hint: "Story" },
  { value: 60, label: "60s", hint: "Max" },
];

const ASPECTS: { value: Aspect; label: string; hint: string; box: string }[] = [
  { value: "9:16", label: "9:16", hint: "Shorts · Reels · TikTok", box: "h-9 w-[20px]" },
  { value: "1:1", label: "1:1", hint: "Feed posts", box: "size-7" },
  { value: "16:9", label: "16:9", hint: "YouTube · X", box: "h-[18px] w-8" },
];

const QUALITIES: { value: Quality; label: string; hint: string }[] = [
  { value: "480p", label: "480p", hint: "Fastest" },
  { value: "720p", label: "720p", hint: "Balanced" },
  { value: "1080p", label: "1080p", hint: "Best" },
];

const PRESETS: { value: CaptionPreset; label: string }[] = [
  { value: "bold", label: "Bold pop" },
  { value: "karaoke", label: "Karaoke" },
  { value: "clean", label: "Clean" },
  { value: "neon", label: "Neon" },
  { value: "minimal", label: "Minimal" },
];

const FONTS: { value: CaptionFont; label: string }[] = [
  { value: "display", label: "Display" },
  { value: "inter", label: "Inter" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Serif" },
];

const FOCUS_IDEAS = [
  "Funniest moments",
  "Emotional beats",
  "Hot takes & debates",
  "Storytelling",
  "Biggest reactions",
];

function detectPlatform(url: string): { label: string; ok: boolean } {
  const value = url.trim().toLowerCase();
  if (!value) return { label: "Waiting for a link", ok: false };
  if (/youtu\.?be/.test(value)) return { label: "YouTube detected", ok: true };
  if (/twitch\.tv/.test(value)) return { label: "Twitch detected", ok: true };
  if (/kick\.com/.test(value)) return { label: "Kick detected", ok: true };
  if (/\.(mp4|mov|m4v|webm|mkv)(\?|$)/.test(value)) return { label: "Video file detected", ok: true };
  return { label: "Paste a YouTube, Twitch, Kick or MP4 link", ok: false };
}

export function NewProjectForm({ initialUrl = "" }: { initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [settings, setSettings] = useState<ProjectSettings>({
    clipCount: 3,
    targetLength: 30,
    aspect: "9:16",
    quality: "1080p",
    captionPreset: "bold",
    captionFont: "display",
    language: "en",
    prompt: "",
    captions: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const detected = useMemo(() => detectPlatform(url), [url]);
  const patch = (next: Partial<ProjectSettings>) => setSettings((current) => ({ ...current, ...next }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Paste a video link first.");
      return;
    }
    if (!detected.ok) {
      setError("That link isn't supported yet. Try a YouTube, Twitch, Kick or direct MP4 URL.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, settings }),
      });
      const data = (await response.json()) as { project?: { id: string }; error?: string };
      if (!response.ok || !data.project) {
        setError(data.error ?? "Something went wrong starting that project.");
        setPending(false);
        return;
      }
      router.push(`/studio/${data.project.id}`);
    } catch {
      setError("Network hiccup — check your connection and try again.");
      setPending(false);
    }
  }

  const lengthLabel =
    settings.targetLength === 0 ? "Auto length" : `up to ${settings.targetLength}s`;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-4">
        {/* Source */}
        <section className="card-flat p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-medium text-snow">
              <Link2 className="size-4 text-violet-soft" aria-hidden /> Source video
            </h2>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10.5px]",
                detected.ok
                  ? "border-lime/30 bg-lime/10 text-lime"
                  : "border-line bg-white/5 text-fog-dim",
              )}
            >
              {detected.label}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError(null);
              }}
              placeholder="https://www.youtube.com/watch?v=… or https://clips.twitch.tv/…"
              className="field flex-1"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-label="Video link"
            />
            <button type="submit" disabled={pending} className="btn btn-accent shrink-0">
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
              {pending ? "Starting…" : "Analyze"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-fog-dim">Samples:</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  setError(null);
                }}
                className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-fog transition hover:border-white/25 hover:text-snow"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </section>

        {/* What to find */}
        <section className="card-flat p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-snow">
            <Sparkles className="size-4 text-violet-soft" aria-hidden /> What should we find?
          </h2>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="label mb-0">Clips to generate</p>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-fog">
                {settings.clipCount} of 6
              </span>
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => patch({ clipCount: count })}
                  data-active={settings.clipCount === count}
                  className="chip h-9 justify-center px-0 text-[13px]"
                  aria-pressed={settings.clipCount === count}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="label">Target length</p>
            <div className="grid grid-cols-5 gap-1.5">
              {LENGTHS.map((item) => (
                <button
                  key={String(item.value)}
                  type="button"
                  onClick={() => patch({ targetLength: item.value })}
                  data-active={settings.targetLength === item.value}
                  className="chip h-auto flex-col items-start gap-0.5 px-2 py-1.5"
                  aria-pressed={settings.targetLength === item.value}
                >
                  <span className="text-[12.5px] font-medium">{item.label}</span>
                  <span className="text-[9.5px] opacity-70">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="focus" className="label">
              Focus prompt <span className="font-normal text-fog-dim">(optional)</span>
            </label>
            <input
              id="focus"
              value={settings.prompt}
              onChange={(event) => patch({ prompt: event.target.value })}
              maxLength={280}
              placeholder="e.g. only the funny arguments with chat"
              className="field"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FOCUS_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => patch({ prompt: idea })}
                  className="rounded-full border border-line px-2.5 py-1 text-[10.5px] text-fog transition hover:border-violet/40 hover:text-snow"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Look */}
        <section className="card-flat p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-snow">
            <Captions className="size-4 text-violet-soft" aria-hidden /> Format & captions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Aspect ratio</p>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECTS.map((aspect) => (
                  <button
                    key={aspect.value}
                    type="button"
                    onClick={() => patch({ aspect: aspect.value })}
                    data-active={settings.aspect === aspect.value}
                    className="chip h-auto flex-col gap-1.5 px-1.5 py-2"
                    aria-pressed={settings.aspect === aspect.value}
                  >
                    <span
                      className={cn(
                        "rounded-[3px] border",
                        aspect.box,
                        settings.aspect === aspect.value ? "border-violet-soft bg-violet/25" : "border-white/25",
                      )}
                      aria-hidden
                    />
                    <span className="text-[11.5px]">{aspect.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] text-fog-dim">
                {ASPECTS.find((item) => item.value === settings.aspect)?.hint}
              </p>
            </div>

            <div>
              <p className="label">Caption style</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => patch({ captionPreset: preset.value })}
                    data-active={settings.captionPreset === preset.value}
                    className="chip h-8 px-2.5 text-[11.5px]"
                    aria-pressed={settings.captionPreset === preset.value}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FONTS.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => patch({ captionFont: font.value })}
                    data-active={settings.captionFont === font.value}
                    className="chip h-7 px-2 text-[10.5px]"
                    aria-pressed={settings.captionFont === font.value}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fog">
              <input
                type="checkbox"
                checked={settings.captions}
                onChange={(event) => patch({ captions: event.target.checked })}
                className="size-4 accent-violet"
              />
              Burn in captions
            </label>
            <span className="text-[11px] text-fog-dim">·</span>
            <span className="text-[11px] text-fog-dim">Style can be changed per clip after analysis</span>
          </div>
        </section>

        {/* Quality */}
        <section className="card-flat p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-snow">
            <Film className="size-4 text-violet-soft" aria-hidden /> Export quality
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {QUALITIES.map((quality) => (
              <button
                key={quality.value}
                type="button"
                onClick={() => patch({ quality: quality.value })}
                data-active={settings.quality === quality.value}
                className="chip h-auto flex-col items-start gap-0.5 px-3 py-2"
                aria-pressed={settings.quality === quality.value}
              >
                <span className="text-[12.5px] font-medium">{quality.label}</span>
                <span className="text-[9.5px] opacity-70">{quality.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-[12.5px] text-pink" role="alert">
            {error}
          </div>
        ) : null}
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-6">
        <div className="card p-5">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-fog-dim">
            Project summary
          </p>
          <h2 className="mt-2 text-[18px]">{settings.clipCount} clips, best first</h2>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[12.5px]">
            {[
              ["Clips", `${settings.clipCount} × ${lengthLabel}`],
              ["Format", `${settings.aspect} · ${settings.quality}`],
              ["Captions", settings.captions ? `${PRESETS.find((p) => p.value === settings.captionPreset)?.label} · ${FONTS.find((f) => f.value === settings.captionFont)?.label}` : "Off"],
              ["Focus", settings.prompt.trim() ? settings.prompt.trim() : "Balanced"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="text-fog-dim">{label}</dt>
                <dd className="max-w-[62%] text-right text-snow">{value}</dd>
              </div>
            ))}
          </dl>

          <button type="submit" disabled={pending} className="btn btn-primary mt-5 w-full">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {pending ? "Starting analysis…" : "Analyze video"}
            {!pending ? <ArrowRight className="size-4" aria-hidden /> : null}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-fog-dim">
            <Clock className="size-3" aria-hidden /> Usually ready in under a minute
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-4">
          <p className="text-[11.5px] font-medium text-snow">What happens next</p>
          <ol className="mt-2.5 space-y-2">
            {[
              "Every second is transcribed",
              "Hooks and payoffs are scored",
              "Clips are cut, captioned & ranked",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-[11.5px] text-fog">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-white/8 font-[family-name:var(--font-mono)] text-[9px] text-fog">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[10.5px] text-fog-dim">
            <Check className="size-3 text-lime" aria-hidden /> Delete a project any time
            <ChevronRight className="size-3" aria-hidden />
          </div>
        </div>
      </aside>
    </form>
  );
}
