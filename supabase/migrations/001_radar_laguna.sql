-- Radar Laguna V11 · esquema inicial Supabase
-- Ejecutar una sola vez en SQL Editor o como migración.

begin;

create extension if not exists pgcrypto;

create table if not exists public.water_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null,
  city_id text not null check (city_id in ('torreon', 'gomez_palacio', 'lerdo')),
  zone_id text,
  postal_code text check (postal_code is null or postal_code ~ '^\d{5}$'),
  zone_label text check (zone_label is null or char_length(zone_label) <= 120),
  settlement_name text check (settlement_name is null or char_length(settlement_name) <= 120),
  settlement_type text check (settlement_type is null or char_length(settlement_type) <= 80),
  status text not null check (status in ('no_water', 'low_pressure', 'good_pressure')),
  tags text[] not null default '{}',
  latitude numeric(8,5) not null check (latitude between -90 and 90),
  longitude numeric(8,5) not null check (longitude between -180 and 180),
  confirm_count integer not null default 0 check (confirm_count >= 0),
  change_count integer not null default 0 check (change_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint water_reports_max_five_tags check (cardinality(tags) <= 5),
  constraint water_reports_allowed_tags check (
    tags <@ array[
      'corte_total','desde_madrugada','intermitente','sin_aviso',
      'tinaco_vacio','varias_cuadras','requiere_bomba','solo_de_noche',
      'solo_mananas','agua_turbia','no_sube_tinaco','presion_variable',
      'presion_estable','llenando_tinaco','regreso_agua','mejoro_hoy',
      'agua_clara','sin_bomba'
    ]::text[]
  )
);

create table if not exists public.report_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.water_reports(id) on delete cascade,
  voter_id uuid not null,
  vote_type text not null check (vote_type in ('confirm', 'changed')),
  created_at timestamptz not null default now(),
  constraint report_votes_one_per_user unique (report_id, voter_id)
);

create index if not exists water_reports_created_at_idx
  on public.water_reports (created_at desc);
create index if not exists water_reports_city_created_idx
  on public.water_reports (city_id, created_at desc);
create index if not exists water_reports_zone_created_idx
  on public.water_reports (zone_id, created_at desc);
create index if not exists water_reports_reported_by_created_idx
  on public.water_reports (reported_by, created_at desc);
create index if not exists report_votes_report_id_idx
  on public.report_votes (report_id);
create index if not exists report_votes_voter_id_idx
  on public.report_votes (voter_id);

create or replace function public.prepare_water_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.reported_by <> auth.uid() then
    raise exception 'El reporte debe pertenecer a la sesión autenticada.'
      using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.water_reports
    where reported_by = auth.uid()
      and created_at >= now() - interval '15 minutes'
  ) >= 3 then
    raise exception 'Límite temporal alcanzado. Espera antes de publicar otro reporte.'
      using errcode = 'P0001';
  end if;

  -- Minimización de ubicación: la base guarda una coordenada aproximada
  -- (~100 m), no la precisión completa entregada por el GPS.
  new.latitude := round(new.latitude, 3);
  new.longitude := round(new.longitude, 3);
  new.confirm_count := 0;
  new.change_count := 0;
  new.created_at := now();
  new.updated_at := now();

  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.refresh_report_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_report_id uuid;
begin
  target_report_id := coalesce(new.report_id, old.report_id);

  update public.water_reports
  set
    confirm_count = (
      select count(*)
      from public.report_votes
      where report_id = target_report_id
        and vote_type = 'confirm'
    ),
    change_count = (
      select count(*)
      from public.report_votes
      where report_id = target_report_id
        and vote_type = 'changed'
    ),
    updated_at = now()
  where id = target_report_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.validate_report_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.voter_id <> auth.uid() then
    raise exception 'El voto debe pertenecer a la sesión autenticada.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.water_reports
    where id = new.report_id
      and created_at >= now() - interval '24 hours'
  ) then
    raise exception 'Este reporte ya no admite votos.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS water_reports_prepare_trigger ON public.water_reports;
create trigger water_reports_prepare_trigger
before insert on public.water_reports
for each row execute function public.prepare_water_report();

DROP TRIGGER IF EXISTS water_reports_touch_trigger ON public.water_reports;
create trigger water_reports_touch_trigger
before update on public.water_reports
for each row execute function public.touch_updated_at();

DROP TRIGGER IF EXISTS report_votes_validate_trigger ON public.report_votes;
create trigger report_votes_validate_trigger
before insert on public.report_votes
for each row execute function public.validate_report_vote();

DROP TRIGGER IF EXISTS report_votes_counts_insert_trigger ON public.report_votes;
create trigger report_votes_counts_insert_trigger
after insert on public.report_votes
for each row execute function public.refresh_report_vote_counts();

DROP TRIGGER IF EXISTS report_votes_counts_delete_trigger ON public.report_votes;
create trigger report_votes_counts_delete_trigger
after delete on public.report_votes
for each row execute function public.refresh_report_vote_counts();

alter table public.water_reports enable row level security;
alter table public.report_votes enable row level security;

DROP POLICY IF EXISTS "Authenticated users can read reports" ON public.water_reports;
create policy "Authenticated users can read reports"
on public.water_reports
for select
to authenticated
using (created_at >= now() - interval '7 days');

DROP POLICY IF EXISTS "Authenticated users can create own reports" ON public.water_reports;
create policy "Authenticated users can create own reports"
on public.water_reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and reported_by = (select auth.uid())
);

DROP POLICY IF EXISTS "Users can read own votes" ON public.report_votes;
create policy "Users can read own votes"
on public.report_votes
for select
to authenticated
using (
  auth.uid() is not null
  and voter_id = (select auth.uid())
);

DROP POLICY IF EXISTS "Users can create own votes" ON public.report_votes;
create policy "Users can create own votes"
on public.report_votes
for insert
to authenticated
with check (
  auth.uid() is not null
  and voter_id = (select auth.uid())
);

revoke all on public.water_reports from anon;
revoke all on public.report_votes from anon;
revoke all on public.water_reports from authenticated;
revoke all on public.report_votes from authenticated;

grant select, insert on public.water_reports to authenticated;
grant select, insert on public.report_votes to authenticated;

-- Activar Postgres Changes sin duplicar la tabla en la publicación.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'water_reports'
  ) then
    alter publication supabase_realtime add table public.water_reports;
  end if;
end
$$;

commit;
