import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/studio/new", label: "New project" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#features", label: "Features" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { href: "/#how-it-works", label: "Streams & VODs" },
      { href: "/#showcase", label: "Podcasts" },
      { href: "/#features", label: "Shorts channels" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "mailto:hello@clipforge.app", label: "Contact" },
      { href: "/api/health", label: "Status" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-line">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-fog">
            The clipping studio for people who post every day. Find the moment, not the timeline.
          </p>
          <p className="mt-6 text-[11.5px] leading-relaxed text-fog-dim">
            Clip responsibly. Only repurpose footage you own or have permission to use.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fog-dim">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link href={link.href} className="text-[13.5px] text-fog transition hover:text-snow">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="wrap flex flex-col gap-3 border-t border-line py-6 text-[12px] text-fog-dim sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} ClipForge. Built for creators who move fast.</p>
        <p className="font-[family-name:var(--font-mono)]">v1.0 · 1080p exports</p>
      </div>
    </footer>
  );
}
