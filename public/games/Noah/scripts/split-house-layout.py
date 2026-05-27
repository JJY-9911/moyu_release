#!/usr/bin/env python3
"""Split layout-editor house.txt into per-floor templates in houses.json."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "house.txt"
OUT = ROOT / "houses.json"

WALL_ROW_TOL = 25
WALL_ON_DECK_OFFSET = 57  # wall.y - platform.y in build-slots (~32–57)


def cluster_wall_rows(walls: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for w in sorted(walls, key=lambda s: (-s["y"], s["x"])):
        for row in rows:
            if abs(row["y"] - w["y"]) <= WALL_ROW_TOL:
                row["walls"].append(w)
                row["ys"].append(w["y"])
                row["y"] = sum(row["ys"]) / len(row["ys"])
                break
        else:
            rows.append({"y": w["y"], "ys": [w["y"]], "walls": [w]})
    rows.sort(key=lambda r: -r["y"])
    return rows


def floor_bounds(centers: list[float]) -> list[float]:
    return [(centers[i] + centers[i + 1]) / 2 for i in range(len(centers) - 1)]


def floor_index(y_top: float, bounds: list[float], n: int) -> int:
    for i, b in enumerate(bounds):
        if y_top > b:
            return i
    return n - 1


def pick_deck_y(sprites: list[dict], wall_row_y: float, build_zone_y: float, is_bottom: bool) -> float:
    platforms = [s for s in sprites if s["category"] == "platform"]
    if platforms:
        return min(p["y"] for p in platforms)
    if is_bottom:
        return build_zone_y
    return wall_row_y - WALL_ON_DECK_OFFSET


def sprite_export(sp: dict, deck_y: float) -> dict:
    return {
        "category": sp["category"],
        "file": sp["file"],
        "x": round(sp["x"]),
        "y": round(sp["y"] - deck_y),
        "w": round(sp["w"]),
        "h": round(sp["h"]),
        "flipH": bool(sp.get("flipH")),
        "z": sp.get("z", 0),
        "note": sp.get("note") or "",
    }


def floor_complete(sprites: list[dict]) -> bool:
    cats = {s["category"] for s in sprites}
    walls = sum(1 for s in sprites if s["category"] == "wall")
    return walls >= 2 and "door" in cats and "window" in cats


def split_house(src: dict) -> dict:
    sprites = src["sprites"]
    build_zone = src.get("buildZone") or {}
    build_zone_y = float(build_zone.get("y", 291))

    walls = [s for s in sprites if s["category"] == "wall"]
    rows = cluster_wall_rows(walls)
    centers = [r["y"] for r in rows]
    bounds = floor_bounds(centers)
    n = len(centers)

    floor_buckets: dict[int, list[dict]] = defaultdict(list)
    for sp in sprites:
        floor_buckets[floor_index(sp["y"], bounds, n)].append(sp)

    templates = []
    for i in range(n):
        bucket = floor_buckets[i]
        wall_row_y = centers[i]
        deck_y = pick_deck_y(bucket, wall_row_y, build_zone_y, i == 0)
        exported = [sprite_export(sp, deck_y) for sp in bucket]
        exported.sort(key=lambda s: (s["z"], s["y"], s["x"]))

        xs = [s["x"] for s in exported]
        ys = [s["y"] for s in exported]
        needs_platform = any(s["category"] == "platform" for s in exported)

        next_deck = None
        if i + 1 < n:
            next_bucket = floor_buckets[i + 1]
            next_deck = pick_deck_y(
                next_bucket, centers[i + 1], build_zone_y, i + 1 == 0
            )

        templates.append(
            {
                "id": f"floor-{i + 1:02d}",
                "index": i + 1,
                "gameLevel": i + 1,
                "wallRowY": round(wall_row_y),
                "deckY": round(deck_y),
                "deckYSource": (
                    "buildZone"
                    if i == 0 and not needs_platform
                    else ("platform" if needs_platform else "wall-offset")
                ),
                "needsPlatform": needs_platform,
                "complete": floor_complete(bucket),
                "spriteCount": len(exported),
                "spanToNextDeck": (
                    round(next_deck - deck_y) if next_deck is not None else None
                ),
                "bounds": {
                    "minX": min(xs) if xs else 0,
                    "maxX": max(s["x"] + s["w"] for s in exported) if exported else 0,
                    "minY": min(ys) if ys else 0,
                    "maxY": max(s["y"] + s["h"] for s in exported) if exported else 0,
                },
                "sprites": exported,
            }
        )

    return {
        "version": 1,
        "generatedFrom": "house.txt",
        "splitMethod": "wall-row-bands",
        "meta": {
            "canvasW": src.get("canvasW", 1024),
            "canvasH": src.get("canvasH", 576),
            "boatScale": src.get("boatScale"),
            "cameraWorldTop": src.get("cameraWorldTop"),
            "boat": src.get("boat"),
            "buildZone": build_zone,
        },
        "floorCount": len(templates),
        "templates": templates,
    }


def main() -> int:
    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT

    with src_path.open(encoding="utf-8") as f:
        src = json.load(f)

    result = split_house(src)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    complete = sum(1 for t in result["templates"] if t["complete"])
    print(f"Wrote {out_path} — {result['floorCount']} floors ({complete} complete)")
    for t in result["templates"]:
        flag = "ok" if t["complete"] else "partial"
        print(
            f"  {t['id']} [{flag}] deckY={t['deckY']} "
            f"sprites={t['spriteCount']} platform={t['needsPlatform']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
