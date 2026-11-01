/**
 * Twitch clips without an OAuth token.
 *
 * Twitch's public web GraphQL endpoint answers unauthenticated requests with the
 * same client id the website itself uses, so a pasted clip link can be resolved
 * into real metadata (title, channel, duration, thumbnail) and a real MP4 that
 * ffmpeg can cut. The `videoQualities` URLs alone are not enough — they live
 * behind `/nauth/` and answer 401 without the clip's public playback token, which
 * the same query hands out, so the token is appended as `?sig=…&token=…`.
 *
 * VODs and live channels need a user OAuth token, so those keep the honest
 * "can't fetch this" message instead of pretending.
 */

export interface TwitchClip {
  slug: string;
  title: string;
  author: string;
  durationSec: number;
  thumbnail?: string;
  mp4?: string;
  quality?: string;
  signed?: boolean;
}

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const ENDPOINT = "https://gql.twitch.tv/gql";

const CLIP_FIELDS = `
  slug
  title
  durationSeconds
  thumbnailURL
  videoQualities { sourceURL quality frameRate }
  broadcaster { displayName }
`;

/** The public playback token that unlocks the clip's /nauth/ media URL. */
const CLIP_TOKEN_FIELD = `
  playbackAccessToken(params: { platform: "web", playerBackend: "mediaplayer", playerType: "site" }) {
    signature
    value
  }
`;

const cache = new Map<string, { value: TwitchClip | null; at: number }>();
const TTL = 10 * 60 * 1000;

type Loose = Record<string, unknown>;

function asObject(value: unknown): Loose | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Loose) : null;
}

function asArray(value: unknown): Loose[] {
  return Array.isArray(value) ? (value as Loose[]).filter((item) => asObject(item)) : [];
}

async function gql(query: string, variables?: Record<string, unknown>): Promise<Loose | null> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as Loose | null;
}

function readClip(node: Loose): TwitchClip | null {
  const slug = String(node.slug ?? "");
  if (!slug) return null;
  const qualities = asArray(node.videoQualities)
    .map((quality) => ({
      url: String(quality.sourceURL ?? ""),
      quality: String(quality.quality ?? ""),
    }))
    .filter((quality) => quality.url);
  const best =
    qualities
      .slice()
      .sort((a, b) => Number(b.quality) - Number(a.quality))[0] ?? qualities[qualities.length - 1];
  const broadcaster = asObject(node.broadcaster);
  const token = asObject(node.playbackAccessToken);
  const signature = typeof token?.signature === "string" ? token.signature : "";
  const value = typeof token?.value === "string" ? token.value : "";
  const signed =
    best?.url && signature && value
      ? `${best.url}${best.url.includes("?") ? "&" : "?"}sig=${encodeURIComponent(signature)}&token=${encodeURIComponent(value)}`
      : best?.url;

  return {
    slug,
    title: String(node.title ?? "Twitch clip"),
    author: String(broadcaster?.displayName ?? "Twitch"),
    durationSec: Number(node.durationSeconds ?? 0) || 30,
    thumbnail: typeof node.thumbnailURL === "string" ? node.thumbnailURL : undefined,
    mp4: signed,
    quality: best?.quality,
    signed: Boolean(signature && value),
  };
}

/** Looks up a single clip by slug (`clips.twitch.tv/<slug>` or `twitch.tv/<channel>/clip/<slug>`). */
export async function fetchTwitchClip(slug: string): Promise<TwitchClip | null> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const data = await gql(
    `query Clip($slug: ID!) { clip(slug: $slug) { ${CLIP_FIELDS} ${CLIP_TOKEN_FIELD} } }`,
    { slug },
  );
  const clip = readClip(asObject(asObject(data?.data)?.clip) ?? {});
  cache.set(slug, { value: clip, at: Date.now() });
  return clip;
}

/** Newest clips for a channel — used when someone pastes a channel URL. */
export async function fetchChannelClips(login: string, limit = 3): Promise<TwitchClip[]> {
  const data = await gql(
    `query Clips($login: String!, $first: Int!) { user(login: $login) { clips(first: $first) { edges { node { ${CLIP_FIELDS} ${CLIP_TOKEN_FIELD} } } } } }`,
    { login, first: limit },
  );
  const edges = asArray(asObject(asObject(asObject(data?.data)?.user)?.clips)?.edges);
  return edges
    .map((edge) => readClip(asObject(edge.node) ?? {}))
    .filter((clip): clip is TwitchClip => Boolean(clip));
}

/** Diagnostic snapshot for /api/diag. */
export async function twitchDiag(slug = "FrozenCuteYogurt") {
  const clip = await fetchTwitchClip(slug);
  return clip
    ? {
        ok: true,
        slug: clip.slug,
        title: clip.title.slice(0, 60),
        duration: clip.durationSec,
        mp4: Boolean(clip.mp4),
        signed: Boolean(clip.signed),
        quality: clip.quality,
      }
    : { ok: false, slug };
}
