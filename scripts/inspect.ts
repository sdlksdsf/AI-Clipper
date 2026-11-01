import { generateTranscript } from "@/lib/analysis/transcript";
import { parseFocus } from "@/lib/analysis/moments";

// Mirror of the private feature extractor for calibration output.
const src = {
  url: "https://www.youtube.com/watch?v=aircAruvnKk",
  platform: "youtube" as const,
  videoId: "aircAruvnKk",
  title: "test",
  author: "test",
  durationSec: 3600,
};
const t = generateTranscript(src);
console.log("segments", t.segments.length, "words", t.words);
const focus = parseFocus("");
const text = t.segments.map((s) => s.text).join(" ");
const words = text.split(/\s+/).length;
const count = (re: RegExp) => (text.match(re) ?? []).length;
console.log("emotion/100w", (count(/\b(cry|crying|cried|tears|broke me|devastat\w*|terrified|shaking|scream\w*|furious|angry|love|loved|hate|hated|worst|best|insane|crazy|unbelievable|incredible|heartbreaking|scared|proud|painful|hilarious)\b/gi) / words) * 100);
console.log("curiosity/100w", (count(/\b(wait|hold on|listen|look at|here'?s|nobody|secret|actually|turns out|the part|the thing|what if|why|how|reveal\w*|nobody talks|the truth|real reason|guess what)\b/gi) / words) * 100);
console.log("humor/100w", (count(/\b(funny|joke|laugh\w*|hilarious|comedy|meme|lol|goofy|silly|unhinged)\b/gi) / words) * 100);
console.log("conflict/100w", (count(/\b(fight|argument|wrong|lie|fake|stole|accus\w*|ruined|destroy\w*|bet|rival|drama|furious|never speak|mob|thread)\b/gi) / words) * 100);
console.log("insight/100w", (count(/\b(the trick|the rule|the lesson|the point|that'?s the|means|because|learn\w*|understand|truth|reason|strategy|signal|pruning|actually)\b/gi) / words) * 100);
console.log("specificity/100w", (count(/\b(\d[\d,.]*|percent|thousand|million|hundred|grand|dollars?|subscribers?|views|hours?|minutes?|days?|years?)\b/gi) / words) * 100);
console.log("question/100w", (count(/\?/g) / words) * 100);
console.log("focus", focus);
