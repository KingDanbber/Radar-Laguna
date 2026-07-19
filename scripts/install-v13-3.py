#!/usr/bin/env python3
"""Instala de forma idempotente los activos de Radar Laguna V13.3."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
SERVICE_WORKER_PATH = ROOT / "service-worker.js"
SCRIPT_TAG = '  <script src="./v13-3.js?v=13.3.0"></script>'
APP_TAG = '  <script src="./app.js"></script>'


def patch_index() -> bool:
    content = INDEX_PATH.read_text(encoding="utf-8")
    original = content

    versioned_pattern = re.compile(r'^\s*<script src="\./v13-3\.js(?:\?v=[^"]+)?"></script>\s*$', re.MULTILINE)
    if versioned_pattern.search(content):
        content = versioned_pattern.sub(SCRIPT_TAG, content, count=1)
    else:
        if APP_TAG not in content:
            raise RuntimeError("No se encontró la etiqueta de app.js en index.html.")
        content = content.replace(APP_TAG, f"{APP_TAG}\n{SCRIPT_TAG}", 1)

    if content != original:
        INDEX_PATH.write_text(content, encoding="utf-8")
        return True
    return False


def patch_service_worker() -> bool:
    content = SERVICE_WORKER_PATH.read_text(encoding="utf-8")
    original = content

    content, count = re.subn(
        r'const CACHE_NAME = "radar-laguna-[^"]+";',
        'const CACHE_NAME = "radar-laguna-v13-3-shell-1";',
        content,
        count=1,
    )
    if count != 1:
        raise RuntimeError("No se pudo actualizar CACHE_NAME en service-worker.js.")

    if '"./v13-3.js"' not in content:
        marker = '"./v13-2.js",'
        if marker not in content:
            raise RuntimeError("No se encontró v13-2.js en la lista SHELL.")
        content = content.replace(marker, '"./v13-2.js", "./v13-3.js",', 1)

    if '"/v13-3.js",' not in content:
        marker = '      "/v13-2.js",\n'
        if marker not in content:
            raise RuntimeError("No se encontró v13-2.js en activos versionados.")
        content = content.replace(marker, f'{marker}      "/v13-3.js",\n', 1)

    if content != original:
        SERVICE_WORKER_PATH.write_text(content, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    if patch_index():
        changed.append("index.html")
    if patch_service_worker():
        changed.append("service-worker.js")

    if changed:
        print("V13.3 instalada en: " + ", ".join(changed))
    else:
        print("V13.3 ya estaba instalada; no hubo cambios.")


if __name__ == "__main__":
    main()
