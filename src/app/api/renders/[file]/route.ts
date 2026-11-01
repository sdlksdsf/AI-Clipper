import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { renderDir } from "@/lib/render";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ file: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9_-]+\.mp4$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(renderDir(), file);
  let size = 0;
  try {
    const stat = await fs.stat(filePath);
    size = stat.size;
  } catch {
    return new Response("Render not found", { status: 404 });
  }

  const range = request.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
  });
}
