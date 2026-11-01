import { json } from "@/lib/api";
import { getStore } from "@/lib/db";
import { llmStatus } from "@/lib/analysis/llm";
import { rendererStatus } from "@/lib/render";

export const dynamic = "force-dynamic";

export async function GET() {
  const renderer = await rendererStatus();
  return json({
    ok: true,
    service: "clipforge",
    version: "1.0.0",
    time: new Date().toISOString(),
    store: getStore().kind,
    engines: {
      transcript: "youtube-captions-first",
      scoring: "heuristic-v2",
      llm: llmStatus(),
      renderer: {
        available: renderer.enabled,
        ffmpeg: renderer.ffmpeg,
        downloader: renderer.downloader,
        storage: renderer.storage,
      },
    },
  });
}
