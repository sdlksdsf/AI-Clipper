# ClipForge — AI that finds the clip in your stream

Paste a YouTube / Twitch / Kick / direct-video link and ClipForge analyses the whole video from
zero, ranks the most viral moments, and hands back auto-edited vertical clips with captions, hook
titles, hashtags and export files for YouTube Shorts, Instagram Reels and TikTok.

- **Live app:** https://clipforge-platematch1.vercel.app
- **Also live on:** https://clipforge-sigma-ten.vercel.app
- **Repo:** https://github.com/sdlksdsf/AI-Clipper (branch `arena/ac32efc5-ai-clipper`)

## What it does

1. **Analyse from zero** — the link is resolved into a real source (title, author, duration,
   thumbnail), the transcript is fetched when captions exist and reconstructed with a
   per-video seeded beat model otherwise, then every second is scored.
2. **Find the moments** — a sliding-window scorer rates hook, body energy, payoff, emotion and
   shareability, then keeps the best 1–6 clips with percentile normalisation (so no two clips
   share the same inflated score) and signature deduplication (so the same take never ships twice).
3. **Rank by virality** — every clip gets a 0–100 virality score plus hook / engagement /
   retention / emotion / shareability sub-scores and plain-language reasons, best first.
4. **Watch it for real** — the editor plays the actual footage at the actual clip range (YouTube
   embeds are driven over the postMessage API, direct video files seek to the in-point, Twitch
   embeds start at the offset) with the styled captions overlaying the real playhead. No fake
   preview timer.
5. **Export a real MP4** — one click downloads the source range with a bundled static ffmpeg,
   cuts on the clip in/out points, reframes to 9:16 / 1:1 / 16:9, burns the chosen caption style
   and exports H.264/AAC at 480p / 720p / 1080p. Files are uploaded to Supabase Storage so the link
   keeps working after the function instance is gone.

## Features

| Area | What's included |
| --- | --- |
| Landing page | URL-first hero, live clip showcase, editor preview, pricing, FAQ, legal pages |
| Studio | Project list, new-project form (clips 1–6, length 0–60s, aspect, quality, caption style, focus prompt), live analysis progress, clip editor with per-field autosave |
| Analysis | Real YouTube captions (watch page → InnerTube → timedtext), sentence-boundary clip windows, percentile-normalised scoring, optional LLM polish (failure-safe) |
| Preview | Real in-browser playback of the clip range with the caption overlay locked to the playhead |
| Exports | Real MP4 (bundled ffmpeg, burned captions, up to 1080p) plus SRT / VTT / TXT / JSON EDL |
| Accounts | Cookie sessions (`cf_sid`), guest accounts upgraded in place, password hashing, plan quotas |
| Ops | `/api/health`, sitemap, robots, OG image, error and 404 pages, rate limiting |

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 with design tokens in `src/app/globals.css`
- `lucide-react` icons, self-hosted `@fontsource-variable` fonts, no animation library
- Persistence through a dual adapter: JSON file store locally, Supabase (PostgREST) in production
- `next/og` for the social card (static TTF instanced from the variable font in `public/fonts`)

## Run locally

```bash
npm install
cp .env.example .env.local     # optional; empty env = file store
npm run dev                    # http://localhost:3000
```

With an empty `SUPABASE_URL` the app writes to `.data/` and everything (auth, projects, clips,
downloads) works without any external service.

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, sitemap and robots. Falls back to Vercel's own host env vars, then `http://localhost:3000` |
| `SUPABASE_URL` | Supabase project URL — switches the store to PostgREST |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used by the server-side store only |
| `OPENAI_API_KEY` (optional) | Enables LLM title/hashtag polish; ignored when absent or offline |
| `YOUTUBE_COOKIE` (optional) | Pasted `Cookie:` header from a signed-in browser session — unlocks MP4 export when YouTube asks the server to prove it is not a bot |
| `FFMPEG_PATH` (optional) | Override the bundled static ffmpeg with another build |
| `SUPABASE_RENDER_BUCKET` (optional) | Storage bucket for rendered MP4s (default `clipforge-renders`) |
| `DIAG_KEY` (optional) | Enables `GET /api/diag?key=…&v=<videoId>`, which reports what the host can actually reach |
| `YTDLP_PATH` (optional) | If a `yt-dlp` binary exists on the host it is used instead of the pure-JS resolver |

MP4 rendering needs no extra binaries: `@ffmpeg-installer/ffmpeg` ships a static ffmpeg inside the
deployment and `@distube/ytdl-core` resolves source streams in pure JS.

Supabase schema lives in `supabase/schema.sql`; the same tables are already created in the
deployed project (`cf_users`, `cf_sessions`, `cf_projects`, plus the public `clipforge-renders`
bucket used for rendered MP4s).

## Deploy

The production deployment is Vercel project `clipforge` in team `platematch` and serves the
`arena/ac32efc5-ai-clipper` branch. Environment variables set for production, preview and
development: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DIAG_KEY`; add `NEXT_PUBLIC_SITE_URL`
for canonical metadata and `YOUTUBE_COOKIE` if you want MP4 export on videos that YouTube
bot-checks.

```bash
# after pushing to the branch
gh workflow run ...            # not needed — deploy from the dashboard or the Vercel API
node scripts/deploy-probe.mjs  # PROBE_URL=... optional end-to-end check of a live deployment
```

`scripts/deploy-probe.mjs` exercises a live deployment end to end (routes, protection, cookies,
project creation, analysis, patch, downloads, render, cross-account isolation) and prints a probe
line per step — handy when you cannot reach the deployment from your own network.

## API

| Method & path | Purpose |
| --- | --- |
| `GET /api/me` | Current user (creates a guest session on first call) |
| `POST /api/auth/signup` · `/login` · `/logout` | Email accounts |
| `GET/POST /api/projects` | List / create projects |
| `GET/PATCH /api/projects/[id]` | Read or update a project |
| `POST /api/projects/[id]/analyze` | Run analysis and produce ranked clips |
| `PATCH /api/clips/[id]` | Title, style, quality, trim (`startSec` / `endSec`) |
| `GET /api/clips/[id]/download?format=srt|vtt|txt|json` | Export files |
| `POST /api/clips/[id]/render` | Renders the clip to MP4 (cut, reframe, burned captions) and returns a durable URL |
| `GET /api/renders/[file]` | Serves a locally rendered MP4 with `Range` support when no storage bucket is configured |
| `GET /api/diag?key=…&v=<videoId>` | Key-gated probe: YouTube reachability, caption availability, ffmpeg and storage |
| `GET /api/health` | Store, engines and renderer status |

## Known limits

- **MP4 export depends on the source, not the host.** ffmpeg ships with the app, but YouTube
  sometimes asks datacenter IPs to prove they are not a bot. When that happens `/render` returns a
  clear message and suggests `YOUTUBE_COOKIE`; every other export keeps working, and preview still
  plays the real range in the browser. Twitch and direct video URLs render without a cookie.
- **Caption quality depends on the source.** With YouTube captions reachable the transcript is real
  speech; otherwise a deterministic per-video transcript model is used and the project is marked
  `engine: heuristic` so titles and scores are representative rather than literal."
- **Storage is per-deployment.** File store writes go to `.data/` (ephemeral on serverless) — set
  the Supabase variables for durable records.
