-- ClipForge storage schema (Supabase / any Postgres with PostgREST).
-- Documents live in `data` (jsonb); the other columns exist so PostgREST can
-- filter rows (email lookups, session tokens, project owners, ordering).
-- Access is server-side only, with the service-role key, so RLS stays closed.

create table if not exists public.cf_users (
  id text primary key,
  email text unique,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cf_sessions (
  token text primary key,
  user_id text not null,
  expires_at timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cf_projects (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  data jsonb not null
);

create index if not exists cf_sessions_user_idx on public.cf_sessions (user_id);
create index if not exists cf_sessions_expires_idx on public.cf_sessions (expires_at);
create index if not exists cf_projects_user_idx on public.cf_projects (user_id, created_at desc);

alter table public.cf_users enable row level security;
alter table public.cf_sessions enable row level security;
alter table public.cf_projects enable row level security;
