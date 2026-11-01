import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-2xl text-center", className)}>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-mono)] text-[10.5px] font-medium uppercase tracking-[0.18em] text-fog">
        <span className="size-1.5 rounded-full bg-lime" aria-hidden />
        {eyebrow}
      </span>
      <h2 className="mt-5 text-[30px] leading-[1.08] sm:text-[38px] md:text-[42px]">{title}</h2>
      {description ? (
        <p className={cn("mt-4 max-w-xl text-[15px] leading-relaxed text-fog", align === "center" && "mx-auto")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
