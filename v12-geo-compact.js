"use strict";

/* Radar Laguna V13.2.1 · adaptador geográfico directo y robusto. */
(function installDirectCompactPostalLayer(global) {
  const previousShp = global.shp;
  const compactPath = "./data/geo/laguna-postal.compact.txt?v=13.2.2";
  let geometryPromise = null;

  async function loadCompactGeometry() {
    if (!geometryPromise) {
      geometryPromise = (async () => {
        const response = await fetch(compactPath, { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`Capa postal compacta no disponible (${response.status}).`);
        }

        const base64 = (await response.text()).trim();
        if (!base64) throw new Error("La capa postal compacta está vacía.");

        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

        if (!("DecompressionStream" in global)) {
          throw new Error("Este navegador no admite la descompresión de la capa postal.");
        }

        const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream("gzip"));

        const collection = JSON.parse(await new Response(stream).text());
        if (
          collection?.type !== "FeatureCollection" ||
          !Array.isArray(collection.features) ||
          !collection.features.length
        ) {
          throw new Error("La capa postal compacta no tiene una estructura válida.");
        }

        return collection;
      })().catch((error) => {
        geometryPromise = null;
        throw error;
      });
    }

    return geometryPromise;
  }

  if (typeof previousShp === "function") {
    global.shp = async function radarDirectPostalAdapter(source, ...args) {
      const sourceText = String(source || "");
      const stateKey = sourceText.includes("CP_Coah.zip")
        ? "coahuila"
        : sourceText.includes("CP_Dgo.zip")
          ? "durango"
          : null;

      if (stateKey) {
        try {
          const collection = await loadCompactGeometry();
          return {
            ...collection,
            features: collection.features.filter(
              (feature) => feature?.properties?.stateKey === stateKey
            ),
          };
        } catch (error) {
          console.error("No se pudo cargar la geografía postal compacta.", error);
        }
      }

      return previousShp(source, ...args);
    };
  }

  global.RadarPostalGeometry = Object.freeze({
    load: loadCompactGeometry,
    source: "compact-local",
  });
})(window);
