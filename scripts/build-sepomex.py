#!/usr/bin/env python3
"""Genera los activos ligeros de Radar Laguna desde los ZIP SHP oficiales.

Entradas:
  data/sepomex/CP_Coah.zip
  data/sepomex/CP_Dgo.zip

Salidas:
  data/geo/laguna-postal.compact.txt
  data/sepomex/catalogo_asentamientos.json
  data/sepomex/sepomex-build-report.json
"""

from __future__ import annotations

import base64
import gzip
import hashlib
import json
import math
import re
import tempfile
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

import shapefile  # pyshp
from pyproj import CRS, Transformer
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform as shapely_transform
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEPOMEX_DIR = DATA_DIR / "sepomex"
GEO_DIR = DATA_DIR / "geo"
CATALOG_LOADER = ROOT / "catalog-loader.js"

SOURCE_ZIPS = {
    "coahuila": SEPOMEX_DIR / "CP_Coah.zip",
    "durango": SEPOMEX_DIR / "CP_Dgo.zip",
}

# Extensiones idénticas a CITY_CONFIG de app.js. Formato: sur, oeste, norte, este.
CITY_CONFIG = {
    "torreon": {
        "name": "Torreón",
        "stateKey": "coahuila",
        "center": (25.5439, -103.4190),
        "extent": (25.455, -103.57, 25.665, -103.275),
    },
    "gomez_palacio": {
        "name": "Gómez Palacio",
        "stateKey": "durango",
        "center": (25.5891, -103.4859),
        "extent": (25.52, -103.61, 25.69, -103.405),
    },
    "lerdo": {
        "name": "Lerdo",
        "stateKey": "durango",
        "center": (25.5447, -103.5263),
        "extent": (25.46, -103.665, 25.63, -103.43),
    },
}

POSTAL_KEY_HINTS = (
    "d_codigo",
    "codigo",
    "codigo_postal",
    "codigopostal",
    "d_cp",
    "c_p",
    "cp",
    "postal",
    "cod_post",
)
SETTLEMENT_KEY_HINTS = (
    "d_asenta",
    "asentamiento",
    "asenta",
    "colonia",
    "barrio",
    "fraccionamiento",
    "fracc",
    "poblado",
    "localidad",
    "nombre_asent",
)
SETTLEMENT_TYPE_KEY_HINTS = (
    "d_tipo_asenta",
    "tipo_asentamiento",
    "tipoasentamiento",
    "tipo_asenta",
)
MUNICIPALITY_KEY_HINTS = (
    "d_mnpio",
    "municipio",
    "municip",
    "mnpio",
    "delegacion",
    "deleg",
    "alcaldia",
)
STATE_KEY_HINTS = ("d_estado", "estado", "entidad")
CITY_KEY_HINTS = ("d_ciudad", "ciudad", "city")
ZONE_TYPE_KEY_HINTS = ("d_zona", "zona", "zone_type")

SIMPLIFY_TOLERANCE = 0.000055  # ~5–6 m en La Laguna.
ROUND_DECIMALS = 6
MIN_EXPECTED_ZONES = 50


def normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def normalize_key(value: Any) -> str:
    return normalize_text(value).replace(" ", "")


def compact_string(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def first_value(properties: dict[str, Any], hints: Iterable[str]) -> str:
    normalized = {normalize_key(key): value for key, value in properties.items()}
    hint_keys = [normalize_key(hint) for hint in hints]

    for hint in hint_keys:
        if hint in normalized:
            value = compact_string(normalized[hint])
            if value:
                return value

    for key, value in normalized.items():
        if any(hint in key for hint in hint_keys):
            text = compact_string(value)
            if text:
                return text

    return ""


def extract_postal_code(properties: dict[str, Any]) -> str:
    preferred = first_value(properties, POSTAL_KEY_HINTS)
    match = re.search(r"(?<!\d)(\d{5})(?!\d)", preferred)
    if match:
        return match.group(1)

    for value in properties.values():
        match = re.fullmatch(r"\s*(\d{5})\s*", str(value or ""))
        if match:
            return match.group(1)

    return ""


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def choose_city(state_key: str, geometry: Any) -> str | None:
    minx, miny, maxx, maxy = geometry.bounds
    center_lat = (miny + maxy) / 2
    center_lng = (minx + maxx) / 2
    candidates: list[tuple[float, str]] = []

    for city_id, city in CITY_CONFIG.items():
        if city["stateKey"] != state_key:
            continue
        south, west, north, east = city["extent"]
        if maxx < west or minx > east or maxy < south or miny > north:
            continue
        distance = haversine_km(
            center_lat,
            center_lng,
            city["center"][0],
            city["center"][1],
        )
        candidates.append((distance, city_id))

    candidates.sort()
    return candidates[0][1] if candidates else None


def discover_transformer(shp_path: Path, reader: shapefile.Reader, warnings: list[str]) -> Callable | None:
    prj_path = shp_path.with_suffix(".prj")
    source_crs: CRS | None = None

    if prj_path.exists():
        try:
            source_crs = CRS.from_wkt(prj_path.read_text(encoding="utf-8", errors="ignore"))
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"No se pudo leer {prj_path.name}: {exc}")

    if source_crs is None:
        minx, miny, maxx, maxy = reader.bbox
        looks_geographic = (
            -180 <= minx <= 180
            and -180 <= maxx <= 180
            and -90 <= miny <= 90
            and -90 <= maxy <= 90
        )
        if looks_geographic:
            return None
        raise RuntimeError(
            f"{shp_path.name} parece usar coordenadas proyectadas, pero no incluye un .prj válido."
        )

    target_crs = CRS.from_epsg(4326)
    if source_crs.equals(target_crs):
        return None

    return Transformer.from_crs(source_crs, target_crs, always_xy=True).transform


def open_reader(shp_path: Path) -> shapefile.Reader:
    last_error: Exception | None = None
    for encoding in ("utf-8", "cp1252", "latin1"):
        try:
            return shapefile.Reader(str(shp_path), encoding=encoding, encodingErrors="replace")
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"No se pudo abrir {shp_path.name}: {last_error}")


def polygonal_only(geometry: Any) -> Polygon | MultiPolygon | None:
    if geometry.is_empty:
        return None
    if isinstance(geometry, (Polygon, MultiPolygon)):
        return geometry
    if isinstance(geometry, GeometryCollection):
        polygons = [item for item in geometry.geoms if isinstance(item, (Polygon, MultiPolygon))]
        if not polygons:
            return None
        merged = unary_union(polygons)
        return merged if isinstance(merged, (Polygon, MultiPolygon)) else None
    return None


def round_coordinates(value: Any) -> Any:
    if isinstance(value, (list, tuple)):
        if len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
            return [round(float(item), ROUND_DECIMALS) for item in value]
        return [round_coordinates(item) for item in value]
    return value


def geometry_mapping(geometry: Any) -> dict[str, Any]:
    geo = mapping(geometry)
    return {
        "type": geo["type"],
        "coordinates": round_coordinates(geo["coordinates"]),
    }


def infer_city_id_from_metadata(state_key: str, properties: dict[str, Any]) -> str:
    combined = normalize_text(
        " ".join(
            filter(
                None,
                [
                    first_value(properties, MUNICIPALITY_KEY_HINTS),
                    first_value(properties, CITY_KEY_HINTS),
                ],
            )
        )
    )

    if state_key == "coahuila" and "torreon" in combined:
        return "torreon"
    if state_key == "durango" and "gomez palacio" in combined:
        return "gomez_palacio"
    if state_key == "durango" and re.search(r"\blerdo\b", combined):
        return "lerdo"
    return ""


def catalog_row_from_properties(
    state_key: str,
    properties: dict[str, Any],
    city_id_hint: str = "",
) -> dict[str, str] | None:
    postal_code = extract_postal_code(properties)
    settlement = first_value(properties, SETTLEMENT_KEY_HINTS)
    if not postal_code or not settlement:
        return None

    city_id = infer_city_id_from_metadata(state_key, properties) or city_id_hint
    if city_id not in CITY_CONFIG:
        return None

    return {
        "postalCode": postal_code,
        "settlement": settlement,
        "settlementType": first_value(properties, SETTLEMENT_TYPE_KEY_HINTS),
        "municipality": first_value(properties, MUNICIPALITY_KEY_HINTS),
        "state": first_value(properties, STATE_KEY_HINTS),
        "city": first_value(properties, CITY_KEY_HINTS),
        "zoneType": first_value(properties, ZONE_TYPE_KEY_HINTS),
        "cityId": city_id,
    }


def decode_embedded_catalog(warnings: list[str]) -> list[dict[str, Any]]:
    if not CATALOG_LOADER.exists():
        warnings.append("No existe catalog-loader.js para usarlo como respaldo de asentamientos.")
        return []

    source = CATALOG_LOADER.read_text(encoding="utf-8")
    match = re.search(r'CATALOG_GZIP_BASE64\s*=\s*"([A-Za-z0-9+/=]+)"', source)
    if not match:
        warnings.append("No se encontró el catálogo comprimido dentro de catalog-loader.js.")
        return []

    try:
        decoded = gzip.decompress(base64.b64decode(match.group(1)))
        rows = json.loads(decoded.decode("utf-8"))
        return rows if isinstance(rows, list) else []
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"No se pudo recuperar el catálogo embebido: {exc}")
        return []


def normalize_catalog_row(row: dict[str, Any]) -> dict[str, str] | None:
    postal_code = compact_string(row.get("postalCode") or row.get("cp") or row.get("d_codigo"))
    settlement = compact_string(
        row.get("settlement")
        or row.get("asentamiento")
        or row.get("colonia")
        or row.get("d_asenta")
    )
    city_id = compact_string(row.get("cityId"))

    if not re.fullmatch(r"\d{5}", postal_code) or not settlement:
        return None
    if city_id not in CITY_CONFIG:
        metadata = {
            "d_mnpio": row.get("municipality") or row.get("municipio") or row.get("d_mnpio"),
            "d_ciudad": row.get("city") or row.get("ciudad") or row.get("d_ciudad"),
        }
        state_key = "coahuila" if postal_code.startswith("27") else "durango"
        city_id = infer_city_id_from_metadata(state_key, metadata)
    if city_id not in CITY_CONFIG:
        return None

    return {
        "postalCode": postal_code,
        "settlement": settlement,
        "settlementType": compact_string(
            row.get("settlementType")
            or row.get("tipoAsentamiento")
            or row.get("d_tipo_asenta")
        ),
        "municipality": compact_string(
            row.get("municipality") or row.get("municipio") or row.get("d_mnpio")
        ),
        "state": compact_string(row.get("state") or row.get("estado") or row.get("d_estado")),
        "city": compact_string(row.get("city") or row.get("ciudad") or row.get("d_ciudad")),
        "zoneType": compact_string(row.get("zoneType") or row.get("zona") or row.get("d_zona")),
        "cityId": city_id,
    }


def deduplicate_catalog(rows: Iterable[dict[str, Any]]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for raw_row in rows:
        row = normalize_catalog_row(raw_row)
        if not row:
            continue
        key = (
            row["postalCode"],
            normalize_text(row["settlement"]),
            row["cityId"],
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(row)

    return sorted(
        result,
        key=lambda row: (row["cityId"], row["postalCode"], normalize_text(row["settlement"])),
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build() -> dict[str, Any]:
    GEO_DIR.mkdir(parents=True, exist_ok=True)
    SEPOMEX_DIR.mkdir(parents=True, exist_ok=True)

    warnings: list[str] = []
    source_report: dict[str, Any] = {}
    grouped_geometries: dict[tuple[str, str, str], list[Any]] = defaultdict(list)
    catalog_rows: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="radar-sepomex-") as temp_dir_name:
        temp_root = Path(temp_dir_name)

        for state_key, zip_path in SOURCE_ZIPS.items():
            if not zip_path.exists():
                raise FileNotFoundError(f"Falta el archivo requerido: {zip_path.relative_to(ROOT)}")

            state_dir = temp_root / state_key
            state_dir.mkdir(parents=True, exist_ok=True)

            with zipfile.ZipFile(zip_path) as archive:
                unsafe = [
                    name
                    for name in archive.namelist()
                    if Path(name).is_absolute() or ".." in Path(name).parts
                ]
                if unsafe:
                    raise RuntimeError(f"{zip_path.name} contiene rutas no seguras: {unsafe[:3]}")
                archive.extractall(state_dir)
                members = sorted(name for name in archive.namelist() if not name.endswith("/"))

            shapefiles = sorted(state_dir.rglob("*.shp"))
            if not shapefiles:
                raise RuntimeError(f"{zip_path.name} no contiene ningún archivo .shp")

            state_feature_count = 0
            state_catalog_count = 0
            shp_details: list[dict[str, Any]] = []

            for shp_path in shapefiles:
                reader = open_reader(shp_path)
                field_names = [field[0] for field in reader.fields[1:]]
                transformer = discover_transformer(shp_path, reader, warnings)
                kept = 0
                skipped_no_cp = 0
                skipped_outside = 0

                for shape_record in reader.iterShapeRecords():
                    properties = dict(zip(field_names, list(shape_record.record)))
                    row = catalog_row_from_properties(state_key, properties)
                    if row:
                        catalog_rows.append(row)
                        state_catalog_count += 1

                    postal_code = extract_postal_code(properties)
                    if not postal_code:
                        skipped_no_cp += 1
                        continue

                    try:
                        geometry = shape(shape_record.shape.__geo_interface__)
                        if transformer:
                            geometry = shapely_transform(transformer, geometry)
                        if not geometry.is_valid:
                            geometry = geometry.buffer(0)
                        geometry = polygonal_only(geometry)
                    except Exception as exc:  # noqa: BLE001
                        warnings.append(f"Entidad inválida en {shp_path.name}: {exc}")
                        continue

                    if geometry is None:
                        continue

                    city_id = choose_city(state_key, geometry)
                    if not city_id:
                        skipped_outside += 1
                        continue

                    grouped_geometries[(state_key, city_id, postal_code)].append(geometry)
                    row_with_city = catalog_row_from_properties(state_key, properties, city_id)
                    if row_with_city:
                        catalog_rows.append(row_with_city)
                        state_catalog_count += 1
                    kept += 1
                    state_feature_count += 1

                shp_details.append(
                    {
                        "file": str(shp_path.relative_to(state_dir)),
                        "records": len(reader),
                        "fields": field_names,
                        "keptPolygonRecords": kept,
                        "skippedWithoutPostalCode": skipped_no_cp,
                        "skippedOutsideLaguna": skipped_outside,
                    }
                )
                reader.close()

            source_report[state_key] = {
                "zip": str(zip_path.relative_to(ROOT)),
                "sha256": sha256_file(zip_path),
                "sizeBytes": zip_path.stat().st_size,
                "members": members,
                "shapefiles": shp_details,
                "keptPolygonRecords": state_feature_count,
                "catalogRowsDetected": state_catalog_count,
            }

    features: list[dict[str, Any]] = []
    city_zone_counts: dict[str, int] = defaultdict(int)
    state_zone_counts: dict[str, int] = defaultdict(int)

    for (state_key, city_id, postal_code), geometries in sorted(grouped_geometries.items()):
        merged = unary_union(geometries)
        if not merged.is_valid:
            merged = merged.buffer(0)
        merged = polygonal_only(merged)
        if merged is None:
            warnings.append(f"Se descartó CP {postal_code}: la unión no produjo polígonos válidos.")
            continue
        simplified = merged.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        simplified = polygonal_only(simplified) or merged

        features.append(
            {
                "type": "Feature",
                "properties": {
                    "postalCode": postal_code,
                    "stateKey": state_key,
                    "cityId": city_id,
                    "source": "SEPOMEX oficial · generación local",
                },
                "geometry": geometry_mapping(simplified),
            }
        )
        city_zone_counts[city_id] += 1
        state_zone_counts[state_key] += 1

    if len(features) < MIN_EXPECTED_ZONES:
        raise RuntimeError(
            f"La conversión produjo solo {len(features)} zonas; se esperaban al menos {MIN_EXPECTED_ZONES}. "
            "No se reemplazará la capa estable."
        )
    for state_key in SOURCE_ZIPS:
        if state_zone_counts[state_key] == 0:
            raise RuntimeError(f"La conversión no produjo zonas para {state_key}.")

    collection = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "SEPOMEX oficial",
            "cities": [CITY_CONFIG[city_id]["name"] for city_id in CITY_CONFIG],
            "zoneCount": len(features),
            "simplifyTolerance": SIMPLIFY_TOLERANCE,
        },
        "features": features,
    }
    geojson_bytes = json.dumps(
        collection,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    compact_bytes = base64.b64encode(gzip.compress(geojson_bytes, compresslevel=9, mtime=0))
    compact_path = GEO_DIR / "laguna-postal.compact.txt"
    compact_path.write_bytes(compact_bytes)

    embedded_catalog = decode_embedded_catalog(warnings)
    final_catalog = deduplicate_catalog([*catalog_rows, *embedded_catalog])
    if not final_catalog:
        warnings.append("No se generó catálogo de asentamientos; la búsqueda quedará limitada a códigos postales.")
    catalog_path = SEPOMEX_DIR / "catalogo_asentamientos.json"
    catalog_path.write_text(
        json.dumps(final_catalog, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "generator": "scripts/build-sepomex.py",
        "sources": source_report,
        "outputs": {
            "zoneCount": len(features),
            "zonesByState": dict(sorted(state_zone_counts.items())),
            "zonesByCity": dict(sorted(city_zone_counts.items())),
            "catalogRows": len(final_catalog),
            "catalogRowsDetectedDirectly": len(deduplicate_catalog(catalog_rows)),
            "catalogRowsRecoveredFromEmbeddedFallback": len(deduplicate_catalog(embedded_catalog)),
            "geoJsonBytesBeforeCompression": len(geojson_bytes),
            "compactBase64Bytes": len(compact_bytes),
            "catalogBytes": catalog_path.stat().st_size,
        },
        "warnings": warnings,
    }

    report_path = SEPOMEX_DIR / "sepomex-build-report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return report


def main() -> None:
    report = build()
    outputs = report["outputs"]
    print(
        "SEPOMEX listo: "
        f"{outputs['zoneCount']} zonas, "
        f"{outputs['catalogRows']} asentamientos, "
        f"{outputs['compactBase64Bytes']} bytes compactos."
    )
    if report["warnings"]:
        print(f"Advertencias: {len(report['warnings'])}. Consulta data/sepomex/sepomex-build-report.json")


if __name__ == "__main__":
    main()
