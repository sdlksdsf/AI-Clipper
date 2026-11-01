import { cookies } from "next/headers";
import { authForRoute, fail, json, readJson } from "@/lib/api";
import { createSession, hashPassword, publicUser, sessionCookie } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isValidEmail, passwordProblem } from "@/lib/validation";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "signup"), 8, 60_000);
  if (!limit.ok) return fail("Too many attempts. Give it a minute.", 429);

  const body = await readJson<{ email?: string; password?: string; name?: string }>(request);
  if (!body) return fail("Invalid request.");

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim().slice(0, 60);

  if (!isValidEmail(email)) return fail("Enter a valid email address.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);

  const auth = await authForRoute();
  const store = getStore();

  const existing = await store.getUserByEmail(email);
  if (existing && existing.id !== auth.user.id) {
    return fail("That email already has an account. Sign in instead.", 409);
  }
  if (!auth.user.isGuest) {
    return fail("You are already signed in.", 400);
  }

  const updated = await store.updateUser(auth.user.id, {
    email,
    name: name || email.split("@")[0],
    passwordHash: hashPassword(password),
    isGuest: false,
  });

  const { token } = await createSession(updated.id);
  await store.deleteSession(auth.token).catch(() => undefined);
  const jar = await cookies();
  jar.set(sessionCookie(token));

  return json({ user: publicUser(updated) });
}
