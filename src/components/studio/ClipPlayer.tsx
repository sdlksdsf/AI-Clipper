"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, VolumeX } from "lucide-react";
import { CaptionOverlay, activeLine, aspectRatioValue } from "@/components/ui/CaptionOverlay";
import type { Clip, Project, SourceInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  clip: Clip;
  project: Project;
  className?: string;
  onTime?: (seconds: number) => void;
}

type Mode = "youtube" | "twitch" | "file" | "none";

function detectMode(source: SourceInfo): Mode {
  if (source.platform === "youtube" && source.videoId) return "youtube";
  if (source.platform === "twitch" && source.videoId && /videos|clips\.twitch|\/v\//.test(source.url)) {
    return "twitch";
  }
  if (source.platform === "file" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(source.url)) return "file";
  return "none";
}

function youtubeEmbed(clip: Clip, videoId: string) {
  const start = Math.max(0, Math.floor(clip.startSec));
  const end = Math.max(start + 2, Math.ceil(clip.endSec));
  const params = new URLSearchParams({
    start: String(start),
    end: String(end),
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    cc_load_policy: "0",
    autoplay: "0",
    controls: "1",
    origin: typeof window === "undefined" ? "" : window.location.origin,
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function twitchEmbed(clip: Clip, source: SourceInfo) {
  const host = typeof window === "undefined" ? "localhost" : window.location.hostname;
  const offset = Math.max(0, Math.floor(clip.startSec));
  const hours = Math.floor(offset / 3600);
  const minutes = Math.floor((offset % 3600) / 60);
  const seconds = offset % 60;
  const isClip = /clips\.twitch\.tv|\/clip\//.test(source.url);
  const params = new URLSearchParams({ parent: host, autoplay: "false" });
  if (isClip) params.set("clip", source.videoId ?? "");
  else {
    params.set("video", source.videoId ?? "");
    params.set("time", `${hours}h${minutes}m${seconds}s`);
  }
  return `https://player.twitch.tv/?${params.toString()}`;
}

/**
 * Plays the real footage for a clip's exact time range.
 *
 * YouTube embeds are driven over the iframe postMessage API (no external script):
 * we ask for `listening`, poll `getCurrentTime` and mirror `onStateChange`, so the
 * caption overlay stays locked to the actual video rather than a fake timer.
 */
export function ClipPlayer({ clip, project, className, onTime }: Props) {
  const mode = detectMode(project.source);
  const duration = Math.max(1, clip.durationSec);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const listening = useRef(false);
  const timerRef = useRef<number | null>(null);

  const src = useMemo(() => {
    if (mode === "youtube" && project.source.videoId) return youtubeEmbed(clip, project.source.videoId);
    if (mode === "twitch") return twitchEmbed(clip, project.source);
    return "";
  }, [clip, mode, project.source]);

  useEffect(() => {
    setStarted(false);
    setPlaying(false);
    setTime(0);
    listening.current = false;
  }, [clip.id]);

  const send = useCallback((func: string, args: unknown[] = []) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(JSON.stringify({ event: "command", func, args, id: 1 }), "*");
  }, []);

  // Handshake + inbound state from the YouTube player.
  useEffect(() => {
    if (mode !== "youtube") return;
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const data = payload as { event?: string; info?: { currentTime?: number; playerState?: number } };
      if (data?.event === "onReady" || data?.event === "initialDelivery") {
        listening.current = true;
        send("getCurrentTime");
      }
      if (data?.event === "onStateChange") {
        const state = Number(data.info);
        setPlaying(state === 1 || state === 3);
        if (state === 1) setStarted(true);
        if (state === 0) send("seekTo", [Math.max(0, Math.floor(clip.startSec)), true]);
      }
      if (data?.event === "infoDelivery" && typeof data.info?.currentTime === "number") {
        const relative = data.info.currentTime - clip.startSec;
        setTime(Math.max(0, Math.min(duration, relative)));
        onTime?.(Math.max(0, relative));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clip.startSec, duration, mode, onTime, send]);

  // Poll the playhead while the clip is meant to be running.
  useEffect(() => {
    if (mode !== "youtube" || !started) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => send("getCurrentTime"), 300);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [mode, send, started]);

  const handleIframeLoad = useCallback(() => {
    if (mode !== "youtube") return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    window.setTimeout(() => {
      target.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      send("getCurrentTime");
    }, 600);
  }, [mode, send]);

  const play = useCallback(() => {
    setStarted(true);
    if (mode === "youtube") {
      send("playVideo");
      window.setTimeout(() => send("getCurrentTime"), 400);
    }
    if (mode === "file" && videoRef.current) {
      videoRef.current.currentTime = clip.startSec;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [clip.startSec, mode, send]);

  const line = useMemo(() => activeLine(clip.captionLines, clip.startSec + time), [clip.captionLines, clip.startSec, time]);

  const showCaptions = project.settings.captions && started;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border border-white/12 bg-black [container-type:inline-size]",
          project.settings.aspect === "9:16" && "max-w-[320px]",
          project.settings.aspect === "1:1" && "max-w-[380px]",
        )}
        style={{ aspectRatio: aspectRatioValue(project.settings.aspect) }}
      >
        {mode === "file" ? (
          <video
            ref={videoRef}
            src={`${project.source.url}#t=${Math.max(0, Math.floor(clip.startSec))},${Math.ceil(clip.endSec)}`}
            preload="metadata"
            playsInline
            controls
            onLoadedMetadata={(event) => {
              const element = event.currentTarget;
              element.currentTime = clip.startSec;
            }}
            onTimeUpdate={(event) => {
              const element = event.currentTarget;
              const relative = element.currentTime - clip.startSec;
              setTime(Math.max(0, Math.min(duration, relative)));
              setPlaying(!element.paused);
              if (element.currentTime >= clip.endSec) element.pause();
            }}
            className="absolute inset-0 size-full bg-black object-contain"
          />
        ) : src ? (
          <iframe
            ref={iframeRef}
            src={src}
            title={`${project.source.title} — clip ${clip.index + 1}`}
            onLoad={handleIframeLoad}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center gap-2 text-center">
            <p className="max-w-[240px] text-xs text-white/60">
              This source can&apos;t be embedded. Use &ldquo;Open source&rdquo; to watch the moment on the original
              platform.
            </p>
          </div>
        )}

        {!started && (mode === "youtube" || mode === "file") ? (
          <button
            type="button"
            onClick={play}
            className="absolute inset-0 grid place-items-center bg-gradient-to-b from-black/45 via-black/25 to-black/60 transition hover:from-black/35"
            aria-label="Play this clip"
          >
            <span className="grid size-16 place-items-center rounded-full bg-white/95 text-ink shadow-xl transition group-hover:scale-105">
              <Play className="size-7 translate-x-[1px] fill-ink" />
            </span>
            <span className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-white/80">
              Play {Math.round(duration)}s recap
            </span>
          </button>
        ) : null}

        {showCaptions ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[13%] px-3">
            <div className="mx-auto max-w-[86%]">
              <CaptionOverlay line={line} style={clip.style} time={clip.startSec + time} compact />
            </div>
          </div>
        ) : null}

        {playing ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-white/75">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-lime)]" /> live preview
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={play}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-fog transition hover:text-snow"
        >
          <Play className="size-3" aria-hidden /> Play from {Math.floor(clip.startSec / 60)}:
          {String(Math.floor(clip.startSec % 60)).padStart(2, "0")}
        </button>
        {mode === "youtube" ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10.5px] text-fog-dim">
            <VolumeX className="size-3" aria-hidden /> Mute the player for clean captions
          </span>
        ) : null}
      </div>
    </div>
  );
}
