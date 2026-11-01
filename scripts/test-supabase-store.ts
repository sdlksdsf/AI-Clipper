/**
 * Validates the Supabase/PostgREST adapter against an in-process mock that
 * implements the exact filters the adapter relies on.
 */
import http from "node:http";
import { createSupabaseStore } from "@/lib/db/supabase-store";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = { cf_users: [], cf_sessions: [], cf_projects: [] };

function matches(row: Row, key: string, value: string) {
  const rowValue = String(row[key] ?? "");
  if (value.startsWith("gt.")) return new Date(rowValue).getTime() > new Date(value.slice(3)).getTime();
  if (value.startsWith("eq.")) return rowValue === value.slice(3);
  return rowValue === value;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const table = url.pathname.replace("/rest/v1/", "");
  const rows = tables[table];
  if (!rows) {
    res.writeHead(404).end();
    return;
  }
  const send = (status: number, body?: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  const filters = [...url.searchParams.entries()].filter(([key]) => !["select", "limit", "order"].includes(key));

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const payload = body ? JSON.parse(body) : null;
    if (req.method === "POST") {
      for (const item of payload as Row[]) {
        const index = rows.findIndex((row) => row.id === item.id || row.token === item.token);
        if (index >= 0) rows[index] = item;
        else rows.push(item);
      }
      send(201, payload);
      return;
    }
    if (req.method === "PATCH") {
      const targets = rows.filter((row) => filters.every(([key, value]) => matches(row, key, value)));
      for (const row of targets) Object.assign(row, payload);
      send(200, targets);
      return;
    }
    if (req.method === "DELETE") {
      const kept = rows.filter((row) => !filters.every(([key, value]) => matches(row, key, value)));
      tables[table] = kept;
      send(204);
      return;
    }
    const result = rows.filter((row) => filters.every(([key, value]) => matches(row, key, value)));
    send(200, result);
  });
});

async function main() {
await new Promise<void>((resolve) => server.listen(54321, "127.0.0.1", resolve));
process.env.SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

const store = createSupabaseStore();
const user = {
  id: "usr_1",
  email: "a@b.com",
  name: "A",
  isGuest: false,
  plan: "free" as const,
  minutesUsed: 0,
  createdAt: new Date().toISOString(),
};
await store.createUser(user);
console.log("getUser", (await store.getUser("usr_1"))?.email);
console.log("getUserByEmail", (await store.getUserByEmail("A@B.com"))?.id);
await store.updateUser("usr_1", { minutesUsed: 42, plan: "creator" });
console.log("updated", await store.getUser("usr_1"));

const session = { token: "tok", userId: "usr_1", expiresAt: new Date(Date.now() + 10000).toISOString(), createdAt: new Date().toISOString() };
await store.createSession(session);
console.log("session", (await store.getSession("tok"))?.userId, "expired?", await store.getSession("nope"));

const project = {
  id: "prj_1",
  userId: "usr_1",
  source: { url: "https://x", platform: "youtube" as const, title: "t", author: "a", durationSec: 10 },
  settings: {},
  status: "queued" as const,
  stage: 0,
  progress: 0,
  stages: [],
  engine: "generated" as const,
  clips: [],
  transcript: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  minutesProcessed: 0,
  words: 0,
};
await store.createProject(project as never);
console.log("list", (await store.listProjects("usr_1")).map((p) => p.id));
console.log("count", await store.countProjects("usr_1"));
await store.updateProject("prj_1", { status: "ready" });
console.log("status", (await store.getProject("prj_1"))?.status);
await store.deleteProject("prj_1");
console.log("after delete", await store.listProjects("usr_1"));
await store.deleteSession("tok");
console.log("session after delete", await store.getSession("tok"));
server.close();
}
main().catch((error) => { console.error(error); process.exit(1); });
