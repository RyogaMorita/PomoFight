alter table public.profiles
add column if not exists status_badge text not null default 'seed';
