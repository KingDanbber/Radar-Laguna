"use strict";

const STORAGE_KEY = "radarLagunaReportsV11";
const LEGACY_STORAGE_KEYS = [
  "radarLagunaReportsV8",
  "radarLagunaReportsV7",
  "radarLagunaReportsV6",
  "radarLagunaReportsV4",
  "radarLagunaReportsV3",
  "radarLagunaReportsV2",
  "radarLagunaReportsV1",
];
const VOTES_KEY = "radarLagunaVotesV11";
const LEGACY_VOTES_KEYS = ["radarLagunaVotesV8", "radarLagunaVotesV7", "radarLagunaVotesV6", "radarLagunaVotesV4"];
const THEME_KEY = "radarLagunaTheme";
const CITY_KEY = "radarLagunaCityV3";

const REPORT_WINDOW_HOURS = 6;
const RESTORATION_RECENT_MINUTES = 90;
const RESTORATION_MIN_GOOD_REPORTS = 2;
const MAX_REPORT_TAGS = 5;

const POSTAL_SOURCES = [
  {
    stateKey: "coahuila",
    label: "Coahuila",
    fileName: "CP_Coah.zip",
    localPath: "./data/sepomex/CP_Coah.zip",
    remoteUrl: "https://repodatos.atdt.gob.mx/api_update/sepomex/codigos_postales_entidad_federativa/CP_Coah.zip",
  },
  {
    stateKey: "durango",
    label: "Durango",
    fileName: "CP_Dgo.zip",
    localPath: "./data/sepomex/CP_Dgo.zip",
    remoteUrl: "https://repodatos.atdt.gob.mx/api_update/sepomex/codigos_postales_entidad_federativa/CP_Dgo.zip",
  },
];

const SETTLEMENT_CATALOG_PATH =
  "./data/sepomex/catalogo_asentamientos.json";

const STATUS_CONFIG = {
  no_water: {
    label: "Sin agua",
    icon: "⊘",
    lightColor: "#e83f5d",
    darkColor: "#ff4f6d",
  },
  low_pressure: {
    label: "Baja presión",
    icon: "↘",
    lightColor: "#e89a25",
    darkColor: "#ffb547",
  },
  good_pressure: {
    label: "Buena presión",
    icon: "✓",
    lightColor: "#16a978",
    darkColor: "#2ed6a1",
  },
};

const TAG_PRESETS = {
  no_water: [
    { id: "corte_total", label: "Corte total" },
    { id: "desde_madrugada", label: "Desde madrugada" },
    { id: "intermitente", label: "Intermitente" },
    { id: "sin_aviso", label: "Sin aviso" },
    { id: "tinaco_vacio", label: "Tinaco vacío" },
    { id: "varias_cuadras", label: "Varias cuadras" },
  ],
  low_pressure: [
    { id: "requiere_bomba", label: "Requiere bomba" },
    { id: "solo_de_noche", label: "Solo de noche" },
    { id: "solo_mananas", label: "Solo mañanas" },
    { id: "agua_turbia", label: "Agua turbia" },
    { id: "no_sube_tinaco", label: "No sube al tinaco" },
    { id: "intermitente", label: "Intermitente" },
    { id: "presion_variable", label: "Presión variable" },
  ],
  good_pressure: [
    { id: "presion_estable", label: "Presión estable" },
    { id: "llenando_tinaco", label: "Llenando tinaco" },
    { id: "regreso_agua", label: "Regresó el agua" },
    { id: "mejoro_hoy", label: "Mejoró hoy" },
    { id: "agua_clara", label: "Agua clara" },
    { id: "sin_bomba", label: "Sin bomba" },
  ],
};

const CITY_CONFIG = {
  torreon: {
    id: "torreon",
    name: "Torreón",
    center: [25.5439, -103.4190],
    zoom: 12,
    stateKey: "coahuila",
    extent: [[25.455, -103.57], [25.665, -103.275]],
  },
  gomez_palacio: {
    id: "gomez_palacio",
    name: "Gómez Palacio",
    center: [25.5891, -103.4859],
    zoom: 12.5,
    stateKey: "durango",
    extent: [[25.52, -103.61], [25.69, -103.405]],
  },
  lerdo: {
    id: "lerdo",
    name: "Lerdo",
    center: [25.5447, -103.5263],
    zoom: 13,
    stateKey: "durango",
    extent: [[25.46, -103.665], [25.63, -103.43]],
  },
};

const reportModal = document.querySelector("#report-modal");
const infoModal = document.querySelector("#info-modal");
const locationConsentModal = document.querySelector("#location-consent-modal");
const submitReportButton = document.querySelector("#submit-report-button");
const reportLocationLabel = document.querySelector("#report-location-label");
const settlementPicker = document.querySelector("#settlement-picker");
const settlementSelect = document.querySelector("#settlement-select");
const settlementCount = document.querySelector("#settlement-count");
const settlementPickerCopy = document.querySelector("#settlement-picker-copy");
const settlementUnknownButton = document.querySelector("#settlement-unknown-button");
const recentList = document.querySelector("#recent-list");
const toast = document.querySelector("#toast");
const themeButton = document.querySelector("#theme-button");
const themeIcon = document.querySelector("#theme-icon");
const themeColorMeta = document.querySelector("#theme-color-meta");
const zoneSearchInput = document.querySelector("#zone-search-input");
const zoneSearchButton = document.querySelector("#zone-search-button");
const zoneSearchResults = document.querySelector("#zone-search-results");
const selectedZoneSettlements = document.querySelector("#selected-zone-settlements");
const clearZoneButton = document.querySelector("#clear-zone-button");
const citySelector = document.querySelector("#city-selector");
const activeCityLabel = document.querySelector("#active-city-label");
const reportTagsSection = document.querySelector("#report-tags-section");
const reportTagsTitle = document.querySelector("#report-tags-title");
const tagOptions = document.querySelector("#tag-options");
const tagCount = document.querySelector("#tag-count");
const signalsList = document.querySelector("#signals-list");
const signalsContext = document.querySelector("#signals-context");
const restorationAlert = document.querySelector("#restoration-alert");
const restorationTitle = document.querySelector("#restoration-title");
const restorationDetail = document.querySelector("#restoration-detail");
const restorationBadge = document.querySelector("#restoration-badge");
const mapCard = document.querySelector(".map-card");
const mapFullscreenButton = document.querySelector("#map-fullscreen-button");
const mapFullscreenIcon = document.querySelector("#map-fullscreen-icon");
const geoStatusIcon = document.querySelector("#geo-status-icon");
const geoStatusTitle = document.querySelector("#geo-status-title");
const geoStatusDetail = document.querySelector("#geo-status-detail");
const geoRetryButton = document.querySelector("#geo-retry-button");
const geoNativeBadge = document.querySelector("#geo-native-badge");
const mapLayerLabel = document.querySelector("#map-layer-label");
const connectionPill = document.querySelector("#connection-pill");
const connectionLabel = document.querySelector("#connection-label");

let selectedStatus = null;
let selectedTags = [];
let selectedZoneId = null;
let selectedSettlement = null;
let reportByPostalOnly = false;
let toastTimer = null;
let geoLoadState = "loading";
let geoErrors = [];
let loadedStateKeys = new Set();
let postalZones = [];
let postalZoneById = new Map();
let postalSourceModes = new Map();
let nativeSettlementCatalog = new Map();
let supabaseConnected = false;
let supabaseRefreshTimer = null;
let supabaseInitializationFinished = false;

let selectedCityId = localStorage.getItem(CITY_KEY);
if (!CITY_CONFIG[selectedCityId]) selectedCityId = "torreon";

let selectedLocation = {
  lat: CITY_CONFIG[selectedCityId].center[0],
  lng: CITY_CONFIG[selectedCityId].center[1],
  source: `Centro de ${CITY_CONFIG[selectedCityId].name}`,
};

const map = L.map("map", {
  zoomControl: false,
  attributionControl: true,
  preferCanvas: true,
}).setView(CITY_CONFIG[selectedCityId].center, CITY_CONFIG[selectedCityId].zoom);

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const zoneLayer = L.layerGroup().addTo(map);
const reportLayer = L.layerGroup().addTo(map);
const selectionLayer = L.layerGroup().addTo(map);

function getCurrentTheme() {
  return document.body.dataset.theme === "dark" ? "dark" : "light";
}

function getCurrentCity() {
  return CITY_CONFIG[selectedCityId] || CITY_CONFIG.torreon;
}

function getStatusColor(status) {
  const config = STATUS_CONFIG[status];
  if (!config) return getCurrentTheme() === "dark" ? "#55d7ff" : "#087fa5";
  return getCurrentTheme() === "dark" ? config.darkColor : config.lightColor;
}

function applyTheme(theme, { persist = true } = {}) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";

  document.body.dataset.theme = normalizedTheme;
  themeIcon.textContent = normalizedTheme === "dark" ? "☀" : "☾";
  themeButton.setAttribute(
    "aria-label",
    normalizedTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
  );
  themeButton.title = normalizedTheme === "dark" ? "Tema claro" : "Tema oscuro";
  themeColorMeta.setAttribute(
    "content",
    normalizedTheme === "dark" ? "#07111f" : "#eef7fb"
  );

  if (persist) localStorage.setItem(THEME_KEY, normalizedTheme);
  if (typeof reports !== "undefined") renderReports();
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme === "dark" ? "dark" : "light", { persist: false });
}

function hoursAgo(hours, minutes = 0) {
  return new Date(
    Date.now() - (hours * 60 + minutes) * 60 * 1000
  ).toISOString();
}

function getSeedReports() {
  const seed = [
    { cityId: "torreon", status: "no_water", tags: ["sin_aviso", "varias_cuadras"], lat: 25.5504, lng: -103.4238, createdAt: hoursAgo(0, 18), confirmCount: 12, changeCount: 1 },
    { cityId: "torreon", status: "low_pressure", tags: ["requiere_bomba", "no_sube_tinaco"], lat: 25.5366, lng: -103.4182, createdAt: hoursAgo(0, 43), confirmCount: 8, changeCount: 2 },
    { cityId: "torreon", status: "good_pressure", tags: ["presion_estable", "agua_clara"], lat: 25.5589, lng: -103.3918, createdAt: hoursAgo(1, 8), confirmCount: 10, changeCount: 1 },
    { cityId: "torreon", status: "no_water", tags: ["corte_total", "desde_madrugada"], lat: 25.5269, lng: -103.4024, createdAt: hoursAgo(1, 41), confirmCount: 15, changeCount: 1 },
    { cityId: "torreon", status: "low_pressure", tags: ["solo_de_noche", "requiere_bomba"], lat: 25.5697, lng: -103.4104, createdAt: hoursAgo(2, 5), confirmCount: 5, changeCount: 3 },
    { cityId: "torreon", status: "good_pressure", tags: ["regreso_agua", "llenando_tinaco"], lat: 25.5467, lng: -103.3748, createdAt: hoursAgo(0, 32), confirmCount: 9, changeCount: 1 },
    { cityId: "torreon", status: "low_pressure", tags: ["agua_turbia", "presion_variable"], lat: 25.5175, lng: -103.3889, createdAt: hoursAgo(3, 9), confirmCount: 3, changeCount: 5 },
    { cityId: "torreon", status: "no_water", tags: ["sin_aviso", "intermitente"], lat: 25.5788, lng: -103.3652, createdAt: hoursAgo(4, 54), confirmCount: 11, changeCount: 7 },

    { cityId: "gomez_palacio", status: "low_pressure", tags: ["requiere_bomba", "solo_mananas"], lat: 25.589, lng: -103.486, createdAt: hoursAgo(0, 24), confirmCount: 14, changeCount: 2 },
    { cityId: "gomez_palacio", status: "low_pressure", tags: ["requiere_bomba", "no_sube_tinaco"], lat: 25.594, lng: -103.481, createdAt: hoursAgo(0, 49), confirmCount: 7, changeCount: 1 },
    { cityId: "gomez_palacio", status: "no_water", tags: ["corte_total", "sin_aviso"], lat: 25.608, lng: -103.487, createdAt: hoursAgo(1, 12), confirmCount: 13, changeCount: 2 },
    { cityId: "gomez_palacio", status: "good_pressure", tags: ["regreso_agua", "agua_clara"], lat: 25.589, lng: -103.461, createdAt: hoursAgo(0, 18), confirmCount: 8, changeCount: 1 },
    { cityId: "gomez_palacio", status: "good_pressure", tags: ["llenando_tinaco", "presion_estable"], lat: 25.585, lng: -103.463, createdAt: hoursAgo(0, 41), confirmCount: 6, changeCount: 1 },

    { cityId: "lerdo", status: "good_pressure", tags: ["regreso_agua", "llenando_tinaco"], lat: 25.545, lng: -103.526, createdAt: hoursAgo(0, 32), confirmCount: 16, changeCount: 1 },
    { cityId: "lerdo", status: "low_pressure", tags: ["requiere_bomba", "presion_variable"], lat: 25.563, lng: -103.526, createdAt: hoursAgo(1, 6), confirmCount: 6, changeCount: 2 },
    { cityId: "lerdo", status: "no_water", tags: ["desde_madrugada", "sin_aviso"], lat: 25.526, lng: -103.526, createdAt: hoursAgo(1, 48), confirmCount: 12, changeCount: 3 },
    { cityId: "lerdo", status: "low_pressure", tags: ["agua_turbia", "no_sube_tinaco"], lat: 25.545, lng: -103.547, createdAt: hoursAgo(2, 37), confirmCount: 5, changeCount: 4 },
  ];

  return seed.map((report) =>
    normalizeReport({
      id: crypto.randomUUID(),
      ...report,
    })
  );
}

function getTagConfig(tagId) {
  for (const presets of Object.values(TAG_PRESETS)) {
    const tag = presets.find((item) => item.id === tagId);
    if (tag) return tag;
  }
  return null;
}

function nearestCityId(lat, lng, allowedStateKey = null) {
  const candidates = Object.values(CITY_CONFIG).filter(
    (city) => !allowedStateKey || city.stateKey === allowedStateKey
  );

  if (!candidates.length) return "torreon";

  return candidates
    .map((city) => ({
      id: city.id,
      distance: haversineKm(lat, lng, city.center[0], city.center[1]),
    }))
    .sort((a, b) => a.distance - b.distance)[0].id;
}

function normalizeReport(report) {
  const lat = Number(report.lat ?? report.latitude);
  const lng = Number(report.lng ?? report.longitude);
  const cityId = CITY_CONFIG[report.cityId]
    ? report.cityId
    : nearestCityId(lat, lng);

  return {
    id: report.id || crypto.randomUUID(),
    cityId: report.cityId || report.city_id || cityId,
    zoneId:
      typeof (report.zoneId || report.zone_id) === "string" &&
      (report.zoneId || report.zone_id).startsWith("postal-")
        ? (report.zoneId || report.zone_id)
        : null,
    postalCode: /^\d{5}$/.test(String(report.postalCode || report.postal_code || ""))
      ? String(report.postalCode || report.postal_code)
      : null,
    zoneLabel: report.zoneLabel || report.zone_label || null,
    settlement: String(report.settlement || report.settlement_name || "").trim() || null,
    settlementType: String(report.settlementType || report.settlement_type || "").trim() || null,
    status: STATUS_CONFIG[report.status] ? report.status : "low_pressure",
    tags: Array.isArray(report.tags)
      ? report.tags
          .filter((tagId) => getTagConfig(tagId))
          .slice(0, MAX_REPORT_TAGS)
      : [],
    confirmCount: Math.max(0, Number(report.confirmCount ?? report.confirm_count) || 0),
    changeCount: Math.max(0, Number(report.changeCount ?? report.change_count) || 0),
    lat: Number(report.lat ?? report.latitude),
    lng: Number(report.lng ?? report.longitude),
    createdAt: report.createdAt || report.created_at || new Date().toISOString(),
  };
}

function loadReports() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved) && saved.length) {
        const normalized = saved.map(normalizeReport);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.warn(`No se pudieron leer los reportes de ${key}.`, error);
    }
  }

  const seedReports = getSeedReports();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedReports));
  return seedReports;
}

let reports = loadReports();

function saveReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function loadLocalVotes() {
  for (const key of [VOTES_KEY, ...LEGACY_VOTES_KEYS]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        localStorage.setItem(VOTES_KEY, JSON.stringify(saved));
        return saved;
      }
    } catch (error) {
      console.warn(`No se pudieron leer los votos de ${key}.`, error);
    }
  }

  return {};
}

let localVotes = loadLocalVotes();

function saveLocalVotes() {
  localStorage.setItem(VOTES_KEY, JSON.stringify(localVotes));
}


function setConnectionStatus(status, label, title = label) {
  if (!connectionPill || !connectionLabel) return;

  connectionPill.className = `live-pill ${status}`;
  connectionLabel.textContent = label;
  connectionPill.title = title;
}

function scheduleSupabaseRefresh(delay = 250) {
  clearTimeout(supabaseRefreshTimer);

  supabaseRefreshTimer = setTimeout(() => {
    refreshSupabaseData({ silent: true });
  }, delay);
}

async function refreshSupabaseData({ silent = false } = {}) {
  if (!supabaseConnected || !window.RadarSupabase?.isConnected()) return;

  if (!silent) {
    setConnectionStatus("syncing", "Sincronizando…");
  }

  try {
    const [remoteReports, myVotes] = await Promise.all([
      window.RadarSupabase.fetchRecentReports(REPORT_WINDOW_HOURS),
      window.RadarSupabase.fetchMyVotes(),
    ]);

    reports = remoteReports.map(normalizeReport);
    localVotes = myVotes;
    saveReports();
    saveLocalVotes();
    renderReports();

    setConnectionStatus(
      "online",
      "En vivo",
      "Conectado a Supabase Realtime"
    );
  } catch (error) {
    console.error("No se pudieron sincronizar los reportes.", error);
    setConnectionStatus(
      "offline",
      "Sin conexión",
      "Se muestran los últimos datos guardados en el dispositivo"
    );

    if (!silent) {
      showToast("No pudimos actualizar el radar. Mostrando la caché local.");
    }
  }
}

async function initializeSupabase() {
  if (!window.RadarSupabase?.isConfigured()) {
    setConnectionStatus(
      "local",
      "Modo local",
      "Configura supabase-config.js para activar la sincronización"
    );
    supabaseInitializationFinished = true;
    return;
  }

  setConnectionStatus("syncing", "Conectando…");

  try {
    await window.RadarSupabase.initialize();
    supabaseConnected = true;

    await refreshSupabaseData();

    window.RadarSupabase.subscribeToReports(() => {
      scheduleSupabaseRefresh();
    });
  } catch (error) {
    console.error("Supabase no pudo inicializarse.", error);
    supabaseConnected = false;
    setConnectionStatus(
      "error",
      "Modo local",
      "Supabase no está disponible; los cambios quedarán solo en este dispositivo"
    );
    showToast("Supabase no está disponible. Radar Laguna continúa en modo local.");
  } finally {
    supabaseInitializationFinished = true;
  }
}

function getRecentReports() {
  const threshold = Date.now() - REPORT_WINDOW_HOURS * 60 * 60 * 1000;

  return reports
    .filter(
      (report) => new Date(report.createdAt).getTime() >= threshold
    )
    .sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
}

function getCurrentCityReports(reportList = getRecentReports()) {
  return reportList.filter(
    (report) => report.cityId === selectedCityId
  );
}

function getReportsForZone(zoneId, reportList = getRecentReports()) {
  if (!zoneId) return reportList;
  return reportList.filter((report) => report.zoneId === zoneId);
}

function getStatusCounts(reportList) {
  return reportList.reduce(
    (counts, report) => {
      if (report.status in counts) counts[report.status] += 1;
      return counts;
    },
    { no_water: 0, low_pressure: 0, good_pressure: 0 }
  );
}

function getFreshnessWeight(report) {
  const ageMs = Math.max(
    0,
    Date.now() - new Date(report.createdAt).getTime()
  );
  const ageRatio =
    ageMs / (REPORT_WINDOW_HOURS * 60 * 60 * 1000);

  return Math.max(0.15, 1 - ageRatio);
}

function isReportPossiblyChanged(report) {
  return (
    report.changeCount >= 3 &&
    report.changeCount > report.confirmCount
  );
}

function getReportWeight(report) {
  const freshness = getFreshnessWeight(report);
  const communityFactor = Math.min(
    2.6,
    Math.max(
      0.18,
      1 + report.confirmCount * 0.12 - report.changeCount * 0.2
    )
  );
  const changePenalty = isReportPossiblyChanged(report) ? 0.28 : 1;

  return freshness * communityFactor * changePenalty;
}

function getStatusScores(reportList) {
  return reportList.reduce(
    (scores, report) => {
      if (report.status in scores) {
        scores[report.status] += getReportWeight(report);
      }
      return scores;
    },
    { no_water: 0, low_pressure: 0, good_pressure: 0 }
  );
}

function getRadarAnalysis(reportList) {
  const scores = getStatusScores(reportList);
  const totalScore = Object.values(scores).reduce(
    (sum, score) => sum + score,
    0
  );
  const priority = ["no_water", "low_pressure", "good_pressure"];

  const predominantStatus = reportList.length
    ? priority.reduce((winner, status) => {
        if (!winner) return status;
        return scores[status] > scores[winner] ? status : winner;
      }, null)
    : null;

  const confidence =
    predominantStatus && totalScore
      ? Math.round(
          (scores[predominantStatus] / totalScore) * 100
        )
      : 0;

  let strength = "weak";
  let strengthLabel = "Señal débil";

  if (
    reportList.length >= 4 &&
    totalScore >= 4 &&
    confidence >= 70
  ) {
    strength = "strong";
    strengthLabel = "Señal fuerte";
  } else if (
    reportList.length >= 2 &&
    totalScore >= 1.5 &&
    confidence >= 52
  ) {
    strength = "medium";
    strengthLabel = "Señal moderada";
  }

  return {
    scores,
    totalScore,
    predominantStatus,
    confidence,
    strength,
    strengthLabel,
  };
}

function getReportTrustState(report) {
  if (isReportPossiblyChanged(report)) {
    return { label: "Posible cambio", className: "changed" };
  }

  const netConfirmations =
    report.confirmCount - report.changeCount;

  if (report.confirmCount >= 8 && netConfirmations >= 5) {
    return { label: "Alta confianza", className: "strong" };
  }

  if (report.confirmCount >= 3 && netConfirmations >= 1) {
    return { label: "Confirmado", className: "confirmed" };
  }

  return { label: "Por confirmar", className: "pending" };
}

async function castCommunityVote(reportId, voteType) {
  if (!["confirm", "changed"].includes(voteType)) return;

  const report = reports.find((item) => item.id === reportId);
  if (!report) return;

  if (localVotes[reportId]) {
    showToast("Este dispositivo ya participó en este reporte.");
    return;
  }

  if (supabaseConnected && window.RadarSupabase?.isConnected()) {
    try {
      await window.RadarSupabase.publishVote(reportId, voteType);
      localVotes[reportId] = voteType;
      saveLocalVotes();

      showToast(
        voteType === "confirm"
          ? "Confirmación compartida con la comunidad."
          : "Cambio compartido con la comunidad."
      );

      await refreshSupabaseData({ silent: true });
      return;
    } catch (error) {
      console.error("No se pudo registrar el voto.", error);

      if (error?.code === "23505") {
        showToast("Ya habías participado en este reporte.");
        localVotes[reportId] = voteType;
        saveLocalVotes();
        return;
      }

      showToast("No se pudo compartir tu voto. Revisa la conexión.");
      return;
    }
  }

  if (voteType === "confirm") {
    report.confirmCount += 1;
    showToast(
      "Confirmación guardada solo en este dispositivo."
    );
  } else {
    report.changeCount += 1;
    showToast(
      "Cambio guardado solo en este dispositivo."
    );
  }

  localVotes[reportId] = voteType;
  saveReports();
  saveLocalVotes();
  renderReports();
}

function getReportAgeMinutes(report) {
  return Math.max(
    0,
    (Date.now() - new Date(report.createdAt).getTime()) / 60000
  );
}

function hasTag(report, tagId) {
  return (
    Array.isArray(report.tags) &&
    report.tags.includes(tagId)
  );
}

function detectRestorationSignal(reportList) {
  if (!reportList.length) return null;

  const recentReports = reportList.filter(
    (report) =>
      getReportAgeMinutes(report) <= RESTORATION_RECENT_MINUTES
  );

  const recentGoodReports = recentReports.filter(
    (report) =>
      report.status === "good_pressure" &&
      (
        hasTag(report, "regreso_agua") ||
        hasTag(report, "llenando_tinaco") ||
        hasTag(report, "presion_estable") ||
        report.confirmCount >= 3
      )
  );

  const recentChangedSignals = recentReports.reduce(
    (sum, report) => sum + Math.max(0, report.changeCount),
    0
  );

  const olderProblemReports = reportList.filter(
    (report) =>
      report.status !== "good_pressure" &&
      getReportAgeMinutes(report) > 30
  );

  const previousProblemScore = olderProblemReports.reduce(
    (sum, report) => sum + getReportWeight(report),
    0
  );

  const goodSignalScore = recentGoodReports.reduce(
    (sum, report) => sum + getReportWeight(report),
    0
  );

  const strongRestoration =
    recentGoodReports.length >= RESTORATION_MIN_GOOD_REPORTS &&
    previousProblemScore >= 0.8 &&
    goodSignalScore >= 1.4;

  const emergingRestoration =
    recentGoodReports.length >= 1 &&
    recentChangedSignals >= 2 &&
    previousProblemScore >= 0.5;

  if (!strongRestoration && !emergingRestoration) return null;

  return {
    level: strongRestoration ? "strong" : "emerging",
    recentGoodReports: recentGoodReports.length,
    recentChangedSignals,
  };
}

function renderRestorationAlert(cityReports) {
  const contextReports = selectedZoneId
    ? getReportsForZone(selectedZoneId, cityReports)
    : cityReports;

  const signal = detectRestorationSignal(contextReports);
  const selectedZone = getZoneById(selectedZoneId);
  const contextName =
    selectedZone?.name || getCurrentCity().name;

  if (!signal) {
    restorationAlert.classList.add("hidden");
    restorationAlert.classList.remove("warning");
    return;
  }

  restorationAlert.classList.remove("hidden");

  if (signal.level === "strong") {
    restorationAlert.classList.remove("warning");
    restorationTitle.textContent =
      "Posible restablecimiento detectado";
    restorationDetail.textContent =
      `${signal.recentGoodReports} reportes recientes indican regreso o mejora del servicio en ${contextName}.`;
    restorationBadge.textContent = "Señal favorable";
  } else {
    restorationAlert.classList.add("warning");
    restorationTitle.textContent =
      "La situación podría estar cambiando";
    restorationDetail.textContent =
      `Hay nuevas señales positivas y ${signal.recentChangedSignals} avisos de “Ya cambió” en ${contextName}.`;
    restorationBadge.textContent = "En observación";
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function flattenCoordinates(coordinates, accumulator = []) {
  if (!Array.isArray(coordinates)) return accumulator;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    accumulator.push(coordinates);
    return accumulator;
  }

  coordinates.forEach((child) =>
    flattenCoordinates(child, accumulator)
  );

  return accumulator;
}

function getGeometryBounds(geometry) {
  if (!geometry) return null;

  if (geometry.type === "GeometryCollection") {
    const childBounds = geometry.geometries
      .map(getGeometryBounds)
      .filter(Boolean);

    if (!childBounds.length) return null;

    return childBounds.reduce(
      (result, bounds) => ({
        south: Math.min(result.south, bounds.south),
        west: Math.min(result.west, bounds.west),
        north: Math.max(result.north, bounds.north),
        east: Math.max(result.east, bounds.east),
      }),
      childBounds[0]
    );
  }

  const points = flattenCoordinates(geometry.coordinates);
  if (!points.length) return null;

  return points.reduce(
    (bounds, [lng, lat]) => ({
      south: Math.min(bounds.south, lat),
      west: Math.min(bounds.west, lng),
      north: Math.max(bounds.north, lat),
      east: Math.max(bounds.east, lng),
    }),
    {
      south: Infinity,
      west: Infinity,
      north: -Infinity,
      east: -Infinity,
    }
  );
}

function boundsIntersect(bounds, extent) {
  const [[south, west], [north, east]] = extent;

  return !(
    bounds.east < west ||
    bounds.west > east ||
    bounds.north < south ||
    bounds.south > north
  );
}

function boundsCenter(bounds) {
  return [
    (bounds.south + bounds.north) / 2,
    (bounds.west + bounds.east) / 2,
  ];
}

function pointInRing(lng, lat, ring) {
  let inside = false;

  for (
    let i = 0, j = ring.length - 1;
    i < ring.length;
    j = i++
  ) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > lat !== yj > lat &&
      lng <
        ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) +
          xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygonGeometry(lng, lat, coordinates) {
  if (!coordinates?.length) return false;

  const [outerRing, ...holes] = coordinates;

  if (!pointInRing(lng, lat, outerRing)) return false;

  return !holes.some((hole) =>
    pointInRing(lng, lat, hole)
  );
}

function geometryContainsPoint(geometry, lat, lng) {
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInPolygonGeometry(
      lng,
      lat,
      geometry.coordinates
    );
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygonGeometry(lng, lat, polygon)
    );
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.some((child) =>
      geometryContainsPoint(child, lat, lng)
    );
  }

  return false;
}

function extractPostalCode(properties = {}) {
  const entries = Object.entries(properties);

  const preferredKeys = [
    "d_codigo",
    "codigo",
    "c_p",
    "cp",
    "postal",
    "cod_post",
    "codigopostal",
  ];

  for (const preferredKey of preferredKeys) {
    const match = entries.find(
      ([key]) =>
        key.toLocaleLowerCase("es-MX").replaceAll(" ", "") ===
        preferredKey
    );

    if (match) {
      const digits = String(match[1] ?? "").match(/\b\d{5}\b/);
      if (digits) return digits[0];
    }
  }

  for (const [, value] of entries) {
    const normalized = String(value ?? "").trim();
    if (/^\d{5}$/.test(normalized)) return normalized;
  }

  return null;
}


function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePropertyKey(key) {
  return normalizeSearchText(key).replaceAll(" ", "");
}

function uniqueTextValues(values) {
  const seen = new Set();

  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value && value.length <= 120)
    .filter((value) => {
      const key = normalizeSearchText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function extractPropertyValues(properties = {}, keyHints = []) {
  const normalizedHints = keyHints.map(normalizePropertyKey);

  return uniqueTextValues(
    Object.entries(properties)
      .filter(([key]) => {
        const normalizedKey = normalizePropertyKey(key);
        return normalizedHints.some((hint) =>
          normalizedKey.includes(hint)
        );
      })
      .map(([, value]) => value)
      .filter((value) => {
        const normalized = String(value ?? "").trim();
        return normalized && !/^\d{5}$/.test(normalized);
      })
  );
}

function extractSettlementNames(properties = {}) {
  return extractPropertyValues(properties, [
    "asenta",
    "asentamiento",
    "colonia",
    "barrio",
    "fracc",
    "poblado",
    "localidad",
    "nombreasent",
  ]);
}

function extractMunicipalityNames(properties = {}) {
  return extractPropertyValues(properties, [
    "municip",
    "mnpio",
    "deleg",
    "alcald",
  ]);
}

function extractCityNames(properties = {}) {
  return extractPropertyValues(properties, [
    "ciudad",
    "city",
  ]);
}

function getCatalogRowsForPostalCode(postalCode) {
  return nativeSettlementCatalog.get(postalCode) || [];
}

function mergeCatalogMetadataIntoZones() {
  postalZones = postalZones.map((zone) => {
    const catalogRows = getCatalogRowsForPostalCode(zone.postalCode);

    const settlements = uniqueTextValues([
      ...(zone.settlements || []),
      ...catalogRows.map((row) => row.settlement),
    ]);

    const municipalities = uniqueTextValues([
      ...(zone.municipalities || []),
      ...catalogRows.map((row) => row.municipality),
    ]);

    const cities = uniqueTextValues([
      ...(zone.cities || []),
      ...catalogRows.map((row) => row.city),
    ]);

    const settlementRecords = catalogRows
      .filter((row) => row.settlement)
      .map((row) => ({
        settlement: row.settlement,
        settlementType: row.settlementType || "",
        municipality: row.municipality || "",
        state: row.state || "",
        city: row.city || "",
        zoneType: row.zoneType || "",
        cityId: row.cityId || zone.cityId,
      }));

    return {
      ...zone,
      settlements,
      municipalities,
      cities,
      settlementRecords,
    };
  });

  rebuildPostalZoneIndex();
}

async function loadNativeSettlementCatalog() {
  try {
    const response = await fetch(
      `${SETTLEMENT_CATALOG_PATH}?v=7-final`,
      { cache: "no-store" }
    );

    if (!response.ok) return;

    const rows = await response.json();
    if (!Array.isArray(rows)) return;

    const index = new Map();

    rows.forEach((row) => {
      const postalCode = String(
        row.postalCode ?? row.cp ?? row.d_codigo ?? ""
      ).trim();

      if (!/^\d{5}$/.test(postalCode)) return;

      if (!index.has(postalCode)) {
        index.set(postalCode, []);
      }

      index.get(postalCode).push({
        settlement:
          row.settlement ??
          row.asentamiento ??
          row.colonia ??
          row.d_asenta ??
          "",
        settlementType:
          row.settlementType ??
          row.tipoAsentamiento ??
          row.d_tipo_asenta ??
          "",
        municipality:
          row.municipality ??
          row.municipio ??
          row.d_mnpio ??
          "",
        state:
          row.state ??
          row.estado ??
          row.d_estado ??
          "",
        city:
          row.city ??
          row.ciudad ??
          row.d_ciudad ??
          "",
        zoneType:
          row.zoneType ??
          row.zona ??
          row.d_zona ??
          "",
        cityId: row.cityId ?? "",
      });
    });

    nativeSettlementCatalog = index;
  } catch (error) {
    console.info(
      "Catálogo nativo de asentamientos no disponible.",
      error
    );
  }
}

function normalizeShpOutput(output) {
  const collections = Array.isArray(output) ? output : [output];

  return collections.flatMap((collection) => {
    if (collection?.type === "FeatureCollection") {
      return collection.features || [];
    }

    if (collection?.type === "Feature") {
      return [collection];
    }

    return [];
  });
}

function determineFeatureCity(stateKey, bounds) {
  const [lat, lng] = boundsCenter(bounds);

  const candidates = Object.values(CITY_CONFIG)
    .filter(
      (city) =>
        (!stateKey || city.stateKey === stateKey) &&
        boundsIntersect(bounds, city.extent)
    )
    .map((city) => ({
      city,
      distance: haversineKm(
        lat,
        lng,
        city.center[0],
        city.center[1]
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.city || null;
}

function rebuildPostalZoneIndex() {
  postalZoneById = new Map(
    postalZones.map((zone) => [zone.id, zone])
  );
}

function ingestGeoFeatures(features, stateKey = null) {
  const grouped = new Map();

  features.forEach((feature) => {
    if (!feature?.geometry) return;

    const bounds = getGeometryBounds(feature.geometry);
    if (!bounds) return;

    const city = determineFeatureCity(stateKey, bounds);
    if (!city) return;

    const postalCode = extractPostalCode(feature.properties);
    if (!postalCode) return;

    const groupKey = `${city.id}|${stateKey || city.stateKey}|${postalCode}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        cityId: city.id,
        stateKey: stateKey || city.stateKey,
        postalCode,
        geometries: [],
        settlements: new Set(),
        municipalities: new Set(),
        cities: new Set(),
      });
    }

    const group = grouped.get(groupKey);

    group.geometries.push(feature.geometry);

    extractSettlementNames(feature.properties).forEach((value) =>
      group.settlements.add(value)
    );

    extractMunicipalityNames(feature.properties).forEach((value) =>
      group.municipalities.add(value)
    );

    extractCityNames(feature.properties).forEach((value) =>
      group.cities.add(value)
    );
  });

  const incomingZones = [...grouped.values()].map((group) => {
    const geometry =
      group.geometries.length === 1
        ? group.geometries[0]
        : {
            type: "GeometryCollection",
            geometries: group.geometries,
          };

    const bounds = getGeometryBounds(geometry);
    const center = boundsCenter(bounds);
    const id = `postal-${group.stateKey}-${group.postalCode}`;

    return {
      id,
      cityId: group.cityId,
      stateKey: group.stateKey,
      postalCode: group.postalCode,
      name: `Zona postal · CP ${group.postalCode}`,
      settlements: uniqueTextValues([...group.settlements]),
      municipalities: uniqueTextValues([...group.municipalities]),
      cities: uniqueTextValues([...group.cities]),
      center,
      bounds: [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      feature: {
        type: "Feature",
        properties: {
          postalCode: group.postalCode,
          cityId: group.cityId,
          source: "SEPOMEX 2025",
        },
        geometry,
      },
    };
  });

  const zoneMap = new Map(
    postalZones.map((zone) => [zone.id, zone])
  );

  incomingZones.forEach((zone) => {
    zoneMap.set(zone.id, zone);
  });

  postalZones = [...zoneMap.values()].sort((a, b) =>
    a.postalCode.localeCompare(b.postalCode, "es-MX")
  );

  rebuildPostalZoneIndex();
}

function getCurrentCityZones() {
  return postalZones.filter(
    (zone) => zone.cityId === selectedCityId
  );
}

function hasSettlementSearchData() {
  return getCurrentCityZones().some(
    (zone) =>
      (zone.settlements || []).length ||
      (zone.municipalities || []).length ||
      (zone.cities || []).length
  );
}

function getZoneById(zoneId) {
  return postalZoneById.get(zoneId) || null;
}

function getPostalZoneForCoordinates(
  lat,
  lng,
  cityId = null
) {
  const candidates = postalZones.filter(
    (zone) =>
      (!cityId || zone.cityId === cityId) &&
      lat >= zone.bounds[0][0] &&
      lat <= zone.bounds[1][0] &&
      lng >= zone.bounds[0][1] &&
      lng <= zone.bounds[1][1]
  );

  return (
    candidates.find((zone) =>
      geometryContainsPoint(zone.feature.geometry, lat, lng)
    ) || null
  );
}

function assignReportsToPostalZones() {
  let changed = false;

  reports.forEach((report) => {
    const zone = getPostalZoneForCoordinates(
      report.lat,
      report.lng,
      report.cityId
    );

    if (!zone) return;

    if (
      report.zoneId !== zone.id ||
      report.postalCode !== zone.postalCode ||
      report.zoneLabel !== zone.name
    ) {
      report.zoneId = zone.id;
      report.postalCode = zone.postalCode;
      report.zoneLabel = zone.name;
      changed = true;
    }
  });

  if (changed) saveReports();
}

function inferStateKeyFromFileName(fileName) {
  const normalized = String(fileName || "")
    .toLocaleLowerCase("es-MX");

  if (
    normalized.includes("coah") ||
    normalized.includes("coahuila")
  ) {
    return "coahuila";
  }

  if (
    normalized.includes("dgo") ||
    normalized.includes("durango")
  ) {
    return "durango";
  }

  return null;
}

function getSourceModeSummary() {
  const modes = [...postalSourceModes.values()];

  return {
    native: modes.filter((mode) => mode === "native").length,
    remote: modes.filter((mode) => mode === "remote").length,
  };
}

function renderGeoStatus() {
  const cityZoneCount = getCurrentCityZones().length;
  const searchAvailable = cityZoneCount > 0;
  const modeSummary = getSourceModeSummary();

  zoneSearchInput.disabled = !searchAvailable;
  zoneSearchButton.disabled = !searchAvailable;

  geoStatusIcon.className = "geo-status-icon";
  geoRetryButton.classList.add("hidden");
  geoNativeBadge.classList.add("hidden");

  if (geoLoadState === "loading") {
    geoStatusIcon.classList.add("loading");
    geoStatusIcon.textContent = "⌁";
    geoStatusTitle.textContent =
      "Cargando geografía nativa…";
    geoStatusDetail.textContent =
      "Buscando CP_Coah.zip y CP_Dgo.zip dentro de data/sepomex/";
    mapLayerLabel.textContent =
      "Últimas 6 horas · Cargando capa postal";
    return;
  }

  if (geoLoadState === "ready") {
    geoStatusIcon.classList.add("ready");
    geoStatusIcon.textContent = "✓";
    geoStatusTitle.textContent =
      modeSummary.native === POSTAL_SOURCES.length
        ? "Geografía postal nativa lista"
        : "Capa postal oficial lista";

    geoStatusDetail.textContent =
      `${cityZoneCount} zonas postales en ${getCurrentCity().name} · ` +
      (
        modeSummary.native === POSTAL_SOURCES.length
          ? (
              hasSettlementSearchData()
                ? "ZIP SHP nativos + metadatos de asentamientos"
                : "ZIP SHP nativos · DBF oficial: d_cp"
            )
          : `${modeSummary.native} fuente(s) nativa(s) · ${modeSummary.remote} respaldo(s) remoto(s)`
      );

    if (modeSummary.native > 0) {
      geoNativeBadge.classList.remove("hidden");
    }

    mapLayerLabel.textContent =
      "Últimas 6 horas · Zonas postales SEPOMEX";
    return;
  }

  if (geoLoadState === "partial") {
    geoStatusIcon.classList.add("partial");
    geoStatusIcon.textContent = "!";
    geoStatusTitle.textContent =
      "Capa postal parcialmente cargada";
    geoStatusDetail.textContent =
      cityZoneCount
        ? `${cityZoneCount} zonas disponibles en ${getCurrentCity().name}. Revisa que ambos ZIP estén dentro de data/sepomex/.`
        : `La geometría de ${getCurrentCity().name} todavía no está disponible.`;

    geoRetryButton.classList.remove("hidden");

    if (modeSummary.native > 0) {
      geoNativeBadge.classList.remove("hidden");
    }

    mapLayerLabel.textContent =
      cityZoneCount
        ? "Últimas 6 horas · Capa postal parcial"
        : "Últimas 6 horas · Radar por puntos";
    return;
  }

  geoStatusIcon.classList.add("error");
  geoStatusIcon.textContent = "!";
  geoStatusTitle.textContent =
    "No se encontró la geografía postal";
  geoStatusDetail.textContent =
    "Coloca CP_Coah.zip y CP_Dgo.zip en data/sepomex/ y vuelve a cargar la app.";
  geoRetryButton.classList.remove("hidden");
  mapLayerLabel.textContent =
    "Últimas 6 horas · Radar por puntos";
}

async function loadPostalSource(source) {
  const attempts = [
    {
      mode: "native",
      path: `${source.localPath}?v=7`,
    },
    {
      mode: "remote",
      path: source.remoteUrl,
    },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      const output = await window.shp(attempt.path);
      const features = normalizeShpOutput(output);

      if (!features.length) {
        throw new Error(
          "El archivo no devolvió entidades geográficas."
        );
      }

      return {
        features,
        mode: attempt.mode,
      };
    } catch (error) {
      errors.push(
        `${attempt.mode}: ${error?.message || "error de carga"}`
      );
    }
  }

  throw new Error(
    `${source.label}: ${errors.join(" | ")}`
  );
}

async function loadNativePostalGeometry() {
  if (typeof window.shp !== "function") {
    geoLoadState = "error";
    geoErrors = ["La biblioteca SHP no pudo cargarse."];
    renderReports();
    return;
  }

  geoLoadState = "loading";
  geoErrors = [];
  loadedStateKeys = new Set();
  postalSourceModes = new Map();
  postalZones = [];
  rebuildPostalZoneIndex();
  renderReports();

  await loadNativeSettlementCatalog();

  const results = await Promise.allSettled(
    POSTAL_SOURCES.map(async (source) => {
      const result = await loadPostalSource(source);

      ingestGeoFeatures(
        result.features,
        source.stateKey
      );

      loadedStateKeys.add(source.stateKey);
      postalSourceModes.set(
        source.stateKey,
        result.mode
      );

      return {
        source,
        featureCount: result.features.length,
        mode: result.mode,
      };
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const source = POSTAL_SOURCES[index];

      geoErrors.push(
        `${source.label}: ${result.reason?.message || "error de carga"}`
      );

      console.warn(
        `No se pudo cargar ${source.label}.`,
        result.reason
      );
    }
  });

  mergeCatalogMetadataIntoZones();
  assignReportsToPostalZones();
  populateZoneSearch();

  if (loadedStateKeys.size === POSTAL_SOURCES.length) {
    geoLoadState = "ready";
  } else if (postalZones.length) {
    geoLoadState = "partial";
  } else {
    geoLoadState = "error";
  }

  renderReports();
}


function renderReports() {
  const cityReports = getCurrentCityReports();

  renderCityControls();
  renderGeoStatus();
  renderZonePolygons(cityReports);
  renderReportMarkers(cityReports);
  renderSummary(cityReports);
  renderZoneRadar(cityReports);
  renderSignals(cityReports);
  renderRestorationAlert(cityReports);
  renderRecentList(cityReports);
}

function renderCityControls() {
  const city = getCurrentCity();

  activeCityLabel.textContent = city.name;
  zoneSearchInput.placeholder = hasSettlementSearchData()
    ? `Buscar CP, colonia o asentamiento en ${city.name}…`
    : `Buscar código postal en ${city.name}…`;

  citySelector
    .querySelectorAll("[data-city-id]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.cityId === selectedCityId
      );
    });
}

function renderZonePolygons(cityReports) {
  zoneLayer.clearLayers();

  getCurrentCityZones().forEach((zone) => {
    const zoneReports = getReportsForZone(zone.id, cityReports);
    const analysis = getRadarAnalysis(zoneReports);
    const predominantStatus = analysis.predominantStatus;
    const isSelected = selectedZoneId === zone.id;

    const fillColor = predominantStatus
      ? getStatusColor(predominantStatus)
      : getCurrentTheme() === "dark"
        ? "#55d7ff"
        : "#087fa5";

    const confidenceBoost = Math.min(
      0.11,
      analysis.confidence / 1000
    );

    const geoJsonLayer = L.geoJSON(zone.feature, {
      style: {
        color: fillColor,
        weight: isSelected ? 3 : 1.25,
        opacity: isSelected ? 0.95 : 0.5,
        dashArray: predominantStatus ? null : "5 5",
        fillColor,
        fillOpacity: predominantStatus
          ? (isSelected ? 0.2 : 0.08) + confidenceBoost
          : 0.025,
      },
    });

    geoJsonLayer.on("click", (event) => {
      if (event.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
      }

      selectZone(zone.id);
    });

    const tooltipSettlements = zone.settlements
      .slice(0, 2)
      .map((name) => escapeHtml(name))
      .join(" · ");

    geoJsonLayer.bindTooltip(
      `
        <div class="postal-tooltip">
          <strong>CP ${escapeHtml(zone.postalCode)}</strong>
          <span>${zoneReports.length} reportes · ${escapeHtml(analysis.strengthLabel)}</span>
          ${tooltipSettlements
            ? `<div class="postal-settlements">${tooltipSettlements}</div>`
            : ""}
        </div>
      `,
      { sticky: true }
    );

    geoJsonLayer.addTo(zoneLayer);
  });
}

function renderReportMarkers(cityReports) {
  reportLayer.clearLayers();

  cityReports.forEach((report) => {
    const config = STATUS_CONFIG[report.status];
    if (!config) return;

    const zone = getZoneById(report.zoneId);
    const freshness = getFreshnessWeight(report);
    const reportWeight = getReportWeight(report);
    const possibleChange = isReportPossiblyChanged(report);

    const baseRadius =
      report.status === "no_water"
        ? 1050
        : report.status === "low_pressure"
          ? 850
          : 650;

    const radius =
      baseRadius *
      Math.min(
        1.3,
        Math.max(0.72, 0.78 + reportWeight * 0.16)
      );

    const color = getStatusColor(report.status);

    const haloOpacity = Math.min(
      0.22,
      (
        0.06 +
        0.08 * freshness +
        Math.min(report.confirmCount, 8) * 0.008
      ) * (possibleChange ? 0.32 : 1)
    );

    L.circle([report.lat, report.lng], {
      radius,
      stroke: false,
      fillColor: color,
      fillOpacity: haloOpacity,
    }).addTo(reportLayer);

    const popupTags = report.tags
      .map((tagId) => getTagConfig(tagId))
      .filter(Boolean)
      .slice(0, 5)
      .map(
        (tag) =>
          `<span class="popup-tag">${escapeHtml(tag.label)}</span>`
      )
      .join("");

    const reportLocation = getReportLocationText(report);
    const zoneName = reportLocation.full;

    L.circleMarker([report.lat, report.lng], {
      radius: Math.min(
        11,
        7.5 + report.confirmCount * 0.18
      ),
      color:
        getCurrentTheme() === "dark"
          ? "#07111f"
          : "#ffffff",
      weight: 3,
      fillColor: color,
      fillOpacity: possibleChange ? 0.48 : 1,
    })
      .bindPopup(
        `
          <div class="popup-status">
            <i style="background:${color}"></i>
            <span>${escapeHtml(config.label)}</span>
          </div>

          <div class="popup-meta">
            ${escapeHtml(zoneName)} · ${escapeHtml(getRelativeTime(report.createdAt))}
          </div>

          ${report.settlementType
            ? `<div class="popup-settlement-type">${escapeHtml(report.settlementType)}</div>`
            : ""}

          <div class="popup-trust">
            <span>👍 ${report.confirmCount} confirman</span>
            <span>↻ ${report.changeCount} ya cambió</span>
          </div>

          ${possibleChange
            ? '<div class="popup-change-alert">⚠ Posible cambio en la situación</div>'
            : ""}

          ${popupTags
            ? `<div class="popup-tags">${popupTags}</div>`
            : ""}
        `,
        { className: "report-popup" }
      )
      .addTo(reportLayer);
  });
}

function renderSummary(cityReports) {
  const counts = getStatusCounts(cityReports);

  document.querySelector("#count-no-water").textContent =
    counts.no_water;
  document.querySelector("#count-low-pressure").textContent =
    counts.low_pressure;
  document.querySelector("#count-good-pressure").textContent =
    counts.good_pressure;
  document.querySelector("#report-count").textContent =
    `${cityReports.length} ${cityReports.length === 1 ? "reporte" : "reportes"}`;
}

function renderZoneRadar(cityReports) {
  const city = getCurrentCity();
  const selectedZone = getZoneById(selectedZoneId);

  const radarReports = selectedZone
    ? getReportsForZone(selectedZone.id, cityReports)
    : cityReports;

  const counts = getStatusCounts(radarReports);
  const analysis = getRadarAnalysis(radarReports);
  const predominantStatus = analysis.predominantStatus;
  const total = radarReports.length;

  document.querySelector("#selected-zone-name").textContent =
    selectedZone?.name || `Todo ${city.name}`;

  selectedZoneSettlements.textContent = selectedZone
    ? formatZoneSettlementSummary(selectedZone)
    : hasSettlementSearchData()
      ? "Busca por código postal, colonia o asentamiento disponible en la capa cargada."
      : "Los SHP oficiales cargados incluyen geometría postal y el campo d_cp. Busca por código postal.";

  document.querySelector("#zone-report-total").textContent =
    total;
  document.querySelector("#zone-no-water").textContent =
    counts.no_water;
  document.querySelector("#zone-low-pressure").textContent =
    counts.low_pressure;
  document.querySelector("#zone-good-pressure").textContent =
    counts.good_pressure;

  clearZoneButton.classList.toggle(
    "hidden",
    !selectedZone
  );

  const statusIcon =
    document.querySelector("#zone-status-icon");
  const statusLabel =
    document.querySelector("#zone-status-label");
  const statusDetail =
    document.querySelector("#zone-status-detail");
  const strengthBadge =
    document.querySelector("#zone-strength");

  statusIcon.className = "zone-status-icon";
  strengthBadge.className = "zone-strength";

  if (!predominantStatus) {
    statusIcon.classList.add("neutral");
    statusIcon.textContent = "≈";
    statusLabel.textContent = selectedZone
      ? "Sin señal suficiente"
      : "Radar general";
    statusDetail.textContent = selectedZone
      ? "Aún no hay reportes recientes en esta zona postal."
      : "Calculando la señal comunitaria de la ciudad.";
    strengthBadge.classList.add("neutral");
    strengthBadge.textContent = "Señal sin calcular";
  } else {
    const config = STATUS_CONFIG[predominantStatus];

    statusIcon.classList.add(predominantStatus);
    statusIcon.textContent = config.icon;
    statusLabel.textContent = config.label;
    statusDetail.textContent =
      `${analysis.confidence}% de la señal ponderada favorece este estado.`;

    strengthBadge.classList.add(analysis.strength);
    strengthBadge.textContent = analysis.strengthLabel;
  }

  const scoreTotal = analysis.totalScore || 0;

  const percentages = scoreTotal
    ? {
        no_water:
          (analysis.scores.no_water / scoreTotal) * 100,
        low_pressure:
          (analysis.scores.low_pressure / scoreTotal) * 100,
        good_pressure:
          (analysis.scores.good_pressure / scoreTotal) * 100,
      }
    : {
        no_water: 0,
        low_pressure: 0,
        good_pressure: 0,
      };

  document.querySelector("#bar-no-water").style.width =
    `${percentages.no_water}%`;
  document.querySelector("#bar-low-pressure").style.width =
    `${percentages.low_pressure}%`;
  document.querySelector("#bar-good-pressure").style.width =
    `${percentages.good_pressure}%`;
}

function renderSignals(cityReports) {
  const selectedZone = getZoneById(selectedZoneId);

  const contextReports = selectedZone
    ? getReportsForZone(selectedZone.id, cityReports)
    : cityReports;

  signalsContext.textContent =
    selectedZone?.postalCode
      ? `CP ${selectedZone.postalCode}`
      : getCurrentCity().name;

  const counts = new Map();

  contextReports.forEach((report) => {
    report.tags.forEach((tagId) => {
      if (!getTagConfig(tagId)) return;

      counts.set(
        tagId,
        (counts.get(tagId) || 0) + 1
      );
    });
  });

  const frequentSignals = [...counts.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        getTagConfig(a[0]).label.localeCompare(
          getTagConfig(b[0]).label,
          "es"
        )
    )
    .slice(0, 6);

  if (!frequentSignals.length) {
    signalsList.innerHTML = `
      <p class="signals-empty">
        Aún no hay etiquetas suficientes. Los próximos reportes pueden revelar patrones de horario, presión o calidad.
      </p>
    `;
    return;
  }

  signalsList.innerHTML = frequentSignals
    .map(([tagId, count]) => {
      const tag = getTagConfig(tagId);

      return `
        <span class="signal-chip">
          ${escapeHtml(tag.label)}
          <b>${count}</b>
        </span>
      `;
    })
    .join("");
}

function renderRecentList(cityReports) {
  const visibleReports = selectedZoneId
    ? getReportsForZone(selectedZoneId, cityReports)
    : cityReports;

  if (!visibleReports.length) {
    recentList.innerHTML = `
      <div class="empty-state">
        Aún no hay reportes recientes en esta zona postal. Sé la primera persona en actualizar el radar.
      </div>
    `;
    return;
  }

  const orderedReports = [...visibleReports].sort(
    (a, b) => {
      const weightDifference =
        getReportWeight(b) - getReportWeight(a);

      if (Math.abs(weightDifference) > 0.12) {
        return weightDifference;
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    }
  );

  recentList.innerHTML = orderedReports
    .slice(0, 8)
    .map((report) => {
      const config = STATUS_CONFIG[report.status];
      const zone = getZoneById(report.zoneId);
      const trustState = getReportTrustState(report);
      const localVote = localVotes[report.id] || null;

      const visibleTags = report.tags
        .map((tagId) => getTagConfig(tagId))
        .filter(Boolean)
        .slice(0, 3)
        .map(
          (tag) =>
            `<span class="recent-tag">${escapeHtml(tag.label)}</span>`
        )
        .join("");

      const voteLockedClass = localVote ? "locked" : "";
      const reportLocation = getReportLocationText(report);
      const zoneName = reportLocation.full;

      return `
        <article class="recent-report-card status-${escapeHtml(report.status)}">
          <button
            class="recent-report-focus"
            data-focus-report-id="${escapeHtml(report.id)}"
            type="button"
          >
            <span class="recent-status-icon">${escapeHtml(config.icon)}</span>

            <div>
              <strong>${escapeHtml(config.label)}</strong>
              <span>
                <span class="report-location-settlement">${escapeHtml(reportLocation.primary)}</span>
                ${reportLocation.secondary
                  ? ` <span class="report-location-postal">· ${escapeHtml(reportLocation.secondary)}</span>`
                  : ""}
              </span>
              ${visibleTags
                ? `<span class="recent-tags">${visibleTags}</span>`
                : ""}
            </div>

            <time class="recent-time">${escapeHtml(getRelativeTime(report.createdAt))}</time>
          </button>

          <div class="report-trust-row">
            <div class="trust-stats">
              <span>👍 ${report.confirmCount} confirman</span>
              <span>↻ ${report.changeCount} dicen que cambió</span>
            </div>

            <span class="trust-state ${escapeHtml(trustState.className)}">${escapeHtml(trustState.label)}</span>
          </div>

          <div class="report-vote-actions">
            <button
              class="vote-button confirm ${voteLockedClass} ${localVote === "confirm" ? "active" : ""}"
              data-vote-report-id="${escapeHtml(report.id)}"
              data-vote-type="confirm"
              type="button"
            >
              👍 Confirmar
              <b>${report.confirmCount}</b>
            </button>

            <button
              class="vote-button changed ${voteLockedClass} ${localVote === "changed" ? "active" : ""}"
              data-vote-report-id="${escapeHtml(report.id)}"
              data-vote-type="changed"
              type="button"
            >
              ↻ Ya cambió
              <b>${report.changeCount}</b>
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  recentList
    .querySelectorAll("[data-focus-report-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const report = reports.find(
          (item) =>
            item.id === button.dataset.focusReportId
        );

        if (!report) return;

        const zone = getZoneById(report.zoneId);
        selectedZoneId = zone?.id || null;
        zoneSearchInput.value = zone?.name || "";

        map.flyTo(
          [report.lat, report.lng],
          15,
          { duration: 0.7 }
        );

        renderReports();
      });
    });

  recentList
    .querySelectorAll("[data-vote-report-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        castCommunityVote(
          button.dataset.voteReportId,
          button.dataset.voteType
        );
      });
    });
}

function formatZoneSettlementSummary(zone) {
  const settlements = zone?.settlements || [];
  const municipalities = zone?.municipalities || [];

  if (!settlements.length) {
    return municipalities.length
      ? `Municipio asociado en los datos: ${municipalities.join(", ")}.`
      : "El SHP cargado no expone nombres de asentamiento para este CP.";
  }

  const visible = settlements.slice(0, 4);
  const remaining = settlements.length - visible.length;
  const municipalityText = municipalities.length
    ? ` · ${municipalities[0]}`
    : "";

  return (
    `Asentamientos oficiales asociados al CP: ${visible.join(", ")}` +
    (remaining > 0 ? ` y ${remaining} más` : "") +
    municipalityText
  );
}

function getZoneSearchText(zone) {
  return normalizeSearchText(
    [
      zone.postalCode,
      zone.name,
      ...(zone.settlements || []),
      ...(zone.municipalities || []),
      ...(zone.cities || []),
    ].join(" ")
  );
}

function getZoneSearchMatches(query) {
  const normalizedQuery = normalizeSearchText(query);
  const postalMatch = normalizedQuery.match(/\b\d{5}\b/);

  if (!normalizedQuery) return [];

  return getCurrentCityZones()
    .map((zone) => {
      let score = 0;
      let matchedRecord = null;

      const records = zone.settlementRecords || [];
      const normalizedRecords = records.map((record) => ({
        record,
        name: normalizeSearchText(record.settlement),
      }));

      const exactRecord = normalizedRecords.find(
        ({ name }) => name === normalizedQuery
      );

      const startsWithRecord = normalizedRecords.find(
        ({ name }) => name.startsWith(normalizedQuery)
      );

      const containsRecord = normalizedRecords.find(
        ({ name }) => name.includes(normalizedQuery)
      );

      const municipalities = zone.municipalities || [];
      const normalizedMunicipalities = municipalities.map(
        normalizeSearchText
      );

      const searchText = getZoneSearchText(zone);

      if (
        postalMatch &&
        zone.postalCode === postalMatch[0]
      ) {
        score = 100;
      } else if (
        zone.postalCode.startsWith(normalizedQuery)
      ) {
        score = 92;
      } else if (exactRecord) {
        score = 88;
        matchedRecord = exactRecord.record;
      } else if (startsWithRecord) {
        score = 78;
        matchedRecord = startsWithRecord.record;
      } else if (containsRecord) {
        score = 70;
        matchedRecord = containsRecord.record;
      } else if (
        normalizedMunicipalities.some(
          (name) => name === normalizedQuery
        )
      ) {
        score = 62;
      } else if (
        searchText.includes(normalizedQuery)
      ) {
        score = 50;
      }

      return {
        zone,
        score,
        matchedRecord,
      };
    })
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (
          Boolean(b.matchedRecord) -
          Boolean(a.matchedRecord)
        ) ||
        a.zone.postalCode.localeCompare(
          b.zone.postalCode,
          "es-MX"
        )
    )
    .slice(0, 10);
}

function populateZoneSearch() {
  closeZoneSearchResults();
}

function getPrimaryZoneLabel(zone) {
  return (
    zone.settlements?.[0] ||
    `Zona postal CP ${zone.postalCode}`
  );
}

function renderZoneSearchResults(query) {
  const matches = getZoneSearchMatches(query);

  if (!query.trim()) {
    closeZoneSearchResults();
    return;
  }

  if (!matches.length) {
    zoneSearchResults.innerHTML = `
      <div class="empty-state">
        No encontramos coincidencias en ${escapeHtml(getCurrentCity().name)}.
      </div>
    `;
    zoneSearchResults.classList.remove("hidden");
    return;
  }

  zoneSearchResults.innerHTML = matches
    .map(({ zone, matchedRecord }) => {
      const primaryLabel =
        matchedRecord?.settlement ||
        getPrimaryZoneLabel(zone);

      const contextLabel = matchedRecord
        ? [
            matchedRecord.settlementType,
            matchedRecord.municipality,
          ]
            .filter(Boolean)
            .join(" · ")
        : (
            zone.municipalities?.[0] ||
            getCurrentCity().name
          );

      const relatedSettlements = zone.settlements
        .filter(
          (name) =>
            normalizeSearchText(name) !==
            normalizeSearchText(primaryLabel)
        )
        .slice(0, 3)
        .join(" · ");

      return `
        <button
          class="zone-search-result"
          data-search-zone-id="${escapeHtml(zone.id)}"
          data-search-label="${escapeHtml(primaryLabel)}"
          type="button"
        >
          <span class="zone-result-pin">⌖</span>

          <span class="zone-result-copy">
            <strong>${escapeHtml(primaryLabel)}</strong>
            <span>${escapeHtml(contextLabel)}</span>
            ${relatedSettlements
              ? `<small>También en este CP: ${escapeHtml(relatedSettlements)}</small>`
              : ""}
          </span>

          <span class="zone-result-cp">CP ${escapeHtml(zone.postalCode)}</span>
        </button>
      `;
    })
    .join("");

  zoneSearchResults
    .querySelectorAll("[data-search-zone-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectZone(
          button.dataset.searchZoneId,
          button.dataset.searchLabel
        );
      });
    });

  zoneSearchResults.classList.remove("hidden");
}

function closeZoneSearchResults() {
  zoneSearchResults.classList.add("hidden");
  zoneSearchResults.innerHTML = "";
}

function selectCity(cityId, { moveMap = true } = {}) {
  if (!CITY_CONFIG[cityId]) return;

  selectedCityId = cityId;
  selectedZoneId = null;

  selectedLocation = {
    lat: getCurrentCity().center[0],
    lng: getCurrentCity().center[1],
    source: `Centro de ${getCurrentCity().name}`,
  };

  localStorage.setItem(CITY_KEY, selectedCityId);

  zoneSearchInput.value = "";
  closeZoneSearchResults();
  selectionLayer.clearLayers();
  populateZoneSearch();

  if (moveMap) {
    map.flyTo(
      getCurrentCity().center,
      getCurrentCity().zoom,
      { duration: 0.75 }
    );
  }

  renderReports();
}

function selectZone(zoneId, preferredLabel = null) {
  const zone = getZoneById(zoneId);

  if (!zone || zone.cityId !== selectedCityId) {
    return;
  }

  selectedZoneId = zone.id;
  zoneSearchInput.value =
    preferredLabel ||
    zone.settlements?.[0] ||
    `CP ${zone.postalCode}`;

  closeZoneSearchResults();

  map.fitBounds(zone.bounds, {
    padding: [28, 28],
    maxZoom: 15,
    animate: true,
    duration: 0.7,
  });

  renderReports();

  if (!isMapFullscreen()) {
    document
      .querySelector("#zone-radar-card")
      .scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }
}

function searchZone() {
  const query = zoneSearchInput.value.trim();

  if (!getCurrentCityZones().length) {
    showToast(
      "La capa postal todavía no está disponible para esta ciudad."
    );
    return;
  }

  if (!query) {
    showToast(
      hasSettlementSearchData()
        ? "Escribe un código postal, colonia o asentamiento."
        : "Escribe un código postal de 5 dígitos."
    );
    return;
  }

  const [bestMatch] = getZoneSearchMatches(query);

  if (!bestMatch) {
    showToast(
      `No encontramos esa búsqueda en ${getCurrentCity().name}.`
    );
    renderZoneSearchResults(query);
    return;
  }

  selectZone(
    bestMatch.zone.id,
    bestMatch.matchedRecord?.settlement || null
  );
}


function clearSelectedZone() {
  selectedZoneId = null;
  zoneSearchInput.value = "";

  map.flyTo(
    getCurrentCity().center,
    getCurrentCity().zoom,
    { duration: 0.7 }
  );

  renderReports();
}


function getZoneSettlementRecords(zone) {
  if (!zone) return [];

  return [...(zone.settlementRecords || [])]
    .filter((record) => record.settlement)
    .sort((a, b) =>
      a.settlement.localeCompare(
        b.settlement,
        "es-MX",
        { sensitivity: "base" }
      )
    );
}

function getReportLocationText(report) {
  const zone = getZoneById(report.zoneId);
  const postalCode =
    report.postalCode ||
    zone?.postalCode ||
    null;

  if (report.settlement) {
    return {
      primary: report.settlement,
      secondary: postalCode ? `CP ${postalCode}` : "",
      full: postalCode
        ? `${report.settlement} · CP ${postalCode}`
        : report.settlement,
    };
  }

  const fallback =
    zone?.name ||
    report.zoneLabel ||
    "Ubicación reportada";

  return {
    primary: fallback,
    secondary: postalCode ? `CP ${postalCode}` : "",
    full: fallback,
  };
}

function resetSettlementPicker() {
  selectedSettlement = null;
  reportByPostalOnly = false;
  settlementSelect.value = "";
  settlementSelect.innerHTML =
    '<option value="">Selecciona tu colonia...</option>';
  settlementPicker.classList.add("hidden");
  settlementUnknownButton.classList.remove("active");
}

function renderSettlementPickerForLocation() {
  const zone = getPostalZoneForCoordinates(
    selectedLocation.lat,
    selectedLocation.lng,
    selectedCityId
  );

  selectedSettlement = null;
  reportByPostalOnly = false;
  settlementUnknownButton.classList.remove("active");

  if (!zone) {
    settlementPicker.classList.add("hidden");
    settlementSelect.innerHTML =
      '<option value="">Sin colonia disponible</option>';
    return;
  }

  const records = getZoneSettlementRecords(zone);

  if (!records.length) {
    settlementPicker.classList.add("hidden");
    settlementSelect.innerHTML =
      '<option value="">Sin asentamientos asociados</option>';
    return;
  }

  settlementPicker.classList.remove("hidden");
  settlementCount.textContent =
    `${records.length} ${records.length === 1 ? "opción" : "opciones"}`;
  settlementPickerCopy.textContent =
    `CP ${zone.postalCode} · Selecciona únicamente la colonia o asentamiento donde estás reportando.`;

  settlementSelect.innerHTML = [
    '<option value="">Selecciona tu colonia...</option>',
    ...records.map((record, index) => `
      <option value="${index}">
        ${escapeHtml(record.settlement)}${record.settlementType ? ` · ${escapeHtml(record.settlementType)}` : ""}
      </option>
    `),
  ].join("");

  settlementSelect.dataset.zoneId = zone.id;

  if (records.length === 1) {
    settlementSelect.value = "0";
    selectedSettlement = records[0];
  }
}

function getSelectedSettlementRecord() {
  const zone = getZoneById(
    settlementSelect.dataset.zoneId
  );

  if (!zone) return null;

  const records = getZoneSettlementRecords(zone);
  const selectedIndex = Number(settlementSelect.value);

  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= records.length
  ) {
    return null;
  }

  return records[selectedIndex];
}

function renderTagOptions(status) {
  selectedTags = [];
  updateTagCounter();

  if (!STATUS_CONFIG[status]) {
    reportTagsSection.classList.add("hidden");
    tagOptions.innerHTML = "";
    return;
  }

  reportTagsTitle.textContent =
    `Detalles de “${STATUS_CONFIG[status].label}”`;

  tagOptions.innerHTML = TAG_PRESETS[status]
    .map(
      (tag) => `
        <button
          class="tag-option"
          data-tag-id="${escapeHtml(tag.id)}"
          type="button"
        >
          ${escapeHtml(tag.label)}
        </button>
      `
    )
    .join("");

  reportTagsSection.classList.remove("hidden");

  tagOptions
    .querySelectorAll("[data-tag-id]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        toggleTag(button.dataset.tagId)
      );
    });
}

function toggleTag(tagId) {
  const isSelected = selectedTags.includes(tagId);

  if (isSelected) {
    selectedTags = selectedTags.filter(
      (item) => item !== tagId
    );
  } else {
    if (selectedTags.length >= MAX_REPORT_TAGS) {
      showToast(
        `Puedes elegir máximo ${MAX_REPORT_TAGS} etiquetas.`
      );
      return;
    }

    selectedTags.push(tagId);
  }

  tagOptions
    .querySelectorAll("[data-tag-id]")
    .forEach((button) => {
      button.classList.toggle(
        "selected",
        selectedTags.includes(button.dataset.tagId)
      );
    });

  updateTagCounter();
}

function updateTagCounter() {
  tagCount.textContent =
    `${selectedTags.length}/${MAX_REPORT_TAGS}`;
}

function openModal(modal) {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.classList.add("hidden");

  if (
    reportModal.classList.contains("hidden") &&
    infoModal.classList.contains("hidden") &&
    locationConsentModal.classList.contains("hidden")
  ) {
    document.body.style.overflow = "";
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

function setSelectedLocation(lat, lng, source) {
  selectedLocation = { lat, lng, source };
  reportLocationLabel.textContent = source;

  selectionLayer.clearLayers();

  L.circleMarker([lat, lng], {
    radius: 11,
    color:
      getCurrentTheme() === "dark"
        ? "#ffffff"
        : "#102536",
    weight: 3,
    fillColor:
      getCurrentTheme() === "dark"
        ? "#55d7ff"
        : "#087fa5",
    fillOpacity: 0.95,
  }).addTo(selectionLayer);

  if (!reportModal.classList.contains("hidden")) {
    renderSettlementPickerForLocation();
  }
}

function getCityForCoordinates(lat, lng) {
  const containingCities = Object.values(CITY_CONFIG)
    .filter((city) => {
      const [[south, west], [north, east]] = city.extent;

      return (
        lat >= south &&
        lat <= north &&
        lng >= west &&
        lng <= east
      );
    })
    .sort(
      (a, b) =>
        haversineKm(
          lat,
          lng,
          a.center[0],
          a.center[1]
        ) -
        haversineKm(
          lat,
          lng,
          b.center[0],
          b.center[1]
        )
    );

  return containingCities[0] || null;
}

function requestLocationAccess() {
  openModal(locationConsentModal);
}

function locateUser({ moveMap = true } = {}) {
  if (!navigator.geolocation) {
    showToast(
      "Tu navegador no permite obtener la ubicación."
    );
    return;
  }

  showToast("Buscando tu ubicación…");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const city = getCityForCoordinates(
        latitude,
        longitude
      );

      if (city && city.id !== selectedCityId) {
        selectCity(city.id, { moveMap: false });
      }

      const zone = getPostalZoneForCoordinates(
        latitude,
        longitude,
        city?.id || selectedCityId
      );

      if (zone) {
        selectedZoneId = zone.id;
        zoneSearchInput.value = `CP ${zone.postalCode}`;
      }

      setSelectedLocation(
        latitude,
        longitude,
        zone
          ? `Mi ubicación · ${getCurrentCity().name} · CP ${zone.postalCode}`
          : "Mi ubicación actual · sin zona postal detectada"
      );

      if (moveMap) {
        map.flyTo(
          [latitude, longitude],
          15,
          { duration: 0.8 }
        );
      }

      renderReports();

      showToast(
        zone
          ? `Ubicación lista · CP ${zone.postalCode}`
          : "Ubicación lista. La capa postal no identificó el punto."
      );
    },
    (error) => {
      console.warn(
        "No se pudo obtener la ubicación.",
        error
      );

      showToast(
        "No pudimos obtener tu GPS. Puedes tocar el mapa."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

function resetReportForm() {
  selectedStatus = null;
  selectedTags = [];
  selectedSettlement = null;
  reportByPostalOnly = false;
  submitReportButton.disabled = true;
  reportTagsSection.classList.add("hidden");
  tagOptions.innerHTML = "";
  resetSettlementPicker();
  updateTagCounter();

  document
    .querySelectorAll(".status-option")
    .forEach((button) => {
      button.classList.remove("selected");
    });
}

function getRelativeTime(dateString) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(dateString).getTime()) / 60000
    )
  );

  if (elapsedMinutes < 1) return "Ahora";
  if (elapsedMinutes < 60) {
    return `Hace ${elapsedMinutes} min`;
  }

  return `Hace ${Math.floor(elapsedMinutes / 60)} h`;
}

function isMapFullscreen() {
  return mapCard.classList.contains("map-fullscreen");
}

function setMapFullscreen(enabled) {
  mapCard.classList.toggle("map-fullscreen", enabled);
  document.body.classList.toggle(
    "map-is-fullscreen",
    enabled
  );

  mapFullscreenIcon.textContent = enabled ? "✕" : "⛶";
  mapFullscreenButton.setAttribute(
    "aria-label",
    enabled
      ? "Salir de pantalla completa"
      : "Ver mapa en pantalla completa"
  );
  mapFullscreenButton.title = enabled
    ? "Salir de pantalla completa"
    : "Pantalla completa";

  requestAnimationFrame(() => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 260);
}

map.on("click", (event) => {
  const { lat, lng } = event.latlng;

  const zone = getPostalZoneForCoordinates(
    lat,
    lng,
    selectedCityId
  );

  setSelectedLocation(
    lat,
    lng,
    zone
      ? `Punto elegido · CP ${zone.postalCode}`
      : `Punto elegido en ${getCurrentCity().name} · sin zona postal detectada`
  );

  if (zone) {
    selectedZoneId = zone.id;
    zoneSearchInput.value = `CP ${zone.postalCode}`;
  }

  renderReports();
  showToast(
    zone
      ? `Ubicación actualizada · CP ${zone.postalCode}`
      : "Ubicación actualizada. El reporte se guardará por coordenada."
  );
});

citySelector
  .querySelectorAll("[data-city-id]")
  .forEach((button) => {
    button.addEventListener("click", () =>
      selectCity(button.dataset.cityId)
    );
  });

mapFullscreenButton.addEventListener("click", () => {
  setMapFullscreen(!isMapFullscreen());
});

themeButton.addEventListener("click", () => {
  const nextTheme =
    getCurrentTheme() === "dark" ? "light" : "dark";

  applyTheme(nextTheme);

  showToast(
    nextTheme === "dark"
      ? "Tema oscuro activado."
      : "Tema claro activado."
  );
});

zoneSearchButton.addEventListener("click", searchZone);
clearZoneButton.addEventListener(
  "click",
  clearSelectedZone
);

zoneSearchInput.addEventListener("input", () => {
  renderZoneSearchResults(zoneSearchInput.value);
});

zoneSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchZone();
  }

  if (event.key === "Escape") {
    closeZoneSearchResults();
  }
});

document.addEventListener("click", (event) => {
  const isInsideSearch =
    event.target.closest(".zone-search-card") ||
    event.target.closest("#zone-search-results");

  if (!isInsideSearch) {
    closeZoneSearchResults();
  }
});

geoRetryButton.addEventListener(
  "click",
  loadNativePostalGeometry
);

document
  .querySelector("#open-report-button")
  .addEventListener("click", () => {
    resetReportForm();
    reportLocationLabel.textContent =
      selectedLocation.source;
    openModal(reportModal);
    renderSettlementPickerForLocation();
  });

document
  .querySelector("#close-report-button")
  .addEventListener("click", () => {
    closeModal(reportModal);
  });

document
  .querySelector("#info-button")
  .addEventListener("click", () => {
    openModal(infoModal);
  });

document
  .querySelector("#open-legal-button")
  .addEventListener("click", () => {
    openModal(infoModal);
  });

document
  .querySelector("#close-info-button")
  .addEventListener("click", () => {
    closeModal(infoModal);
  });

document
  .querySelector("#locate-button")
  .addEventListener("click", requestLocationAccess);

document
  .querySelector("#report-locate-button")
  .addEventListener("click", requestLocationAccess);

document
  .querySelector("#close-location-consent-button")
  .addEventListener("click", () => {
    closeModal(locationConsentModal);
  });

document
  .querySelector("#decline-location-button")
  .addEventListener("click", () => {
    closeModal(locationConsentModal);
    showToast("Puedes seguir usando Radar Laguna sin compartir tu ubicación.");
  });

document
  .querySelector("#accept-location-button")
  .addEventListener("click", () => {
    closeModal(locationConsentModal);
    locateUser({ moveMap: true });
  });

settlementSelect.addEventListener("change", () => {
  selectedSettlement = getSelectedSettlementRecord();
  reportByPostalOnly = false;
  settlementUnknownButton.classList.remove("active");
});

settlementUnknownButton.addEventListener("click", () => {
  selectedSettlement = null;
  reportByPostalOnly = true;
  settlementSelect.value = "";
  settlementUnknownButton.classList.add("active");
  showToast("El reporte se guardará solo por código postal.");
});

document
  .querySelectorAll(".status-option")
  .forEach((button) => {
    button.addEventListener("click", () => {
      selectedStatus = button.dataset.status;

      document
        .querySelectorAll(".status-option")
        .forEach((option) => {
          option.classList.toggle(
            "selected",
            option === button
          );
        });

      renderTagOptions(selectedStatus);
      submitReportButton.disabled = false;
    });
  });

submitReportButton.addEventListener("click", async () => {
  if (!selectedStatus) return;

  const zone = getPostalZoneForCoordinates(
    selectedLocation.lat,
    selectedLocation.lng,
    selectedCityId
  );

  const settlementRecords = getZoneSettlementRecords(zone);

  if (
    zone &&
    settlementRecords.length &&
    !selectedSettlement &&
    !reportByPostalOnly
  ) {
    showToast(
      "Selecciona tu colonia o elige “No estoy seguro · reportar solo por CP”."
    );
    settlementPicker.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }

  const newReport = normalizeReport({
    id: crypto.randomUUID(),
    cityId: selectedCityId,
    zoneId: zone?.id || null,
    postalCode: zone?.postalCode || null,
    zoneLabel: zone?.name || null,
    settlement: selectedSettlement?.settlement || null,
    settlementType: selectedSettlement?.settlementType || null,
    status: selectedStatus,
    tags: selectedTags,
    confirmCount: 0,
    changeCount: 0,
    lat: Number(selectedLocation.lat),
    lng: Number(selectedLocation.lng),
    createdAt: new Date().toISOString(),
  });

  let publishedReport = newReport;
  let sharedWithCommunity = false;

  if (supabaseConnected && window.RadarSupabase?.isConnected()) {
    submitReportButton.disabled = true;
    submitReportButton.textContent = "Publicando…";

    try {
      publishedReport = normalizeReport(
        await window.RadarSupabase.publishReport(newReport)
      );
      sharedWithCommunity = true;
    } catch (error) {
      console.error("No se pudo publicar el reporte en Supabase.", error);
      showToast(
        "No se pudo compartir en tiempo real. Se guardará solo en este dispositivo."
      );
    } finally {
      submitReportButton.textContent = "Publicar reporte";
    }
  }

  reports.unshift(publishedReport);
  saveReports();

  if (zone) {
    selectedZoneId = zone.id;
    zoneSearchInput.value = `CP ${zone.postalCode}`;
  }

  map.flyTo(
    [publishedReport.lat, publishedReport.lng],
    Math.max(map.getZoom(), 14),
    { duration: 0.7 }
  );

  closeModal(reportModal);
  selectionLayer.clearLayers();
  resetReportForm();
  renderReports();

  const tagMessage = publishedReport.tags.length
    ? ` · ${publishedReport.tags.length} ${publishedReport.tags.length === 1 ? "etiqueta" : "etiquetas"}`
    : "";

  const locationMessage = publishedReport.settlement
    ? ` · ${publishedReport.settlement}`
    : publishedReport.postalCode
      ? ` · CP ${publishedReport.postalCode}`
      : "";

  showToast(
    sharedWithCommunity
      ? `Reporte compartido: ${STATUS_CONFIG[publishedReport.status].label}${locationMessage}${tagMessage}`
      : `Reporte local: ${STATUS_CONFIG[publishedReport.status].label}${locationMessage}${tagMessage}`
  );

  if (sharedWithCommunity) {
    scheduleSupabaseRefresh(100);
  }
});

[reportModal, infoModal, locationConsentModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (isMapFullscreen()) {
      setMapFullscreen(false);
      return;
    }

    closeModal(reportModal);
    closeModal(infoModal);
    closeModal(locationConsentModal);
  }
});

initializeTheme();
populateZoneSearch();
renderReports();
loadNativePostalGeometry();
initializeSupabase();

setInterval(() => {
  renderReports();

  if (supabaseConnected) {
    refreshSupabaseData({ silent: true });
  }
}, 60000);
