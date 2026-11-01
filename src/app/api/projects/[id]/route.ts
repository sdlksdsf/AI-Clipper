import { authForRoute, fail, json, ownsProject, readJson } from "@/lib/api";
import { getStore } from "@/lib/db";
import { parseProjectSettings } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const project = await getStore().getProject(id);
  if (!ownsProject(project, user.id)) return fail("Project not found.", 404);
  return json({ project });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const store = getStore();
  const project = await store.getProject(id);
  if (!ownsProject(project, user.id)) return fail("Project not found.", 404);

  const body = await readJson<{ settings?: unknown; title?: string }>(request);
  if (!body) return fail("Invalid request.");

  const settings = body.settings ? parseProjectSettings({ ...project.settings, ...body.settings }) : project.settings;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : undefined;

  const clips = project.clips.map((clip) => ({
    ...clip,
    quality: settings.quality,
    style: { ...clip.style },
  }));

  const updated = await store.updateProject(id, {
    settings,
    clips,
    source: title ? { ...project.source, title } : project.source,
  });
  return json({ project: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const store = getStore();
  const project = await store.getProject(id);
  if (!ownsProject(project, user.id)) return fail("Project not found.", 404);
  await store.deleteProject(id);
  return json({ ok: true });
}
