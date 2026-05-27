#!/usr/bin/env python3
"""Split Gemini building sprite sheet into categorized webp tiles.

推荐优先使用浏览器手动工具：../sprite-splitter.html
本脚本仅作批量初稿，框选往往不准。
"""
from __future__ import annotations

import json
import os
from collections import deque

from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'Building')
SRC = os.path.join(ROOT, 'Gemini_Generated_Image_jixn0njixn0njixn_doublebg.webp')
OUT_DIR = os.path.join(ROOT, 'gemini')
PAD = 2
MIN_SEG_H = 50
MIN_W = 30
HEADER_Y = 130
MIN_BLOB_AREA = 800

PRESET = {
    'eave': ['roof-tiles-red', 'roof-green', 'roof-grey', 'roof-wood'],
    'door': ['door-01', 'door-02', 'door-03', 'door-04'],
    'window': ['window-wide', 'window-arch', 'window-square', 'window-tall'],
    'wall': ['wall-h-plank', 'wall-v-plank', 'wall-mixed', 'wall-v-dark'],
    'other': [
        'plant-pot', 'railing-long', 'railing-short', 'chimney', 'frame-small',
        'platform-small', 'barrel-on-stand', 'barrel-small', 'pots-empty', 'toolbox',
    ],
}


def content_mask(region: np.ndarray) -> np.ndarray:
    r, g, b, a = region[:, :, 0], region[:, :, 1], region[:, :, 2], region[:, :, 3]
    return (a > 10) & ((r > 15) | (g > 15) | (b > 15))


def row_segments(mask: np.ndarray, min_h: int = MIN_SEG_H) -> list[tuple[int, int]]:
    row_has = mask.any(axis=1)
    segs: list[tuple[int, int]] = []
    in_seg = False
    start = 0
    for y, has in enumerate(row_has):
        if has and not in_seg:
            start = y
            in_seg = True
        elif not has and in_seg:
            if y - start >= min_h:
                segs.append((start, y))
            in_seg = False
    if in_seg and len(row_has) - start >= min_h:
        segs.append((start, len(row_has)))
    return segs


def crop_tight(
    img: Image.Image,
    col_mask: np.ndarray,
    col_x: int,
    y0: int,
    y1: int,
) -> Image.Image | None:
    sub = col_mask[y0:y1, :]
    ys, xs = np.where(sub)
    if len(xs) == 0:
        return None
    bx0, bx1 = int(xs.min()), int(xs.max()) + 1
    by0, by1 = int(ys.min()), int(ys.max()) + 1
    if bx1 - bx0 < MIN_W or by1 - by0 < MIN_SEG_H:
        return None
    gx0 = max(0, col_x + bx0 - PAD)
    gy0 = max(0, y0 + by0 - PAD)
    gx1 = min(img.width, col_x + bx1 + PAD)
    gy1 = min(img.height, y0 + by1 + PAD)
    return img.crop((gx0, gy0, gx1, gy1))


def label_blobs(mask: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    h, w = mask.shape
    visited = np.zeros(mask.shape, dtype=bool)
    blobs: list[tuple[int, int, int, int, int]] = []

    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or visited[y0, x0]:
                continue
            q: deque[tuple[int, int]] = deque([(y0, x0)])
            visited[y0, x0] = True
            ys = [y0]
            xs = [x0]
            while q:
                y, x = q.popleft()
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
                        ys.append(ny)
                        xs.append(nx)
            area = len(xs)
            if area < MIN_BLOB_AREA:
                continue
            blobs.append((min(ys), min(xs), max(ys) + 1, max(xs) + 1, area))
    blobs.sort(key=lambda b: (b[0], b[1]))
    return blobs


def save_crop(img: Image.Image, cat: str, label: str, manifest: list[dict[str, str]]) -> None:
    rel = f'gemini/{cat}/{label}.webp'
    path = os.path.join(OUT_DIR, cat, f'{label}.webp')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', lossless=True)
    manifest.append({'category': cat, 'file': rel})
    print(f'{rel} {img.size}')


def main() -> None:
    img = Image.open(SRC).convert('RGBA')
    w, h = img.size
    arr = np.array(img)
    cols = 5
    col_w = w // cols
    categories = ['eave', 'door', 'window', 'wall', 'other']
    manifest: list[dict[str, str]] = []

    if os.path.isdir(OUT_DIR):
        for root, _dirs, files in os.walk(OUT_DIR):
            for fn in files:
                if fn.endswith('.webp'):
                    os.remove(os.path.join(root, fn))

    for ci, cat in enumerate(categories):
        x0, x1 = ci * col_w, (ci + 1) * col_w
        col_mask = content_mask(arr[:, x0:x1])

        if cat != 'other':
            work = col_mask.copy()
            work[:HEADER_Y, :] = False
            segs = row_segments(work)
            presets = PRESET[cat]
            for i, (y0, y1) in enumerate(segs[: len(presets)]):
                crop = crop_tight(img, col_mask, x0, y0, y1)
                if crop is None:
                    continue
                label = presets[i] if i < len(presets) else f'{cat}-{i + 1:02d}'
                save_crop(crop, cat, label, manifest)
            continue

        work = col_mask.copy()
        work[:HEADER_Y, :] = False
        blobs = label_blobs(work)
        presets = PRESET['other']
        for i, (by0, bx0, by1, bx1, _area) in enumerate(blobs[: len(presets)]):
            gx0 = max(0, x0 + bx0 - PAD)
            gy0 = max(0, by0 - PAD)
            gx1 = min(w, x0 + bx1 + PAD)
            gy1 = min(h, by1 + PAD)
            crop = img.crop((gx0, gy0, gx1, gy1))
            label = presets[i] if i < len(presets) else f'other-{i + 1:02d}'
            save_crop(crop, cat, label, manifest)

    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print('total', len(manifest))


if __name__ == '__main__':
    main()
