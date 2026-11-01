import { authForRoute, fail, json, ownsProject } from "@/lib/api";
import { getStore } from "@/lib/db";
import { runAnalysis } from "@/lib/analysis";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const limit = rateLimit(clientKey(request, "analyze"), 30, 60_000);
  if (!limit.ok) return fail("Analysis is being rate limited. Try again shortly.", 429);

  const { user } = await authForRoute();
  const store = getStore();
  const project = await store.getProject(id);
  if (!ownsProject(project, user.id)) return fail("Project not found.", 404);
  if (project.status === "ready") return json({ project });

  const startedAt = project.analysisStartedAt ? new Date(project.analysisStartedAt).getTime() : 0;
  if (project.status === "analyzing" && Date.now() - startedAt < 120_000) {
    return json({ project, alreadyRunning: true });
  }

  const finished = await runAnalysis(id);
  const latest = finished ?? (await store.getProject(id));
  if (!latest) return fail("Project not found.", 404);
  if (latest.status === "failed") {
    return fail(latest.error ?? "Analysis failed. Try a different link.", 500, { project: latest });
  }
  return json({ project: latest });
}
