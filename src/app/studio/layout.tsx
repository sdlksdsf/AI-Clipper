import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";
import { getAuth } from "@/lib/auth";
import { planFor, remainingMinutes, usagePercent } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuth();
  const plan = planFor(user.plan);

  return (
    <StudioShell
      user={{ name: user.name, email: user.email ?? null, isGuest: user.isGuest }}
      plan={{
        name: plan.name,
        minutes: plan.minutes,
        remaining: remainingMinutes(user.minutesUsed, user.plan),
        percent: usagePercent(user.minutesUsed, user.plan),
      }}
    >
      {children}
    </StudioShell>
  );
}
