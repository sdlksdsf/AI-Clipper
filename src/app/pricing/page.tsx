import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { SiteNav } from "@/components/site/Nav";
import { SiteFooter } from "@/components/site/Footer";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { BigCta, Faq } from "@/components/marketing/Sections";
import { Reveal } from "@/components/ui/Reveal";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ClipForge pricing — start free with 4 hours of video a month, up to 1080p exports and 6 clips per video.",
};

const ROWS: { label: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { label: "Minutes per month", values: ["240", "1,200", "6,000"] },
  { label: "Clips per video", values: ["6", "6", "6"] },
  { label: "Max export quality", values: ["1080p", "1080p", "1080p"] },
  { label: "All caption presets & fonts", values: [true, true, true] },
  { label: "Clip kit (SRT / VTT / edit list)", values: [true, true, true] },
  { label: "MP4 rendering", values: [true, true, true] },
  { label: "Priority analysis queue", values: [false, true, true] },
  { label: "Saved brand kits", values: [false, true, true] },
  { label: "Team seats", values: ["1", "1", "5"] },
  { label: "API access & webhooks", values: [false, false, true] },
  { label: "Support", values: ["Community", "Email", "Dedicated channel"] },
];

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative overflow-hidden pb-10 pt-16 md:pt-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="grid-bg absolute inset-x-0 top-0 h-[420px]" />
            <div className="glow-orb left-1/2 top-[-140px] size-[420px] -translate-x-1/2 bg-violet/35" />
          </div>
          <div className="wrap">
            <Reveal>
              <SectionHeading
                eyebrow="Pricing"
                title="Simple plans. No watermark, ever."
                description="Start free. Move up when your posting schedule does. Every plan exports at up to 1080p with the full caption system."
                align="center"
              />
            </Reveal>
            <Reveal delay={80} className="mt-10">
              <PricingCards />
            </Reveal>
            <p className="mt-5 text-center text-[12px] text-fog-dim">
              Prices in USD. We're in open beta, so paid-tier limits are unlocked for everyone — no
              charge today.
            </p>
          </div>
        </section>

        <section className="wrap py-14">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="grid grid-cols-4 gap-px bg-line text-[12px]">
                <div className="bg-ink p-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-fog-dim">
                  Compare
                </div>
                {(["free", "creator", "studio"] as const).map((id) => (
                  <div key={id} className="bg-ink p-4">
                    <p className="text-[13px] font-medium text-snow">{PLANS[id].name}</p>
                    <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[11px] text-fog-dim">
                      ${PLANS[id].price}
                      {PLANS[id].price > 0 ? "/mo" : ""}
                    </p>
                  </div>
                ))}
                {ROWS.map((row) => (
                  <Row key={row.label} label={row.label} values={row.values} />
                ))}
              </div>
            </div>
          </Reveal>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
            <p className="text-[12px] text-fog">
              Need more than 6,000 minutes, custom fonts or a private deployment?
            </p>
            <Link href="mailto:hello@clipforge.app" className="btn btn-ghost btn-sm">
              Talk to us
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

function Row({ label, values }: { label: string; values: (string | boolean)[] }) {
  return (
    <>
      <div className="bg-ink px-4 py-3 text-[12px] text-fog">{label}</div>
      {values.map((value, index) => (
        <div key={`${label}-${index}`} className="flex items-center bg-ink px-4 py-3">
          {typeof value === "boolean" ? (
            value ? (
              <Check className="size-3.5 text-lime" aria-label="Included" />
            ) : (
              <Minus className="size-3.5 text-fog-dim" aria-label="Not included" />
            )
          ) : (
            <span className="text-[12px] text-snow">{value}</span>
          )}
        </div>
      ))}
    </>
  );
}
