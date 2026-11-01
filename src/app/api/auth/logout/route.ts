import { cookies } from "next/headers";
import { getAuth, SESSION_COOKIE } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { json } from "@/lib/api";

export async function POST() {
  try {
    const auth = await getAuth();
    await getStore().deleteSession(auth.token);
  } catch {
    // Already signed out — clearing the cookie is enough.
  }
  const jar = await cookies();
  jar.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return json({ ok: true });
}
