import { getStore } from "@/lib/db";
import type { Clip, Project } from "@/lib/types";

export interface ClipLocation {
  project: Project;
  clip: Clip;
}

export async function findClip(userId: string, clipId: string): Promise<ClipLocation | null> {
  const projects = await getStore().listProjects(userId);
  for (const project of projects) {
    const clip = project.clips.find((item) => item.id === clipId);
    if (clip) return { project, clip };
  }
  return null;
}
