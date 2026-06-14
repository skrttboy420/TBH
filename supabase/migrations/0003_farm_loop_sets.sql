-- ============================================================================
-- TBH Companion — farm loop sets
--
-- A user-defined, saved plan for an idle-farming loop: an ordered list of stages
-- each with a target number of rounds, plus a live "current step" pointer and a
-- per-stage round counter the player bumps as they loop. Replaces the removed
-- auto stage-selection. The game can't be driven by injected input, so this is a
-- manual ledger the player checks/updates while AFK farming, so they never lose
-- track of which stage they're on or how many rounds they've looped.
--
-- Both tables carry user_id (denormalized on steps) so RLS is the same trivial
-- `auth.uid() = user_id` owner check used elsewhere. These are user-owned and
-- written only by the signed-in user, never by the agent.
-- ============================================================================

-- ── farm_loop_sets (one named loop plan) ────────────────────────────────────
create table if not exists public.farm_loop_sets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  description     text,
  current_step_id uuid,                    -- FK added after steps table exists
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists farm_loop_sets_user_idx
  on public.farm_loop_sets (user_id, created_at desc);

create trigger farm_loop_sets_set_updated_at
  before update on public.farm_loop_sets
  for each row execute function public.set_updated_at();

-- ── farm_loop_steps (ordered stages within a set) ───────────────────────────
create table if not exists public.farm_loop_steps (
  id               uuid primary key default gen_random_uuid(),
  set_id           uuid not null references public.farm_loop_sets (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  stage_key        int  not null,          -- encoded difficulty*1000 + act*100 + stage
  target_rounds    int  not null default 1  check (target_rounds  >= 1),
  completed_rounds int  not null default 0  check (completed_rounds >= 0),
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists farm_loop_steps_set_idx
  on public.farm_loop_steps (set_id, sort_order);
create index if not exists farm_loop_steps_user_idx
  on public.farm_loop_steps (user_id);

-- current_step_id → steps (deferred: steps table must exist first).
-- on delete set null so removing a step never orphans the pointer.
alter table public.farm_loop_sets
  drop constraint if exists farm_loop_sets_current_step_fk;
alter table public.farm_loop_sets
  add constraint farm_loop_sets_current_step_fk
  foreign key (current_step_id) references public.farm_loop_steps (id) on delete set null;

-- ── RLS: owner full control ─────────────────────────────────────────────────
alter table public.farm_loop_sets  enable row level security;
alter table public.farm_loop_steps enable row level security;

create policy "farm_loop_sets_select_own" on public.farm_loop_sets
  for select using (auth.uid() = user_id);
create policy "farm_loop_sets_insert_own" on public.farm_loop_sets
  for insert with check (auth.uid() = user_id);
create policy "farm_loop_sets_update_own" on public.farm_loop_sets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "farm_loop_sets_delete_own" on public.farm_loop_sets
  for delete using (auth.uid() = user_id);

create policy "farm_loop_steps_select_own" on public.farm_loop_steps
  for select using (auth.uid() = user_id);
create policy "farm_loop_steps_insert_own" on public.farm_loop_steps
  for insert with check (auth.uid() = user_id);
create policy "farm_loop_steps_update_own" on public.farm_loop_steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "farm_loop_steps_delete_own" on public.farm_loop_steps
  for delete using (auth.uid() = user_id);
