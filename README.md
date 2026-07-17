# Radar Laguna V11 · Supabase Ready

V11 integra una capa completa de sincronización con Supabase manteniendo modo local como respaldo.

## Estado de la aplicación

- Supabase conectado con sesiones anónimas.
- Reportes y votos comunitarios en tiempo real.
- Modo local como respaldo.
- Búsqueda por colonia, asentamiento y código postal.
- Geografía postal oficial de SEPOMEX con carga remota de respaldo.
- Aviso de privacidad, términos y metodología.

## Archivos principales

```text
index.html
styles.css
app.js
supabase-config.js
supabase-service.js
catalog-loader.js
assets/
data/
supabase/
```

## Estado visual

- `Modo local`: Supabase no está configurado.
- `Conectando…`: creando o recuperando la sesión anónima.
- `Sincronizando…`: descargando reportes y votos.
- `En vivo`: conectado y escuchando cambios.
- `Sin conexión`: utiliza la última caché local.

## Seguridad

- RLS activado.
- Contadores mantenidos por triggers.
- Máximo 3 reportes por sesión cada 15 minutos.
- Un voto por sesión y reporte.
- Coordenadas redondeadas en la base a aproximadamente 100 metros.

Proyecto comunitario independiente: **De un Lagunero para Laguneros ❤️**
