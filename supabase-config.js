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

window.addEventListener("load", () => {
  const loadV132 = () => {
    if (document.querySelector('script[data-radar-v13-2]')) return;
    const script = document.createElement("script");
    script.src = "./v13-2.js";
    script.setAttribute("data-radar-v13-2", "true");
    document.body.appendChild(script);
  };

  if (document.querySelector('script[data-radar-v13-1]')) {
    loadV132();
    return;
  }

  const script = document.createElement("script");
  script.src = "./v13-1.js";
  script.setAttribute("data-radar-v13-1", "true");
  script.addEventListener("load", loadV132, { once: true });
  document.body.appendChild(script);
}, { once: true });
