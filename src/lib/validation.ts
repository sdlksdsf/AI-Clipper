import type {
  Aspect,
  CaptionFont,
  CaptionPreset,
  LengthPreset,
  ProjectSettings,
  Quality,
} from "@/lib/types";

const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9"];
const QUALITIES: Quality[] = ["480p", "720p", "1080p"];
const LENGTHS: LengthPreset[] = [0, 15, 30, 45, 60];
const PRESETS: CaptionPreset[] = ["bold", "karaoke", "clean", "neon", "minimal"];
const FONTS: CaptionFont[] = ["display", "inter", "mono", "serif"];

export const DEFAULT_SETTINGS: ProjectSettings = {
  clipCount: 3,
  targetLength: 30,
  aspect: "9:16",
  quality: "1080p",
  captionPreset: "bold",
  captionFont: "display",
  language: "en",
  prompt: "",
  captions: true,
};

function pickEnum<T extends string | number>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export interface CreateProjectInput {
  url: string;
  settings: ProjectSettings;
}

export function parseProjectSettings(raw: unknown): ProjectSettings {
  const input = (raw ?? {}) as Record<string, unknown>;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 280) : "";
  return {
    clipCount: Math.min(6, Math.max(1, Math.round(Number(input.clipCount) || 3))),
    targetLength: pickEnum(Number(input.targetLength), LENGTHS, 30),
    aspect: pickEnum(input.aspect, ASPECTS, "9:16"),
    quality: pickEnum(input.quality, QUALITIES, "1080p"),
    captionPreset: pickEnum(input.captionPreset, PRESETS, "bold"),
    captionFont: pickEnum(input.captionFont, FONTS, "display"),
    language: input.language === "auto" ? "auto" : "en",
    prompt,
    captions: input.captions === false ? false : true,
  };
}

export function parseCreateProject(body: unknown): CreateProjectInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Send a video link to get started." };
  const input = body as Record<string, unknown>;
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url) return { error: "Paste a YouTube, Twitch or Kick link first." };
  if (url.length > 600) return { error: "That link is too long." };
  return { url, settings: parseProjectSettings(input.settings) };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Add at least one letter and one number.";
  }
  return null;
}
