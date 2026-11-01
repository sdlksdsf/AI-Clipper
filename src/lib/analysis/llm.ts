import type { Clip } from "@/lib/types";
import { truncate } from "@/lib/utils";

export interface LlmStatus {
  provider: "openai" | "gemini" | "none";
  model?: string;
}

export function llmStatus(): LlmStatus {
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", model: "gemini-2.0-flash" };
  }
  return { provider: "none" };
}

interface PolishItem {
  index: number;
  title?: string;
  hook?: string;
  hashtags?: string[];
}

const SYSTEM = `You are a short-form video editor who has produced clips with billions of views.
You receive transcript excerpts of candidate clips. For each clip, write:
- title: max 60 characters, no hashtags, no emoji, front-load the most interesting detail.
- hook: max 45 characters, a spoken-style opening line that creates a curiosity gap.
- hashtags: 3 to 5 lowercase tags without the # symbol.
Keep claims faithful to the transcript. Return strict JSON: {"clips":[{"index":0,"title":"...","hook":"...","hashtags":["..."]}]}`

function buildPrompt(clips: Clip[]): string {
  return clips
    .map(
      (clip, index) =>
        `Clip ${index} (${Math.round(clip.durationSec)}s):\n${truncate(clip.transcript.map((s) => s.text).join(" "), 900)}`,
    )
    .join("\n\n");
}

async function callOpenAI(clips: Clip[], model: string): Promise<PolishItem[] | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(9000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(clips) },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return extractItems(content);
}

async function callGemini(clips: Clip[], model: string): Promise<PolishItem[] | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      signal: AbortSignal.timeout(9000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(clips) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;
  return extractItems(content);
}

function extractItems(content: string): PolishItem[] | null {
  try {
    const jsonText = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonText) as { clips?: PolishItem[] };
    if (!Array.isArray(parsed.clips)) return null;
    return parsed.clips
      .filter((item) => typeof item?.index === "number")
      .map((item) => ({
        index: item.index,
        title: typeof item.title === "string" ? item.title.trim().slice(0, 80) : undefined,
        hook: typeof item.hook === "string" ? item.hook.trim().slice(0, 70) : undefined,
        hashtags: Array.isArray(item.hashtags)
          ? item.hashtags
              .filter((tag): tag is string => typeof tag === "string")
              .slice(0, 5)
              .map((tag) => `#${tag.replace(/^#/, "").replace(/[^a-z0-9]/gi, "").toLowerCase()}`)
              .filter((tag) => tag.length > 1)
          : undefined,
      }));
  } catch {
    return null;
  }
}

/** Never throws: on any failure the deterministic titles are kept. */
export async function polishClips(clips: Clip[]): Promise<Clip[]> {
  const status = llmStatus();
  if (status.provider === "none" || !clips.length) return clips;
  try {
    const items =
      status.provider === "openai"
        ? await callOpenAI(clips, status.model ?? "gpt-4o-mini")
        : await callGemini(clips, status.model ?? "gemini-2.0-flash");
    if (!items?.length) return clips;
    return clips.map((clip, index) => {
      const match = items.find((item) => item.index === index);
      if (!match) return clip;
      const title = match.title && match.title.length > 8 ? match.title : clip.title;
      return {
        ...clip,
        title,
        hook: match.hook && match.hook.length > 6 ? match.hook : clip.hook,
        hashtags: match.hashtags?.length ? match.hashtags : clip.hashtags,
        titleIdeas: [title, ...clip.titleIdeas.filter((idea) => idea !== title)].slice(0, 5),
        description: `${clip.summary}\n\nClipped with ClipForge.\n${(match.hashtags?.length ? match.hashtags : clip.hashtags).join(" ")}`,
      };
    });
  } catch {
    return clips;
  }
}
