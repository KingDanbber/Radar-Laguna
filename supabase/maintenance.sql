-- Radar Laguna · mantenimiento opcional
-- Revisar antes de automatizar en producción.

-- 1) Eliminar votos muy antiguos (los reportes actuales solo usan una ventana corta).
delete from public.report_votes
where created_at < now() - interval '90 days';

-- 2) Eliminar reportes muy antiguos, si no se desean estadísticas históricas.
-- delete from public.water_reports
-- where created_at < now() - interval '180 days';

-- 3) Los usuarios anónimos de Supabase Auth no se limpian automáticamente.
-- Antes de borrar auth.users, define si deseas conservar reportes/votos históricos
-- y prueba la estrategia en un proyecto de desarrollo.
