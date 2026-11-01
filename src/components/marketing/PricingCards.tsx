import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

const ORDER: Plan["id"][] = ["free", "creator", "studio"];

export function PricingCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      {ORDER.map((id) => {
        const plan = PLANS[id];
        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition",
              plan.featured
                ? "border-violet/45 bg-gradient-to-b from-violet/[0.13] to-transparent shadow-[0_30px_80px_-50px_rgba(124,92,255,0.9)]"
                : "border-line bg-white/[0.018] hover:border-white/20",
            )}
          >
            {plan.featured ? (
              <span className="absolute -top-3 left-6 rounded-full border border-violet/40 bg-[#181233] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-soft">
                Most popular
              </span>
            ) : null}

            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px]">{plan.name}</h3>
              {plan.id !== "free" ? (
                <span className="rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-lime">
                  Free in beta
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-end gap-1.5">
              <span className="font-[family-name:var(--font-display)] text-[38px] font-semibold leading-none tracking-[-0.04em]">
                ${plan.price}
              </span>
              <span className="pb-1 text-[12px] text-fog-dim">/ {plan.cadence}</span>
            </div>
            <p className="mt-3 min-h-[38px] text-[13px] leading-relaxed text-fog">{plan.blurb}</p>

            <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
              {plan.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-fog">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-lime" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={plan.id === "free" ? "/studio/new" : "/studio/new"}
              className={cn("btn mt-6 w-full", plan.featured ? "btn-accent" : "btn-ghost")}
            >
              {plan.cta}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
