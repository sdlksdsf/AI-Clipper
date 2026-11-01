import { getStore } from "@/lib/db";
import type { ProjectSummary } from "@/lib/types";
import { clipSummary } from "@/lib/api";

export async function getOrListSummaries(userId: string): Promise<ProjectSummary[]> {
  const projects = await getStore().listProjects(userId);
  return projects.map(clipSummary);
}
