import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="November 2026">
      <p>
        By using ClipForge you agree to these terms. They're short on purpose.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Only submit content you own or have permission to reuse. ClipForge is a tool; it does not grant you rights to anyone else's footage.</li>
        <li>Follow the rules of the platforms you post to, including their policies on reused content.</li>
        <li>Don't use ClipForge to harass, defame or misrepresent anyone, or to process illegal material.</li>
      </ul>
      <h2>Availability</h2>
      <p>
        The service is provided as-is during beta. Analysis results are suggestions, not guarantees
        of performance, and rendering depends on the deployment host having the required media
        tooling.
      </p>
      <h2>Plans and limits</h2>
      <p>
        Each plan includes a monthly minute allowance. Analysis beyond your allowance is refused
        until the next cycle or an upgrade. Paid tiers are shown for transparency and are not charged
        during the beta.
      </p>
      <h2>Liability, briefly</h2>
      <p>
        We're not liable for lost views, lost revenue or takedowns that result from how you use the
        clips. Keep your own backups of anything important.
      </p>
      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a className="text-snow underline decoration-white/25 underline-offset-4" href="mailto:hello@clipforge.app">
          hello@clipforge.app
        </a>
        .
      </p>
    </LegalPage>
  );
}
