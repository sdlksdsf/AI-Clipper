# ClipForge — Build Plan

> Turn any long video or stream into ready-to-post clips. Paste a link, get the
> best moments, scored for virality, captioned, and edited — 1 to 6 clips, up to
> 1080p, 0–60s each.

Inspiration studied: Vizard.ai, OpusClip, Klap, Submagic (flow, scoring, caption
editor, export panel). We keep their strongest ideas and cut the bloat.

---

## 1. Product definition

**Who it's for:** streamers, clip channels, podcasters, editors who cut other
creators' long-form content for YouTube Shorts / Reels / TikTok.

**Core loop (4 screens):**

1. **Landing** — paste a URL, instant value prop, real product visuals, pricing.
2. **New project** — link + clip settings (count, length, format, quality, caption style, language, focus prompt).
3. **Analysis** — live staged progress: fetch → transcribe → understand → hook detection → scoring → edit → render plan.
4. **Results / editor** — clips ranked by virality score, vertical preview with live captions, per-clip editing, export.

**Clip spec**

| Property | Range |
| --- | --- |
| Clips per video | 1 – 6 (default 3) |
| Clip length | 0–60s; presets 15s / 30s / 45s / 60s / auto |
| Aspect | 9:16 (Shorts/Reels/TikTok), 1:1, 16:9 |
| Quality | 480p / 720p / 1080p (max) |
| Captions | 5 presets, font, size, color, highlight, position, uppercase, background |
| Extras | hook rewrite, title, description, hashtags, SRT/VTT/JSON export, MP4 render |

**Virality score** = weighted blend of Hook (30%), Engagement (25%), Retention
(20%), Emotion (15%), Shareability (10%). Sub-scores are shown so the number is
explainable, not magic.

---

## 2. Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — server components for
  marketing pages, client components only where interactive.
- **Tailwind CSS v4** — design tokens in CSS, no runtime CSS-in-JS.
- **No animation library** — CSS transitions + IntersectionObserver reveals.
  Keeps the bundle small and scrolling smooth on low-end phones.
- **Data layer adapter**: local JSON store (default, zero-config) or Supabase
  (activates automatically when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  are set) — so the deployed site keeps data across serverless instances.
- **Auth**: cookie sessions. Anonymous guest session is created on first visit
  (zero friction); adding an email + password upgrades the same account, so no
  project merge logic.
- **AI pipeline**: deterministic, explainable scoring engine running on the
  transcript. Optional LLM (OpenAI/Gemini) polish for titles & hooks when a key
  is present. Optional real transcript fetch; otherwise a seeded, realistic
  transcript is generated so the demo is always functional offline.
- **Renderer**: ffmpeg + yt-dlp when the host provides them (VPS/Render/Docker).
  On serverless hosts the app degrades cleanly to a downloadable **clip kit**
  (SRT + VTT + edit-decision JSON + captions text) and browser preview.

---

## 3. Architecture

```
src/
  app/
    page.tsx                 marketing home
    pricing/  login/  signup/
    studio/                  dashboard
    studio/new/              create project
    studio/[id]/             analysis + results + editor
    api/
      me, auth/{signup,login,logout}
      projects (GET/POST), projects/[id] (GET/PATCH/DELETE)
      projects/[id]/analyze (POST — staged pipeline)
      clips/[id] (PATCH), clips/[id]/render (POST)
      clips/[id]/download (GET ?format=srt|vtt|json|txt)
      health
    sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg
  components/  marketing/, studio/, ui/
  lib/
    db/          file + supabase adapters, types
    auth/        password hashing (scrypt), sessions
    sources.ts   URL parsing for YouTube / Twitch / Kick / direct files
    analysis/    transcript, features, scoring, captions, titles
    render/      ffmpeg/ASS builder + availability probe
    plans.ts, usage.ts
```

### Data model (documents, stored as JSON)

```ts
User    { id, email?, passwordHash?, name, plan, minutesUsed, isGuest, createdAt }
Session { token, userId, expiresAt }
Project { id, userId, source{platform, videoId, url, title, author, thumbnail, durationSec},
          settings{clipCount, targetLength, aspect, quality, captionStyle, language, prompt},
          status, progress, stage, engine, transcript[], clips[], createdAt }
Clip    { id, idx, title, description, hashtags[], startSec, endSec, durationSec,
          score{virality, hook, engagement, retention, emotion, shareability},
          hook, titleIdeas[], captionLines[], transcriptLineIndices[],
          styles, render{status, url?} }
```

---

## 4. Analysis pipeline (the "AI")

1. **Resolve source** — normalize URL, extract id, fetch title/author/thumbnail
   (oEmbed with timeout; graceful fallback).
2. **Transcribe** — timed segments (2–6s). Real captions when reachable,
   otherwise a seeded transcript keyed by the video id so results are stable.
3. **Feature extraction** — per segment: energy (caps, exclamations, laughter,
   intensifiers), emotion, curiosity/open-loop, story markers, specificity
   (numbers, names), question, humour, conflict, quotability, speech rate.
4. **Hook detection** — score the first 3 seconds of every candidate window
   separately; a clip with a weak opening can never outrank a strong one.
5. **Window scoring + NMS** — sliding windows matched to target length, snapped
   to sentence boundaries, then non-max suppression so clips never overlap.
6. **Rank & select** — top N, sorted best-first, diversified by topic so the
   set doesn't repeat the same beat.
7. **Edit plan** — trim dead air at both ends, mark b-roll/zoom beats, generate
   caption chunks (2–4 words, emphasis words highlighted), title, description,
   hashtags, hook line.
8. **Optional LLM polish** — if `OPENAI_API_KEY` or `GEMINI_API_KEY` is set,
   titles/hooks are rewritten for punch. Failure falls back silently.

Everything above runs in one request with progress persisted per stage, so the
UI can poll real status instead of faking a spinner.

---

## 5. Quality bars

- No layout shift, no horizontal scroll, mobile-first down to 360px.
- Interactive targets ≥ 40px, focus-visible rings, aria labels, reduced-motion.
- Empty states, error states, and 404 designed — not afterthoughts.
- Server validates every input; no unhandled promise can crash a route.
- `npm run build` + lint clean; API flows smoke-tested end to end.

---

## 6. Deployment

- Vercel (recommended) with Supabase env vars for persistence, or any Node host
  with ffmpeg/yt-dlp for real MP4 rendering.
- `.env.example` documents every switch; `README.md` has copy-paste steps.
- Health endpoint reports which engines are live so ops is obvious.
