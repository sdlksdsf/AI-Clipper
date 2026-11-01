"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Thumb } from "@/components/ui/Thumb";
import type { ProjectSummary } from "@/lib/types";
import { cn, formatDuration, timeAgo } from "@/lib/utils";

const STATUS_META: Record<ProjectSummary["status"], { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "text-fog border-line bg-white/5" },
  analyzing: { label: "Analyzing", tone: "text-violet-soft border-violet/40 bg-violet/10" },
  ready: { label: "Ready", tone: "text-lime border-lime/30 bg-lime/10" },
  failed: { label: "Failed", tone: "text-pink border-pink/30 bg-pink/10" },
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_META[project.status];

  async function remove() {
    setDeleting(true);
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
      setMenu(false);
    }
  }

  return (
    <div className="group relative">
      <Link
        href={`/studio/${project.id}`}
        className="card card-hover block overflow-hidden focus-visible:ring-2"
      >
        <div className="relative">
          <Thumb
            src={project.thumbnail}
            alt={project.title}
            seed={project.id.length}
            className="aspect-[16/9] w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", status.tone)}>
              {project.status === "analyzing" ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-2.5 animate-spin" aria-hidden /> {project.progress}%
                </span>
              ) : (
                status.label
              )}
            </span>
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-white/70 backdrop-blur">
              {project.aspect} · {project.quality}
            </span>
          </div>
          {project.status === "ready" && project.topScore > 0 ? (
            <div className="absolute right-3 top-3 rounded-full bg-black/50 p-1 backdrop-blur">
              <ScoreRing score={project.topScore} size={40} stroke={3} />
            </div>
          ) : null}
          <div className="absolute inset-x-3 bottom-2.5">
            <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-snow">
              {project.title}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[11.5px] text-fog">{project.author}</p>
            <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">
              {formatDuration(project.durationSec)} source
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11.5px] font-medium text-snow">{project.clipCount} clips</p>
            <p className="mt-0.5 text-[10px] text-fog-dim">{timeAgo(project.createdAt)}</p>
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            setMenu((value) => !value);
          }}
          className="grid size-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white/70 backdrop-blur transition hover:text-white"
          aria-label="Project options"
          aria-expanded={menu}
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menu ? (
          <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-line bg-ink-2 shadow-lift">
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-pink transition hover:bg-white/5 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              Delete project
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
