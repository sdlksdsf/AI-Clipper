"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn, initials } from "@/lib/utils";

export interface StudioUser {
  name: string;
  email: string | null;
  isGuest: boolean;
}

interface StudioShellProps {
  user: StudioUser;
  plan: { name: string; minutes: number; remaining: number; percent: number };
  children: React.ReactNode;
}

const NAV = [
  { href: "/studio", label: "Projects", icon: LayoutGrid, exact: true },
  { href: "/studio/new", label: "New project", icon: Plus },
  { href: "/pricing", label: "Plans & billing", icon: CreditCard },
];

export function StudioShell({ user, plan, children }: StudioShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Studio">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className="nav-link" data-active={active}>
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-medium text-fog">{plan.name} plan</span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-fog-dim">
            {plan.percent}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet to-violet-soft"
            style={{ width: `${Math.max(plan.percent, 2)}%` }}
          />
        </div>
        <p className="mt-2 text-[10.5px] text-fog-dim">
          {plan.remaining} of {plan.minutes} min left
        </p>
        {plan.percent > 70 ? (
          <Link href="/pricing" className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-lime hover:underline">
            <Sparkles className="size-3" aria-hidden /> Get more minutes
          </Link>
        ) : null}
      </div>
    </nav>
  );

  const footer = (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet/20 text-[11.5px] font-semibold text-violet-soft">
          {initials(user.name || "G")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-snow">{user.name}</p>
          <p className="truncate text-[10.5px] text-fog-dim">
            {user.isGuest ? "Guest session" : user.email}
          </p>
        </div>
      </div>
      {user.isGuest ? (
        <Link href="/signup" className="btn btn-ghost btn-sm mt-3 w-full">
          Save your work
        </Link>
      ) : (
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] text-fog transition hover:border-white/25 hover:text-snow disabled:opacity-50"
        >
          <LogOut className="size-3" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
      <p className="mt-3 px-1 text-[10px] leading-relaxed text-fog-dim">
        Clip responsibly — repurpose only footage you have rights to.
      </p>
    </div>
  );

  return (
    <div className="studio-grid">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink-2/60 px-3.5 py-5 lg:flex">
        <div className="px-1.5">
          <Logo href="/studio" />
        </div>
        <Link href="/studio/new" className="btn btn-primary mt-5 w-full">
          <Plus className="size-4" aria-hidden />
          New project
        </Link>
        <div className="mt-4 flex flex-1 flex-col">{nav}</div>
        {footer}
      </aside>

      {/* mobile bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/studio" />
        <div className="flex items-center gap-2">
          <Link href="/studio/new" className="btn btn-primary btn-sm">
            <Plus className="size-3.5" aria-hidden /> New
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-ghost btn-sm"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[280px] flex-col border-l border-line bg-ink-2 px-4 py-5">
            <div className="flex items-center justify-between">
              <Logo href="/studio" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6 flex flex-1 flex-col">{nav}</div>
            {footer}
          </div>
        </div>
      ) : null}

      <div className={cn("flex min-w-0 flex-col bg-ink")}>{children}</div>
    </div>
  );
}
