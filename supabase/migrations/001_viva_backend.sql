create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_url text,
  points integer not null default 100 check (points >= 0),
  level text not null default 'Iniciante',
  appear_in_ranking boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_key text not null,
  label text not null,
  points integer not null check (points >= 0),
  is_bonus boolean not null default false,
  action_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index point_events_user_date_idx on public.point_events(user_id, action_date);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminder_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  interval_minutes integer not null default 60 check (interval_minutes in (30, 60, 90, 120)),
  start_time time not null default '08:00',
  end_time time not null default '22:00',
  timezone text not null default 'America/Sao_Paulo',
  stop_at_goal boolean not null default true,
  hydration_completed_on date,
  next_send_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.point_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.user_achievements enable row level security;

create policy "profile owner reads full profile" on public.profiles for select using (auth.uid() = id or appear_in_ranking);
create policy "profile owner updates profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "user reads own point events" on public.point_events for select using (auth.uid() = user_id);
create policy "user manages own push subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user manages own reminders" on public.reminder_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user reads own workouts" on public.workout_sessions for select using (auth.uid() = user_id);
create policy "user reads own achievements" on public.user_achievements for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, points)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Novo usuário'), 100);
  insert into public.point_events (user_id, action_key, label, points, is_bonus)
  values (new.id, 'cadastro', 'Boas-vindas ao Viva', 100, true);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace view public.leaderboard
with (security_invoker = true) as
select display_name, avatar_url, points, level
from public.profiles
where appear_in_ranking = true
order by points desc;

grant select on public.leaderboard to anon, authenticated;

-- Pontos devem ser concedidos apenas por funções de servidor. O cliente não
-- recebe permissão de INSERT em point_events, evitando manipulação direta.
