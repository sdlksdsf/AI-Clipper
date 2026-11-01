// Build-time reconnaissance: what can a Vercel build container actually reach?
// Prints one line per candidate endpoint so we can pick resolvers that work
// instead of guessing. Never throws, never exits non-zero.
const VIDEO = process.env.PROBE_VIDEO || "aircAruvnKk";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
  "https://pipedapi.ducks.party",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.drgns.space",
  "https://piped-api.lunar.icu",
  "https://api.piped.projectsegfau.lt",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi.astartes.nl",
  "https://pipedapi.orangenet.cc",
  "https://pipedapi.reallyaweso.me",
];

const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://iv.melmac.space",
  "https://invidious.privacyredirect.com",
  "https://invidious.jing.rocks",
  "https://inv.tux.pizza",
  "https://invidious.dhusch.de",
  "https://invidious.f5.si",
  "https://invidious.protokolla.fi",
  "https://iv.datura.network",
  "https://invidious.materialio.us",
];

async function probe(label, url, init = {}, timeout = 9000) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout), headers: { "user-agent": UA, ...(init.headers || {}) } });
    const body = await res.text().catch(() => "");
    const ms = Date.now() - started;
    const type = res.headers.get("content-type") || "";
    console.log(`probe-sources: ${label} ${res.status} ${type} ${body.length}b ${ms}ms :: ${body.slice(0, 120).replace(/\s+/g, " ")}`);
    return { status: res.status, body, type };
  } catch (error) {
    const ms = Date.now() - started;
    console.log(`probe-sources: ${label} ERR ${String(error?.message ?? error).slice(0, 120)} ${ms}ms`);
    return null;
  }
}

async function main() {
  await probe("watch", `https://www.youtube.com/watch?v=${VIDEO}&hl=en`);
  await probe("timedtext", `https://www.youtube.com/api/timedtext?lang=en&v=${VIDEO}&fmt=json3`);
  await probe("oembed", `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${VIDEO}&format=json`);

  for (const host of PIPED) {
    const res = await probe(`piped ${host.replace("https://", "")}`, `${host}/streams/${VIDEO}`);
    if (res?.body) {
      try {
        const data = JSON.parse(res.body);
        console.log(
          `probe-sources:   -> subtitles ${Array.isArray(data.subtitles) ? data.subtitles.length : "?"}, videoStreams ${Array.isArray(data.videoStreams) ? data.videoStreams.length : "?"}, audioStreams ${Array.isArray(data.audioStreams) ? data.audioStreams.length : "?"}`,
        );
      } catch {
        /* not json */
      }
    }
  }

  for (const host of INVIDIOUS) {
    const res = await probe(
      `invidious ${host.replace("https://", "")}`,
      `${host}/api/v1/videos/${VIDEO}?fields=captions,formatStreams,adaptiveFormats,lengthSeconds`,
    );
    if (res?.body) {
      try {
        const data = JSON.parse(res.body);
        console.log(
          `probe-sources:   -> captions ${Array.isArray(data.captions) ? data.captions.length : "?"}, formatStreams ${Array.isArray(data.formatStreams) ? data.formatStreams.length : "?"}, adaptive ${Array.isArray(data.adaptiveFormats) ? data.adaptiveFormats.length : "?"}, length ${data.lengthSeconds ?? "?"}`,
        );
      } catch {
        /* not json */
      }
    }
  }

  try {
    const ytdl = (await import("@distube/ytdl-core")).default ?? (await import("@distube/ytdl-core"));
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${VIDEO}`);
    console.log(`probe-sources: ytdl ok formats=${info.formats.length} title=${String(info.videoDetails?.title).slice(0, 40)}`);
  } catch (error) {
    console.log(`probe-sources: ytdl ERR ${String(error?.message ?? error).slice(0, 160)}`);
  }
}

main().catch((error) => console.log(`probe-sources: fatal ${String(error?.message ?? error).slice(0, 160)}`));
