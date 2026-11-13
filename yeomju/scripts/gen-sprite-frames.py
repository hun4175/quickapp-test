#!/usr/bin/env python3
"""
2.5.0: 2.3.1 형상(E1/E3 on)을 빌드 타임에 PNG8 스프라이트 프레임으로 합성.

- 방향당 4프레임 (t=0, 1/3, 2/3, 1.0), 150ms linear
- 첫·끝 프레임 픽셀 동일(idle)
- 432×514 → 구슬 영역 bbox 크롭
- 산출: src/common/sprite/*.png + sprite-meta.json + src/common/sprite-meta.js
- 프리뷰: docs/preview-2.5.0-sprite-*.png
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "common" / "sprite"
DOCS = ROOT / "docs"
W, H = 432, 514
BG = (12, 10, 8, 255)
PROGRESS = [0.0, 1.0 / 3.0, 2.0 / 3.0, 1.0]
COLORS = 32
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
      left: b.left, top: b.top, size: b.size, z: b.z, src: b.src
    }))
    frames[key].push({ t, boxes })
  }
}
console.log(JSON.stringify(frames))
"""


def save_png8(im: Image.Image, path: Path) -> int:
    alpha = im.getchannel("A")
    flat = Image.new("RGBA", im.size, BG)
    flat.alpha_composite(im)
    q = flat.convert("RGB").quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
    qp = q.load()
    ap = alpha.load()
    w, h = im.size
    data = []
    for y in range(h):
        for x in range(w):
            if ap[x, y] < 12:
                data.append(0)
            else:
                v = qp[x, y]
                data.append(1 if v == 0 else v)
    out = Image.new("P", (w, h))
    out.putpalette(q.getpalette())
    out.putdata(data)
    out.info["transparency"] = 0
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, format="PNG", optimize=True)
    return path.stat().st_size


def content_bbox(images, pad=PAD):
    """Non-background content bbox across frames, clamped to screen."""
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
    raw = subprocess.check_output(
        ["node", "--input-type=module", "-e", NODE],
        cwd=ROOT,
        text=True,
    )
    line = [ln for ln in raw.splitlines() if ln.startswith("{")][-1]
    data = json.loads(line)

    assets = {
        "/common/bead-front-255.png": Image.open(
            ROOT / "src/common/bead-front-255.png"
        ).convert("RGBA"),
        "/common/bead-back-160.png": Image.open(
            ROOT / "src/common/bead-back-160.png"
        ).convert("RGBA"),
        "/common/bead-wood-v3.png": Image.open(
            ROOT / "src/common/bead-wood-v3.png"
        ).convert("RGBA"),
    }

    def render_full(boxes):
        im = Image.new("RGBA", (W, H), BG)
        for b in sorted(boxes, key=lambda x: x["z"]):
            src = assets.get(b.get("src")) or assets["/common/bead-wood-v3.png"]
            size = max(1, int(round(b["size"])))
            bead = src.resize((size, size), Image.Resampling.LANCZOS)
            im.alpha_composite(bead, (int(round(b["left"])), int(round(b["top"]))))
        return im

    full = {}
    for key in ("next", "prev"):
        full[key] = [render_full(fr["boxes"]) for fr in data[key]]

    for key in ("next", "prev"):
        same = list(full[key][0].tobytes()) == list(full[key][-1].tobytes())
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
    sizes["idle.png"] = save_png8(crop_im(idle), OUT / "idle.png")

    next_paths = ["idle.png"]
    for i in (1, 2):
        name = f"next-{i}.png"
        sizes[name] = save_png8(crop_im(full["next"][i]), OUT / name)
        next_paths.append(name)
    next_paths.append("idle.png")

    prev_paths = ["idle.png"]
    for i in (1, 2):
        name = f"prev-{i}.png"
        sizes[name] = save_png8(crop_im(full["prev"][i]), OUT / name)
        prev_paths.append(name)
    prev_paths.append("idle.png")

    total = sum(sizes.values())
    print("frame sizes:", sizes, "sum=", total)

    meta = {
        "version": "2.5.0",
        "screenW": W,
        "screenH": H,
        "crop": {"left": crop[0], "top": crop[1], "width": cw, "height": ch},
        "durationMs": 150,
        "frameCount": 4,
        "progress": PROGRESS,
        "colors": COLORS,
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
 * 2.5.0 스프라이트 메타 (gen-sprite-frames.py 생성 · 수동 수정 금지)
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
    idle.save(DOCS / "preview-2.5.0-sprite-idle.png")
    full["next"][1].save(DOCS / "preview-2.5.0-sprite-mid.png")

    strip = Image.new("RGBA", (W * 4, H + 28), (20, 16, 12, 255))
    labels = ["2.3.1 home", "sprite idle", "sprite mid", "sprite end"]
    imgs = [idle, idle, full["next"][1], full["next"][-1]]
    d = ImageDraw.Draw(strip)
    for i, (im, lab) in enumerate(zip(imgs, labels)):
        strip.paste(im, (i * W, 28))
        d.text((i * W + 8, 6), lab, fill=(200, 180, 140, 255))
    strip.save(DOCS / "preview-2.5.0-sprite-compare.png")
    print("previews ok; filesSumBytes=", total)


if __name__ == "__main__":
    main()
