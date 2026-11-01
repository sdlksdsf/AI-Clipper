import { createFileStore } from "./file-store";
import { createSupabaseStore } from "./supabase-store";
import type { DataStore } from "./types";

const globalForStore = globalThis as unknown as { __clipforgeStore?: DataStore };

function resolveStore(): DataStore {
  const hasSupabase = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return hasSupabase ? createSupabaseStore() : createFileStore();
}

export function getStore(): DataStore {
  if (!globalForStore.__clipforgeStore) {
    globalForStore.__clipforgeStore = resolveStore();
  }
  return globalForStore.__clipforgeStore;
}

export type { DataStore };
