"use strict";

/**
 * Radar Laguna · conexión pública al proyecto Supabase real.
 *
 * Proyecto: Radar Laguna
 * Ref: wqfrlhpkdkjjhfggehlk
 * Región: us-west-1
 *
 * La Publishable Key puede incluirse en el frontend cuando RLS protege las
 * tablas. Nunca colocar aquí una service_role key.
 *
 * Paso pendiente en Dashboard:
 * Authentication > Providers > Anonymous Sign-Ins > Enable
 */
window.RADAR_SUPABASE_CONFIG = Object.freeze({
  enabled: true,
  url: "https://wqfrlhpkdkjjhfggehlk.supabase.co",
  publishableKey: "sb_publishable_EOuFeFMDB5rM2Kjq2JgS9g_t1eT-iHy",
});
