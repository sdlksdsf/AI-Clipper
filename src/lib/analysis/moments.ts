import type {
  CaptionLine,
  CaptionPreset,
  Clip,
  ClipScores,
  ProjectSettings,
  TranscriptSegment,
} from "@/lib/types";
import { clamp, createRng, formatClock, uid } from "@/lib/utils";

/* ─────────────────────────── language signals ──────────────────────────── */

const LEX = {
  emotion:
    /\b(cry|crying|cried|tears|broke me|devastat\w*|terrified|shaking|scream\w*|furious|angry|love|loved|hate|hated|worst|best|insane|crazy|unbelievable|incredible|heartbreaking|scared|proud|painful|hilarious)\b/gi,
  curiosity:
    /\b(wait|hold on|listen|look at|here'?s|nobody|secret|actually|turns out|the part|the thing|what if|why|how|reveal\w*|nobody talks|the truth|real reason|guess what)\b/gi,
  story:
    /\b(started|then|when|day|month|year|ago|happened|ended|remember|told|walked|met|drove|spent|bet|began|finally)\b/gi,
  humor: /\b(funny|joke|laugh\w*|hilarious|comedy|meme|lol|goofy|silly|unhinged|haha)\b/gi,
  conflict:
    /\b(fight|argument|wrong|lie|fake|stole|accus\w*|ruined|destroy\w*|bet|rival|drama|furious|never speak|mob|thread)\b/gi,
  insight:
    /\b(the trick|the rule|the lesson|the point|that'?s the|means|because|learn\w*|understand|truth|reason|strategy|signal|pruning|actually)\b/gi,
  specificity: /\b(\d[\d,.]*|percent|thousand|million|hundred|grand|dollars?|subscribers?|views|hours?|minutes?|days?|years?)\b/gi,
  intensity:
    /\b(never|nobody|always|everything|nothing|absolutely|literally|completely|entire|whole|real|most|only|every single)\b/gi,
};

const FILLER_PREFIX =
  /^(okay|ok|so|and|but|well|listen|look|honestly|here'?s the thing|alright|i mean|you know|like|actually)[,:\s]+/i;

const META_LINE =
  /\b(let me|let's|i'm going to|i am going to|i want to|before we|one sec|hold on|okay so|for the people who|real quick|screen share|deep breath|give me a second|chat is saying|reading superchats)\b/i;

const STRONG_WORDS = new Set([
  "insane", "crazy", "unbelievable", "incredible", "never", "nobody", "everything", "nothing",
  "money", "free", "million", "thousand", "worst", "best", "secret", "truth", "broke",
  "destroyed", "cried", "screamed", "hate", "love", "stop", "wait", "now", "why", "how",
  "actually", "literally",
]);

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","if","then","than","that","this","these","those","is","are","was",
  "were","be","been","being","to","of","in","on","at","for","with","from","by","as","it","its","i",
  "me","my","we","our","you","your","he","she","they","them","his","her","their","what","which","who",
  "when","where","why","how","not","no","so","just","do","did","does","have","has","had","will",
  "would","can","could","should","about","into","up","down","out","off","over","under","again","very",
  "really","there","here","because","got","get","like","one","two","all","any","some","more","most",
  "much","also","even","still","okay","alright","well","now","ever","never","only","said","says","say",
  "go","going","went","make","makes","made","thing","things","know","think","thought","people",
  "wait","actually","almost","before","after","every","still","even","though","while","since",
  "something","anything","everything","nothing","someone","anyone","everyone","nobody","yeah",
  "okay","right","pretty","little","lot","kind","sort","stuff","way","ways","back","first","last",
  "next","new","old","good","bad","big","small","long","short","time","times","day","days","year",
  "years","month","months","week","weeks","hour","hours","minute","minutes","second","seconds",
  "chat","stream","video","clip","clips","part","point","reason","truth","secret",
]);

export interface FocusWeights {
  humor: number;
  emotion: number;
  insight: number;
  conflict: number;
  story: number;
}

export function parseFocus(prompt: string): FocusWeights {
  const weights: FocusWeights = { humor: 1, emotion: 1, insight: 1, conflict: 1, story: 1 };
  const text = prompt.toLowerCase();
  if (!text.trim()) return weights;
  const bump = (key: keyof FocusWeights) => {
    weights[key] = 1.75;
  };
  if (/funny|humou?r|comedy|laugh|meme/.test(text)) bump("humor");
  if (/emotion|wholesome|heart|sad|cry|inspir/.test(text)) bump("emotion");
  if (/insight|advice|learn|educat|tips|value|explain/.test(text)) bump("insight");
  if (/drama|controver|hot take|argument|conflict|beef|rage/.test(text)) bump("conflict");
  if (/story|storytelling|anecdote|journey/.test(text)) bump("story");
  return weights;
}

/* ──────────────────────────── feature pass ─────────────────────────────── */

interface RawFeatures {
  energy: number;
  emotion: number;
  curiosity: number;
  story: number;
  humor: number;
  conflict: number;
  insight: number;
  specificity: number;
  intensity: number;
  quote: number;
  question: number;
  words: number;
}

interface Features extends RawFeatures {
  raw: number;
}

function matches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

function rawFeatures(text: string): RawFeatures {
  const words = Math.max(1, text.split(/\s+/).filter(Boolean).length);
  const root = Math.sqrt(words);
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const upper = text.replace(/[^A-Z]/g, "");
  const capsRatio = letters.length > 4 ? upper.length / letters.length : 0;
  const exclamations = matches(text, /!/g);
  const questionMarks = matches(text, /\?/g);

  const strong = text
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((word) => STRONG_WORDS.has(word)).length;

  const punch = clamp(strong / 2.5, 0, 1);
  const shortPunch = clamp((16 - words) / 10, 0.2, 1);
  const energy = clamp(0.34 * capsRatio + 0.22 * clamp(exclamations, 0, 1) + 0.26 * punch + 0.18 * shortPunch, 0, 1);

  const quote =
    words >= 4 && words <= 16
      ? clamp(1 - Math.abs(words - 9.5) / 13, 0.35, 1) * (0.55 + 0.45 * Math.max(punch, capsRatio, questionMarks ? 0.4 : 0))
      : clamp(0.4 - words / 90, 0, 0.4);

  return {
    words,
    energy,
    emotion: matches(text, LEX.emotion) / root,
    curiosity: matches(text, LEX.curiosity) / root + (/(^|\s)(wait|hold on|nobody|here'?s|the truth|guess what)/i.test(text) ? 0.28 : 0) + (questionMarks ? 0.18 : 0),
    story: matches(text, LEX.story) / root,
    humor: matches(text, LEX.humor) / root + (/\b(haha|lol|lmao)\b/i.test(text) ? 0.25 : 0),
    conflict: matches(text, LEX.conflict) / root,
    insight: matches(text, LEX.insight) / root,
    specificity: matches(text, LEX.specificity) / root + (/\d/.test(text) ? 0.14 : 0),
    intensity: matches(text, LEX.intensity) / root,
    quote: clamp(quote, 0, 1),
    question: questionMarks ? 1 : 0,
  };
}

const FEATURE_KEYS: (keyof Omit<RawFeatures, "words">)[] = [
  "energy", "emotion", "curiosity", "story", "humor", "conflict", "insight",
  "specificity", "intensity", "quote", "question",
];

/**
 * Absolute keyword density is meaningless across different speakers, so each
 * feature is normalised against this transcript's own distribution (p75).
 * A "high emotion" moment is emotional *relative to the rest of the video*.
 */
function normalise(raw: RawFeatures[], focus: FocusWeights): Features[] {
  const denominators = {} as Record<string, number>;
  for (const key of FEATURE_KEYS) {
    const values = raw.map((item) => item[key]).sort((a, b) => a - b);
    const p75 = values[Math.floor(values.length * 0.75)] ?? 0;
    const p95 = values[Math.floor(values.length * 0.95)] ?? 0;
    denominators[key] = Math.max(0.18, p95 > 0 ? (p75 * 0.6 + p95 * 0.4) : 0);
  }

  return raw.map((item) => {
    const next = { ...item } as Features;
    for (const key of FEATURE_KEYS) {
      next[key] = clamp(item[key] / denominators[key], 0, 1);
    }
    next.emotion = clamp(next.emotion * focus.emotion, 0, 1);
    next.humor = clamp(next.humor * focus.humor, 0, 1);
    next.insight = clamp(next.insight * focus.insight, 0, 1);
    next.conflict = clamp(next.conflict * focus.conflict, 0, 1);
    next.story = clamp(next.story * focus.story, 0, 1);

    next.raw = clamp(
      0.2 * next.energy +
        0.17 * next.emotion +
        0.15 * next.curiosity +
        0.1 * next.story +
        0.08 * next.humor +
        0.08 * next.conflict +
        0.08 * next.insight +
        0.07 * next.specificity +
        0.04 * next.intensity +
        0.03 * next.quote,
      0,
      1,
    );
    return next;
  });
}

/* ─────────────────────────── window selection ──────────────────────────── */

interface Candidate {
  startIndex: number;
  endIndex: number;
  start: number;
  end: number;
  duration: number;
  score: number;
  hook: number;
  body: number;
  payoff: number;
  share: number;
  emotion: number;
  standalone: boolean;
}

const average = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

function scoreWindow(
  segments: TranscriptSegment[],
  features: Features[],
  startIndex: number,
  endIndex: number,
  target: number,
): Candidate {
  const slice = segments.slice(startIndex, endIndex + 1);
  const windowFeatures = features.slice(startIndex, endIndex + 1);
  const duration = slice[slice.length - 1].end - slice[0].start;

  const hookFeatures = windowFeatures.slice(0, Math.min(2, windowFeatures.length));
  const hook = average(
    hookFeatures.map((f) => 0.4 * f.energy + 0.28 * f.curiosity + 0.18 * f.emotion + 0.14 * f.quote),
  );

  const body = average(windowFeatures.map((f) => f.raw));

  const tail = windowFeatures.slice(-2);
  const payoff = average(tail.map((f) => 0.5 * f.emotion + 0.3 * f.insight + 0.2 * f.energy));

  const share = average(
    windowFeatures.map((f) => 0.4 * f.quote + 0.2 * f.humor + 0.2 * f.conflict + 0.2 * f.specificity),
  );

  let gaps = 0;
  for (let index = 1; index < slice.length; index++) {
    if (slice[index].start - slice[index - 1].end > 2.4) gaps += 1;
  }

  const gapBefore =
    startIndex === 0 ? 99 : segments[startIndex].start - segments[startIndex - 1].end;
  const standalone = gapBefore > 1.6;

  const durationFit = clamp(1 - Math.abs(duration - target) / Math.max(target, 1) / 1.7, 0, 1);
  const coherence = clamp(1 - gaps / Math.max(2, slice.length * 0.4), 0, 1);

  const score = clamp(
    0.32 * hook +
      0.27 * body +
      0.15 * payoff +
      0.1 * share +
      0.07 * durationFit +
      0.05 * coherence +
      (standalone ? 0.04 : 0),
    0,
    1,
  );

  return {
    startIndex,
    endIndex,
    start: slice[0].start,
    end: slice[slice.length - 1].end,
    duration,
    score,
    hook,
    body,
    payoff,
    share,
    emotion: average(windowFeatures.map((f) => f.emotion)),
    standalone,
  };
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }, pad = 3) {
  return a.start < b.end + pad && b.start < a.end + pad;
}

/* ─────────────────────────── titles & captions ─────────────────────────── */

function stripFillers(text: string) {
  return text
    .replace(FILLER_PREFIX, "")
    .replace(/\s+/g, " ")
    .replace(/[,;:\-–—.!?]+$/g, "")
    .trim();
}

function sentenceCase(text: string) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function makeTitle(text: string, max = 64): string {
  let cleaned = stripFillers(text)
    .replace(
      /^(the (?:crazy|weird|funny|honest|scary|wild|cool) part is|here'?s the thing|that'?s the (?:thing|part|problem)|the truth is|the reason is|the problem is)[,:]\s*/i,
      "",
    )
    .replace(/[,;:]+$/g, "")
    .trim();

  if (!cleaned) return "Untitled moment";

  // A short first sentence ("Four hundred.") works better as a setup than a title.
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1 && sentences[0].length < 26) {
    cleaned = sentences.slice(1).join(" ");
  }

  // Prefer the lead clause when it can stand alone; otherwise add the next one.
  const parts = cleaned.split(/,\s+/);
  if (parts.length > 1) {
    const lead = parts[0].trim();
    if (lead.split(/\s+/).length >= 4 && lead.length >= 16) {
      cleaned = lead;
    } else {
      cleaned = `${parts[0]}, ${parts[1]}`.trim();
    }
  }

  cleaned = cleaned.replace(/\s+(and|but|because|that|so|which|when)$/i, "").replace(/[,;:]+$/g, "").trim();

  if (cleaned.length <= max) return sentenceCase(cleaned);

  const cut = cleaned.slice(0, max);
  const boundary = Math.max(
    cut.lastIndexOf(", "),
    cut.lastIndexOf(" and "),
    cut.lastIndexOf(" but "),
    cut.lastIndexOf(" because "),
    cut.lastIndexOf(" so "),
  );
  const base = boundary > max * 0.45 ? cut.slice(0, boundary) : cut.slice(0, cut.lastIndexOf(" "));
  return sentenceCase(base.trim());
}

export function extractKeywords(text: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const rawWord of text.toLowerCase().split(/[^a-z0-9']+/)) {
    const word = rawWord.replace(/'s$/, "").trim();
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function buildCaptionLines(segments: TranscriptSegment[]): CaptionLine[] {
  const lines: CaptionLine[] = [];
  for (const segment of segments) {
    const words = segment.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const chunks: string[][] = [];
    let current: string[] = [];
    for (const word of words) {
      const candidate = [...current, word];
      if (candidate.join(" ").length > 21 || candidate.length > 4) {
        if (current.length) chunks.push(current);
        current = [word];
      } else {
        current = candidate;
      }
    }
    if (current.length) chunks.push(current);

    const totalChars = chunks.reduce((total, chunk) => total + chunk.join(" ").length, 0) || 1;
    let cursor = segment.start;
    const span = Math.max(0.9, segment.end - segment.start);
    for (const chunk of chunks) {
      const chars = chunk.join(" ").length;
      const duration = (chars / totalChars) * span;
      const end = Math.min(segment.end, cursor + duration);
      lines.push({
        start: Number(cursor.toFixed(2)),
        end: Number(end.toFixed(2)),
        words: chunk.map((word, index) => {
          const clean = word.replace(/[^a-zA-Z0-9']/g, "");
          const emphasis =
            STRONG_WORDS.has(clean.toLowerCase()) ||
            /^\d[\d,.]*$/.test(clean) ||
            clean.length > 7 ||
            /^[A-Z]{2,}$/.test(clean);
          return {
            text: word,
            start: Number((cursor + (end - cursor) * (index / chunk.length)).toFixed(2)),
            end: Number((cursor + (end - cursor) * ((index + 1) / chunk.length)).toFixed(2)),
            emphasis,
          };
        }),
      });
      cursor = end;
    }
  }
  return lines;
}

function pickTitleSegment(
  segments: TranscriptSegment[],
  features: Features[],
): TranscriptSegment {
  let best = segments[0];
  let bestScore = -1;
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const feature = features[index];
    if (!feature) continue;
    const metaPenalty = META_LINE.test(segment.text) ? 0.45 : 0;
    const lengthPenalty = feature.words > 24 ? 0.15 : feature.words < 4 ? 0.3 : 0;
    const score =
      0.42 * feature.quote +
      0.28 * feature.specificity +
      0.18 * feature.emotion +
      0.12 * feature.energy -
      metaPenalty -
      lengthPenalty;
    if (score > bestScore) {
      best = segment;
      bestScore = score;
    }
  }
  return best;
}

function buildSignals(windowFeatures: Features[], candidate: Candidate): string[] {
  const signals: string[] = [];
  const mean = (key: keyof RawFeatures) => average(windowFeatures.map((f) => f[key]));

  if (candidate.hook > 0.42) signals.push("Strong opening hook");
  if (mean("emotion") > 0.4) signals.push("High emotion");
  if (mean("curiosity") > 0.45) signals.push("Curiosity gap");
  if (mean("humor") > 0.34) signals.push("Comedic beat");
  if (mean("conflict") > 0.34) signals.push("Conflict / tension");
  if (mean("insight") > 0.42) signals.push("Clear insight");
  if (mean("specificity") > 0.45) signals.push("Concrete numbers");
  if (candidate.payoff > 0.35) signals.push("Pays off the setup");
  if (candidate.standalone) signals.push("Stands on its own");
  if (!signals.length) signals.push("Conversational momentum");
  return signals.slice(0, 4);
}

export function defaultHighlight(preset: CaptionPreset): string {
  switch (preset) {
    case "neon":
      return "#58e6d9";
    case "karaoke":
      return "#c8f751";
    case "clean":
      return "#a78bfa";
    case "minimal":
      return "#f6f7fa";
    default:
      return "#c8f751";
  }
}

/* ─────────────────────────────── analysis ──────────────────────────────── */

export interface AnalyzeInput {
  segments: TranscriptSegment[];
  settings: ProjectSettings;
  sourceTitle: string;
  sourceAuthor: string;
  seed: string;
}

export interface AnalyzeOutput {
  clips: Clip[];
  focus: FocusWeights;
}

export function analyzeTranscript(input: AnalyzeInput): AnalyzeOutput {
  const { segments, settings, seed } = input;
  const focus = parseFocus(settings.prompt);
  const rng = createRng(`${seed}:windows`);
  const features = normalise(segments.map((segment) => rawFeatures(segment.text)), focus);

  const target = settings.targetLength === 0 ? 32 : settings.targetLength;
  const minLen = settings.targetLength === 0 ? 20 : Math.max(6, target * 0.8);
  const maxLen = Math.min(60, settings.targetLength === 0 ? 45 : target * 1.15);

  const candidates: Candidate[] = [];
  for (let i = 0; i < segments.length; i++) {
    let best: Candidate | null = null;
    for (let j = i; j < segments.length; j++) {
      const duration = segments[j].end - segments[i].start;
      if (duration > maxLen) break;
      if (duration >= minLen) {
        const candidate = scoreWindow(segments, features, i, j, target);
        if (!best || candidate.score > best.score) best = candidate;
      }
    }
    if (best) candidates.push(best);
  }

  candidates.sort((a, b) => b.score - a.score);

  const wanted = clamp(settings.clipCount, 1, 6);
  const selected: Candidate[] = [];
  const signatures = new Set<string>();

  const signature = (candidate: Candidate) => {
    const text = segments
      .slice(candidate.startIndex, candidate.endIndex + 1)
      .map((segment) => segment.text)
      .join(" ")
      .toLowerCase();
    return text.split(/[^a-z0-9]+/).filter(Boolean).slice(0, 7).join("-");
  };

  const take = (pool: Candidate[]) => {
    for (const candidate of pool) {
      if (selected.length >= wanted) break;
      if (selected.some((picked) => overlaps(picked, candidate, 4))) continue;
      const key = signature(candidate);
      if (signatures.has(key)) continue;
      selected.push(candidate);
      signatures.add(key);
    }
  };

  // Pass 1: only clean scene starts, so clips don't open mid-thought.
  take(candidates.filter((candidate) => candidate.standalone));
  // Pass 2: fill the rest from the remaining candidates.
  if (selected.length < wanted) take(candidates);
  if (!selected.length && candidates.length) selected.push(candidates[0]);

  const topScore = selected[0]?.score ?? 0.4;

  const clips: Clip[] = selected.map((candidate, index) => {
    const clipSegments = segments.slice(candidate.startIndex, candidate.endIndex + 1);
    const windowFeatures = features.slice(candidate.startIndex, candidate.endIndex + 1);
    const text = clipSegments.map((segment) => segment.text).join(" ");

    const strongest = pickTitleSegment(clipSegments, windowFeatures);
    const title = makeTitle(strongest.text);
    const alternatives = clipSegments
      .map((segment, i) => ({ segment, score: windowFeatures[i]?.quote ?? 0 }))
      .filter((item) => item.segment !== strongest && item.segment.text.split(" ").length >= 5)
      .sort((a, b) => b.score - a.score)
      .map((item) => makeTitle(item.segment.text, 58))
      .filter((value) => value !== title);
    const titleIdeas = [...new Set([title, ...alternatives])].slice(0, 4);

    const keywords = extractKeywords(text, 6);
    const relative = topScore > 0 ? candidate.score / topScore : 1;
    const jitter = Math.round((rng() - 0.5) * 2.5);
    const virality = Math.round(clamp(59 + Math.pow(relative, 3) * 38 + jitter, 56, 97));

    const scores: ClipScores = {
      virality: index === 0 ? Math.max(virality, 85) : Math.min(virality, 96),
      hook: Math.round(clamp(55 + candidate.hook * 42, 50, 99)),
      engagement: Math.round(clamp(54 + candidate.body * 44, 48, 99)),
      retention: Math.round(clamp(56 + (candidate.payoff * 0.5 + candidate.score * 0.5) * 42, 50, 99)),
      emotion: Math.round(clamp(52 + candidate.emotion * 46, 45, 99)),
      shareability: Math.round(clamp(50 + candidate.share * 48, 45, 99)),
    };

    const captionLines = buildCaptionLines(clipSegments);
    const captionText = captionLines.map((line) => line.words.map((word) => word.text).join(" ")).join("\n");

    const speakerCounts = new Map<string, number>();
    for (const segment of clipSegments) {
      if (!segment.speaker) continue;
      speakerCounts.set(segment.speaker, (speakerCounts.get(segment.speaker) ?? 0) + 1);
    }
    const speaker = [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    const repeated = keywords.filter((word) => (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g")) ?? []).length >= 2);
    const tagPool = repeated.length >= 2 ? repeated : keywords;
    const hashtags = [
      ...new Set(
        tagPool
          .filter(
            (word) =>
              word.length >= 5 &&
              word.length <= 14 &&
              !/(ly|ing|ed)$/.test(word) &&
              ![
                "hundred","thousand","million","dollars","percent","couldnt","already","really",
                "actually","wait","before","after","anyway","everybody","camera","went","gonna",
                "wanna","thing","things","stuff","maybe","probably","literally","somebody",
              ].includes(word),
          )
          .slice(0, 4)
          .concat(["shorts", "clips", "streamer"]),
      ),
    ]
      .map((tag) => `#${tag.replace(/[^a-z0-9]/gi, "").toLowerCase()}`)
      .filter((tag) => tag.length > 4)
      .slice(0, 6);

    const summary = stripFillers(clipSegments[0].text);
    const description = `${summary}${clipSegments[1] ? ` ${stripFillers(clipSegments[1].text)}` : ""}\n\nClipped with ClipForge.\n${hashtags.join(" ")}`;

    return {
      id: uid("clip_"),
      index,
      title: titleIdeas[0],
      hook: makeTitle(strongest.text, 54),
      summary,
      description,
      hashtags,
      titleIdeas,
      startSec: Number(Math.max(0, candidate.start - 0.2).toFixed(2)),
      endSec: Number(Math.min(segments[segments.length - 1].end, candidate.end + 0.25).toFixed(2)),
      durationSec: Number(candidate.duration.toFixed(2)),
      scores,
      keywords,
      signals: buildSignals(windowFeatures, candidate),
      captionLines,
      captionText,
      transcript: clipSegments,
      speaker,
      style: {
        preset: settings.captionPreset,
        font: settings.captionFont,
        size: 100,
        uppercase: settings.captionPreset === "bold" || settings.captionPreset === "neon",
        highlight: defaultHighlight(settings.captionPreset),
        color: "#ffffff",
        position: "lower",
        background: settings.captionPreset === "clean",
      },
      quality: settings.quality,
      render: { status: "idle" },
      createdAt: new Date().toISOString(),
    };
  });

  clips.sort((a, b) => b.scores.virality - a.scores.virality);
  return {
    clips: clips.map((clip, index) => ({ ...clip, index })),
    focus,
  };
}

export function clipLabel(clip: Clip) {
  return `${formatClock(clip.startSec)} → ${formatClock(clip.endSec)}`;
}

export { overlaps };
