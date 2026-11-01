import Link from "next/link";
import { ArrowLeft, Scissors } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-5">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-x-0 top-0 h-[520px]" />
        <div className="glow-orb left-1/2 top-[-120px] size-[380px] -translate-x-1/2 bg-violet/30" />
      </div>
      <div className="w-full max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fog-dim">
          404
        </p>
        <h1 className="mt-3 text-[32px] leading-tight">This moment didn't make the cut.</h1>
        <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-fog">
          The page you're looking for isn't here. Your projects are safe in the studio.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/studio" className="btn btn-primary">
            <Scissors className="size-4" aria-hidden /> Open studio
          </Link>
          <Link href="/" className="btn btn-ghost">
            <ArrowLeft className="size-4" aria-hidden /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
