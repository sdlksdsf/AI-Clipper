import { cookies } from "next/headers";
import { authForRoute, fail, json, readJson } from "@/lib/api";
import { createSession, publicUser, sessionCookie, verifyPassword } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "login"), 10, 60_000);
  if (!limit.ok) return fail("Too many attempts. Try again in a minute.", 429);

  const body = await readJson<{ email?: string; password?: string }>(request);
  if (!body) return fail("Invalid request.");

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!isValidEmail(email) || !password) return fail("Email and password are required.");

  const store = getStore();
  const user = await store.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("That email and password combination doesn't match.", 401);
  }

  const auth = await authForRoute();
  const { token } = await createSession(user.id);
  if (auth.isNew) await store.deleteSession(auth.token).catch(() => undefined);

  const jar = await cookies();
  jar.set(sessionCookie(token));
  return json({ user: publicUser(user) });
}
