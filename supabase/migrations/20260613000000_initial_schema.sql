-- Baseline initial schema — plan §6 (Postgres on Supabase, project pzlvsljladbymdgtxger).
-- Reference data is written only by the ingestion service (service_role, bypasses RLS);
-- clients read with the anon key under the policies below.

create type favourite_entity_type as enum ('player', 'tournament', 'match');
create type notification_kind as enum ('scheduled', 'starting', 'started', 'set', 'result', 'brief');
create type notification_channel as enum ('push', 'email');
create type user_plan as enum ('free', 'plus', 'pro');

-- Reference core (ids come from the data provider)

create table public.players (
  id bigint primary key,
  tour text not null,
  name text not null,
  country text,
  plays text,
  current_rank integer,
  raw jsonb,
  synced_at timestamptz not null default now()
);

create table public.tournaments (
  id bigint primary key,
  name text not null,
  tier text,
  surface text,
  location text,
  start_date date,
  end_date date,
  raw jsonb
);

create table public.fixtures (
  id bigint primary key,
  api_source text not null default 'rapidapi-tennis',
  tournament_id bigint references public.tournaments (id),
  round_id integer,
  p1_id bigint references public.players (id),
  p2_id bigint references public.players (id),
  scheduled_utc timestamptz,
  status text not null default 'scheduled',
  seeds jsonb,
  unique (api_source, id)
);

create index fixtures_scheduled_utc_idx on public.fixtures (scheduled_utc);
create index fixtures_tournament_idx on public.fixtures (tournament_id);

create table public.match_results (
  fixture_id bigint primary key references public.fixtures (id),
  winner_id bigint references public.players (id),
  score_text text,
  sets jsonb,
  duration_minutes integer,
  stats jsonb
);

-- Weekly snapshots accumulate the proprietary ranking-history asset (plan §6):
-- the provider serves rankings only per date; sparklines and career-high
-- callouts need our own archive, which a later copycat cannot backfill.
create table public.ranking_snapshots (
  player_id bigint not null references public.players (id),
  tour text not null,
  ranking_date date not null,
  position integer not null,
  points integer not null,
  primary key (player_id, tour, ranking_date)
);

-- Point-by-point archive; partition/Timescale when PBP storage lands (plan §6).
create table public.point_events (
  fixture_id bigint not null references public.fixtures (id),
  seq integer not null,
  ts timestamptz not null,
  payload jsonb not null,
  primary key (fixture_id, seq)
);

-- User data (RLS on every table — CLAUDE.md: Security)

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  apple_sub text,
  -- IANA zone, never a fixed offset — DST-safe (plan §7)
  tz text not null default 'Australia/Sydney',
  locale text,
  quiet_hours_start time not null default '23:00',
  quiet_hours_end time not null default '07:00',
  brief_local_time time not null default '07:00',
  plan user_plan not null default 'free'
);

create table public.favourites (
  user_id uuid not null references public.users (id) on delete cascade,
  entity_type favourite_entity_type not null,
  entity_id bigint not null,
  notif_prefs jsonb not null default '{}',
  primary key (user_id, entity_type, entity_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null,
  push_token text,
  live_activity_token text,
  tz_at_register text
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  fixture_id bigint references public.fixtures (id),
  kind notification_kind not null,
  send_after_utc timestamptz,
  sent_at timestamptz,
  channel notification_channel not null,
  -- Idempotency: at-least-once delivery + unique dedupe key = never double-fire (plan §7)
  dedupe_key text not null unique
);

create index notifications_due_idx on public.notifications (send_after_utc) where sent_at is null;

-- Row-level security

alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.fixtures enable row level security;
alter table public.match_results enable row level security;
alter table public.ranking_snapshots enable row level security;
alter table public.point_events enable row level security;
alter table public.users enable row level security;
alter table public.favourites enable row level security;
alter table public.devices enable row level security;
alter table public.notifications enable row level security;

-- Reference data: world-readable; writes arrive only via service_role.
create policy "players are world readable" on public.players for select using (true);
create policy "tournaments are world readable" on public.tournaments for select using (true);
create policy "fixtures are world readable" on public.fixtures for select using (true);
create policy "match results are world readable" on public.match_results for select using (true);
create policy "ranking snapshots are world readable" on public.ranking_snapshots for select using (true);
create policy "point events are world readable" on public.point_events for select using (true);

-- User data: owners only.
create policy "users read own row" on public.users for select using (auth.uid() = id);
create policy "users insert own row" on public.users for insert with check (auth.uid() = id);
create policy "users update own row" on public.users for update using (auth.uid() = id);

create policy "favourites owned" on public.favourites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "devices owned" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications readable by owner" on public.notifications
  for select using (auth.uid() = user_id);
