"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Loader2,
  Plus,
  Radio,
  Sparkles,
} from "lucide-react";
import { ClipPreview } from "@/components/studio/ClipPreview";
import {
  ClipCopyPanel,
  ClipExportPanel,
  ClipStylePanel,
  ClipTimingPanel,
} from "@/components/studio/ClipPanels";
import { ScoreRing, Meter } from "@/components/ui/ScoreRing";
import { Thumb } from "@/components/ui/Thumb";
import type { Clip, ClipStyle, Project } from "@/lib/types";
import { cn, formatClock, formatDuration, timeAgo } from "@/lib/utils";

type Tab = "style" | "timing" | "copy" | "export";

const TABS: { id: Tab; label: string }[] = [
  { id: "style", label: "Style" },
  { id: "timing", label: "Timing" },
  { id: "copy", label: "Copy" },
  { id: "export", label: "Export" },
];

/* ───────────────────────────── processing ─────────────────────────────── */

function ProcessingView({
  project,
  error,
}: {
  project: Project;
  error: string | null;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeIndex = Math.max(0, project.stages.findIndex((stage) => stage.status === "active"));
  const progress = Math.max(4, project.progress);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-line">
          <Thumb src={project.source.thumbnail} alt={project.source.title} seed={project.id.length} className="size-full" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-snow">{project.source.title}</p>
          <p className="mt-0.5 text-[11.5px] text-fog">
            {project.source.author} · {formatDuration(project.source.durationSec)} ·{" "}
            {project.settings.clipCount} clips
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-[10.5px] text-violet-soft">
          <span className="size-1.5 animate-pulse rounded-full bg-violet-soft" aria-hidden />
          Analyzing
        </span>
      </div>

      <div className="mt-7">
        <div className="flex items-end justify-between">
          <h1 className="text-[22px]">{project.stages[activeIndex]?.label ?? "Analyzing"}</h1>
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-fog">{progress}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet to-lime transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-fog-dim">
          {project.stages[activeIndex]?.detail} · {elapsed}s elapsed
        </p>
      </div>

      <div className="mt-7 card-flat divide-y divide-line">
        {project.stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-[10px]",
                stage.status === "done" && "border-lime/40 bg-lime/12 text-lime",
                stage.status === "active" && "border-violet/50 bg-violet/15 text-violet-soft",
                stage.status === "pending" && "border-line bg-white/[0.03] text-fog-dim",
              )}
            >
              {stage.status === "done" ? (
                <Check className="size-3" aria-hidden />
              ) : stage.status === "active" ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[12.5px]",
                  stage.status === "pending" ? "text-fog-dim" : "text-snow",
                )}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-fog-dim">{stage.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-pink/30 bg-pink/10 px-3.5 py-3 text-[12px] text-pink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/studio" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to projects
        </Link>
        <Link href="/studio/new" className="btn btn-ghost btn-sm">
          <Plus className="size-3.5" aria-hidden /> Start another
        </Link>
        <p className="text-[11px] text-fog-dim">
          You can leave this page — analysis keeps running.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── results ──────────────────────────────── */

function applyLocal(clip: Clip, patch: Partial<Clip> & { style?: Partial<ClipStyle> }): Clip {
  const next: Clip = {
    ...clip,
    ...patch,
    style: patch.style ? { ...clip.style, ...patch.style } : clip.style,
  };
  if (patch.startSec !== undefined || patch.endSec !== undefined) {
    const start = Math.max(0, patch.startSec ?? clip.startSec);
    const end = Math.max(start + 5, patch.endSec ?? clip.endSec);
    next.startSec = start;
    next.endSec = end;
    next.durationSec = end - start;
  }
  return next;
}

function ResultsView({ initial }: { initial: Project }) {
  const [project, setProject] = useState(initial);
  const [activeId, setActiveId] = useState(initial.clips[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("style");
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState<string | null>(null);

  const pending = useRef<{ patch: Record<string, unknown>; timer: number | null }>({
    patch: {},
    timer: null,
  });

  const clip = useMemo(
    () => project.clips.find((item) => item.id === activeId) ?? project.clips[0],
    [project.clips, activeId],
  );

  const patchClip = useCallback((clipId: string, patch: Record<string, unknown>) => {
    setProject((current) => ({
      ...current,
      clips: current.clips.map((item) =>
        item.id === clipId ? applyLocal(item, patch as Partial<Clip>) : item,
      ),
    }));

    pending.current.patch = { ...pending.current.patch, ...patch };
    if (pending.current.timer) window.clearTimeout(pending.current.timer);
    pending.current.timer = window.setTimeout(async () => {
      const body = pending.current.patch;
      pending.current.patch = {};
      setSaving(true);
      try {
        const response = await fetch(`/api/clips/${clipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as { clip?: Clip };
        if (data.clip) {
          setProject((current) => ({
            ...current,
            clips: current.clips.map((item) => (item.id === clipId ? data.clip as Clip : item)),
          }));
        }
      } finally {
        setSaving(false);
      }
    }, 420);
  }, []);

  async function renderClip(clipId: string) {
    setRendering(clipId);
    try {
      const response = await fetch(`/api/clips/${clipId}/render`, { method: "POST" });
      const data = (await response.json()) as { render?: Clip["render"] };
      if (data.render) {
        setProject((current) => ({
          ...current,
          clips: current.clips.map((item) =>
            item.id === clipId ? { ...item, render: data.render as Clip["render"] } : item,
          ),
        }));
      }
    } catch {
      setProject((current) => ({
        ...current,
        clips: current.clips.map((item) =>
          item.id === clipId
            ? { ...item, render: { status: "failed", message: "Could not reach the render worker." } }
            : item,
        ),
      }));
    } finally {
      setRendering(null);
    }
  }

  if (!clip) return null;

  return (
    <main className="mx-auto w-full max-w-[1420px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-[12px] text-fog transition hover:text-snow"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> All projects
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[21px] leading-tight sm:text-[24px]">{project.source.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-fog">
            <span>{project.source.author}</span>
            <span className="text-fog-dim">·</span>
            <span className="capitalize">{project.source.platform}</span>
            <span className="text-fog-dim">·</span>
            <span>{formatDuration(project.source.durationSec)}</span>
            <span className="text-fog-dim">·</span>
            <span>
              {project.clips.length} clips · {project.settings.aspect} · {project.settings.quality}
            </span>
            <span className="text-fog-dim">·</span>
            <span>{timeAgo(project.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saving ? (
            <span className="hidden items-center gap-1.5 text-[11px] text-fog-dim sm:flex">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Saving
            </span>
          ) : null}
          {project.source.watchUrl ? (
            <a
              href={project.source.watchUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost btn-sm"
            >
              Source <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ) : null}
          <Link href="/studio/new" className="btn btn-primary btn-sm">
            <Plus className="size-3.5" aria-hidden /> New project
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_252px]">
        {/* clip list */}
        <section className="order-2 lg:order-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-dim">
              Ranked by virality
            </h2>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">
              {project.clips.length} clips
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {project.clips.map((item) => {
              const active = item.id === clip.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "flex w-[248px] shrink-0 items-start gap-3 rounded-xl border p-2.5 text-left transition lg:w-full",
                    active
                      ? "border-violet/45 bg-violet/[0.09]"
                      : "border-line bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.04]",
                  )}
                  aria-pressed={active}
                >
                  <ScoreRing score={item.scores.virality} size={40} stroke={3} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[9.5px] text-fog-dim">
                      <span>#{String(item.index + 1).padStart(2, "0")}</span>
                      <span>·</span>
                      <span>{Math.round(item.durationSec)}s</span>
                      {item.render?.status === "ready" ? (
                        <span className="text-lime">· mp4</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-snow">
                      {item.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* preview + editor */}
        <section className="order-1 min-w-0 lg:order-2">
          <div className="card p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 px-0.5 pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-medium text-snow">{clip.title}</h2>
                <p className="mt-0.5 truncate text-[11.5px] text-fog">{clip.hook}</p>
              </div>
              <span className="shrink-0 rounded-full border border-line bg-white/[0.04] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-fog">
                {formatClock(clip.startSec)}–{formatClock(clip.endSec)}
              </span>
            </div>

            <ClipPreview clip={clip} project={project} />

            <div className="mt-4 flex gap-1 border-b border-line">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-[12px] font-medium transition",
                    tab === item.id
                      ? "border-violet text-snow"
                      : "border-transparent text-fog hover:text-snow",
                  )}
                  aria-pressed={tab === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {tab === "style" ? (
                <ClipStylePanel
                  clip={clip}
                  onUpdate={(patch) => patchClip(clip.id, patch as Record<string, unknown>)}
                />
              ) : null}
              {tab === "timing" ? (
                <ClipTimingPanel
                  clip={clip}
                  bounds={{
                    start: 0,
                    end: Math.max(
                      project.source.durationSec,
                      project.transcript.at(-1)?.end ?? 0,
                    ),
                  }}
                  onUpdate={(patch) => patchClip(clip.id, patch as Record<string, unknown>)}
                />
              ) : null}
              {tab === "copy" ? (
                <ClipCopyPanel
                  clip={clip}
                  onTitleChange={(title) => patchClip(clip.id, { title })}
                />
              ) : null}
              {tab === "export" ? (
                <ClipExportPanel
                  clip={clip}
                  project={project}
                  onRender={() => renderClip(clip.id)}
                  rendering={rendering === clip.id}
                />
              ) : null}
            </div>
          </div>
        </section>

        {/* insights */}
        <aside className="order-3 space-y-3">
          <div className="card-flat p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-dim">
                Why this ranked
              </h3>
              <ScoreRing score={clip.scores.virality} size={38} stroke={3} label="virality" />
            </div>
            <div className="mt-3 space-y-2.5">
              <Meter label="Hook" value={clip.scores.hook} />
              <Meter label="Engagement" value={clip.scores.engagement} />
              <Meter label="Retention" value={clip.scores.retention} />
              <Meter label="Emotion" value={clip.scores.emotion} />
              <Meter label="Shareability" value={clip.scores.shareability} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {clip.signals.map((signal) => (
                <span key={signal} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-fog">
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="card-flat p-4">
            <div className="flex items-center gap-1.5">
              <Radio className="size-3.5 text-fog-dim" aria-hidden />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-dim">
                Transcript
              </h3>
            </div>
            <div className="mt-2 max-h-[188px] space-y-2 overflow-y-auto pr-1">
              {clip.transcript.map((segment, index) => (
                <div key={`${segment.start}-${index}`} className="flex gap-2">
                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-[9px] text-fog-dim">
                    {formatClock(segment.start)}
                  </span>
                  <p className="text-[11px] leading-relaxed text-fog">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-flat p-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-line">
                <Thumb src={project.source.thumbnail} alt={project.source.title} seed={project.id.length} className="size-full" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium text-snow">{project.source.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-fog-dim">
                  <Clock className="size-2.5" aria-hidden /> {formatDuration(project.source.durationSec)} · {project.source.author}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet/25 bg-violet/[0.06] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-soft">
              <Sparkles className="size-3.5" aria-hidden /> Posting tip
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-fog">
              Export the clip at {project.settings.aspect} for Shorts, Reels and TikTok. Upload{" "}
              <span className="text-snow">clip #{clip.index + 1}</span> first — highest hook score.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${clip.title}\n\n${clip.description}`);
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-white/12 px-2 py-1 text-[10.5px] text-snow transition hover:bg-white/5"
            >
              <Copy className="size-3" aria-hidden /> Copy title + caption
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ───────────────────────────── orchestration ──────────────────────────── */

export function ProjectView({ initialProject }: { initialProject: Project }) {
  const [project, setProject] = useState(initialProject);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const startAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${initialProject.id}/analyze`, { method: "POST" });
      const data = (await response.json()) as { project?: Project; error?: string };
      if (data.project) setProject(data.project);
      if (!response.ok) setError(data.error ?? "Analysis failed. Try again.");
    } catch {
      setError("We lost the connection while analysing. Retry in a moment.");
    }
  }, [initialProject.id]);

  useEffect(() => {
    if (project.status === "ready" || project.status === "failed") return;
    if (!startedRef.current) {
      startedRef.current = true;
      void startAnalysis();
    }
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { project?: Project };
        if (data.project) setProject(data.project);
      } catch {
        /* keep polling */
      }
    }, 900);
    return () => window.clearInterval(timer);
  }, [project.id, project.status, startAnalysis]);

  if (project.status === "ready" && project.clips.length) {
    return <ResultsView initial={project} />;
  }

  if (project.status === "failed") {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 py-16 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-pink/30 bg-pink/10 text-pink">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-[22px]">That analysis didn't finish</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-fog">
          {project.error ?? "Something broke while processing the source. Try again, or paste a different link."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setError(null);
              setProject({ ...project, status: "queued" });
              startedRef.current = true;
              await startAnalysis();
            }}
            className="btn btn-primary"
          >
            Retry analysis
          </button>
          <Link href="/studio/new" className="btn btn-ghost">
            New project
          </Link>
        </div>
      </div>
    );
  }

  return <ProcessingView project={project} error={error} />;
}
