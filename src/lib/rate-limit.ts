interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const globalState = globalThis as unknown as { __clipforgeRate?: Map<string, Bucket> };
const store = globalState.__clipforgeRate ?? buckets;
globalState.__clipforgeRate = store;

/** Simple in-memory sliding window. Good enough to blunt abuse on one instance. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs);
  if (bucket.hits.length >= limit) {
    store.set(key, bucket);
    const oldest = bucket.hits[0] ?? now;
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }
  bucket.hits.push(now);
  store.set(key, bucket);
  if (store.size > 5000) store.clear();
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
