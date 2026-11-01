import { SiteNav } from "@/components/site/Nav";
import { SiteFooter } from "@/components/site/Footer";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="wrap max-w-3xl py-16">
        <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] text-fog-dim">
          Legal · updated {updated}
        </p>
        <h1 className="mt-3 text-[32px] leading-tight">{title}</h1>
        <div className="prose-invert mt-8 space-y-6 text-[13.5px] leading-relaxed text-fog [&_h2]:mt-8 [&_h2]:text-[16px] [&_h2]:text-snow [&_strong]:text-snow [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
