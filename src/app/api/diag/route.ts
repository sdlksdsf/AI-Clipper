import { NextResponse } from "next/server";
import { youtubeDiag, fetchYoutubeCaptions } from "@/lib/analysis/youtube";
import { rendererStatus } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Deployment diagnostic. Answers "what can this host actually reach?" without
 * leaking anything: it only reports booleans, counts and public metadata.
 * Enabled when DIAG_KEY is set and the request carries the same key.
 */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const expected = process.env.DIAG_KEY ?? "";
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const videoId = new URL(request.url).searchParams.get("v") ?? "aircAruvnKk";
  const started = Date.now();
  const yt = await youtubeDiag(videoId).catch((error) => ({ error: String(error?.message ?? error) }));
  const captions = await fetchYoutubeCaptions(videoId).catch(() => ({ segments: [], language: "en", meta: null }));

  return NextResponse.json({
    host: process.env.VERCEL ? "vercel" : "local",
    node: process.version,
    ms: Date.now() - started,
    youtube: yt,
    captions: {
      segments: captions.segments.length,
      language: captions.language,
      first: captions.segments.slice(0, 4).map((segment) => `${segment.start}-${segment.end}: ${segment.text}`),
      last: captions.segments.slice(-2).map((segment) => `${segment.start}-${segment.end}: ${segment.text}`),
      chars: captions.segments.reduce((total, segment) => total + segment.text.length, 0),
    },
    renderer: await rendererStatus(),
  });
}
