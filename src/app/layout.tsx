import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const site = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "ClipForge — AI that finds the clip in your stream",
    template: "%s · ClipForge",
  },
  description:
    "Paste a YouTube, Twitch or Kick link. ClipForge finds the best moments, scores them for virality, writes the captions and exports 1080p vertical clips in under a minute.",
  keywords: [
    "AI clipping",
    "stream clips",
    "YouTube Shorts maker",
    "Twitch clip generator",
    "podcast clips",
    "video repurposing",
  ],
  openGraph: {
    title: "ClipForge — AI that finds the clip in your stream",
    description:
      "Long stream in, six viral-ready clips out. Ranked by virality, captioned, reframed and exportable at 1080p.",
    type: "website",
    url: site,
    siteName: "ClipForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipForge — AI that finds the clip in your stream",
    description: "Turn any long video or stream into short clips ranked by virality.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: site },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
