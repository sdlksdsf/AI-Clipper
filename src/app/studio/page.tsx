import Link from "next/link";
import { ArrowRight, Clock, Film, Plus, Sparkles, TrendingUp } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getOrListSummaries } from "@/lib/projects";
import { ProjectCard } from "@/components/studio/ProjectCard";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { user } = await getAuth();
  const projects = await getOrListSummaries(user.id);

  const clips = projects.reduce((total, project) => total + project.clipCount, 0);
  const minutes = Math.round(
    projects.reduce((total, project) => total + project.durationSec / 60, 0),
  );
  const ready = projects.filter((project) => project.status === "ready");
  const avg =
    ready.length > 0
      ? Math.round(ready.reduce((total, project) => total + project.topScore, 0) / ready.length)
      : 0;

  const stats = [
    { label: "Projects", value: projects.length, icon: Film },
    { label: "Clips generated", value: clips, icon: Sparkles },
    { label: "Avg. top score", value: avg ? `${avg}` : "—", icon: TrendingUp },
    { label: "Minutes analysed", value: minutes, icon: Clock },
  ];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight sm:text-[30px]">Your studio</h1>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-fog">
            Paste a link, get the moments. Everything you have analysed lives here.
          </p>
        </div>
        <Link href="/studio/new" className="btn btn-primary hidden sm:inline-flex">
          <Plus className="size-4" aria-hidden /> New project
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-flat p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-fog">{stat.label}</span>
              <stat.icon className="size-3.5 text-fog-dim" aria-hidden />
            </div>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[24px] font-semibold leading-none text-snow">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="relative px-5 py-14 text-center sm:px-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="glow-orb left-1/2 top-0 size-[280px] -translate-x-1/2 bg-violet/25" />
              <div className="grid-bg absolute inset-0 opacity-50" />
            </div>
            <div className="relative">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/12 bg-white/[0.04] text-violet-soft">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-[22px]">No projects yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-fog">
                Drop in a YouTube, Twitch or Kick link. We'll find up to six moments worth posting,
                ranked by how likely they are to land.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link href="/studio/new" className="btn btn-primary">
                  <Plus className="size-4" aria-hidden /> Start your first project
                </Link>
                <Link href="/studio/new?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DaircAruvnKk" className="btn btn-ghost">
                  Try a sample <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              <p className="mt-5 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.14em] text-fog-dim">
                No credit card · 1080p exports · 6 clips max
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-fog-dim">
              Recent projects
            </h2>
            <Link href="/studio/new" className="inline-flex items-center gap-1 text-[12px] text-fog hover:text-snow sm:hidden">
              New <Plus className="size-3" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            <Link
              href="/studio/new"
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 text-fog transition hover:border-violet/40 hover:bg-violet/[0.04] hover:text-snow"
            >
              <span className="grid size-10 place-items-center rounded-full border border-line">
                <Plus className="size-4" aria-hidden />
              </span>
              <span className="text-[12.5px] font-medium">New project</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
