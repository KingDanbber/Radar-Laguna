"use strict";

/* Radar Laguna V13.3 · clima compacto para Torreón, Gómez Palacio y Lerdo. */
(() => {
  const VERSION = "13.3.0";
  const API_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  const CACHE_KEY = "radarLagunaWeatherV13_3";
  const CACHE_TTL_MS = 20 * 60 * 1000;
  const MAX_STALE_MS = 6 * 60 * 60 * 1000;
  const AUTO_REFRESH_MS = 30 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 9000;

  const CITIES = Object.freeze([
    { id: "torreon", name: "Torreón", latitude: 25.5439, longitude: -103.4190 },
    { id: "gomez_palacio", name: "Gómez Palacio", latitude: 25.5891, longitude: -103.4859 },
    { id: "lerdo", name: "Lerdo", latitude: 25.5447, longitude: -103.5263 },
  ]);

  let weatherState = null;
  let isLoading = false;
  let refreshTimer = null;
  let activeCityObserver = null;

  function injectPreconnect() {
    if (document.querySelector('link[href="https://api.open-meteo.com"]')) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = "https://api.open-meteo.com";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }

  function injectStyles() {
    if (document.querySelector("#radar-v13-3-weather-styles")) return;

    const style = document.createElement("style");
    style.id = "radar-v13-3-weather-styles";
    style.textContent = `
      .weather-widget-card{position:relative;margin-top:14px;padding:16px;border:1px solid var(--border);border-radius:24px;background:radial-gradient(circle at 100% 0%,color-mix(in srgb,var(--cyan) 13%,transparent),transparent 44%),var(--card);box-shadow:var(--shadow);overflow:hidden}
      .weather-widget-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .weather-widget-title{display:flex;align-items:center;gap:10px;min-width:0}.weather-widget-symbol{display:grid;place-items:center;width:42px;height:42px;flex:0 0 auto;border-radius:15px;background:var(--cyan-soft);font-size:1.25rem}.weather-widget-title strong,.weather-widget-title small{display:block}.weather-widget-title strong{font-size:.84rem;letter-spacing:-.02em}.weather-widget-title small{margin-top:3px;color:var(--muted);font-size:.55rem;line-height:1.35}
      .weather-refresh-button{display:grid;place-items:center;width:36px;height:36px;flex:0 0 auto;border:1px solid var(--border);border-radius:13px;color:var(--muted);background:color-mix(in srgb,var(--card-strong) 92%,transparent);font-size:1rem;cursor:pointer;transition:transform .2s ease,color .2s ease,background .2s ease}.weather-refresh-button:hover{color:var(--cyan);background:var(--surface-hover)}.weather-refresh-button:disabled{cursor:wait;opacity:.65}.weather-refresh-button.loading span{display:inline-block;animation:weather-spin .8s linear infinite}@keyframes weather-spin{to{transform:rotate(360deg)}}
      .weather-city-list{display:grid;gap:7px;margin-top:14px}.weather-city-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) auto;align-items:center;gap:10px;width:100%;min-height:50px;padding:9px 11px;border:1px solid transparent;border-radius:16px;color:var(--text);background:color-mix(in srgb,var(--card-strong) 88%,transparent);text-align:left;cursor:pointer;transition:border-color .2s ease,background .2s ease,transform .2s ease}.weather-city-row:hover{background:var(--surface-hover)}.weather-city-row:active{transform:scale(.99)}.weather-city-row.active{border-color:color-mix(in srgb,var(--cyan) 45%,var(--border));background:color-mix(in srgb,var(--cyan-soft) 68%,var(--card-strong))}.weather-city-name strong,.weather-city-name small,.weather-condition strong,.weather-condition small{display:block}.weather-city-name strong{overflow:hidden;font-size:.69rem;white-space:nowrap;text-overflow:ellipsis}.weather-city-name small{margin-top:2px;color:var(--muted);font-size:.5rem}.weather-condition{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:7px;min-width:0}.weather-condition-icon{font-size:1.12rem}.weather-condition strong{overflow:hidden;font-size:.61rem;white-space:nowrap;text-overflow:ellipsis}.weather-condition small{margin-top:2px;color:var(--muted);font-size:.48rem}.weather-temperature{font-size:1.08rem;font-weight:850;letter-spacing:-.04em;white-space:nowrap}
      .weather-active-detail{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.weather-active-detail span{padding:6px 8px;border-radius:999px;color:var(--muted);background:var(--surface-hover);font-size:.52rem;font-weight:700}.weather-active-detail b{color:var(--text)}
      .weather-widget-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;color:var(--muted);font-size:.49rem;line-height:1.4}.weather-widget-footer a{color:var(--cyan);font-weight:750;text-decoration:none}.weather-widget-footer a:hover{text-decoration:underline}.weather-freshness.stale{color:var(--warning)}
      .weather-widget-message{display:flex;align-items:center;gap:10px;margin-top:14px;padding:13px;border-radius:16px;color:var(--muted);background:var(--surface-hover);font-size:.58rem;line-height:1.45}.weather-widget-message span{font-size:1.1rem}.weather-skeleton{position:relative;overflow:hidden;color:transparent!important;background:var(--surface-hover)!important}.weather-skeleton::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--text) 7%,transparent),transparent);animation:weather-shimmer 1.25s infinite}@keyframes weather-shimmer{to{transform:translateX(100%)}}
      @media(max-width:420px){.weather-widget-card{padding:14px}.weather-city-row{grid-template-columns:minmax(0,.92fr) minmax(0,1.15fr) auto;gap:7px;padding:8px 9px}.weather-condition strong{font-size:.56rem}.weather-temperature{font-size:1rem}.weather-widget-footer{align-items:flex-start;flex-direction:column;gap:3px}}
      @media(prefers-reduced-motion:reduce){.weather-refresh-button,.weather-city-row{transition:none}.weather-refresh-button.loading span,.weather-skeleton::after{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function injectWidget() {
    if (document.querySelector("#weather-widget-card")) return;

    const anchor = document.querySelector(".city-switcher-card");
    if (!anchor) return;

    anchor.insertAdjacentHTML("afterend", `
      <section class="weather-widget-card" id="weather-widget-card" aria-label="Clima actual en La Laguna">
        <div class="weather-widget-head">
          <div class="weather-widget-title">
            <span class="weather-widget-symbol" aria-hidden="true">🌤️</span>
            <div>
              <strong>Clima en La Laguna</strong>
              <small id="weather-widget-status">Consultando condiciones actuales…</small>
            </div>
          </div>
          <button class="weather-refresh-button" id="weather-refresh-button" type="button" aria-label="Actualizar clima" title="Actualizar clima">
            <span aria-hidden="true">↻</span>
          </button>
        </div>
        <div id="weather-widget-content" aria-live="polite">
          <div class="weather-city-list" aria-hidden="true">
            ${CITIES.map((city) => `
              <div class="weather-city-row weather-skeleton">
                <span>${city.name}</span><span>Cargando clima</span><span>00 °C</span>
              </div>`).join("")}
          </div>
        </div>
        <div class="weather-widget-footer">
          <span class="weather-freshness" id="weather-freshness">Actualizando…</span>
          <span>Datos: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></span>
        </div>
      </section>
    `);
  }

  function getActiveCityId() {
    return document.querySelector("#city-selector .city-button.active")?.dataset.cityId || "torreon";
  }

  function getWeatherDescriptor(code, isDay) {
    const day = Number(isDay) !== 0;
    const exact = {
      0: { label: "Despejado", icon: day ? "☀️" : "🌙" },
      1: { label: "Mayormente despejado", icon: day ? "🌤️" : "🌙" },
      2: { label: "Parcialmente nublado", icon: day ? "🌤️" : "☁️" },
      3: { label: "Nublado", icon: "☁️" },
      45: { label: "Niebla", icon: "🌫️" },
      48: { label: "Niebla con escarcha", icon: "🌫️" },
      51: { label: "Llovizna ligera", icon: "🌦️" },
      53: { label: "Llovizna", icon: "🌦️" },
      55: { label: "Llovizna intensa", icon: "🌧️" },
      56: { label: "Llovizna helada", icon: "🌧️" },
      57: { label: "Llovizna helada intensa", icon: "🌧️" },
      61: { label: "Lluvia ligera", icon: "🌦️" },
      63: { label: "Lluvia", icon: "🌧️" },
      65: { label: "Lluvia intensa", icon: "🌧️" },
      66: { label: "Lluvia helada", icon: "🌧️" },
      67: { label: "Lluvia helada intensa", icon: "🌧️" },
      71: { label: "Nieve ligera", icon: "🌨️" },
      73: { label: "Nieve", icon: "🌨️" },
      75: { label: "Nieve intensa", icon: "❄️" },
      77: { label: "Granos de nieve", icon: "🌨️" },
      80: { label: "Chubascos ligeros", icon: "🌦️" },
      81: { label: "Chubascos", icon: "🌧️" },
      82: { label: "Chubascos intensos", icon: "🌧️" },
      85: { label: "Chubascos de nieve", icon: "🌨️" },
      86: { label: "Nieve intensa", icon: "❄️" },
      95: { label: "Tormenta eléctrica", icon: "⛈️" },
      96: { label: "Tormenta con granizo", icon: "⛈️" },
      99: { label: "Tormenta fuerte con granizo", icon: "⛈️" },
    };
    return exact[Number(code)] || { label: "Condición variable", icon: "🌡️" };
  }

  function finiteNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function buildApiUrl() {
    const params = new URLSearchParams({
      latitude: CITIES.map((city) => city.latitude).join(","),
      longitude: CITIES.map((city) => city.longitude).join(","),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "weather_code",
        "wind_speed_10m",
        "is_day",
      ].join(","),
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      timezone: "America/Monterrey",
      forecast_days: "1",
    });
    return `${API_ENDPOINT}?${params.toString()}`;
  }

  function normalizeApiResponse(payload) {
    const locations = Array.isArray(payload) ? payload : [payload];
    if (locations.length !== CITIES.length) {
      throw new Error("La respuesta meteorológica no contiene las tres ciudades.");
    }

    const cities = CITIES.map((city, index) => {
      const current = locations[index]?.current;
      if (!current) throw new Error(`No hay condiciones actuales para ${city.name}.`);

      const temperature = finiteNumber(current.temperature_2m);
      const weatherCode = finiteNumber(current.weather_code);
      if (temperature === null || weatherCode === null) {
        throw new Error(`Datos meteorológicos incompletos para ${city.name}.`);
      }

      return {
        ...city,
        temperature,
        apparentTemperature: finiteNumber(current.apparent_temperature, temperature),
        humidity: finiteNumber(current.relative_humidity_2m),
        windSpeed: finiteNumber(current.wind_speed_10m),
        weatherCode,
        isDay: finiteNumber(current.is_day, 1),
        observedAt: String(current.time || ""),
      };
    });

    return {
      version: VERSION,
      fetchedAt: Date.now(),
      cities,
    };
  }

  function isValidWeatherState(value) {
    return Boolean(
      value &&
      Number.isFinite(Number(value.fetchedAt)) &&
      Array.isArray(value.cities) &&
      value.cities.length === CITIES.length &&
      value.cities.every((city) => CITIES.some((known) => known.id === city.id) && Number.isFinite(Number(city.temperature)))
    );
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!isValidWeatherState(cached)) return null;
      if (Date.now() - Number(cached.fetchedAt) > MAX_STALE_MS) return null;
      return cached;
    } catch {
      return null;
    }
  }

  function saveCache(value) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    } catch {
      // La app puede continuar aunque el navegador no permita almacenamiento local.
    }
  }

  function formatTemperature(value) {
    return `${Math.round(Number(value))} °C`;
  }

  function formatMetric(value, suffix) {
    return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${suffix}` : "—";
  }

  function formatFreshness(timestamp) {
    const ageMinutes = Math.max(0, Math.round((Date.now() - Number(timestamp)) / 60000));
    if (ageMinutes < 1) return "Actualizado ahora";
    if (ageMinutes === 1) return "Actualizado hace 1 min";
    if (ageMinutes < 60) return `Actualizado hace ${ageMinutes} min`;
    return `Último dato · ${new Date(Number(timestamp)).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}`;
  }

  function renderWeather() {
    const content = document.querySelector("#weather-widget-content");
    const status = document.querySelector("#weather-widget-status");
    const freshness = document.querySelector("#weather-freshness");
    if (!content || !status || !freshness || !weatherState) return;

    const activeCityId = getActiveCityId();
    const activeWeather = weatherState.cities.find((city) => city.id === activeCityId) || weatherState.cities[0];
    const isStale = Date.now() - Number(weatherState.fetchedAt) > CACHE_TTL_MS;

    status.textContent = isStale
      ? "Mostrando el último dato disponible"
      : "Condiciones actuales para las tres ciudades";
    freshness.textContent = formatFreshness(weatherState.fetchedAt);
    freshness.classList.toggle("stale", isStale);

    content.innerHTML = `
      <div class="weather-city-list">
        ${weatherState.cities.map((city) => {
          const descriptor = getWeatherDescriptor(city.weatherCode, city.isDay);
          const active = city.id === activeCityId;
          return `
            <button class="weather-city-row${active ? " active" : ""}" data-weather-city-id="${city.id}" type="button" aria-pressed="${active}">
              <span class="weather-city-name"><strong>${city.name}</strong><small>${active ? "Ciudad activa" : "Ver en el radar"}</small></span>
              <span class="weather-condition"><span class="weather-condition-icon" aria-hidden="true">${descriptor.icon}</span><span><strong>${descriptor.label}</strong><small>${city.isDay ? "Condición diurna" : "Condición nocturna"}</small></span></span>
              <span class="weather-temperature">${formatTemperature(city.temperature)}</span>
            </button>`;
        }).join("")}
      </div>
      <div class="weather-active-detail" aria-label="Detalles del clima en ${activeWeather.name}">
        <span>Sensación <b>${formatTemperature(activeWeather.apparentTemperature)}</b></span>
        <span>Humedad <b>${formatMetric(activeWeather.humidity, "%")}</b></span>
        <span>Viento <b>${formatMetric(activeWeather.windSpeed, " km/h")}</b></span>
      </div>`;
  }

  function renderError(error) {
    const content = document.querySelector("#weather-widget-content");
    const status = document.querySelector("#weather-widget-status");
    const freshness = document.querySelector("#weather-freshness");
    if (!content || !status || !freshness) return;

    status.textContent = navigator.onLine ? "No se pudo actualizar el clima" : "Sin conexión a internet";
    freshness.textContent = "Toca ↻ para reintentar";
    freshness.classList.add("stale");
    content.innerHTML = `
      <div class="weather-widget-message">
        <span aria-hidden="true">${navigator.onLine ? "⚠️" : "📡"}</span>
        <div>No hay datos meteorológicos disponibles en este momento. El radar de agua continúa funcionando normalmente.</div>
      </div>`;
    console.info("Radar Laguna V13.3: clima no disponible.", error);
  }

  function setLoading(value) {
    isLoading = value;
    const button = document.querySelector("#weather-refresh-button");
    if (!button) return;
    button.disabled = value;
    button.classList.toggle("loading", value);
    button.setAttribute("aria-busy", String(value));
  }

  async function fetchWeather({ force = false } = {}) {
    if (isLoading) return;

    if (!force && weatherState && Date.now() - Number(weatherState.fetchedAt) < CACHE_TTL_MS) {
      renderWeather();
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildApiUrl(), {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}.`);

      weatherState = normalizeApiResponse(await response.json());
      saveCache(weatherState);
      renderWeather();
    } catch (error) {
      const cached = readCache();
      if (cached) {
        weatherState = cached;
        renderWeather();
      } else {
        renderError(error);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  function syncActiveCity() {
    if (weatherState) renderWeather();
  }

  function bindEvents() {
    document.querySelector("#weather-refresh-button")?.addEventListener("click", () => {
      fetchWeather({ force: true });
    });

    document.querySelector("#weather-widget-content")?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-weather-city-id]");
      if (!row) return;
      const cityId = row.dataset.weatherCityId;
      document.querySelector(`#city-selector .city-button[data-city-id="${cityId}"]`)?.click();
      requestAnimationFrame(syncActiveCity);
    });

    const selector = document.querySelector("#city-selector");
    selector?.addEventListener("click", () => requestAnimationFrame(syncActiveCity));

    const cityButtons = selector?.querySelectorAll(".city-button") || [];
    activeCityObserver = new MutationObserver(syncActiveCity);
    cityButtons.forEach((button) => activeCityObserver.observe(button, { attributes: true, attributeFilter: ["class"] }));

    window.addEventListener("online", () => fetchWeather({ force: true }));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && (!weatherState || Date.now() - Number(weatherState.fetchedAt) >= CACHE_TTL_MS)) {
        fetchWeather({ force: true });
      }
    });
  }

  function updateVersionLabels() {
    document.title = "Radar Laguna V13.3 | Radar de Agua";
    document.querySelectorAll(".app-footer > p").forEach((element) => {
      element.textContent = "Proyecto comunitario independiente · Uso informativo · V13.3";
    });
    const infoVersion = document.querySelector("#info-modal .sheet-header h3");
    if (infoVersion) infoVersion.textContent = "Radar Laguna V13.3";
  }

  function initialize() {
    injectPreconnect();
    injectStyles();
    injectWidget();
    updateVersionLabels();
    bindEvents();

    const cached = readCache();
    if (cached) {
      weatherState = cached;
      renderWeather();
    }

    const begin = () => fetchWeather({ force: !cached || Date.now() - Number(cached.fetchedAt) >= CACHE_TTL_MS });
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(begin, { timeout: 1800 });
    } else {
      setTimeout(begin, 900);
    }

    refreshTimer = window.setInterval(() => {
      if (!document.hidden) fetchWeather({ force: true });
    }, AUTO_REFRESH_MS);
  }

  window.RadarLagunaWeather = Object.freeze({
    refresh: () => fetchWeather({ force: true }),
    getState: () => weatherState ? structuredClone(weatherState) : null,
    version: VERSION,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
