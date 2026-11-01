import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "cf_sid";
const MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Gives every visitor a session id before the app renders, so the studio works
 * with zero signup friction and projects survive a refresh.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(COOKIE)?.value;
  if (existing) return NextResponse.next();

  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const headers = new Headers(request.headers);
  const cookieHeader = request.headers.get("cookie");
  headers.set("cookie", cookieHeader ? `${cookieHeader}; ${COOKIE}=${token}` : `${COOKIE}=${token}`);

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|mp4)$).*)",
  ],
};
