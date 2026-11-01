# ClipForge — AI that finds the clip in your stream

Paste a YouTube / Twitch / Kick / direct-video link and ClipForge analyses the whole video from
zero, ranks the most viral moments, and hands back auto-edited vertical clips with captions, hook
titles, hashtags and export files for YouTube Shorts, Instagram Reels and TikTok.

- **Live app:** https://clipforge-platematch1.vercel.app
- **Also live on:** https://clipforge-git-arena-f4715ce2-ai-clipper-platematch1.vercel.app
- **Repo:** https://github.com/sdlksdsf/AI-Clipper (branch `arena/f4715ce2-ai-clipper`)

## What it does

1. **Analyse from zero** — the link is resolved into a real source (title, author, duration,
   thumbnail), the transcript is fetched when captions exist and reconstructed with a
   per-video seeded beat model otherwise, then every second is scored.
2. **Find the moments** — a sliding-window scorer rates hook, body energy, payoff, emotion and
   shareability, then keeps the best 1–6 clips with percentile normalisation (so no two clips
   share the same inflated score) and signature deduplication (so the same take never ships twice).
3. **Rank by virality** — every clip gets a 0–100 virality score plus hook / engagement /
   retention / emotion / shareability sub-scores and plain-language reasons, best first.
4. **Edit and export** — 5 caption presets, 4 caption fonts, 9:16 / 1:1 / 16:9, 480p / 720p / 1080p,
   adjustable clip start/end, per-clip title and hashtags, and downloads as SRT, VTT, TXT or a
   JSON edit-decision-list for any NLE.

## Features

| Area | What's included |
| --- | --- |
| Landing page | URL-first hero, live clip showcase, editor preview, pricing, FAQ, legal pages |
| Studio | Project list, new-project form (clips 1–6, length 0–60s, aspect, quality, caption style, focus prompt), live analysis progress, clip editor with per-field autosave |
| Analysis | Percentile-normalised scoring, per-video seeded transcripts, real caption fetch when reachable, optional LLM polish (failure-safe) |
| Exports | SRT / VTT / TXT / JSON EDL downloads, MP4 render when `ffmpeg` + `yt-dlp` exist on the host |
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

Supabase schema lives in `supabase/schema.sql`; the same tables are already created in the
deployed project (`cf_users`, `cf_sessions`, `cf_projects`).

## Deploy

The production deployment is Vercel project `clipforge` in team `platematch` and serves the
`arena/f4715ce2-ai-clipper` branch. Two environment variables are set for production, preview and
development: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

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
| `POST /api/clips/[id]/render` | MP4 render when the host has ffmpeg + yt-dlp |
| `GET /api/health` | Store, engines and renderer status |

## Known limits

- **MP4 rendering is host-dependent.** Serverless has no `ffmpeg`/`yt-dlp`, so `/render` reports
  `unsupported` and points at the caption/EDL downloads. Run the app on a VM or container with
  both binaries (`pip install yt-dlp`, any static ffmpeg build) and rendering switches on by itself.
- **Caption quality depends on the source.** With YouTube captions reachable the transcript is real;
  otherwise the deterministic per-video transcript model is used, so titles and scores are
  representative rather than literal.
- **Storage is per-deployment.** File store writes go to `.data/` (ephemeral on serverless) — set
  the Supabase variables for durable records.
