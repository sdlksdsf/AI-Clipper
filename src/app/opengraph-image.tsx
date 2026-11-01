import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "ClipForge — AI that finds the clip in your stream";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const file = path.join(process.cwd(), "public/fonts/instrument-sans-600.ttf");
    const data = await readFile(file);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

const chips: [string, string][] = [
  ["94", "Hook"],
  ["91", "Retention"],
  ["88", "Emotion"],
];

export default async function OpengraphImage() {
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundImage:
            "radial-gradient(circle at 82% -18%, rgba(124,92,255,0.42) 0%, rgba(7,7,10,0) 52%), radial-gradient(circle at 12% 118%, rgba(200,247,81,0.13) 0%, rgba(7,7,10,0) 46%)",
          backgroundColor: "#07070a",
          color: "#f6f7fa",
          position: "relative",
          fontFamily: font ? "Instrument Sans" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg,#8f74ff,#5a35ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M9 6.5v11a1 1 0 0 0 1.55.83l8.2-5.5a1 1 0 0 0 0-1.66l-8.2-5.5A1 1 0 0 0 9 6.5Z" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            <span style={{ color: "#f6f7fa" }}>Clip</span>
            <span style={{ color: "#a78bfa" }}>Forge</span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 15,
              color: "#9ba1b0",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: "#c8f751", display: "flex" }} />
            <span>AI clipping studio</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 600, letterSpacing: -2.4, lineHeight: 1.05, maxWidth: 960 }}>
            Your stream already has the clip.
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 600, letterSpacing: -2.4, lineHeight: 1.05, color: "#c8f751" }}>
            We find it.
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#9ba1b0", maxWidth: 820, lineHeight: 1.4 }}>
            Paste a YouTube, Twitch or Kick link. Get 1–6 scored, captioned, 1080p-ready clips in under a minute.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {chips.map(([score, label]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "12px 18px",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: "#c8f751" }}>{score}</span>
              <span style={{ fontSize: 15, color: "#9ba1b0" }}>{label}</span>
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 15, color: "#6f7686" }}>
            9:16 · 1:1 · 16:9 · up to 1080p
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Instrument Sans", data: font, style: "normal", weight: 600 }]
        : undefined,
    },
  );
}
