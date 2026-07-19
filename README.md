# Radar Laguna V13.1

V13.1 reorganiza la experiencia móvil sin cambiar la ventana activa del radar.

## Centro de control en el header

El icono de campana reúne:

- Instalación PWA.
- Permiso opcional de notificaciones.
- Creación y administración de alertas por colonia o CP.
- Historial comunitario de reportes.

Las tarjetas grandes de instalación y alertas fueron retiradas del flujo principal.

## Historial y caducidad

Los reportes siguen almacenados en Supabase. La señal activa conserva una ventana de seis horas para evitar que información antigua coloree el mapa actual.

El historial muestra:

- Estado y colonia.
- Etiquetas originales.
- Confirmaciones y cambios.
- `Señal caducada` cuando supera seis horas.
- Indicador `Tu reporte` cuando pertenece a la sesión anónima actual.
- Botón `Actualizar estado` para reutilizar ubicación, colonia, estado y etiquetas.

## Privacidad

Instalación, ubicación y notificaciones continúan siendo opcionales. Las alertas solamente guardan la zona elegida y el identificador técnico anónimo necesario para administrarlas.
