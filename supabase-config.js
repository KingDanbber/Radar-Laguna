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

/*
 * Dependencias geográficas que deben ejecutarse antes de app.js.
 * supabase-config.js se carga durante el análisis del HTML, por lo que
 * document.write conserva el orden síncrono requerido por el adaptador SHP.
 */
if (!window.__RADAR_POSTAL_BASE_LOADED__) {
  window.__RADAR_POSTAL_BASE_LOADED__ = true;
  document.write('<script src="./v12.js?v=13.2.1"><\/script>');
  document.write('<script src="./v12-geo-compact.js?v=13.2.1"><\/script>');
  document.write('<script src="./catalog-loader.js?v=13.2.1"><\/script>');
}

window.addEventListener("load", () => {
  const loadV132 = () => {
    if (document.querySelector('script[data-radar-v13-2]')) return;
    const script = document.createElement("script");
    script.src = "./v13-2.js?v=13.2.1";
    script.setAttribute("data-radar-v13-2", "true");
    document.body.appendChild(script);
  };

  if (document.querySelector('script[data-radar-v13-1]')) {
    loadV132();
    return;
  }

  const script = document.createElement("script");
  script.src = "./v13-1.js?v=13.2.1";
  script.setAttribute("data-radar-v13-1", "true");
  script.addEventListener("load", loadV132, { once: true });
  document.body.appendChild(script);
}, { once: true });
