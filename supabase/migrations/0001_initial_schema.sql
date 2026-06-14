-- ============================================================================
-- TBH Companion — initial schema
-- Game: "TBH: Taskbar Hero" (TesseractStudio).  Read-side data is derived from
-- the game's Easy Save 3 (.es3) file, parsed by the desktop agent and pushed up.
--
-- Apply this in the Supabase SQL editor (Dashboard → SQL → New query), or via
-- `supabase db push` once the DB password is configured.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── helper: keep updated_at fresh ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles  (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  plan         text not null default 'free' check (plan in ('free', 'pro')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- agents  (one per machine/PC the player runs the game on)
-- ============================================================================
create table if not exists public.agents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  token_hash    text not null,                 -- sha256 of the agent token
  token_prefix  text not null,                 -- first 8 chars, for display
  status        text not null default 'offline'
                  check (status in ('offline', 'online', 'farming', 'error')),
  agent_version text,
  hostname      text,
  platform      text,
  last_seen_at  timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists agents_token_hash_key on public.agents (token_hash);
create index if not exists agents_user_id_idx on public.agents (user_id);

create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- save_state  (latest full parsed snapshot — exactly one row per agent)
-- Heroes/pets/runes/inventory/stash kept as jsonb: small, read together.
-- ============================================================================
create table if not exists public.save_state (
  agent_id            uuid primary key references public.agents (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  captured_at         timestamptz,            -- game's lastSavedTime, converted
  save_hash           text,                   -- hash of decrypted body (dedupe)
  play_time           numeric,                -- seconds
  gold                bigint,
  max_completed_stage int,
  current_stage_key   int,
  current_stage_wave  int,
  arranged_hero_keys  int[]    not null default '{}',
  arranged_pet_key    int,
  currencies          jsonb    not null default '[]'::jsonb,
  heroes              jsonb    not null default '[]'::jsonb,
  pets                jsonb    not null default '[]'::jsonb,
  runes               jsonb    not null default '[]'::jsonb,
  inventory           jsonb    not null default '[]'::jsonb,  -- occupied bag slots
  stash               jsonb    not null default '[]'::jsonb,
  boxes               jsonb    not null default '[]'::jsonb,
  settings            jsonb    not null default '{}'::jsonb,
  summary             jsonb    not null default '{}'::jsonb,  -- counts
  updated_at          timestamptz not null default now()
);

create index if not exists save_state_user_id_idx on public.save_state (user_id);

create trigger save_state_set_updated_at
  before update on public.save_state
  for each row execute function public.set_updated_at();

-- ============================================================================
-- save_snapshots  (thin time-series header — one row per detected change)
-- Powers gold/stage/playtime charts without storing the fat state each time.
-- ============================================================================
create table if not exists public.save_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  agent_id            uuid not null references public.agents (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  captured_at         timestamptz not null default now(),
  save_hash           text,
  play_time           numeric,
  gold                bigint,
  max_completed_stage int,
  current_stage_key   int,
  current_stage_wave  int,
  items_total         int,
  inventory_used      int,
  stash_used          int,
  created_at          timestamptz not null default now()
);

create index if not exists save_snapshots_agent_time_idx
  on public.save_snapshots (agent_id, captured_at desc);
create index if not exists save_snapshots_user_time_idx
  on public.save_snapshots (user_id, captured_at desc);

-- ============================================================================
-- loot_events  (drops detected by diffing successive saves)
-- ============================================================================
create table if not exists public.loot_events (
  id             uuid primary key default gen_random_uuid(),
  agent_id       uuid not null references public.agents (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  occurred_at    timestamptz not null default now(),
  kind           text not null default 'equipment'
                   check (kind in ('equipment','currency','material','box','rune','pet','other')),
  item_key       int,
  item_unique_id bigint,
  rarity         text,
  is_chaotic     boolean not null default false,
  quantity       bigint not null default 1,
  stage_key      int,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists loot_events_user_time_idx
  on public.loot_events (user_id, occurred_at desc);
create index if not exists loot_events_agent_time_idx
  on public.loot_events (agent_id, occurred_at desc);

-- ============================================================================
-- activity_events  (the feed)
-- ============================================================================
create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references public.agents (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  type        text not null
                check (type in ('stage_cleared','boss_cleared','level_up','farm_started',
                                'farm_stopped','agent_online','agent_offline',
                                'gold_milestone','item_found','error','info')),
  title       text not null,
  description text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_events_user_time_idx
  on public.activity_events (user_id, occurred_at desc);

-- ============================================================================
-- commands  (control queue: web → agent)
-- ============================================================================
create table if not exists public.commands (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.agents (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  command      text not null
                 check (command in ('START_FARM','STOP_FARM','SELECT_STAGE',
                                    'TAKE_SCREENSHOT','GET_STATUS','READ_SAVE')),
  params       jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
                 check (status in ('pending','sent','acknowledged','completed','failed','expired')),
  result       jsonb,
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '5 minutes'),
  completed_at timestamptz
);

create index if not exists commands_agent_status_idx
  on public.commands (agent_id, status, created_at);
create index if not exists commands_user_time_idx
  on public.commands (user_id, created_at desc);

create trigger commands_set_updated_at
  before update on public.commands
  for each row execute function public.set_updated_at();

-- ============================================================================
-- screenshots
-- ============================================================================
create table if not exists public.screenshots (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references public.agents (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  command_id   uuid references public.commands (id) on delete set null,
  storage_path text not null,
  width        int,
  height       int,
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists screenshots_user_time_idx
  on public.screenshots (user_id, captured_at desc);

-- ============================================================================
-- farm_sessions  (a continuous farming run, for analytics)
-- ============================================================================
create table if not exists public.farm_sessions (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references public.agents (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  stage_key     int,
  status        text not null default 'active'
                  check (status in ('active','completed','interrupted')),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  start_gold    bigint,
  end_gold      bigint,
  items_gained  int not null default 0,
  stages_cleared int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists farm_sessions_user_time_idx
  on public.farm_sessions (user_id, started_at desc);

create trigger farm_sessions_set_updated_at
  before update on public.farm_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- item_catalog  (static ItemKey → display info; shared reference data)
-- Not present in the save file; seed/enrich later from game data. The UI
-- falls back to showing the raw ItemKey when a row is missing.
-- ============================================================================
create table if not exists public.item_catalog (
  item_key  int primary key,
  name      text,
  name_th   text,
  rarity    text,
  slot      text,
  kind      text,
  icon_url  text,
  max_stack int,
  metadata  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- Telemetry tables are written by the agent through API routes that use the
-- service-role key (which BYPASSES RLS). So end users only ever SELECT their
-- own rows; we add no agent-insert policies here.
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.agents          enable row level security;
alter table public.save_state      enable row level security;
alter table public.save_snapshots  enable row level security;
alter table public.loot_events     enable row level security;
alter table public.activity_events enable row level security;
alter table public.commands        enable row level security;
alter table public.screenshots     enable row level security;
alter table public.farm_sessions   enable row level security;
alter table public.item_catalog    enable row level security;

-- profiles: owner read/update
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- agents: owner full control
create policy "agents_select_own" on public.agents
  for select using (auth.uid() = user_id);
create policy "agents_insert_own" on public.agents
  for insert with check (auth.uid() = user_id);
create policy "agents_update_own" on public.agents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agents_delete_own" on public.agents
  for delete using (auth.uid() = user_id);

-- read-only-for-owner telemetry tables
create policy "save_state_select_own" on public.save_state
  for select using (auth.uid() = user_id);
create policy "save_snapshots_select_own" on public.save_snapshots
  for select using (auth.uid() = user_id);
create policy "loot_events_select_own" on public.loot_events
  for select using (auth.uid() = user_id);
create policy "activity_events_select_own" on public.activity_events
  for select using (auth.uid() = user_id);
create policy "screenshots_select_own" on public.screenshots
  for select using (auth.uid() = user_id);
create policy "farm_sessions_select_own" on public.farm_sessions
  for select using (auth.uid() = user_id);

-- commands: owner reads own + issues new; status updates happen via service role
create policy "commands_select_own" on public.commands
  for select using (auth.uid() = user_id);
create policy "commands_insert_own" on public.commands
  for insert with check (auth.uid() = user_id);

-- item_catalog: any authenticated user may read; writes via service role only
create policy "item_catalog_select_all" on public.item_catalog
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- Realtime: publish the tables the dashboard subscribes to
-- ============================================================================
alter publication supabase_realtime add table public.agents;
alter publication supabase_realtime add table public.save_state;
alter publication supabase_realtime add table public.loot_events;
alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.commands;
