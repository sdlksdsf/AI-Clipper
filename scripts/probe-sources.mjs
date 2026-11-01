// Build-time reconnaissance: what can a Vercel build container actually reach?
// Prints one line per candidate endpoint so we can pick resolvers that work
// instead of guessing. Never throws, never exits non-zero.
const VIDEO = process.env.PROBE_VIDEO || "aircAruvnKk";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PIPED = ["https://pipedapi.kavin.rocks", "https://api.piped.private.coffee", "https://pipedapi.ducks.party"];

const INVIDIOUS = ["https://inv.nadeko.net", "https://yewtu.be", "https://invidious.f5.si"];

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


const CLIENTS = [
  {
    name: "ANDROID_VR",
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.62.27",
        androidSdkVersion: 32,
        deviceMake: "Oculus",
        deviceModel: "Quest 3",
        osName: "Android",
        osVersion: "12",
        hl: "en",
        gl: "US",
        userAgent: "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12; GB) gzip",
      },
    },
    ua: "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12; GB) gzip",
  },
  {
    name: "IOS",
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.45.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "18.1.0.22B83",
        hl: "en",
        gl: "US",
        userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
      },
    },
    ua: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    context: {
      client: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0", hl: "en", gl: "US" },
      thirdParty: { embedUrl: "https://www.youtube.com/" },
    },
    ua: UA,
  },
  {
    name: "WEB_EMBEDDED_PLAYER",
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    context: {
      client: { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20240723.01.00", hl: "en", gl: "US" },
      thirdParty: { embedUrl: "https://www.youtube.com/" },
    },
    ua: UA,
  },
  {
    name: "MWEB",
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    context: { client: { clientName: "MWEB", clientVersion: "2.20240726.01.00", hl: "en", gl: "US" } },
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
];

async function probeClients(videoId) {
  for (const client of CLIENTS) {
    const started = Date.now();
    try {
      const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${client.key}&prettyPrint=false`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": client.ua,
          "x-youtube-client-name": String(
            { ANDROID_VR: "28", IOS: "5", TVHTML5_SIMPLY_EMBEDDED_PLAYER: "85", WEB_EMBEDDED_PLAYER: "56", MWEB: "2" }[
              client.name
            ],
          ),
          "x-youtube-client-version": client.context.client.clientVersion,
          origin: "https://www.youtube.com",
        },
        body: JSON.stringify({ context: client.context, videoId, contentCheckOk: true, racyCheckOk: true }),
        signal: AbortSignal.timeout(9000),
      });
      const data = await res.json().catch(() => ({}));
      const status = data?.playabilityStatus?.status ?? "?";
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length ?? 0;
      const streams = (data?.streamingData?.formats?.length ?? 0) + (data?.streamingData?.adaptiveFormats?.length ?? 0);
      console.log(
        `probe-sources: innertube ${client.name} ${res.status} ${status} tracks=${tracks} streams=${streams} ${Date.now() - started}ms ${String(data?.playabilityStatus?.reason ?? "").slice(0, 60)}`,
      );
    } catch (error) {
      console.log(`probe-sources: innertube ${client.name} ERR ${String(error?.message ?? error).slice(0, 90)}`);
    }
  }
}

async function probeTranscriptServices(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  await probe("tactiq", "https://tactiq-apps-prod.tactiq.io/transcript", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoUrl: url, langCode: "en" }),
  }, 12000);
  await probe("kome", "https://api.kome.ai/api/tools/youtube-transcripts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ video_id: videoId, format: true }),
  }, 12000);
  await probe("youtubetotranscript", `https://youtubetotranscript.com/transcript?v=${videoId}&current_language_code=en`, {}, 12000);
  await probe("downsub", `https://get.downsub.com/?url=${encodeURIComponent(url)}`, {}, 12000);
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

  await probe("twitch-gql", "https://gql.twitch.tv/gql", {
    method: "POST",
    headers: { "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko", "content-type": "application/json" },
    body: JSON.stringify({ query: 'query { user(login: "shroud") { displayName clips(first: 2) { edges { node { slug title durationSeconds videoQualities { sourceURL quality } } } } } }' }),
  }, 12000);

  await probeClients(VIDEO);
  await probeTranscriptServices(VIDEO);

  await probeTwitchMedia();

  try {
    const ytdl = (await import("@distube/ytdl-core")).default ?? (await import("@distube/ytdl-core"));
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${VIDEO}`);
    console.log(`probe-sources: ytdl ok formats=${info.formats.length} title=${String(info.videoDetails?.title).slice(0, 40)}`);
  } catch (error) {
    console.log(`probe-sources: ytdl ERR ${String(error?.message ?? error).slice(0, 160)}`);
  }
}

main().catch((error) => console.log(`probe-sources: fatal ${String(error?.message ?? error).slice(0, 160)}`));

async function probeTwitchMedia() {
  const res = await fetch("https://gql.twitch.tv/gql", {
    method: "POST",
    headers: { "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko", "content-type": "application/json" },
    body: JSON.stringify({
      query: 'query { user(login: "shroud") { clips(first: 1) { edges { node { slug videoQualities { sourceURL quality } } } } } }',
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!res?.ok) {
    console.log("probe-sources: twitch-media no gql");
    return;
  }
  const data = await res.json().catch(() => ({}));
  const node = data?.data?.user?.clips?.edges?.[0]?.node;
  const qualities = (node?.videoQualities ?? []).filter((quality) => quality.sourceURL);
  if (!qualities.length) {
    console.log("probe-sources: twitch-media no qualities");
    return;
  }
  const best = qualities.sort((a, b) => Number(b.quality) - Number(a.quality))[0];
  console.log(`probe-sources: twitch-media slug=${node.slug} quality=${best.quality} url=${String(best.sourceURL).slice(0, 80)}`);

  for (const [label, headers] of [
    ["plain", { "user-agent": UA }],
    ["twitch-referer", { "user-agent": UA, referer: "https://clips.twitch.tv/" }],
    ["youtube-referer", { "user-agent": UA, referer: "https://www.youtube.com/" }],
  ]) {
    const started = Date.now();
    const media = await fetch(best.sourceURL, {
      headers: { ...headers, range: "bytes=0-2047" },
      signal: AbortSignal.timeout(15000),
    }).catch((error) => ({ status: `ERR ${String(error?.message ?? error).slice(0, 60)}`, headers: new Map(), arrayBuffer: async () => new ArrayBuffer(0) }));
    const bytes = media.arrayBuffer ? (await media.arrayBuffer()).byteLength : 0;
    console.log(
      `probe-sources: twitch-media ${label} ${media.status} ${bytes}b ${Date.now() - started}ms type=${media.headers?.get?.("content-type") ?? "?"}`,
    );
  }

  // Prove ffmpeg can cut it, using the same binary the deployment ships.
  try {
    const installer = (await import("@ffmpeg-installer/ffmpeg")).default ?? (await import("@ffmpeg-installer/ffmpeg"));
    const { spawnSync } = await import("node:child_process");
    const out = "/tmp/twitch-probe.mp4";
    const result = spawnSync(
      installer.path,
      ["-hide_banner", "-loglevel", "error", "-y", "-ss", "1", "-t", "2", "-user_agent", UA, "-headers", "Referer: https://clips.twitch.tv/\r\n", "-i", best.sourceURL, "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", out],
      { timeout: 120000, encoding: "utf8" },
    );
    const stat = await import("node:fs").then((fs) => (fs.existsSync(out) ? fs.statSync(out).size : 0)).catch(() => 0);
    console.log(`probe-sources: twitch-ffmpeg code=${result.status} size=${stat} err=${String(result.stderr ?? "").slice(0, 120)}`);
  } catch (error) {
    console.log(`probe-sources: twitch-ffmpeg ERR ${String(error?.message ?? error).slice(0, 100)}`);
  }
}
