-- Layover: run this in the Supabase SQL editor.

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  occupation text not null,          -- what you do
  bio text not null,                 -- who you are
  hometown text not null,            -- where you belong
  current_city text not null,        -- where you live
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Journeys and legs ----------
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin_airport text not null,        -- IATA code where the whole trip starts
  final_airport text not null,         -- IATA code where the whole trip ends
  final_arrival timestamptz not null,  -- landing time at the final airport
  pool_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.legs (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  leg_index int not null,
  airline text not null,
  flight_number text not null,
  pnr_hash text not null,              -- HMAC of the PNR, never the raw PNR
  origin_airport text not null,
  destination_airport text not null,
  departure_time timestamptz not null,
  boarding_time timestamptz not null,
  arrival_time timestamptz not null,
  unique (journey_id, leg_index)
);

-- ---------- Pools ----------
-- One pool per (final airport, landing window). pool_key looks like "BLR|2026-11-19T06:00Z".
create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  pool_key text not null unique,
  airport text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.journeys
  add constraint journeys_pool_fk foreign key (pool_id) references public.pools(id);

create table if not exists public.pool_members (
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_pool_created_idx on public.messages (pool_id, created_at);

-- ---------- Helper: is the current user a member of this pool? ----------
create or replace function public.is_pool_member(p_pool uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool and user_id = auth.uid()
  );
$$;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.journeys enable row level security;
alter table public.legs enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.messages enable row level security;

-- Profiles: you can edit your own; you can read your own and those of people in a shared pool.
create policy "profiles_select_self_or_pool_mates" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.pool_members me
      join public.pool_members them on them.pool_id = me.pool_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Journeys and legs: private to the owner. Pool creation happens server-side with the service role.
create policy "journeys_select_own" on public.journeys
  for select using (user_id = auth.uid());
create policy "legs_select_own" on public.legs
  for select using (
    exists (select 1 from public.journeys j where j.id = legs.journey_id and j.user_id = auth.uid())
  );

-- Pools and members: visible to members only.
create policy "pools_select_member" on public.pools
  for select using (public.is_pool_member(id));
create policy "pool_members_select_member" on public.pool_members
  for select using (public.is_pool_member(pool_id));

-- Messages: members can read and post (as themselves).
create policy "messages_select_member" on public.messages
  for select using (public.is_pool_member(pool_id));
create policy "messages_insert_member" on public.messages
  for insert with check (user_id = auth.uid() and public.is_pool_member(pool_id));

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.messages;
