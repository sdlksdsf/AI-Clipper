import { authForRoute, fail } from "@/lib/api";
import { findClip } from "@/lib/clips";
import { buildExport, exportFilename, type ExportFormat } from "@/lib/export";

export const dynamic = "force-dynamic";

const FORMATS: ExportFormat[] = ["srt", "vtt", "json", "txt"];

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { user } = await authForRoute();
  const location = await findClip(user.id, id);
  if (!location) return fail("Clip not found.", 404);

  const requested = new URL(request.url).searchParams.get("format") as ExportFormat | null;
  const format: ExportFormat = requested && FORMATS.includes(requested) ? requested : "srt";
  const { body, type } = buildExport(location.clip, location.project, format);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${exportFilename(location.clip, format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
