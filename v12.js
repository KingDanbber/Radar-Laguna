"use strict";

/* Radar Laguna V12 · capa postal ligera + actividad comunitaria */
(function initializeRadarV12(global) {
  const GEOJSON_PATH = "./data/laguna-postal.geojson";
  const originalShp = global.shp;
  let optimizedGeometryPromise = null;
  let communityClient = null;
  let communityStats = null;

  const GEOJSON_CHUNKS = [
    "./data/geo/laguna-postal.01.txt",
    "./data/geo/laguna-postal.02.txt",
    "./data/geo/laguna-postal.03.txt",
    "./data/geo/laguna-postal.04.txt",
    "./data/geo/laguna-postal.05.txt",
  ];

  async function decodeOptimizedGeometry() {
    const chunks = await Promise.all(
      GEOJSON_CHUNKS.map(async (path) => {
        const response = await fetch(`${path}?v=12`, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Fragmento geográfico no disponible (${response.status}).`);
        return response.text();
      })
    );

    const binary = atob(chunks.join(""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (!("DecompressionStream" in global)) {
      throw new Error("Este navegador no puede descomprimir la capa postal integrada.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }

  function loadOptimizedGeometry() {
    if (!optimizedGeometryPromise) {
      optimizedGeometryPromise = decodeOptimizedGeometry().then((collection) => {
        if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
          throw new Error("La capa postal V12 no tiene una estructura válida.");
        }
        return collection;
      });
    }
    return optimizedGeometryPromise;
  }

  if (typeof originalShp === "function") {
    global.shp = async function radarShpAdapter(source, ...args) {
      const sourceText = String(source || "");
      const isCoahuila = sourceText.includes("CP_Coah.zip");
      const isDurango = sourceText.includes("CP_Dgo.zip");

      if (isCoahuila || isDurango) {
        try {
          const collection = await loadOptimizedGeometry();
          const stateKey = isCoahuila ? "coahuila" : "durango";
          return {
            ...collection,
            features: collection.features.filter(
              (feature) => feature?.properties?.stateKey === stateKey
            ),
          };
        } catch (error) {
          console.warn("No se pudo usar la capa postal optimizada.", error);
        }
      }

      return originalShp(source, ...args);
    };
  }

  const styles = `
    .community-stats-card,.colony-summary-card{margin-top:14px;padding:18px;border:1px solid var(--border);border-radius:24px;background:var(--card);box-shadow:var(--shadow)}
    .community-stats-card{overflow:hidden;background:radial-gradient(circle at 100% 0%,color-mix(in srgb,var(--cyan) 15%,transparent),transparent 42%),var(--card)}
    .community-stats-head,.colony-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
    .community-stats-head h3,.colony-summary-head h3{margin:2px 0 0;font-size:1rem;letter-spacing:-.03em}
    .community-stats-head h3 span{color:var(--cyan);font-size:1.45rem}
    .community-stats-head p:not(.eyebrow){margin:6px 0 0;color:var(--muted);font-size:.64rem;line-height:1.45}
    .community-heart{display:grid;place-items:center;width:48px;height:48px;flex:0 0 auto;border-radius:17px;background:var(--cyan-soft);font-size:1.35rem}
    .community-stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:15px}
    .community-stats-grid article{padding:12px 8px;border:1px solid var(--border);border-radius:15px;background:color-mix(in srgb,var(--card-strong) 92%,transparent);text-align:center}
    .community-stats-grid strong,.community-stats-grid span{display:block}.community-stats-grid strong{font-size:1.08rem}.community-stats-grid span{margin-top:3px;color:var(--muted);font-size:.55rem;line-height:1.25}
    .community-city-breakdown{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}.community-city-breakdown span{padding:6px 8px;border-radius:999px;color:var(--muted);background:var(--surface-hover);font-size:.56rem;font-weight:700}.community-city-breakdown b{color:var(--text)}
    .community-estimate-note{display:block;margin-top:11px;color:var(--muted);font-size:.54rem;line-height:1.5}
    .colony-summary-head>span{flex:0 0 auto;padding:6px 8px;border-radius:999px;color:var(--cyan);background:var(--cyan-soft);font-size:.56rem;font-weight:800}
    .colony-summary-list{display:grid;gap:9px;margin-top:14px}.colony-summary-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;padding:12px;border:1px solid var(--border);border-radius:16px;background:color-mix(in srgb,var(--card-strong) 94%,transparent)}
    .colony-summary-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:13px;font-weight:900}.colony-summary-icon.no_water{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,transparent)}.colony-summary-icon.low_pressure{color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,transparent)}.colony-summary-icon.good_pressure{color:var(--good);background:color-mix(in srgb,var(--good) 10%,transparent)}
    .colony-summary-copy{min-width:0}.colony-summary-copy strong,.colony-summary-copy span,.colony-summary-copy small{display:block}.colony-summary-copy strong{overflow:hidden;font-size:.72rem;white-space:nowrap;text-overflow:ellipsis}.colony-summary-copy span{margin-top:3px;color:var(--muted);font-size:.58rem}.colony-summary-copy small{margin-top:4px;color:var(--muted);font-size:.54rem}.colony-summary-metrics{text-align:right}.colony-summary-metrics strong,.colony-summary-metrics span{display:block}.colony-summary-metrics strong{font-size:.78rem}.colony-summary-metrics span{margin-top:2px;color:var(--muted);font-size:.52rem}
    @media(max-width:420px){.community-stats-grid{gap:6px}.community-stats-card,.colony-summary-card{padding:15px}}
  `;

  function injectInterface() {
    if (!document.querySelector("#radar-v12-styles")) {
      const style = document.createElement("style");
      style.id = "radar-v12-styles";
      style.textContent = styles;
      document.head.appendChild(style);
    }

    if (!document.querySelector("#community-stats-card")) {
      document.querySelector(".summary-grid")?.insertAdjacentHTML("afterend", `
        <section class="community-stats-card" id="community-stats-card" aria-label="Actividad comunitaria de Radar Laguna">
          <div class="community-stats-head">
            <div><p class="eyebrow">COMUNIDAD ACTIVA</p><h3><span id="community-participants">—</span> laguneros participaron hoy</h3><p id="community-stats-note">Calculando la participación comunitaria…</p></div>
            <span class="community-heart" aria-hidden="true">💧</span>
          </div>
          <div class="community-stats-grid">
            <article><strong id="community-reports">—</strong><span>reportes hoy</span></article>
            <article><strong id="community-confirmations">—</strong><span>confirmaciones</span></article>
            <article><strong id="community-total">—</strong><span>reportes históricos</span></article>
          </div>
          <div class="community-city-breakdown" id="community-city-breakdown"><span>Torreón <b>—</b></span><span>Gómez Palacio <b>—</b></span><span>Lerdo <b>—</b></span></div>
          <small class="community-estimate-note">“Laguneros” representa participaciones únicas estimadas mediante sesiones anónimas; una persona puede contar de nuevo si cambia de dispositivo o elimina sus datos.</small>
        </section>
      `);
    }

    if (!document.querySelector("#colony-summary-card")) {
      document.querySelector("#zone-radar-card")?.insertAdjacentHTML("afterend", `
        <section class="colony-summary-card" id="colony-summary-card">
          <div class="colony-summary-head"><div><p class="eyebrow">RESUMEN COMUNITARIO</p><h3 id="colony-summary-title">Colonias con actividad reciente</h3></div><span id="colony-summary-context">Últimas 6 h</span></div>
          <div class="colony-summary-list" id="colony-summary-list"><p class="signals-empty">Aún no hay reportes suficientes para crear un resumen por colonia.</p></div>
        </section>
      `);
    }

    document.title = "Radar Laguna V12 | Radar de Agua";
    document.querySelectorAll(".app-footer > p").forEach((element) => {
      element.textContent = "Proyecto comunitario independiente · Uso informativo · V12";
    });
    const infoVersion = document.querySelector("#info-modal .sheet-header h3");
    if (infoVersion) infoVersion.textContent = "Radar Laguna V12";
  }

  function formatMetric(value) {
    return Number(value || 0).toLocaleString("es-MX");
  }

  function renderCommunityStats() {
    const participants = document.querySelector("#community-participants");
    if (!participants) return;

    if (!communityStats) {
      document.querySelector("#community-stats-note").textContent = "Actualizando estadísticas comunitarias…";
      return;
    }

    participants.textContent = formatMetric(communityStats.participants_24h);
    document.querySelector("#community-reports").textContent = formatMetric(communityStats.reports_24h);
    document.querySelector("#community-confirmations").textContent = formatMetric(communityStats.confirmations_24h);
    document.querySelector("#community-total").textContent = formatMetric(communityStats.total_reports);
    document.querySelector("#community-stats-note").textContent = Number(communityStats.reports_24h)
      ? "Gracias por ayudar a hacer visible el estado del agua en La Laguna. ❤️"
      : "Sé la primera persona en compartir cómo está el agua hoy.";
    document.querySelector("#community-city-breakdown").innerHTML = `
      <span>Torreón <b>${formatMetric(communityStats.torreon_reports_24h)}</b></span>
      <span>Gómez Palacio <b>${formatMetric(communityStats.gomez_reports_24h)}</b></span>
      <span>Lerdo <b>${formatMetric(communityStats.lerdo_reports_24h)}</b></span>`;
  }

  async function refreshCommunityStats() {
    try {
      if (!communityClient) {
        const config = global.RADAR_SUPABASE_CONFIG || {};
        if (!config.enabled || !global.supabase?.createClient) return;
        communityClient = global.supabase.createClient(config.url, config.publishableKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
        });
      }

      const { data: sessionData } = await communityClient.auth.getSession();
      if (!sessionData.session) return;
      const { data, error } = await communityClient.rpc("get_community_stats");
      if (error) throw error;
      communityStats = Array.isArray(data) ? data[0] : data;
      renderCommunityStats();
    } catch (error) {
      console.warn("No se pudieron actualizar las estadísticas V12.", error);
      const note = document.querySelector("#community-stats-note");
      if (note) note.textContent = "Las estadísticas aparecerán cuando la conexión esté disponible.";
    }
  }

  function renderColonySummary() {
    const list = document.querySelector("#colony-summary-list");
    if (!list || typeof getCurrentCityReports !== "function") return;

    const cityReports = getCurrentCityReports();
    const selectedZone = getZoneById(selectedZoneId);
    const contextReports = selectedZone ? getReportsForZone(selectedZone.id, cityReports) : cityReports;
    document.querySelector("#colony-summary-title").textContent = selectedZone ? `Actividad dentro del CP ${selectedZone.postalCode}` : "Colonias con actividad reciente";
    document.querySelector("#colony-summary-context").textContent = selectedZone ? `${contextReports.length} reportes` : "Últimas 6 h";

    const groups = new Map();
    contextReports.forEach((report) => {
      const location = getReportLocationText(report);
      const label = report.settlement || location.primary;
      const key = normalizeSearchText(label);
      if (!groups.has(key)) groups.set(key, { label, postalCode: report.postalCode || getZoneById(report.zoneId)?.postalCode || "", reports: [] });
      groups.get(key).reports.push(report);
    });

    const summaries = [...groups.values()].map((group) => {
      const analysis = getRadarAnalysis(group.reports);
      const confirmations = group.reports.reduce((sum, report) => sum + report.confirmCount, 0);
      const latest = [...group.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return { ...group, analysis, confirmations, latest };
    }).sort((a, b) => b.reports.length - a.reports.length || b.confirmations - a.confirmations).slice(0, selectedZone ? 6 : 4);

    if (!summaries.length) {
      list.innerHTML = '<p class="signals-empty">Aún no hay reportes recientes suficientes para crear un resumen por colonia.</p>';
      return;
    }

    list.innerHTML = summaries.map((summary) => {
      const status = summary.analysis.predominantStatus || "low_pressure";
      const config = STATUS_CONFIG[status];
      return `<article class="colony-summary-item"><span class="colony-summary-icon ${escapeHtml(status)}">${escapeHtml(config.icon)}</span><div class="colony-summary-copy"><strong>${escapeHtml(summary.label)}</strong><span>${escapeHtml(config.label)}${summary.postalCode ? ` · CP ${escapeHtml(summary.postalCode)}` : ""}</span><small>Última señal ${escapeHtml(getRelativeTime(summary.latest.createdAt).toLocaleLowerCase("es-MX"))} · 👍 ${summary.confirmations}</small></div><div class="colony-summary-metrics"><strong>${summary.reports.length}</strong><span>${summary.reports.length === 1 ? "reporte" : "reportes"}</span></div></article>`;
    }).join("");
  }

  function updateGeographyLabel() {
    if (typeof geoLoadState !== "undefined" && geoLoadState === "ready" && Array.isArray(postalZones) && postalZones.length) {
      const title = document.querySelector("#geo-status-title");
      const detail = document.querySelector("#geo-status-detail");
      const badge = document.querySelector("#geo-native-badge");
      if (title) title.textContent = "Geografía postal optimizada lista";
      if (detail) detail.textContent = `${getCurrentCityZones().length} zonas postales en ${getCurrentCity().name} · GeoJSON local ligero`;
      badge?.classList.remove("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectInterface();

    if (typeof renderReports === "function") {
      const originalRenderReports = renderReports;
      renderReports = function renderReportsV12() {
        originalRenderReports();
        updateGeographyLabel();
        renderColonySummary();
        renderCommunityStats();
      };
      renderReports();
    }

    setTimeout(refreshCommunityStats, 1200);
    setInterval(refreshCommunityStats, 60000);
  });
})(window);
