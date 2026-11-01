import { getStore } from "@/lib/db";
import type { Project, StageState } from "@/lib/types";
import { analyzeTranscript } from "./moments";
import { getTranscript } from "./transcript";
import { polishClips } from "./llm";

export const STAGE_BLUEPRINT: Omit<StageState, "status">[] = [
  { id: "ingest", label: "Reading the video", detail: "Pulling metadata, audio timeline and duration" },
  { id: "transcribe", label: "Transcribing every second", detail: "Word-level timestamps across the full runtime" },
  { id: "understand", label: "Understanding the story", detail: "Topics, speakers, sentiment and pacing" },
  { id: "hooks", label: "Hunting for hooks", detail: "Scanning for open loops, payoffs and quotable lines" },
  { id: "score", label: "Scoring virality", detail: "Hook, retention, emotion and shareability" },
  { id: "edit", label: "Editing your clips", detail: "Cutting dead air, stacking captions, framing" },
  { id: "finish", label: "Finishing up", detail: "Titles, hashtags and export plans" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const running = new Set<string>();

function stagesAt(activeIndex: number): StageState[] {
  return STAGE_BLUEPRINT.map((stage, index) => ({
    ...stage,
    status: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  }));
}

export async function runAnalysis(projectId: string): Promise<Project | null> {
  const store = getStore();
  const project = await store.getProject(projectId);
  if (!project) return null;
  if (project.status === "ready") return project;
  if (running.has(projectId)) return project;

  running.add(projectId);
  const startedAt = new Date().toISOString();

  try {
    const update = async (patch: Partial<Project>) => store.updateProject(projectId, patch);

    await update({
      status: "analyzing",
      stage: 0,
      progress: 6,
      stages: stagesAt(0),
      analysisStartedAt: startedAt,
      error: undefined,
    });
    await sleep(320);

    await update({ stage: 1, progress: 18, stages: stagesAt(1) });
    const transcript = await getTranscript(project.source);
    await sleep(240);

    await update({
      stage: 2,
      progress: 34,
      stages: stagesAt(2),
      transcript: transcript.segments,
      words: transcript.words,
      engine: transcript.engine,
    });
    await sleep(360);

    await update({ stage: 3, progress: 52, stages: stagesAt(3) });
    await sleep(320);

    await update({ stage: 4, progress: 70, stages: stagesAt(4) });
    const { clips } = analyzeTranscript({
      segments: transcript.segments,
      settings: project.settings,
      sourceTitle: project.source.title,
      sourceAuthor: project.source.author,
      seed: project.id,
    });
    await sleep(360);

    await update({ stage: 5, progress: 84, stages: stagesAt(5) });
    await sleep(260);

    const polished = await polishClips(clips);

    const minutesProcessed = Math.max(1, Math.round(project.source.durationSec / 60));
    const user = await store.getUser(project.userId);
    if (user) {
      await store.updateUser(user.id, { minutesUsed: user.minutesUsed + minutesProcessed });
    }

    const finalProject = await update({
      stage: 6,
      progress: 100,
      stages: STAGE_BLUEPRINT.map((stage) => ({ ...stage, status: "done" as const })),
      status: "ready",
      clips: polished,
      minutesProcessed,
      error: undefined,
    });

    return finalProject;
  } catch (error) {
    const message = error instanceof Error ? error.message : "analysis_failed";
    await store
      .updateProject(projectId, {
        status: "failed",
        error: message.slice(0, 200),
        progress: 100,
        stages: STAGE_BLUEPRINT.map((stage, index) => ({
          ...stage,
          status: index < 2 ? ("done" as const) : ("pending" as const),
        })),
      })
      .catch(() => undefined);
    return null;
  } finally {
    running.delete(projectId);
  }
}

export { analyzeTranscript };
