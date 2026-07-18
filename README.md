# Radar Laguna V12

Radar de Agua comunitario para Torreón, Gómez Palacio y Lerdo, conectado a Supabase y desplegado en Vercel.

## Novedades V12

### Geografía postal optimizada

- 236 zonas postales reales de la Región Lagunera.
- Torreón: 142 zonas.
- Gómez Palacio: 56 zonas.
- Lerdo: 38 zonas.
- La capa se distribuye como un recurso local comprimido de aproximadamente 15 KB.
- Ya no depende de descargar los SHP estatales completos durante cada visita.
- Si la capa optimizada falla, la aplicación conserva el respaldo oficial remoto.

### Comunidad activa

V12 muestra métricas agregadas de Supabase:

- Participaciones únicas estimadas durante las últimas 24 horas.
- Reportes publicados hoy.
- Confirmaciones comunitarias.
- Reportes históricos.
- Actividad diaria por ciudad.

El número de “laguneros” se calcula mediante sesiones anónimas distintas. Es una estimación: una misma persona puede contar nuevamente si cambia de dispositivo o elimina su sesión.

### Resumen por colonia

La aplicación agrupa los reportes recientes por colonia o zona postal y muestra:

- Estado predominante.
- Código postal.
- Número de reportes.
- Confirmaciones.
- Momento de la última señal.

## Archivos V12

```text
v12.js
v12-geo-compact.js
data/geo/laguna-postal.compact.txt
supabase/migrations/002_community_stats.sql
```

## Supabase

- Sesiones anónimas.
- RLS.
- Reportes y votos en tiempo real.
- Un voto por sesión y reporte.
- Límite de reportes para reducir abuso.
- Función agregada `get_community_stats()` accesible únicamente para sesiones autenticadas.

## Privacidad

Radar Laguna no muestra identificadores anónimos individuales. El contador únicamente presenta cifras agregadas. La ubicación continúa siendo opcional y se usa con fines informativos para localizar el reporte dentro de una zona postal.

Proyecto comunitario independiente: **De un Lagunero para Laguneros ❤️**
