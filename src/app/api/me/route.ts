import { authForRoute, json } from "@/lib/api";
import { publicUser } from "@/lib/auth";
import { planFor, remainingMinutes, usagePercent } from "@/lib/plans";

export async function GET() {
  const { user } = await authForRoute();
  const plan = planFor(user.plan);
  return json({
    user: publicUser(user),
    plan: {
      id: plan.id,
      name: plan.name,
      minutes: plan.minutes,
      remaining: remainingMinutes(user.minutesUsed, user.plan),
      percent: usagePercent(user.minutesUsed, user.plan),
    },
  });
}
