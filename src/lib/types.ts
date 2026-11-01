export type Platform = "youtube" | "twitch" | "kick" | "file" | "unknown";

export type Aspect = "9:16" | "1:1" | "16:9";
export type Quality = "480p" | "720p" | "1080p";
export type LengthPreset = 0 | 15 | 30 | 45 | 60;
export type CaptionPreset = "bold" | "karaoke" | "clean" | "neon" | "minimal";
export type CaptionFont = "display" | "inter" | "mono" | "serif";
export type CaptionPosition = "lower" | "center" | "upper";
export type ProjectStatus = "queued" | "analyzing" | "ready" | "failed";
export type EngineMode = "generated" | "captions" | "upload";
export type PlanId = "free" | "creator" | "studio";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  energy?: number;
  laugh?: boolean;
}

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
  emphasis?: boolean;
}

export interface CaptionLine {
  start: number;
  end: number;
  words: CaptionWord[];
}

export interface ClipScores {
  virality: number;
  hook: number;
  engagement: number;
  retention: number;
  emotion: number;
  shareability: number;
}

export interface ClipStyle {
  preset: CaptionPreset;
  font: CaptionFont;
  size: number;
  uppercase: boolean;
  highlight: string;
  color: string;
  position: CaptionPosition;
  background: boolean;
}

export interface ClipRender {
  status: "idle" | "rendering" | "ready" | "unsupported" | "failed";
  url?: string;
  format?: string;
  resolution?: string;
  message?: string;
  updatedAt?: string;
}

export interface Clip {
  id: string;
  index: number;
  title: string;
  hook: string;
  summary: string;
  description: string;
  hashtags: string[];
  titleIdeas: string[];
  startSec: number;
  endSec: number;
  durationSec: number;
  scores: ClipScores;
  keywords: string[];
  signals: string[];
  captionLines: CaptionLine[];
  captionText: string;
  transcript: TranscriptSegment[];
  speaker?: string;
  style: ClipStyle;
  quality: Quality;
  render: ClipRender;
  createdAt: string;
}

export interface SourceInfo {
  url: string;
  platform: Platform;
  videoId?: string;
  title: string;
  author: string;
  thumbnail?: string;
  durationSec: number;
  watchUrl?: string;
  embedUrl?: string;
  live?: boolean;
}

export interface ProjectSettings {
  clipCount: number;
  targetLength: LengthPreset;
  aspect: Aspect;
  quality: Quality;
  captionPreset: CaptionPreset;
  captionFont: CaptionFont;
  language: string;
  prompt: string;
  captions: boolean;
}

export interface StageState {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "done";
}

export interface Project {
  id: string;
  userId: string;
  source: SourceInfo;
  settings: ProjectSettings;
  status: ProjectStatus;
  stage: number;
  progress: number;
  stages: StageState[];
  engine: EngineMode;
  clips: Clip[];
  transcript: TranscriptSegment[];
  createdAt: string;
  updatedAt: string;
  analysisStartedAt?: string;
  error?: string;
  analysisNote?: string;
  minutesProcessed: number;
  words: number;
}

export interface User {
  id: string;
  email?: string;
  name: string;
  passwordHash?: string;
  isGuest: boolean;
  plan: PlanId;
  minutesUsed: number;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  author: string;
  platform: Platform;
  thumbnail?: string;
  status: ProjectStatus;
  progress: number;
  stageLabel: string;
  clipCount: number;
  topScore: number;
  durationSec: number;
  createdAt: string;
  quality: Quality;
  aspect: Aspect;
}
