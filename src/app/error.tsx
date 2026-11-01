"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ClipForge error boundary:", error.message);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-fog-dim">
          Something broke
        </p>
        <h1 className="mt-3 text-[28px] leading-tight">That wasn't supposed to happen.</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-fog">
          The page hit an unexpected error. Retrying usually fixes it — your projects are untouched.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/studio" className="btn btn-ghost">
            Back to studio
          </Link>
        </div>
      </div>
    </main>
  );
}
