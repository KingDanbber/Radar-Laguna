"use strict";
const CACHE_NAME = "radar-laguna-v13-shell-1";
const OFFLINE_URL = "./offline.html";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./v12.js", "./v12-geo-compact.js", "./catalog-loader.js", "./v13.js",
  "./supabase-config.js", "./supabase-service.js", "./manifest.webmanifest",
  "./offline.html", "./aviso-privacidad.html", "./terminos.html", "./fuentes-metodologia.html",
  "./assets/logo-radar-laguna.png", "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png", "./data/laguna-postal.geojson",
  "./data/sepomex/catalogo_asentamientos.json", "./data/geo/laguna-postal.compact.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname.endsWith("supabase.co")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      return response;
    }).catch(async () => (await caches.match("./index.html")) || caches.match(OFFLINE_URL)));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
