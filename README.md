# Radar Laguna V13

V13 incorpora una PWA instalable y alertas comunitarias por colonia o código postal.

## PWA

- `manifest.webmanifest`
- `service-worker.js`
- iconos 192, 512 y maskable
- pantalla sin conexión
- caché del shell, GeoJSON postal y catálogo de asentamientos
- botón de instalación cuando el navegador emite `beforeinstallprompt`

## Alertas de restablecimiento

El usuario puede seleccionar una colonia o todo un código postal y activar una alerta. La suscripción se guarda en Supabase mediante la tabla `alert_subscriptions`.

La app analiza reportes recientes con la misma lógica prudente de V5:

- reportes previos problemáticos
- nuevas señales de buena presión
- etiquetas `Regresó el agua`, `Llenando tinaco` o `Presión estable`
- votos `Ya cambió`
- confirmaciones y recencia

## Limitación honesta

V13 muestra notificaciones cuando la aplicación está abierta, instalada o conservada en segundo plano. Una recepción garantizada con la aplicación completamente cerrada requiere Web Push de servidor, claves VAPID y una función programada, que no se presenta como implementada en esta versión.

## Migración

Ejecutar `supabase/migrations/003_alert_subscriptions.sql`.
