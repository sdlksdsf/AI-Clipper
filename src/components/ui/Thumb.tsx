"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PALETTE = [
  "linear-gradient(135deg,#3b2a72,#1a1630 55%,#0c0b14)",
  "linear-gradient(135deg,#1f4b52,#122024 55%,#0b1214)",
  "linear-gradient(135deg,#5a2440,#24101d 55%,#120810)",
  "linear-gradient(135deg,#2a3f6b,#141b2b 55%,#0a0d14)",
];

export function Thumb({
  src,
  alt,
  className,
  seed = 0,
}: {
  src?: string;
  alt: string;
  className?: string;
  seed?: number;
}) {
  const [failed, setFailed] = useState(false);
  const background = PALETTE[Math.abs(seed) % PALETTE.length];

  return (
    <div className={cn("relative overflow-hidden bg-ink-2", className)} style={{ background }}>
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden />
      {src && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="relative size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white/25">
            {alt.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
