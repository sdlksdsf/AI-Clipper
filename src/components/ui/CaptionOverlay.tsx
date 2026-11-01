import type { CSSProperties } from "react";
import type { CaptionLine, ClipStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const FONT_STACK: Record<ClipStyle["font"], string> = {
  display: "var(--font-display)",
  inter: "var(--font-sans)",
  mono: "var(--font-mono)",
  serif: "Georgia, 'Times New Roman', serif",
};

export function activeLine(lines: CaptionLine[], time: number) {
  if (!lines.length) return null;
  const clamped = Math.max(0, time);
  return (
    lines.find((line) => clamped >= line.start && clamped < line.end) ??
    (clamped >= (lines.at(-1)?.end ?? 0) ? lines.at(-1) ?? null : lines[0])
  );
}

export function CaptionOverlay({
  line,
  style,
  time,
  compact = false,
}: {
  line: CaptionLine | null;
  style: ClipStyle;
  time: number;
  compact?: boolean;
}) {
  if (!line) return null;

  const preset = style.preset;
  const base: CSSProperties = {
    fontFamily: FONT_STACK[style.font],
    fontWeight: preset === "minimal" ? 600 : 800,
    color: style.color,
    textTransform: style.uppercase ? "uppercase" : "none",
    letterSpacing: preset === "bold" ? "-0.02em" : "-0.01em",
    fontSize: `calc(${(style.size / 100) * (compact ? 6.2 : 6.6)}cqw)`,
    lineHeight: 1.1,
  };

  if (preset === "bold") {
    base.textShadow = "0 3px 0 rgba(0,0,0,.9), 0 0 22px rgba(0,0,0,.65)";
    base.fontWeight = 900;
  } else if (preset === "neon") {
    base.textShadow = `0 0 10px ${style.highlight}, 0 0 26px ${style.highlight}aa, 0 2px 2px rgba(0,0,0,.8)`;
  } else if (preset === "karaoke") {
    base.textShadow = "0 2px 0 rgba(0,0,0,.85), 0 0 14px rgba(0,0,0,.55)";
  } else if (preset === "clean") {
    base.textShadow = "0 1px 2px rgba(0,0,0,.6)";
  } else {
    base.textShadow = "0 1px 12px rgba(0,0,0,.8)";
  }

  const boxed = style.background || preset === "clean";
  const positionStyle: CSSProperties =
    style.position === "lower"
      ? { bottom: compact ? "12%" : "13%" }
      : style.position === "upper"
        ? { top: compact ? "12%" : "13%" }
        : { top: "50%", transform: "translateY(-50%)" };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-[7%] text-center"
      style={positionStyle}
    >
      <p
        className={cn("max-w-full leading-[1.1] [text-wrap:balance]", boxed && "rounded-xl bg-black/65 px-3 py-2")}
        style={base}
      >
        {line.words.map((word, index) => {
          const isActive = time >= word.start - 0.02 && time <= word.end + 0.02;
          const highlight = preset === "karaoke" ? isActive : word.emphasis;
          return (
            <span
              key={`${word.text}-${index}`}
              style={{
                color: highlight ? style.highlight : undefined,
                transition: "color .12s linear",
                display: "inline-block",
                marginRight: "0.26em",
              }}
            >
              {style.uppercase ? word.text.toUpperCase() : word.text}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export function aspectRatioValue(aspect: "9:16" | "1:1" | "16:9") {
  return aspect.replace(":", "/");
}
