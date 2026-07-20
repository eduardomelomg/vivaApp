create table if not exists public.user_backups (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{"version":1,"entries":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_backups enable row level security;

drop policy if exists "users read own viva backup" on public.user_backups;
create policy "users read own viva backup"
on public.user_backups for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users create own viva backup" on public.user_backups;
create policy "users create own viva backup"
on public.user_backups for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users update own viva backup" on public.user_backups;
create policy "users update own viva backup"
on public.user_backups for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_user_backup_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_backup_updated_at on public.user_backups;
create trigger touch_user_backup_updated_at
before update on public.user_backups
for each row execute function public.touch_user_backup_updated_at();
