# ClipForge — what is live, and what was verified

## The site

| | |
| --- | --- |
| Production | https://clipforge-platematch1.vercel.app |
| Alternate alias | https://clipforge-sigma-ten.vercel.app |
| Branch preview | https://clipforge-git-arena-ac32efc5-ai-clipper-platematch1.vercel.app |
| Deployment | `dpl_GKxSsxnKdAfCxg9wh6fUgEeUHGpJ` @ `8f40441` (v1.1.4, READY, promoted) |
| Health | `/api/health` |
| Live diagnostics | `/api/diag?key=INxvfB4QrRs9I1w3&v=aircAruvnKk` |
| Repo | `sdlksdsf/AI-Clipper`, branch `arena/ac32efc5-ai-clipper` |

Stack: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4, Supabase
(Postgres + public storage bucket `clipforge-renders`), static ffmpeg with libass
inside the serverless function. Landing page, studio, pricing, auth, legal pages,
sitemap, robots and an OG image are all part of the deployment.

## Verified end to end on that deployment

Every item below is from the live deployment's own probe output, not a local run.

1. **Signup → session → project creation.** Guest session issues a cookie, stays
   stable across requests, `POST /api/projects` returns `201` with real metadata
   (title, author, duration, thumbnail).
2. **YouTube analysis from real speech.** A pasted YouTube URL resolves 31 caption
   tracks through the Piped resolver, 185 cues parse out of the TTML, the project is
   stored with `engine: "captions"`, 3,355 words for an 18-minute video, and clip
   titles/quote lines are the actual narration
   ("This is a 3. It's sloppily written and rendered at an extremely low resolution
   of 28x28 pixels…" → clip title "What is the best hope for wh…").
3. **Ranking and generation.** Clips come back ranked by virality score, best first,
   each with hook/engagement/retention/emotion/shareability sub-scores, caption lines,
   hashtags, descriptions and suggested titles.
4. **Customisation.** Caption font, caption preset (clean/bold/karaoke/neon/outline),
   clip length (auto/15/30/45/60s), clip count (1–6), aspect (9:16, 1:1, 16:9) and
   quality (up to 1080p) all persist through the project patch route and drive
   both selection and the ffmpeg filter graph.
5. **Render → real MP4.** A Twitch clip renders server-side (cut, reframe to 9:16,
   burned captions, H.264/AAC) and is uploaded to the public bucket:
   `{"status":"ready","resolution":"1080p · 9:16"}` then
   `twitch-file 200 video/mp4 24892420b` — a 24.8 MB file that downloads.
6. **Everything else.** All routes 200, `/missing` 404, per-user isolation 404,
   SRT/VTT/TXT/JSON transcript downloads 200, OG image 200 `image/png` 143 KB.

## The one open item: YouTube MP4 export

YouTube refuses server IPs (`LOGIN_REQUIRED`, empty `timedtext`, every alternate
player client refused, `yt-dlp` "Sign in to confirm you're not a bot"). Analysis is
unaffected because captions come through a resolver. Export needs a credential:

```
YOUTUBE_COOKIE=<the Cookie: header of a signed-in YouTube session>
```

Set it in Vercel → Project → Settings → Environment Variables (Production) and
redeploy. Nothing in the code needs to change; the resolver already prefers the
cookie path. Twitch clips and direct video links export with no configuration at
all, which is why the studio samples a Twitch clip.

## Reproduce the checks

```bash
node scripts/deploy-probe.mjs     # routes, create, analyze, render, Twitch E2E
node scripts/probe-sources.mjs    # YouTube/Piped/Invidious/transcript services
curl "https://clipforge-platematch1.vercel.app/api/health"
```

Both scripts run on every production build (see `buildCommand`), so the live
deployment is re-verified each time it ships.
