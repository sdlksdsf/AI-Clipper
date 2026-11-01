"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#showcase", label: "Showcase" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "glass border-b border-line" : "border-b border-transparent",
      )}
    >
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-fog transition hover:bg-white/5 hover:text-snow"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-3 py-2 text-[13.5px] font-medium text-fog transition hover:text-snow sm:block">
            Sign in
          </Link>
          <Link href="/studio" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Open studio
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="btn btn-ghost btn-sm md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 bg-ink/97 px-5 py-6 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center justify-between border-b border-line text-[15px] text-snow"
              >
                {link.label}
                <ArrowUpRight className="size-4 text-fog" aria-hidden />
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/studio" onClick={() => setOpen(false)} className="btn btn-primary btn-lg w-full">
              Open studio
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost btn-lg w-full">
              Sign in
            </Link>
          </div>
          <p className="mt-8 text-xs text-fog-dim">
            Clip responsibly — only repurpose content you have the rights to.
          </p>
        </div>
      ) : null}
    </header>
  );
}
