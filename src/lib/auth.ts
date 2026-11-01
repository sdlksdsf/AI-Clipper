import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getStore } from "@/lib/db";
import type { Session, User } from "@/lib/types";
import { uid } from "@/lib/utils";

export const SESSION_COOKIE = "cf_sid";
const SESSION_DAYS = 30;

export interface AuthContext {
  user: User;
  token: string;
  isNew: boolean;
}

const pendingTokens = new Map<string, Promise<AuthContext>>();

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored?: string): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function createSession(userId: string): Promise<{ session: Session; token: string }> {
  const session: Session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId,
    expiresAt: sessionExpiry(),
    createdAt: new Date().toISOString(),
  };
  await getStore().createSession(session);
  return { session, token: session.token };
}

async function bootstrapGuest(token: string): Promise<AuthContext> {
  const store = getStore();
  const existing = await store.getSession(token);
  if (existing) {
    const user = await store.getUser(existing.userId);
    if (user) return { user, token, isNew: false };
  }

  const user: User = {
    id: uid("usr_"),
    name: "Guest creator",
    isGuest: true,
    plan: "free",
    minutesUsed: 0,
    createdAt: new Date().toISOString(),
  };
  await store.createUser(user);
  await store.createSession({
    token,
    userId: user.id,
    expiresAt: sessionExpiry(),
    createdAt: new Date().toISOString(),
  });
  return { user, token, isNew: true };
}

/**
 * Resolves the visitor. Every visitor gets a session — anonymous visitors are
 * upgraded in place when they sign up, so projects never need migrating.
 */
export async function getAuth(): Promise<AuthContext> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value || crypto.randomBytes(32).toString("hex");

  const inFlight = pendingTokens.get(token);
  if (inFlight) return inFlight;

  const task = (async (): Promise<AuthContext> => {
    const store = getStore();
    const session = await store.getSession(token);
    if (session) {
      const user = await store.getUser(session.userId);
      if (user) return { user, token, isNew: false };
    }
    return bootstrapGuest(token);
  })().finally(() => {
    pendingTokens.delete(token);
  });

  pendingTokens.set(token, task);
  return task;
}

/** Cookie options shared by every route that writes the session cookie. */
export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    isGuest: user.isGuest,
    plan: user.plan,
    minutesUsed: user.minutesUsed,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
