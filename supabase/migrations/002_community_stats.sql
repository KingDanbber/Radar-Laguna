-- Radar Laguna V12 · estadísticas comunitarias agregadas
begin;

create or replace function public.get_community_stats()
returns table (
  participants_24h bigint,
  reports_24h bigint,
  confirmations_24h bigint,
  changes_24h bigint,
  total_reports bigint,
  torreon_reports_24h bigint,
  gomez_reports_24h bigint,
  lerdo_reports_24h bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(distinct reported_by) filter (
      where created_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where created_at >= now() - interval '24 hours'
    ),
    (
      select count(*)
      from public.report_votes
      where vote_type = 'confirm'
        and created_at >= now() - interval '24 hours'
    ),
    (
      select count(*)
      from public.report_votes
      where vote_type = 'changed'
        and created_at >= now() - interval '24 hours'
    ),
    count(*),
    count(*) filter (
      where city_id = 'torreon'
        and created_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where city_id = 'gomez_palacio'
        and created_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where city_id = 'lerdo'
        and created_at >= now() - interval '24 hours'
    )
  from public.water_reports;
$$;

revoke all on function public.get_community_stats() from public, anon;
grant execute on function public.get_community_stats() to authenticated;

commit;
