"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }
      router.push("/studio");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and retry.");
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-[12px] text-fog transition hover:text-snow">
            Back to site
          </Link>
        </div>

        <div className="my-auto w-full max-w-[380px] py-10">
          <h1 className="text-[28px] leading-tight">
            {isSignup ? "Keep your clips in one place" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-fog">
            {isSignup
              ? "Create an account and your projects follow you across devices. No card, no email confirmation."
              : "Sign in to pick up where you left off."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {isSignup ? (
              <div>
                <label htmlFor="name" className="label">
                  Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog-dim" aria-hidden />
                  <input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex"
                    className="field pl-10"
                    autoComplete="name"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog-dim" aria-hidden />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@channel.com"
                  className="field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="label">
                  Password
                </label>
                {isSignup ? <span className="mb-2 text-[10.5px] text-fog-dim">8+ chars, 1 number</span> : null}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog-dim" aria-hidden />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="field pl-10"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-[12px] text-pink" role="alert">
                {error}
              </div>
            ) : null}

            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
              {!pending ? <ArrowRight className="size-4" aria-hidden /> : null}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-fog">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-snow underline decoration-white/25 underline-offset-4">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="text-snow underline decoration-white/25 underline-offset-4">
                  Create an account
                </Link>
              </>
            )}
          </p>

          <div className="mt-6 border-t border-line pt-4 text-center">
            <Link href="/studio" className="inline-flex items-center gap-1.5 text-[12px] text-fog transition hover:text-snow">
              Continue without an account <ArrowRight className="size-3" aria-hidden />
            </Link>
            <p className="mt-1.5 text-[10.5px] text-fog-dim">Guest projects live in this browser session.</p>
          </div>
        </div>

        <p className="text-[10.5px] text-fog-dim">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline decoration-white/20 underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline decoration-white/20 underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(100%_80%_at_20%_0%,#2c2158_0%,#12101f_55%,#08070c_100%)]" />
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="absolute -right-20 top-1/3 size-[360px] rounded-full bg-violet/25 blur-3xl" />
        <div className="absolute bottom-0 left-10 size-[240px] rounded-full bg-lime/10 blur-3xl" />

        <div className="relative flex h-full flex-col justify-center px-14">
          <span className="pill border-lime/30 bg-lime/10 text-lime">Clipping, without the timeline</span>
          <p className="mt-6 max-w-[440px] text-[26px] font-medium leading-[1.22] tracking-[-0.02em] text-snow">
            “I used to spend four hours on a VOD for six clips. Now it's one paste and a coffee.”
          </p>
          <p className="mt-4 text-[12.5px] text-fog">— a very relieved creator</p>

          <div className="mt-10 grid max-w-[380px] gap-2.5">
            {[
              "1–6 clips ranked by virality",
              "Word-level captions in your style",
              "1080p vertical exports",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[12.5px] text-fog"
              >
                <span className="size-1.5 rounded-full bg-lime" aria-hidden />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
