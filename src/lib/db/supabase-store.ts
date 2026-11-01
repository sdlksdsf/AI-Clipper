import type { Project, Session, User } from "@/lib/types";
import type { DataStore } from "./types";

/**
 * Documents live in `data` (jsonb); the few columns outside it exist purely so
 * PostgREST can filter (email, owner, session token).
 */
const USERS = "cf_users";
const SESSIONS = "cf_sessions";
const PROJECTS = "cf_projects";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_not_configured");
  return { url, key };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase_${res.status}:${detail.slice(0, 180)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

interface UserRow {
  id: string;
  email: string | null;
  data: User;
}

interface SessionRow {
  token: string;
  user_id: string;
  expires_at: string;
  data: Session;
}

interface ProjectRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  data: Project;
}

const q = encodeURIComponent;

export function createSupabaseStore(): DataStore {
  return {
    kind: "supabase",

    async getUser(id) {
      const rows = await request<UserRow[]>(`${USERS}?id=eq.${q(id)}&limit=1`);
      return rows[0]?.data ?? null;
    },

    async getUserByEmail(email) {
      const rows = await request<UserRow[]>(
        `${USERS}?email=eq.${q(email.trim().toLowerCase())}&limit=1`,
      );
      return rows[0]?.data ?? null;
    },

    async createUser(user) {
      await request<UserRow[]>(USERS, {
        method: "POST",
        body: JSON.stringify([
          {
            id: user.id,
            email: user.email?.toLowerCase() ?? null,
            data: user,
          },
        ]),
      });
      return user;
    },

    async updateUser(id, patch) {
      const current = await this.getUser(id);
      if (!current) throw new Error("user_not_found");
      const next: User = { ...current, ...patch };
      await request<UserRow[]>(`${USERS}?id=eq.${q(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ email: next.email?.toLowerCase() ?? null, data: next }),
      });
      return next;
    },

    async getSession(token) {
      const rows = await request<SessionRow[]>(
        `${SESSIONS}?token=eq.${q(token)}&expires_at=gt.${q(new Date().toISOString())}&limit=1`,
      );
      return rows[0]?.data ?? null;
    },

    async createSession(session) {
      await request<SessionRow[]>(SESSIONS, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([
          {
            token: session.token,
            user_id: session.userId,
            expires_at: session.expiresAt,
            data: session,
          },
        ]),
      });
      return session;
    },

    async deleteSession(token) {
      await request<unknown>(`${SESSIONS}?token=eq.${q(token)}`, { method: "DELETE" });
    },

    async listProjects(userId) {
      const rows = await request<ProjectRow[]>(
        `${PROJECTS}?user_id=eq.${q(userId)}&order=created_at.desc`,
      );
      return rows.map((r) => r.data);
    },

    async getProject(id) {
      const rows = await request<ProjectRow[]>(`${PROJECTS}?id=eq.${q(id)}&limit=1`);
      return rows[0]?.data ?? null;
    },

    async createProject(project) {
      await request<ProjectRow[]>(PROJECTS, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([
          {
            id: project.id,
            user_id: project.userId,
            created_at: project.createdAt,
            updated_at: project.updatedAt,
            data: project,
          },
        ]),
      });
      return project;
    },

    async updateProject(id, patch) {
      const current = await this.getProject(id);
      if (!current) throw new Error("project_not_found");
      const next: Project = { ...current, ...patch, updatedAt: new Date().toISOString() };
      await request<ProjectRow[]>(`${PROJECTS}?id=eq.${q(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ updated_at: next.updatedAt, data: next }),
      });
      return next;
    },

    async deleteProject(id) {
      await request<unknown>(`${PROJECTS}?id=eq.${q(id)}`, { method: "DELETE" });
    },

    async countProjects(userId) {
      const rows = await request<ProjectRow[]>(
        `${PROJECTS}?user_id=eq.${q(userId)}&select=id`,
      );
      return rows.length;
    },
  };
}
