create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  city_id text not null check (city_id in ('torreon','gomez_palacio','lerdo')),
  zone_id text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  settlement_name text,
  enabled boolean not null default true,
  last_signal_level text check (last_signal_level is null or last_signal_level in ('emerging','strong')),
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alert_subscriptions_user_zone_settlement_uidx
on public.alert_subscriptions (user_id, zone_id, lower(coalesce(settlement_name, '')));

create index if not exists alert_subscriptions_user_enabled_idx
on public.alert_subscriptions (user_id, enabled);

alter table public.alert_subscriptions enable row level security;

revoke all on table public.alert_subscriptions from anon;
grant select, insert, update, delete on table public.alert_subscriptions to authenticated;

create policy "read own alert subscriptions"
on public.alert_subscriptions for select to authenticated
using (auth.uid() = user_id);

create policy "insert own alert subscriptions"
on public.alert_subscriptions for insert to authenticated
with check (auth.uid() = user_id);

create policy "update own alert subscriptions"
on public.alert_subscriptions for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own alert subscriptions"
on public.alert_subscriptions for delete to authenticated
using (auth.uid() = user_id);
