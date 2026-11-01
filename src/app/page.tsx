import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/site/Nav";
import { SiteFooter } from "@/components/site/Footer";
import { Hero } from "@/components/marketing/Hero";
import { DemoClips } from "@/components/marketing/DemoClips";
import { EditorShowcase } from "@/components/marketing/EditorShowcase";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import {
  BigCta,
  Faq,
  Features,
  HowItWorks,
  PlatformRow,
  Showcase,
} from "@/components/marketing/Sections";
import { Reveal } from "@/components/ui/Reveal";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <PlatformRow />
        <HowItWorks />

        <section className="relative border-y border-line bg-white/[0.012] py-20 md:py-24">
          <div className="wrap">
            <Reveal>
              <SectionHeading
                eyebrow="Live output"
                title="This is what comes back."
                description="Three clips from one stream, ranked by the engine. Tap through them — the captions, scores and timing are generated, not mocked up."
              />
            </Reveal>
            <Reveal delay={100} className="mt-10">
              <div className="card p-4 sm:p-6">
                <DemoClips />
              </div>
            </Reveal>
          </div>
        </section>

        <section id="editor" className="wrap scroll-mt-20 py-20 md:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Customisation"
              title="Your style, applied to every clip."
              description="Set the caption system once. Change the preset, font, colour, size or position on the right — the preview updates as you go."
            />
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <EditorShowcase />
          </Reveal>
        </section>

        <Features />
        <Showcase />

        <section id="pricing" className="wrap scroll-mt-20 py-20 md:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Pricing"
              title="Start free. Scale when the clips work."
              description="Every plan includes 1080p exports and no watermark. Beta users get paid-tier limits unlocked."
              align="center"
            />
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <PricingCards />
          </Reveal>
          <p className="mt-5 text-center text-[12px] text-fog-dim">
            Need more than 6,000 minutes?{" "}
            <Link href="mailto:hello@clipforge.app" className="text-snow underline decoration-white/25 underline-offset-4">
              Talk to us
            </Link>{" "}
            about a custom plan.
          </p>
          <div className="mt-6 text-center">
            <Link href="/pricing" className="btn btn-ghost btn-sm">
              Compare plans <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>

        <Faq />
        <BigCta />
      </main>
      <SiteFooter />
    </>
  );
}
