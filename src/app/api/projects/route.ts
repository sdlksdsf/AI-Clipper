import { authForRoute, clipSummary, fail, json, readJson } from "@/lib/api";
import { getStore } from "@/lib/db";
import { STAGE_BLUEPRINT } from "@/lib/analysis";
import { planFor, remainingMinutes } from "@/lib/plans";
import { resolveSource } from "@/lib/sources";
import type { Project } from "@/lib/types";
import { uid } from "@/lib/utils";
import { parseCreateProject } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { user } = await authForRoute();
  const projects = await getStore().listProjects(user.id);
  return json({ projects: projects.map(clipSummary) });
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "create"), 20, 60_000);
  if (!limit.ok) return fail("Slow down a second — you're creating projects fast.", 429);

  const body = await readJson(request);
  const parsed = parseCreateProject(body);
  if ("error" in parsed) return fail(parsed.error);

  const source = await resolveSource(parsed.url);
  if (!source) {
    return fail("That link isn't supported yet. Use a YouTube, Twitch, Kick or direct video URL.");
  }

  const { user } = await authForRoute();
  const plan = planFor(user.plan);
  const needed = Math.max(1, Math.ceil(source.durationSec / 60));
  if (remainingMinutes(user.minutesUsed, user.plan) < needed) {
    return fail(
      `This video needs ${needed} minutes and your ${plan.name} plan has ${remainingMinutes(user.minutesUsed, user.plan)} left this month.`,
      402,
      { code: "quota_exceeded" },
    );
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: uid("prj_"),
    userId: user.id,
    source,
    settings: parsed.settings,
    status: "queued",
    stage: 0,
    progress: 0,
    stages: STAGE_BLUEPRINT.map((stage, index) => ({
      ...stage,
      status: index === 0 ? "active" : "pending",
    })),
    engine: "generated",
    clips: [],
    transcript: [],
    createdAt: now,
    updatedAt: now,
    minutesProcessed: 0,
    words: 0,
  };

  await getStore().createProject(project);
  return json({ project }, { status: 201 });
}
