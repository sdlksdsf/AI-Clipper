import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#8f74ff] to-[#5a35ff] shadow-[0_6px_18px_-8px_rgba(124,92,255,0.9)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none">
        <path d="M9 6.5v11a1 1 0 0 0 1.55.83l8.2-5.5a1 1 0 0 0 0-1.66l-8.2-5.5A1 1 0 0 0 9 6.5Z" fill="currentColor" />
        <path d="M5 8v8" stroke="#c8f751" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="ClipForge home">
      <LogoMark />
      <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-[-0.03em] text-snow">
        Clip<span className="text-violet-soft">Forge</span>
      </span>
    </Link>
  );
}
