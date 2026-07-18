"use strict";

/* Compatibilidad: V12 esperaba cinco fragmentos; la versión pública usa uno solo. */
(function mapCompactPostalLayer(global) {
  const originalFetch = global.fetch.bind(global);
  const compactPath = "./data/geo/laguna-postal.compact.txt?v=12";
  const fragmentPattern = /laguna-postal\.0([1-5])\.txt/i;

  global.fetch = function radarV12Fetch(input, init) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const match = url.match(fragmentPattern);

    if (match?.[1] === "1") {
      return originalFetch(compactPath, init);
    }

    if (match && Number(match[1]) >= 2) {
      return Promise.resolve(
        new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }

    return originalFetch(input, init);
  };
})(window);
