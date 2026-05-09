-- PomoFight Supabase schema
-- Run in the Supabase SQL editor for a new project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  rank integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  total_pomodoros integer not null default 0,
  current_goal text,
  home_tree integer not null default 1,
  profile_icon text,
  status_badge text not null default 'seed',
  push_token text,
  win_streak integer not null default 0,
  last_win_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  theme text,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'cancelled')),
  invite_code text,
  room_name text,
  max_players integer not null default 2 check (max_players between 2 and 8),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rooms_waiting_invite_code_idx
  on public.rooms(invite_code)
  where invite_code is not null and status = 'waiting';

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

create table if not exists public.pomodoro_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  log_text text,
  focus_score integer check (focus_score between 1 and 5),
  duration_minutes integer not null default 25,
  created_at timestamptz not null default now()
);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

create or replace function public.increment_pomodoro(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() <> user_id then
    raise exception 'not allowed';
  end if;

  update public.profiles
  set total_pomodoros = total_pomodoros + 1
  where id = user_id;
end;
$$;

create or replace function public.record_battle_result(p_user_id uuid, p_is_win boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  base_change integer;
  combo_bonus integer := 0;
  first_bonus integer := 0;
  new_streak integer := 0;
  today date := timezone('Asia/Tokyo', now())::date;
begin
  if auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  if p_is_win then
    base_change := 20;

    select coalesce(win_streak, 0) + 1
    into new_streak
    from public.profiles
    where id = p_user_id;

    if new_streak >= 2 then
      combo_bonus := least(30, (new_streak - 1) * 5);
    end if;

    if not exists (
      select 1 from public.profiles
      where id = p_user_id and last_win_date = today
    ) then
      first_bonus := 10;
    end if;

    update public.profiles
    set wins = wins + 1,
        win_streak = new_streak,
        last_win_date = today,
        rank = greatest(0, rank + base_change + combo_bonus + first_bonus)
    where id = p_user_id;
  else
    base_change := -10;
    update public.profiles
    set losses = losses + 1,
        win_streak = 0,
        rank = greatest(0, rank + base_change)
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'base', base_change,
    'combo_bonus', combo_bonus,
    'first_bonus', first_bonus,
    'streak', new_streak,
    'total', base_change + combo_bonus + first_bonus
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.pomodoro_logs enable row level security;
alter table public.friends enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "rooms are readable" on public.rooms;
create policy "rooms are readable" on public.rooms
for select using (true);

drop policy if exists "users create own rooms" on public.rooms;
create policy "users create own rooms" on public.rooms
for insert with check (auth.uid() = host_id);

drop policy if exists "hosts update rooms" on public.rooms;
create policy "hosts update rooms" on public.rooms
for update using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "participants activate rooms" on public.rooms;
create policy "participants activate rooms" on public.rooms
for update using (
  exists (
    select 1 from public.room_players rp
    where rp.room_id = rooms.id and rp.player_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.room_players rp
    where rp.room_id = rooms.id and rp.player_id = auth.uid()
  )
);

drop policy if exists "hosts delete waiting rooms" on public.rooms;
create policy "hosts delete waiting rooms" on public.rooms
for delete using (auth.uid() = host_id and status = 'waiting');

drop policy if exists "room players are readable" on public.room_players;
create policy "room players are readable" on public.room_players
for select using (true);

drop policy if exists "users join as themselves" on public.room_players;
create policy "users join as themselves" on public.room_players
for insert with check (auth.uid() = player_id);

drop policy if exists "users update own room player" on public.room_players;
create policy "users update own room player" on public.room_players
for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

drop policy if exists "users delete own room player" on public.room_players;
create policy "users delete own room player" on public.room_players
for delete using (auth.uid() = player_id);

drop policy if exists "hosts delete room players" on public.room_players;
create policy "hosts delete room players" on public.room_players
for delete using (
  exists (
    select 1 from public.rooms r
    where r.id = room_players.room_id and r.host_id = auth.uid()
  )
);

drop policy if exists "pomodoro logs are readable" on public.pomodoro_logs;
create policy "pomodoro logs are readable" on public.pomodoro_logs
for select using (true);

drop policy if exists "users write own logs" on public.pomodoro_logs;
create policy "users write own logs" on public.pomodoro_logs
for insert with check (auth.uid() = user_id);

drop policy if exists "users read own friendships" on public.friends;
create policy "users read own friendships" on public.friends
for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "users create friend requests" on public.friends;
create policy "users create friend requests" on public.friends
for insert with check (auth.uid() = user_id);

drop policy if exists "users update received friend requests" on public.friends;
create policy "users update received friend requests" on public.friends
for update using (auth.uid() = friend_id) with check (auth.uid() = friend_id);

drop policy if exists "users delete own friend rows" on public.friends;
create policy "users delete own friend rows" on public.friends
for delete using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "users create reports" on public.reports;
create policy "users create reports" on public.reports
for insert with check (auth.uid() = reporter_id);

drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports
for select using (auth.uid() = reporter_id);
