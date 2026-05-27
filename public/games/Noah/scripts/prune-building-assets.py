#!/usr/bin/env python3
"""Delete Building assets not referenced in houses.json; refresh manifest & catalog."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDING = ROOT / "assets" / "Building"
HOUSES = ROOT / "houses.json"
CATALOG_OUT = ROOT / "scripts" / "houses-asset-catalog.json"
MANIFEST = BUILDING / "gemini" / "manifest.json"


def main() -> int:
    houses_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HOUSES
    with houses_path.open(encoding="utf-8") as f:
        houses = json.load(f)

    used = {sp["file"] for t in houses["templates"] for sp in t["sprites"]}
    by_cat: dict[str, set[str]] = {}
    for t in houses["templates"]:
        for sp in t["sprites"]:
            by_cat.setdefault(sp["category"], set()).add(sp["file"])

    deleted = []
    for p in BUILDING.rglob("*"):
        if p.suffix.lower() not in (".webp", ".png", ".jpg", ".jpeg"):
            continue
        rel = str(p.relative_to(BUILDING)).replace("\\", "/")
        if rel not in used:
            p.unlink()
            deleted.append(rel)

    manifest = [
        {"category": cat, "file": file}
        for cat in sorted(by_cat)
        for file in sorted(by_cat[cat])
        if file.startswith("gemini/")
    ]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CATALOG_OUT.write_text(
        json.dumps({k: sorted(v) for k, v in by_cat.items()}, indent=2) + "\n",
        encoding="utf-8",
    )

    for d in sorted(BUILDING.rglob("*"), reverse=True):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()

    kept = sorted(used)
    print(f"Kept {len(kept)} assets, deleted {len(deleted)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
