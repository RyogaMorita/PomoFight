alter table public.profiles
add column if not exists pomo_streak integer not null default 0;

alter table public.profiles
add column if not exists last_pomo_date date;

alter table public.rooms
add column if not exists rated boolean not null default false;

alter table public.rooms
add column if not exists match_type text not null default 'friend';

alter table public.pomodoro_logs
add column if not exists match_type text not null default 'unknown';

alter table public.pomodoro_logs
add column if not exists rated boolean not null default false;

update public.rooms
set match_type = case
  when is_public then 'public'
  when invite_code is not null then 'friend'
  else 'random'
end
where match_type is null or match_type = 'friend';

update public.rooms
set rated = (match_type = 'random')
where rated is null;

create or replace function public.increment_pomodoro(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := timezone('Asia/Tokyo', now())::date;
begin
  if auth.uid() <> user_id then
    raise exception 'not allowed';
  end if;

  update public.profiles
  set total_pomodoros = total_pomodoros + 1,
      pomo_streak = case
        when last_pomo_date = today then pomo_streak
        when last_pomo_date = today - 1 then pomo_streak + 1
        else 1
      end,
      last_pomo_date = today
  where id = user_id;
end;
$$;
