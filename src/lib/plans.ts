import type { PlanId, Quality } from "@/lib/types";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  cadence: string;
  blurb: string;
  minutes: number;
  highlights: string[];
  maxQuality: Quality;
  cta: string;
  featured?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    price: 0,
    cadence: "forever",
    blurb: "Test the engine on real streams before you commit.",
    minutes: 240,
    maxQuality: "1080p",
    highlights: [
      "4 hours (240 min) of video per month",
      "Up to 6 clips per video",
      "1080p exports, no watermark",
      "All caption presets & fonts",
    ],
    cta: "Start free",
  },
  creator: {
    id: "creator",
    name: "Creator",
    price: 19,
    cadence: "per month",
    blurb: "For the creator posting every single day.",
    minutes: 1200,
    maxQuality: "1080p",
    highlights: [
      "20 hours (1,200 min) of video per month",
      "Priority analysis queue",
      "Brand kits & saved caption presets",
      "Bulk export & scheduling (beta)",
      "Email support within one business day",
    ],
    cta: "Choose Creator",
    featured: true,
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: 49,
    cadence: "per month",
    blurb: "For clippers, agencies and teams running several channels.",
    minutes: 6000,
    maxQuality: "1080p",
    highlights: [
      "100 hours (6,000 min) of video per month",
      "5 seats, shared projects",
      "API access & webhooks",
      "Custom fonts and brand templates",
      "Dedicated support channel",
    ],
    cta: "Choose Studio",
  },
};

export function planFor(id?: string | null): Plan {
  if (id === "creator" || id === "studio") return PLANS[id];
  return PLANS.free;
}

export function remainingMinutes(minutesUsed: number, planId: PlanId = "free"): number {
  return Math.max(0, planFor(planId).minutes - minutesUsed);
}

export function usagePercent(minutesUsed: number, planId: PlanId = "free"): number {
  const plan = planFor(planId);
  if (plan.minutes <= 0) return 0;
  return Math.min(100, Math.round((minutesUsed / plan.minutes) * 100));
}

export const QUALITY_ORDER: Quality[] = ["480p", "720p", "1080p"];

export function qualityHeight(quality: Quality): number {
  switch (quality) {
    case "480p":
      return 480;
    case "720p":
      return 720;
    default:
      return 1080;
  }
}

export function qualityBitrate(quality: Quality): string {
  switch (quality) {
    case "480p":
      return "2M";
    case "720p":
      return "4M";
    default:
      return "7M";
  }
}
