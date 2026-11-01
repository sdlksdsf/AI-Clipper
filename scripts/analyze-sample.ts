import { generateTranscript } from "@/lib/analysis/transcript";
import { analyzeTranscript } from "@/lib/analysis/moments";
import type { ProjectSettings } from "@/lib/types";

const platforms = ["youtube", "twitch"] as const;
for (const [i, url] of ["aircAruvnKk", "jfKfPfyJRdk", "dQw4w9WgXcQ"].entries()) {
  const source = {
    url: `https://www.youtube.com/watch?v=${url}`,
    platform: platforms[0],
    videoId: url,
    title: "Sample stream",
    author: "Creator",
    durationSec: [1099, 7200, 2400][i],
    thumbnail: "",
  };
  const transcript = generateTranscript(source);
  const settings: ProjectSettings = {
    clipCount: 4,
    targetLength: 30,
    aspect: "9:16",
    quality: "1080p",
    captionPreset: "bold",
    captionFont: "display",
    language: "en",
    prompt: "",
    captions: true,
  };
  const { clips } = analyzeTranscript({ segments: transcript.segments, settings, sourceTitle: source.title, sourceAuthor: source.author, seed: `seed-${i}` });
  console.log(`\n=== ${source.videoId} (${(source.durationSec/60).toFixed(0)}m) — ${transcript.segments.length} segments, ${clips.length} clips`);
  for (const clip of clips) {
    console.log(`${clip.scores.virality} | ${Math.round(clip.startSec)}-${Math.round(clip.endSec)} (${clip.durationSec.toFixed(0)}s) | ${clip.title}`);
    console.log(`     signals: ${clip.signals.join(", ")}`);
    console.log(`     scores: hook ${clip.scores.hook} eng ${clip.scores.engagement} ret ${clip.scores.retention} emo ${clip.scores.emotion} share ${clip.scores.shareability}`);
    console.log(`     tags: ${clip.hashtags.join(" ")} | captions ${clip.captionLines.length}`);
  }
}
