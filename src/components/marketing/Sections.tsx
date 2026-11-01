import Link from "next/link";
import {
  ArrowRight,
  Captions,
  Check,
  Crop,
  Download,
  Gauge,
  Layers,
  Link2,
  Play,
  Scissors,
  Sparkles,
  Timer,
  Wand2,
  Zap,
} from "lucide-react";
import { ClipUrlForm } from "@/components/marketing/ClipUrlForm";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const PLATFORMS = ["YouTube", "Twitch", "Kick", "Podcasts", "Webinars", "MP4 uploads"];

export function PlatformRow() {
  return (
    <div className="border-y border-line bg-white/[0.015] py-4">
      <div className="wrap flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-fog-dim">
          Built for
        </span>
        {PLATFORMS.map((platform) => (
          <span key={platform} className="text-[12.5px] font-medium text-fog">
            {platform}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Drop the link",
      body: "YouTube video, Shorts, Twitch VOD, Kick, or a direct MP4. One field, no uploads, no exports.",
      icon: Link2,
      visual: (
        <div className="rounded-lg border border-line bg-ink-2 p-2">
          <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-2">
            <Link2 className="size-3 text-fog-dim" aria-hidden />
            <span className="truncate font-[family-name:var(--font-mono)] text-[10px] text-fog">
              youtube.com/watch?v=…
            </span>
            <span className="ml-auto rounded bg-violet px-1.5 py-0.5 text-[9px] font-semibold text-white">
              Clip
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      title: "AI watches all of it",
      body: "Every second is transcribed, scored and mapped — hooks, payoffs, dead air, laughter, tension.",
      icon: Wand2,
      visual: (
        <div className="rounded-lg border border-line bg-ink-2 p-2">
          <div className="flex h-9 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 34 }).map((_, index) => (
              <span
                key={index}
                className="flex-1 rounded-full"
                style={{
                  height: `${20 + ((index * 13) % 80)}%`,
                  backgroundColor: index > 12 && index < 22 ? "#c8f751" : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      number: "03",
      title: "Get ranked clips",
      body: "1–6 clips, best first. Each one scored, captioned in your style and ready as a 1080p vertical export.",
      icon: Scissors,
      visual: (
        <div className="space-y-1.5 rounded-lg border border-line bg-ink-2 p-2">
          {[
            [94, "84%"],
            [88, "58%"],
            [81, "36%"],
          ].map(([score, width]) => (
            <div key={String(score)} className="flex items-center gap-2">
              <span className="w-5 font-[family-name:var(--font-mono)] text-[9px] text-lime">{score}</span>
              <div className="h-1.5 rounded-full bg-white/10" style={{ width: `${width}` }}>
                <div className="h-full rounded-full bg-violet-soft" />
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="wrap scroll-mt-20 py-20 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Three steps between a link <br className="hidden sm:block" /> and a postable clip.
            </>
          }
          description="No timeline scrubbing. No hunting through four hours of VOD at 2× speed. The boring part is our job."
        />
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.number} delay={index * 80}>
            <div className="card card-hover h-full p-5">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[11px] text-fog-dim">
                  {step.number}
                </span>
                <span className="grid size-8 place-items-center rounded-lg bg-violet/12 text-violet-soft">
                  <step.icon className="size-4" aria-hidden />
                </span>
              </div>
              <h3 className="mt-5 text-[19px]">{step.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fog">{step.body}</p>
              <div className="mt-5">{step.visual}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Features() {
  const features = [
    {
      icon: Zap,
      title: "Hook-first detection",
      body: "Every candidate clip is judged on its first three seconds. A weak opening can never outrank a strong one.",
    },
    {
      icon: Gauge,
      title: "A score you can argue with",
      body: "Hook, retention, emotion and shareability are scored separately, so you know exactly why a clip ranks where it does.",
    },
    {
      icon: Captions,
      title: "Captions with timing",
      body: "Word-level timing, emphasis on the words that land, five presets, four fonts, your colour. No re-typing.",
    },
    {
      icon: Crop,
      title: "Reframe, not crop",
      body: "9:16, 1:1 or 16:9. The frame follows the subject and keeps the caption safe inside the safe zone.",
    },
    {
      icon: Download,
      title: "Exports that are ready",
      body: "1080p MP4 with burned-in captions, plus SRT, VTT and an edit list for Premiere, Resolve or CapCut.",
    },
    {
      icon: Layers,
      title: "One video, six angles",
      body: "Clips are diversified across the timeline, so your six posts don't all come from the same five minutes.",
    },
  ];

  return (
    <section id="features" className="relative scroll-mt-20 border-y border-line bg-white/[0.012] py-20 md:py-24">
      <div className="wrap">
        <Reveal>
          <SectionHeading
            eyebrow="What's inside"
            title="Everything a clipper does at 3am. Without the 3am."
            description="ClipForge is built around one opinion: the moment matters more than the edit. So we made finding the moment the hard part."
          />
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 50} className="bg-ink">
              <div className="h-full bg-gradient-to-b from-white/[0.03] to-transparent p-6 transition hover:from-violet/[0.07]">
                <span className="grid size-9 place-items-center rounded-xl border border-line bg-white/[0.04] text-violet-soft">
                  <feature.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-[16.5px]">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fog">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Showcase() {
  const cards = [
    {
      category: "Podcast",
      creator: "@thelongtalk",
      source: "2h 14m episode",
      quote: "I stopped editing for the algorithm and started editing for the second. Everything changed.",
      score: 93,
      accent: "#c8f751",
      gradient: "radial-gradient(120% 90% at 30% 0%,#43318a 0%,#1d1735 50%,#0a0810 100%)",
      tags: ["#podcast", "#growth"],
    },
    {
      category: "Gaming",
      creator: "@clutchcity",
      source: "4h 02m stream",
      quote: "He peeked. He actually peeked. Oh my god.",
      score: 91,
      accent: "#ff5c8a",
      gradient: "radial-gradient(120% 90% at 70% 0%,#5e2a45 0%,#2a1220 50%,#0e060a 100%)",
      tags: ["#gaming", "#clutch"],
    },
    {
      category: "IRL",
      creator: "@offcamera",
      source: "58m vlog",
      quote: "The worst day of my life started with a free upgrade, which should tell you everything.",
      score: 88,
      accent: "#58e6d9",
      gradient: "radial-gradient(120% 90% at 40% 0%,#14525a 0%,#0d2b30 50%,#060f10 100%)",
      tags: ["#storytime", "#irl"],
    },
  ];

  return (
    <section id="showcase" className="wrap scroll-mt-20 py-20 md:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Showcase"
          title="The moments creators would have scrolled past."
          description="Every clip below was chosen by the scoring engine — not hand-picked afterwards."
        />
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Reveal key={card.category} delay={index * 80}>
            <article className="group overflow-hidden rounded-2xl border border-line bg-surface">
              <div
                className="relative aspect-[4/3] overflow-hidden [container-type:inline-size]"
                style={{ background: card.gradient }}
              >
                <div className="absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(120deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_9px)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-1 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-wider text-white/75 backdrop-blur">
                  {card.category}
                </span>
                <span
                  className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold backdrop-blur"
                  style={{ color: card.accent }}
                >
                  {card.score}/100
                </span>
                <p className="absolute inset-x-4 bottom-4 font-[family-name:var(--font-display)] text-[16px] font-black uppercase leading-[1.15] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
                  {card.quote.split(" ").map((word, wordIndex) => (
                    <span
                      key={`${card.category}-${wordIndex}`}
                      className="mr-1.5 inline-block"
                      style={{ color: wordIndex === 3 || wordIndex === 4 ? card.accent : undefined }}
                    >
                      {word}
                    </span>
                  ))}
                </p>
                <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur transition group-hover:scale-110 group-hover:bg-white/20">
                  <Play className="size-4 fill-white text-white" aria-hidden />
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-medium text-snow">{card.creator}</p>
                  <p className="font-[family-name:var(--font-mono)] text-[10.5px] text-fog-dim">{card.source}</p>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {card.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-fog">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function BigCta() {
  return (
    <section className="wrap py-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-gradient-to-br from-[#1a1430] via-[#0e0c18] to-[#0a0b0f] p-7 sm:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="glow-orb -right-20 -top-24 size-[320px] bg-violet/45" />
            <div className="glow-orb -bottom-28 left-10 size-[260px] bg-lime/15" />
            <div className="grid-bg absolute inset-0 opacity-40" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="pill border-lime/30 bg-lime/10 text-lime">
                <Sparkles className="size-3" aria-hidden /> Your next clip is already in there
              </span>
              <h2 className="mt-5 text-[30px] leading-[1.06] sm:text-[40px]">
                Stop watching your own VODs.
                <br className="hidden sm:block" /> Start posting them.
              </h2>
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-fog">
                Paste one link and see the six best moments of your last stream — scored, captioned and
                framed before your coffee gets cold.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/studio" className="btn btn-primary">
                  Open the studio <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/pricing" className="btn btn-ghost">
                  See pricing
                </Link>
              </div>
            </div>
            <div>
              <div className="rounded-2xl border border-line bg-ink/60 p-3 backdrop-blur">
                <ClipUrlForm showSamples />
                <ul className="mt-3 grid gap-1.5 px-1 text-[11.5px] text-fog">
                  {["No credit card", "6 clips per video", "1080p exports, no watermark"].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="size-3 text-lime" aria-hidden /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Faq() {
  const items = [
    {
      question: "What links can I paste?",
      answer:
        "YouTube videos and Shorts, Twitch VODs and clips, Kick VODs, and direct MP4 / MOV / WebM URLS. If the source is public, we can read it — no download or upload on your side.",
    },
    {
      question: "How long does analysis take?",
      answer:
        "A one-hour stream is usually ready in under a minute. Longer VODs take a little more, because every second is transcribed and scored rather than sampled.",
    },
    {
      question: "What do I actually get at the end?",
      answer:
        "One to six clips, ranked best-first. Each has a title, hook, caption script, hashtags, an explainable virality score and a 1080p vertical export in 9:16, 1:1 or 16:9.",
    },
    {
      question: "Can I change the captions and clip length?",
      answer:
        "Yes. Pick a caption preset, font, size, colour, position and backing box, then trim the clip down to the second. Style changes persist across every clip in the project. You can also download SRT/VTT if you'd rather caption in your own editor.",
    },
    {
      question: "Is clipping other creators okay?",
      answer:
        "That's between you and the rights holder. ClipForge is a tool — it doesn't grant rights. Many creators allow clipping in exchange for credit; others don't. Check before you post, and always credit the source.",
    },
    {
      question: "Where is my video stored?",
      answer:
        "Only the metadata, transcript and clip data needed to build your project. You can delete a project at any time and everything tied to it is removed immediately.",
    },
  ];

  return (
    <section id="faq" className="wrap scroll-mt-20 py-20 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions, answered plainly." />
          <div className="mt-6 flex items-center gap-2 text-[12.5px] text-fog">
            <Timer className="size-3.5" aria-hidden />
            Still stuck? <a className="text-snow underline decoration-white/25 underline-offset-4" href="mailto:hello@clipforge.app">Email us</a>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="divide-y divide-line rounded-2xl border border-line bg-white/[0.015]">
            {items.map((item) => (
              <details key={item.question} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-snow">
                  {item.question}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-fog transition group-open:rotate-45 group-open:border-violet/50 group-open:text-violet-soft">
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-fog">{item.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
