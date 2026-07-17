# Conectar Radar Laguna V11 a Supabase

## 1. Crear o elegir proyecto

Crea un proyecto dedicado, por ejemplo `Radar Laguna`.

## 2. Ejecutar la migración

Abre **SQL Editor** y ejecuta:

```text
supabase/migrations/001_radar_laguna.sql
```

La migración crea:

- `water_reports`
- `report_votes`
- Row Level Security
- límites básicos anti-spam
- triggers protegidos para contadores
- Realtime en `water_reports`

## 3. Activar usuarios anónimos

En Supabase Dashboard:

```text
Authentication → Providers → Anonymous Sign-Ins → Enable
```

Para un lanzamiento público, activa también CAPTCHA/Cloudflare Turnstile para reducir abuso.

## 4. Obtener credenciales públicas

Copia:

- Project URL
- Publishable Key (`sb_publishable_...`)

No uses `service_role` en el navegador.

## 5. Editar `supabase-config.js`

```js
window.RADAR_SUPABASE_CONFIG = Object.freeze({
  enabled: true,
  url: "https://TU-REF.supabase.co",
  publishableKey: "sb_publishable_...",
});
```

## 6. Probar

Abre la app desde HTTPS o servidor local.

El indicador superior debe cambiar:

```text
Conectando… → Sincronizando… → En vivo
```

## Seguridad incluida

- Cada sesión anónima recibe un `auth.uid()`.
- Solo una sesión autenticada puede insertar.
- Cada persona solo puede votar una vez por reporte.
- Los clientes no pueden modificar contadores.
- La base limita a 3 reportes cada 15 minutos por sesión.
- Las coordenadas se redondean a 3 decimales antes de almacenarse.
- El navegador nunca recibe una llave administrativa.

## Evolución recomendada

Postgres Changes es adecuado para el MVP. Cuando aumente el tráfico, migra a Supabase Realtime Broadcast con canales privados.


## Proyecto conectado

- Nombre: Radar Laguna
- Project ref: `wqfrlhpkdkjjhfggehlk`
- URL: `https://wqfrlhpkdkjjhfggehlk.supabase.co`
- Región: `us-west-1`
- Migración aplicada: `initial_radar_laguna_schema`
- Seguridad adicional aplicada: `secure_internal_trigger_functions`
- Realtime: activo para `public.water_reports`
- Auditoría de seguridad: sin advertencias después de la corrección

### Paso manual necesario

Activa usuarios anónimos desde:

`Authentication > Providers > Anonymous Sign-Ins`

Sin ese ajuste la app conservará el modo local, pero no podrá crear la sesión anónima necesaria para publicar y votar en Supabase.
