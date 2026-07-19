"use strict";

/**
 * Radar Laguna · conexión pública al proyecto Supabase real.
 * Proyecto: Radar Laguna · Ref: wqfrlhpkdkjjhfggehlk · Región: us-west-1
 * La Publishable Key puede incluirse en el frontend cuando RLS protege las tablas.
 */
window.RADAR_SUPABASE_CONFIG = Object.freeze({
  enabled: true,
  url: "https://wqfrlhpkdkjjhfggehlk.supabase.co",
  publishableKey: "sb_publishable_EOuFeFMDB5rM2Kjq2JgS9g_t1eT-iHy",
});

// V12 debe ejecutarse antes de app.js para interceptar la geografía postal.
document.write('<script src="./v12.js"><\/script>');
document.write('<script src="./v12-geo-compact.js"><\/script>');

// Catálogo optimizado de colonias y asentamientos.
document.write('<script src="./catalog-loader.js"><\/script>');

// Radar Laguna V13 · PWA y alertas comunitarias.
(function prepareRadarV13() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "./manifest.webmanifest";
    document.head.appendChild(manifest);
  }
  const mobileMeta = document.createElement("meta");
  mobileMeta.name = "mobile-web-app-capable";
  mobileMeta.content = "yes";
  document.head.appendChild(mobileMeta);

  window.addEventListener("load", () => {
    if (document.querySelector('script[data-radar-v13]')) return;
    const script = document.createElement("script");
    script.src = "./v13.js";
    script.dataset.radarV13 = "true";
    document.body.appendChild(script);
  }, { once: true });
})();
