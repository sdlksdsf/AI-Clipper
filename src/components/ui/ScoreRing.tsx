import { cn } from "@/lib/utils";

function tone(score: number) {
  if (score >= 87) return { stroke: "#c8f751", text: "text-lime", glow: "rgba(200,247,81,0.35)" };
  if (score >= 76) return { stroke: "#a78bfa", text: "text-violet-soft", glow: "rgba(167,139,250,0.32)" };
  if (score >= 65) return { stroke: "#58e6d9", text: "text-cyan", glow: "rgba(88,230,217,0.28)" };
  return { stroke: "#9ba1b0", text: "text-fog", glow: "rgba(155,161,176,0.25)" };
}

export function ScoreRing({
  score,
  size = 52,
  stroke = 4,
  label = "score",
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const colors = tone(clamped);

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${Math.round(clamped)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})`, transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <span
        className={cn("absolute font-[family-name:var(--font-mono)] font-semibold tabular", colors.text)}
        style={{ fontSize: size * 0.29 }}
      >
        {Math.round(clamped)}
      </span>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  const colors = tone(value);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium text-fog">{label}</span>
        <span className={cn("font-[family-name:var(--font-mono)] text-[11.5px] font-semibold", colors.text)}>
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(4, Math.min(100, value))}%`, backgroundColor: colors.stroke }}
        />
      </div>
    </div>
  );
}
