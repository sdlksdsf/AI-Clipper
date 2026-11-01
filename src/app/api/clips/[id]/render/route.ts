import { authForRoute, fail, json } from "@/lib/api";
import { findClip } from "@/lib/clips";
import { getStore } from "@/lib/db";
import { renderClip, rendererStatus } from "@/lib/render";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const location = await findClip(user.id, id);
  if (!location) return fail("Clip not found.", 404);

  const { project, clip } = location;
  const status = await rendererStatus();
  if (!status.enabled) {
    return json(
      {
        render: {
          status: "unsupported",
          message:
            "MP4 rendering needs ffmpeg + yt-dlp on the host. This deployment runs in preview mode — download captions or the edit list instead.",
        },
        renderer: status,
      },
      { status: 200 },
    );
  }

  const store = getStore();
  const markRender = (render: typeof clip.render) =>
    store.updateProject(project.id, {
      clips: project.clips.map((item) => (item.id === clip.id ? { ...item, render } : item)),
    });

  await markRender({ status: "rendering", message: "Rendering your clip…" });

  const result = await renderClip(project, clip);
  const render = result.ok
    ? {
        status: "ready" as const,
        url: result.url,
        format: "mp4",
        resolution: `${clip.quality} · ${project.settings.aspect}`,
        updatedAt: new Date().toISOString(),
      }
    : { status: "failed" as const, message: result.message ?? "Render failed." };

  await markRender(render);
  return json({ render, renderer: status });
}
