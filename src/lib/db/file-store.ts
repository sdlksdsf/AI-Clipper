import { promises as fs } from "node:fs";
import path from "node:path";
import type { Project, Session, User } from "@/lib/types";
import type { DataStore } from "./types";

interface Database {
  users: User[];
  sessions: Session[];
  projects: Project[];
}

const DATA_DIR = process.env.CLIPFORGE_DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const state = globalThis as unknown as {
  __clipforgeDb?: Database;
  __clipforgeLock?: Promise<unknown>;
};

function emptyDb(): Database {
  return { users: [], sessions: [], projects: [] };
}

async function load(): Promise<Database> {
  if (state.__clipforgeDb) return state.__clipforgeDb;
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    state.__clipforgeDb = {
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      projects: parsed.projects ?? [],
    };
  } catch {
    state.__clipforgeDb = emptyDb();
  }
  return state.__clipforgeDb;
}

async function persist(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Serialises mutations so concurrent requests never clobber the file. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = state.__clipforgeLock ?? Promise.resolve();
  const next = previous.then(fn, fn);
  state.__clipforgeLock = next.catch(() => undefined);
  return next;
}

async function read<T>(fn: (db: Database) => T): Promise<T> {
  const db = await load();
  return fn(db);
}

async function write<T>(fn: (db: Database) => T): Promise<T> {
  return withLock(async () => {
    const db = await load();
    const result = fn(db);
    await persist(db);
    return result;
  });
}

export function createFileStore(): DataStore {
  return {
    kind: "file",

    async getUser(id) {
      return read((db) => db.users.find((u) => u.id === id) ?? null);
    },

    async getUserByEmail(email) {
      const normalized = email.trim().toLowerCase();
      return read((db) => db.users.find((u) => u.email?.toLowerCase() === normalized) ?? null);
    },

    async createUser(user) {
      return write((db) => {
        db.users.push(user);
        return user;
      });
    },

    async updateUser(id, patch) {
      return write((db) => {
        const user = db.users.find((u) => u.id === id);
        if (!user) throw new Error("user_not_found");
        Object.assign(user, patch);
        return user;
      });
    },

    async getSession(token) {
      const now = Date.now();
      return read((db) => {
        const session = db.sessions.find((s) => s.token === token);
        if (!session) return null;
        if (new Date(session.expiresAt).getTime() < now) return null;
        return session;
      });
    },

    async createSession(session) {
      return write((db) => {
        db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
        db.sessions.push(session);
        return session;
      });
    },

    async deleteSession(token) {
      await write((db) => {
        db.sessions = db.sessions.filter((s) => s.token !== token);
      });
    },

    async listProjects(userId) {
      return read((db) =>
        db.projects
          .filter((p) => p.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },

    async getProject(id) {
      return read((db) => db.projects.find((p) => p.id === id) ?? null);
    },

    async createProject(project) {
      return write((db) => {
        db.projects.push(project);
        return project;
      });
    },

    async updateProject(id, patch) {
      return write((db) => {
        const project = db.projects.find((p) => p.id === id);
        if (!project) throw new Error("project_not_found");
        Object.assign(project, patch, { updatedAt: new Date().toISOString() });
        return project;
      });
    },

    async deleteProject(id) {
      await write((db) => {
        db.projects = db.projects.filter((p) => p.id !== id);
      });
    },

    async countProjects(userId) {
      return read((db) => db.projects.filter((p) => p.userId === userId).length);
    },
  };
}
