# Radar Laguna V11 · Supabase Ready

V11 integra una capa completa de sincronización con Supabase manteniendo modo local como respaldo.

## Nuevos archivos

```text
supabase-config.js
supabase-service.js
supabase/
├── README.md
├── maintenance.sql
└── migrations/
    └── 001_radar_laguna.sql
```

## Estado visual

- `Modo local`: Supabase no está configurado.
- `Conectando…`: creando/recuperando sesión anónima.
- `Sincronizando…`: descargando reportes y votos.
- `En vivo`: conectado y escuchando cambios.
- `Sin conexión`: usa la última caché local.

## Modelo de datos

### water_reports

Contiene estado del agua, ciudad, CP, colonia, etiquetas, coordenada aproximada, fecha y contadores comunitarios.

### report_votes

Contiene una acción por usuario anónimo y reporte:

- `confirm`
- `changed`

## Seguridad

- RLS activado.
- Acceso mediante sesiones anónimas autenticadas.
- Contadores mantenidos por triggers, no por el navegador.
- Máximo 3 reportes por sesión cada 15 minutos.
- Un voto por sesión y reporte.
- Coordenadas redondeadas en la base a aproximadamente 100 metros.

Consulta `supabase/README.md` para activar la conexión.
