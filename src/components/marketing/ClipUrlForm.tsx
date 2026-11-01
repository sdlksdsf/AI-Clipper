"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLES = [
  { label: "3Blue1Brown", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
  { label: "Podcast VOD", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { label: "Twitch VOD", url: "https://www.twitch.tv/videos/1234567890" },
];

export function ClipUrlForm({
  size = "default",
  className,
  showSamples = false,
  placeholder = "Paste a YouTube, Twitch or Kick link",
}: {
  size?: "default" | "large";
  className?: string;
  showSamples?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Paste a link to get started.");
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes(".")) throw new Error("bad host");
    } catch {
      setError("That doesn't look like a valid link.");
      return;
    }
    setError(null);
    setPending(true);
    router.push(`/studio/new?url=${encodeURIComponent(normalized)}`);
  }

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className={cn(
          "flex flex-col gap-2 rounded-[15px] border border-white/10 bg-white/[0.045] p-2 backdrop-blur-sm transition focus-within:border-violet/60 focus-within:bg-white/[0.065] sm:flex-row sm:items-center",
          size === "large" && "sm:p-2.5",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
          <Link2 className="size-4 shrink-0 text-fog-dim" aria-hidden />
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            aria-label="Video link"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "w-full min-w-0 bg-transparent text-snow placeholder:text-fog-dim focus:outline-none",
              size === "large" ? "h-[46px] text-[15px]" : "h-[42px] text-sm",
            )}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={cn("btn btn-accent w-full sm:w-auto", size === "large" && "btn-lg")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Opening studio" : "Clip it free"}
          {!pending ? <ArrowRight className="size-4" aria-hidden /> : null}
        </button>
      </form>

      {error ? <p className="mt-2 pl-1 text-xs text-pink">{error}</p> : null}

      {showSamples ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-1 text-xs text-fog-dim">
          <span>Try a sample:</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.url}
              type="button"
              onClick={() => {
                setValue(sample.url);
                submit(sample.url);
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-fog transition hover:border-white/25 hover:text-snow"
            >
              {sample.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
