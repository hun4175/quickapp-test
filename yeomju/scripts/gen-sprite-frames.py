#!/usr/bin/env python3
"""
2.5.2: bead-src-cut.png (원형 알파) → 검정 배경 합성 → JPG(q90/4:4:4) 기본.

- 방향당 4프레임, 첫·끝=idle 픽셀 동일
- 앞줄 간격 2.3.1/2.5.0 (focus≈0.981) · 뒷줄 밀도 2.5.1
- PNG32도 사이드카로 저장해 용량 비교 (런타임 기본은 JPG)
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "common" / "sprite"
OUT_PNG = ROOT / "scripts" / "out" / "sprite-png32"  # 비교용 · rpk 미포함
DOCS = ROOT / "docs"
ASSETS = ROOT / "scripts" / "assets"
SRC_BEAD = ASSETS / "bead-src-cut.png"
W, H = 432, 514
BG = (12, 10, 8, 255)
PROGRESS = [0.0, 1.0 / 3.0, 2.0 / 3.0, 1.0]
PAD = 4
JPG_QUALITY = 90

NODE = r"""
import { DEFAULT_RING, layoutOptsFromExps, pathProgressAtTime } from './src/common/ring.js'
import { layoutRing } from './scripts/lib/ring-kf.js'
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


def save_jpg(im: Image.Image, path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    # subsampling=0 → 4:4:4
    rgb.save(
        path,
        format="JPEG",
        quality=JPG_QUALITY,
        subsampling=0,
        optimize=True,
    )
    return path.stat().st_size


def save_png32(im: Image.Image, path: Path) -> int:
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
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    for p in OUT.glob("*"):
        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".json"):
            p.unlink()
    for p in OUT_PNG.glob("*.png"):
        p.unlink()

    jpg_sizes = {}
    png_sizes = {}

    def write_pair(name_stem: str, im: Image.Image):
        c = crop_im(im)
        jpg_sizes[name_stem + ".jpg"] = save_jpg(c, OUT / (name_stem + ".jpg"))
        png_sizes[name_stem + ".png"] = save_png32(c, OUT_PNG / (name_stem + ".png"))

    write_pair("idle", idle)
    next_paths = ["idle.jpg"]
    for i in (1, 2):
        write_pair(f"next-{i}", full["next"][i])
        next_paths.append(f"next-{i}.jpg")
    next_paths.append("idle.jpg")

    prev_paths = ["idle.jpg"]
    for i in (1, 2):
        write_pair(f"prev-{i}", full["prev"][i])
        prev_paths.append(f"prev-{i}.jpg")
    prev_paths.append("idle.jpg")

    jpg_total = sum(jpg_sizes.values())
    png_total = sum(png_sizes.values())
    print("jpg sizes:", jpg_sizes, "sum=", jpg_total)
    print("png32 sizes:", png_sizes, "sum=", png_total)

    meta = {
        "version": "2.5.2",
        "screenW": W,
        "screenH": H,
        "crop": {"left": crop[0], "top": crop[1], "width": cw, "height": ch},
        "durationMs": 150,
        "frameCount": 4,
        "progress": PROGRESS,
        "format": "JPEG",
        "jpegQuality": JPG_QUALITY,
        "jpegSubsampling": "4:4:4",
        "source": "scripts/assets/bead-src-cut.png",
        "geom": geom_meta,
        "idle": "/common/sprite/idle.jpg",
        "next": ["/common/sprite/" + p for p in next_paths],
        "prev": ["/common/sprite/" + p for p in prev_paths],
        "fileSizes": jpg_sizes,
        "filesSumBytes": jpg_total,
        "png32Compare": {"fileSizes": png_sizes, "filesSumBytes": png_total},
    }
    (OUT / "sprite-meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    js = f"""/**
 * 2.5.2 스프라이트 메타 (gen-sprite-frames.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = {meta['durationMs']}
export const SPRITE_FRAME_COUNT = {meta['frameCount']}
export const SPRITE_CROP = Object.freeze({json.dumps(meta['crop'])})
export const SPRITE_IDLE = {json.dumps(meta['idle'])}
export const SPRITE_NEXT = Object.freeze({json.dumps(meta['next'])})
export const SPRITE_PREV = Object.freeze({json.dumps(meta['prev'])})
export const SPRITE_FILES_SUM_BYTES = {jpg_total}
export const SPRITE_PNG32_SUM_BYTES = {png_total}

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({{ src }}))
"""
    (ROOT / "src" / "common" / "sprite-meta.js").write_text(js, encoding="utf-8")

    DOCS.mkdir(parents=True, exist_ok=True)
    idle.save(DOCS / "preview-2.5.2-idle.png")
    full["next"][1].save(DOCS / "preview-2.5.2-mid.png")
    full["next"][-1].save(DOCS / "preview-2.5.2-end.png")

    old = DOCS / "preview-2.5.0-sprite-idle.png"
    strip = Image.new("RGBA", (W * 4, H + 28), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    cols = []
    if old.exists():
        cols.append((Image.open(old).convert("RGBA").resize((W, H)), "2.5.0 idle"))
    else:
        cols.append((idle, "2.5.0 n/a"))
    cols.append((idle, "2.5.2 idle"))
    cols.append((full["next"][1], "2.5.2 mid"))
    cols.append((full["next"][-1], "2.5.2 end"))
    for i, (im, lab) in enumerate(cols):
        if im.size != (W, H):
            im = im.resize((W, H), Image.Resampling.LANCZOS)
        strip.paste(im, (i * W, 28))
        d.text((i * W + 8, 6), lab, fill=(200, 180, 140, 255))
    strip.save(DOCS / "preview-2.5.2-compare.png")
    print("previews ok")


if __name__ == "__main__":
    main()
