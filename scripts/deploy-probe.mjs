/**
 * Deploy probe. Runs from the Vercel build container (which has open egress)
 * against the currently live production alias, so a deployment can be verified
 * end to end — routing, protection, cookies, Supabase persistence, analysis and
 * exports. Output lands in the build log. Never fails a build.
 */
const target = (() => {
  const explicit = process.env.PROBE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : null;
})();

if (!target) {
  console.log("probe: no target, skipping");
  process.exit(0);
}

const jar = new Map();
const log = (...args) => console.log("probe:", ...args);
const remember = (res) => {
  for (const cookie of res.headers.getSetCookie?.() ?? []) {
    const [pair] = cookie.split(";");
    const [name, ...rest] = pair.split("=");
    jar.set(name.trim(), rest.join("=").trim());
  }
};
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

async function hit(path, init = {}) {
  const res = await fetch(`${target}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(240_000),
  });
  remember(res);
  return res;
}

async function main() {
  const home = await hit("/");
  const html = await home.text();
  log("home", home.status, (html.match(/<title>([^<]*)/) ?? [])[1] ?? "(no title)");
  log("protected?", /Vercel Authentication|vercel\.com\/login/.test(html) || home.status === 401);

  for (const path of ["/pricing", "/login", "/signup", "/studio", "/privacy", "/terms", "/sitemap.xml", "/robots.txt", "/missing"]) {
    const res = await hit(path);
    log("route", path, res.status, res.headers.get("location") ?? "");
    await res.text();
  }

  const og = await hit("/opengraph-image");
  log("og", og.status, og.headers.get("content-type"), `${(await og.arrayBuffer()).byteLength}b`);

  const health = await hit("/api/health");
  log("health", health.status, await health.text());

  const me1 = await hit("/api/me");
  const user1 = (await me1.json().catch(() => ({}))).user;
  log("me", me1.status, user1?.id, user1?.plan, "guest", user1?.isGuest, "cookie", jar.size);
  const me2 = await hit("/api/me");
  const user2 = (await me2.json().catch(() => ({}))).user;
  log("me-stable", user1?.id === user2?.id);

  const diag = await hit(`/api/diag?key=${encodeURIComponent(process.env.DIAG_KEY ?? "cf-diag-7f3a91")}&v=aircAruvnKk`);
  const diagBody = await diag.json().catch(() => ({}));
  log("diag", diag.status, JSON.stringify(diagBody).slice(0, 900));

  const created = await hit("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      url: "https://www.youtube.com/watch?v=aircAruvnKk",
      settings: {
        clipCount: 4,
        targetLength: 30,
        aspect: "9:16",
        quality: "1080p",
        captionPreset: "bold",
        captionFont: "display",
        prompt: "funny and insightful",
        captions: true,
      },
    }),
  });
  const createdBody = await created.json().catch(() => ({}));
  log("create", created.status, createdBody.project?.source?.title ?? JSON.stringify(createdBody).slice(0, 160));
  const id = createdBody.project?.id;
  if (!id) return;

  const started = Date.now();
  const analyzed = await hit(`/api/projects/${id}/analyze`, { method: "POST" });
  log("analyze", analyzed.status, `${((Date.now() - started) / 1000).toFixed(1)}s`, JSON.stringify(await analyzed.json().catch(() => ({}))).slice(0, 120));

  let project = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const res = await hit(`/api/projects/${id}`);
    project = (await res.json().catch(() => ({}))).project ?? null;
    if (project && project.status !== "queued" && project.status !== "analyzing") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  log("project", project?.status, project?.engine, "words", project?.words, "minutes", project?.minutesProcessed);
  log("duration", `${project?.source?.durationSec}s`, "|", project?.source?.title);
  for (const segment of (project?.transcript ?? []).slice(0, 3)) {
    log(`  transcript ${segment.start}-${segment.end}: ${segment.text.slice(0, 90)}`);
  }
  log("clips", project?.clips?.length ?? 0);
  for (const clip of project?.clips ?? []) {
    log(`  ${clip.scores.virality} | ${Math.round(clip.durationSec)}s | ${clip.title}`);
    log(`      ${clip.hashtags.join(" ")} | lines ${clip.captionLines.length}`);
  }

  const clip = project?.clips?.[0];
  if (!clip) return;

  const patched = await hit(`/api/clips/${clip.id}`, {
    method: "PATCH",
    body: JSON.stringify({ title: "Deployed patch test", style: { preset: "karaoke", font: "mono" }, quality: "720p" }),
  });
  const patchedBody = await patched.json().catch(() => ({}));
  log("patch", patched.status, patchedBody.clip?.title, patchedBody.clip?.style?.preset, patchedBody.clip?.style?.font, patchedBody.clip?.quality);

  for (const format of ["srt", "vtt", "txt", "json"]) {
    const res = await hit(`/api/clips/${clip.id}/download?format=${format}`);
    const body = await res.text();
    log("download", format, res.status, `${body.length}b`);
  }

  const renderStarted = Date.now();
  const render = await hit(`/api/clips/${clip.id}/render`, { method: "POST" });
  const renderBody = await render.json().catch(() => ({}));
  log("render", render.status, `${((Date.now() - renderStarted) / 1000).toFixed(1)}s`, JSON.stringify(renderBody).slice(0, 400));

  const renderUrl = renderBody?.render?.url;
  if (renderUrl) {
    const absolute = renderUrl.startsWith("http") ? renderUrl : `${target}${renderUrl}`;
    const file = await fetch(absolute, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (file) {
      const bytes = (await file.arrayBuffer()).byteLength;
      log("render-file", file.status, file.headers.get("content-type"), `${bytes}b`, absolute.slice(0, 90));
    } else {
      log("render-file", "fetch failed");
    }
  }

  const list = await hit("/api/projects");
  const listBody = await list.json().catch(() => ({}));
  log("list", list.status, `${listBody.projects?.length ?? 0} projects`);

  const anon = await fetch(`${target}/api/projects/${id}`, { signal: AbortSignal.timeout(15_000) });
  log("isolation", anon.status);
}

main()
  .catch((error) => console.log("probe: error", error?.message ?? error))
  .finally(() => process.exit(0));
