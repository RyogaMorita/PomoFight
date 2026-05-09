alter table public.profiles
add column if not exists status_badge text not null default 'first_pomo';

alter table public.profiles
alter column status_badge set default 'first_pomo';

update public.profiles
set status_badge = 'first_pomo'
where status_badge = 'seed';
