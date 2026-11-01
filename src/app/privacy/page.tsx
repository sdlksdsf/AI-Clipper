import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 2026">
      <p>
        ClipForge turns public video links into short clips. This page explains what we store, why,
        and how to get rid of it.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Session data.</strong> A random session id in a cookie so your projects follow you between visits. If you create an account, we store your email and a salted password hash (scrypt).</li>
        <li><strong>Project data.</strong> The link you paste, public metadata about that video, the transcript we generate, and the clips and edits you create.</li>
        <li><strong>Usage.</strong> Minutes analysed per month, so plan limits can be enforced.</li>
      </ul>
      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell your data.</li>
        <li>We don't publish, re-upload or redistribute your clips.</li>
        <li>We don't store the source video file unless you ask us to render an MP4, in which case the file lives in temporary server storage and is cleaned up on a schedule.</li>
      </ul>
      <h2>Third parties</h2>
      <p>
        Metadata and captions may be fetched from the platform that hosts the source video (for
        example YouTube). If an LLM polish key is configured, transcript excerpts of the candidate
        clips are sent to that provider to refine titles and hooks. Rendering happens on our own
        workers.
      </p>
      <h2>Deleting your data</h2>
      <p>
        Delete any project from the studio and its record is removed immediately. To delete an
        account and everything attached to it, email{" "}
        <a className="text-snow underline decoration-white/25 underline-offset-4" href="mailto:hello@clipforge.app">
          hello@clipforge.app
        </a>{" "}
        and we'll remove it within 30 days.
      </p>
      <h2>Cookies</h2>
      <p>
        One essential cookie (<code>cf_sid</code>) for your session. No advertising or cross-site
        tracking cookies.
      </p>
    </LegalPage>
  );
}
