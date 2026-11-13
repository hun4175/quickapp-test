#!/usr/bin/env python3
"""
2.5.1: 고품질 원본(bead-new-src.png) LANCZOS 리샘플 → 풀컬러 PNG 프레임.

- 방향당 4프레임 (t=0, 1/3, 2/3, 1.0), 150ms linear
- 첫·끝 프레임 픽셀 동일(idle)
- 앞줄 간격 유지 · 뒷줄 밀도↑ (ring.js buildChainAngles)
- 산출: src/common/sprite/*.png + sprite-meta.js
- 프리뷰: docs/preview-2.5.1-*.png (+ 2.5.0 비교)
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "common" / "sprite"
DOCS = ROOT / "docs"
ASSETS = ROOT / "scripts" / "assets"
SRC_BEAD = ASSETS / "bead-new-src.png"
W, H = 432, 514
BG = (12, 10, 8, 255)
PROGRESS = [0.0, 1.0 / 3.0, 2.0 / 3.0, 1.0]
PAD = 4

NODE = r"""
import { DEFAULT_RING, layoutOptsFromExps, pathProgressAtTime } from './src/common/ring.js'
import { layoutRing } from './src/common/ring-kf.js'
const opts = layoutOptsFromExps({ e1Minimize: true, e2NoScale: false, e3SplitSrc: true, e4SkipBack: false })
const ts = [0, 1/3, 2/3, 1]
const frames = {}
for (const dir of [1, -1]) {
  const key = dir > 0 ? 'next' : 'prev'
  frames[key] = []
  for (const t of ts) {
    const boxes = layoutRing({
      ...DEFAULT_RING,
      ...opts,
      shiftProgress: pathProgressAtTime(t),
      chainDir: dir
    }).map(b => ({
      left: b.left, top: b.top, size: b.size, z: b.z
    }))
    frames[key].push({ t, boxes })
  }
}
import { layoutChainSlots, FRONT_DEPTH_MIN, frontAdjacentGapRatios, SLOT_COUNT, BACK_COUNT } from './src/common/ring.js'
const slots = layoutChainSlots(opts)
const front = slots.filter(s => s.depth >= FRONT_DEPTH_MIN)
const back = slots.filter(s => s.depth < FRONT_DEPTH_MIN)
console.log(JSON.stringify({
  frames,
  meta: {
    slotCount: SLOT_COUNT,
    backCount: BACK_COUNT,
    frontCount: front.length,
    focusGap: frontAdjacentGapRatios(opts)
  }
}))
"""


def save_png_rgba(im: Image.Image, path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True, compress_level=9)
    return path.stat().st_size


def content_bbox(images, pad=PAD):
    minx, miny, maxx, maxy = W, H, 0, 0
    found = False
    for im in images:
        px = im.load()
        w, h = im.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < 20:
                    continue
                if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) <= 24:
                    continue
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        return (0, 0, W, H)
    minx = max(0, minx - pad)
    miny = max(0, miny - pad)
    maxx = min(W - 1, maxx + pad)
    maxy = min(H - 1, maxy + pad)
    return (minx, miny, maxx + 1, maxy + 1)


def main() -> None:
    if not SRC_BEAD.exists():
        raise SystemExit(f"missing source bead: {SRC_BEAD}")

    raw = subprocess.check_output(
        ["node", "--input-type=module", "-e", NODE],
        cwd=ROOT,
        text=True,
    )
    line = [ln for ln in raw.splitlines() if ln.startswith("{")][-1]
    payload = json.loads(line)
    data = payload["frames"]
    geom_meta = payload["meta"]
    print("geom", geom_meta)

    src = Image.open(SRC_BEAD).convert("RGBA")
    print(f"source {SRC_BEAD.name} {src.size} {src.mode}")

    def render_full(boxes):
        im = Image.new("RGBA", (W, H), BG)
        for b in sorted(boxes, key=lambda x: x["z"]):
            size = max(1, int(round(b["size"])))
            bead = src.resize((size, size), Image.Resampling.LANCZOS)
            im.alpha_composite(bead, (int(round(b["left"])), int(round(b["top"]))))
        return im

    full = {}
    for key in ("next", "prev"):
        full[key] = [render_full(fr["boxes"]) for fr in data[key]]

    for key in ("next", "prev"):
        same = full[key][0].tobytes() == full[key][-1].tobytes()
        print(f"{key} first==last: {same}")
        if not same:
            full[key][-1] = full[key][0].copy()
            print(f"{key}: forced last=first")

    idle = full["next"][0]
    crop = content_bbox(
        [full["next"][i] for i in range(len(PROGRESS))]
        + [full["prev"][i] for i in range(len(PROGRESS))]
    )
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    print(f"crop={crop} size={cw}x{ch}")

    def crop_im(im):
        return im.crop(crop)

    OUT.mkdir(parents=True, exist_ok=True)
    for p in OUT.glob("*.png"):
        p.unlink()

    sizes = {}
    sizes["idle.png"] = save_png_rgba(crop_im(idle), OUT / "idle.png")

    next_paths = ["idle.png"]
    for i in (1, 2):
        name = f"next-{i}.png"
        sizes[name] = save_png_rgba(crop_im(full["next"][i]), OUT / name)
        next_paths.append(name)
    next_paths.append("idle.png")

    prev_paths = ["idle.png"]
    for i in (1, 2):
        name = f"prev-{i}.png"
        sizes[name] = save_png_rgba(crop_im(full["prev"][i]), OUT / name)
        prev_paths.append(name)
    prev_paths.append("idle.png")

    total = sum(sizes.values())
    print("frame sizes:", sizes)
    print("filesSumBytes=", total)

    meta = {
        "version": "2.5.1",
        "screenW": W,
        "screenH": H,
        "crop": {"left": crop[0], "top": crop[1], "width": cw, "height": ch},
        "durationMs": 150,
        "frameCount": 4,
        "progress": PROGRESS,
        "format": "PNG32",
        "source": "scripts/assets/bead-new-src.png",
        "geom": geom_meta,
        "idle": "/common/sprite/idle.png",
        "next": ["/common/sprite/" + p for p in next_paths],
        "prev": ["/common/sprite/" + p for p in prev_paths],
        "fileSizes": sizes,
        "filesSumBytes": total,
    }
    (OUT / "sprite-meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    js = f"""/**
 * 2.5.1 스프라이트 메타 (gen-sprite-frames.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = {meta['durationMs']}
export const SPRITE_FRAME_COUNT = {meta['frameCount']}
export const SPRITE_CROP = Object.freeze({json.dumps(meta['crop'])})
export const SPRITE_IDLE = {json.dumps(meta['idle'])}
export const SPRITE_NEXT = Object.freeze({json.dumps(meta['next'])})
export const SPRITE_PREV = Object.freeze({json.dumps(meta['prev'])})
export const SPRITE_FILES_SUM_BYTES = {total}

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({{ src }}))
"""
    (ROOT / "src" / "common" / "sprite-meta.js").write_text(js, encoding="utf-8")

    DOCS.mkdir(parents=True, exist_ok=True)
    idle.save(DOCS / "preview-2.5.1-idle.png")
    full["next"][1].save(DOCS / "preview-2.5.1-mid.png")

    # compare: 2.5.0 idle (if present) | 2.5.1 idle | 2.5.1 mid | 2.5.1 end
    old = DOCS / "preview-2.5.0-sprite-idle.png"
    strip = Image.new("RGBA", (W * 4, H + 28), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    cols = []
    if old.exists():
        cols.append((Image.open(old).convert("RGBA").resize((W, H)), "2.5.0 idle"))
    else:
        cols.append((idle, "2.5.0 n/a"))
    cols.append((idle, "2.5.1 idle"))
    cols.append((full["next"][1], "2.5.1 mid"))
    cols.append((full["next"][-1], "2.5.1 end"))
    for i, (im, lab) in enumerate(cols):
        if im.size != (W, H):
            im = im.resize((W, H), Image.Resampling.LANCZOS)
        strip.paste(im, (i * W, 28))
        d.text((i * W + 8, 6), lab, fill=(200, 180, 140, 255))
    strip.save(DOCS / "preview-2.5.1-compare.png")
    print("previews ok")


if __name__ == "__main__":
    main()
