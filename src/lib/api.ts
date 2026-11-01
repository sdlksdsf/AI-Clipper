import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth, sessionCookie } from "@/lib/auth";
import type { Project, User } from "@/lib/types";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, { status });
}

/** Resolves the visitor and persists the cookie for brand-new sessions. */
export async function authForRoute(): Promise<{ user: User; token: string; isNew: boolean }> {
  const auth = await getAuth();
  if (auth.isNew) {
    try {
      const jar = await cookies();
      jar.set(sessionCookie(auth.token));
    } catch {
      // Read-only context (e.g. static rendering) — session still resolves.
    }
  }
  return auth;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as T;
  } catch {
    return null;
  }
}

export function ownsProject(project: Project | null, userId: string): project is Project {
  return Boolean(project && project.userId === userId);
}

export function clipSummary(project: Project) {
  return {
    id: project.id,
    title: project.source.title,
    author: project.source.author,
    platform: project.source.platform,
    thumbnail: project.source.thumbnail,
    status: project.status,
    progress: project.progress,
    stageLabel:
      project.stages[project.stage]?.label ?? (project.status === "ready" ? "Ready" : "Queued"),
    clipCount: project.clips.length,
    topScore: project.clips[0]?.scores.virality ?? 0,
    durationSec: project.source.durationSec,
    createdAt: project.createdAt,
    quality: project.settings.quality,
    aspect: project.settings.aspect,
  };
}
