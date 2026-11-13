#!/usr/bin/env python3
"""
2.7.0: 기본 + 금박나무 + 옥 + 연핑크옥 S2 JPG 프레임.

- 테마당 1주기(idle + next-1/2 + prev-1/2), JPG q90 4:4:4
- 한자 테마 없음
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "common" / "sprite"
ASSETS = ROOT / "scripts" / "assets"
CUT = ASSETS / "beads-cut"
DOCS = ROOT / "docs"

W, H = 432, 514
BG = (12, 10, 8, 255)
PAD = 4
JPG_QUALITY = 90

THEMES = {
    "default": ASSETS / "bead-src-cut.png",
    "goldwood": CUT / "bead-goldwood-cut.png",
    "jade": CUT / "bead-jade-cut.png",
    "pinkjade": CUT / "bead-pinkjade-cut.png",
}

NODE = r"""
import { DEFAULT_RING, layoutOptsFromExps, pathProgressAtTime, layoutChainSlots, frontAdjacentGapRatios, SLOT_COUNT, BACK_COUNT, FRONT_DEPTH_MIN } from './src/common/ring.js'
import { layoutRing } from './scripts/lib/ring-kf.js'
const opts = layoutOptsFromExps({ e1Minimize: true, e2NoScale: false, e3SplitSrc: true, e4SkipBack: false })
const slots = layoutChainSlots(opts)
const depthBySlot = Object.fromEntries(slots.map(s => [s.index, s.depth]))
const ts = [0, 1/3, 2/3, 1]
const frames = {}
for (const dir of [1, -1]) {
  const key = dir > 0 ? 'next' : 'prev'
  frames[key] = []
  for (const t of ts) {
    const boxes = layoutRing({
      ...DEFAULT_RING, ...opts,
      shiftProgress: pathProgressAtTime(t),
      chainDir: dir
    }).map(b => ({
      left: b.left, top: b.top, size: b.size, z: b.z, key: b.key,
      depth: depthBySlot[b.key] != null ? depthBySlot[b.key] : 1
    }))
    frames[key].push({ t, boxes })
  }
}
console.log(JSON.stringify({
  frames,
  meta: {
    slotCount: SLOT_COUNT,
    backCount: BACK_COUNT,
    focusGap: frontAdjacentGapRatios(opts)
  }
}))
"""


def save_jpg(im: Image.Image, path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(
        path, format="JPEG", quality=JPG_QUALITY, subsampling=0, optimize=True
    )
    return path.stat().st_size


def content_bbox(images, pad=PAD):
    minx, miny, maxx, maxy = W, H, 0, 0
    found = False
    for im in images:
        px = im.load()
        for y in range(im.size[1]):
            for x in range(im.size[0]):
                r, g, b, a = px[x, y]
                if a < 20:
                    continue
                if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) <= 24:
                    continue
                found = True
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)
    if not found:
        return (0, 0, W, H)
    return (
        max(0, minx - pad),
        max(0, miny - pad),
        min(W, maxx + 1 + pad),
        min(H, maxy + 1 + pad),
    )


def load_layout():
    raw = subprocess.check_output(
        ["node", "--input-type=module", "-e", NODE], cwd=ROOT, text=True
    )
    line = [ln for ln in raw.splitlines() if ln.startswith("{")][-1]
    return json.loads(line)


def render_full(boxes, bead: Image.Image):
    im = Image.new("RGBA", (W, H), BG)
    for b in sorted(boxes, key=lambda x: x["z"]):
        size = max(1, int(round(b["size"])))
        scaled = bead.resize((size, size), Image.Resampling.LANCZOS)
        im.alpha_composite(scaled, (int(round(b["left"])), int(round(b["top"]))))
    return im


def cjk_font(size: int):
    for path in (
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def generate_theme(theme: str, bead: Image.Image, payload, crop):
    base = OUT if theme == "default" else OUT / theme
    if theme != "default":
        base.mkdir(parents=True, exist_ok=True)
        for p in base.glob("*.jpg"):
            p.unlink()
    else:
        for p in OUT.glob("*.jpg"):
            p.unlink()

    sizes = {}

    def crop_im(im):
        return im.crop(crop)

    def write(name: str, im: Image.Image) -> str:
        path = (OUT / f"{name}.jpg") if theme == "default" else (base / f"{name}.jpg")
        key = path.name if theme == "default" else f"{theme}/{path.name}"
        sizes[key] = save_jpg(crop_im(im), path)
        return (
            f"/common/sprite/{name}.jpg"
            if theme == "default"
            else f"/common/sprite/{theme}/{name}.jpg"
        )

    idle = render_full(payload["frames"]["next"][0]["boxes"], bead)
    # force first==last
    idle_path = write("idle", idle)
    next_paths = [idle_path]
    for i in (1, 2):
        next_paths.append(
            write(f"next-{i}", render_full(payload["frames"]["next"][i]["boxes"], bead))
        )
    next_paths.append(idle_path)
    prev_paths = [idle_path]
    for i in (1, 2):
        prev_paths.append(
            write(f"prev-{i}", render_full(payload["frames"]["prev"][i]["boxes"], bead))
        )
    prev_paths.append(idle_path)

    meta = {
        "phases": 1,
        "idle": [idle_path],
        "nextByPhase": [next_paths],
        "prevByPhase": [prev_paths],
    }
    return sizes, meta, idle


def write_sprite_meta(all_meta: dict, crop, total: int):
    js = f"""/**
 * 2.7.0 스프라이트 메타 (gen-theme-sprites.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = 150
export const SPRITE_FRAME_COUNT = 4
export const SPRITE_CROP = Object.freeze({json.dumps(crop)})
export const SPRITE_PHASES = 1

export const SPRITE_THEMES = Object.freeze({json.dumps(all_meta, ensure_ascii=False)})

export const SPRITE_IDLE = SPRITE_THEMES.default.idle[0]
export const SPRITE_NEXT = Object.freeze(SPRITE_THEMES.default.nextByPhase[0])
export const SPRITE_PREV = Object.freeze(SPRITE_THEMES.default.prevByPhase[0])
export const SPRITE_FILES_SUM_BYTES = {total}

export const themePhase = (todayTotal) => 0

export const spriteIdleFor = (theme, phase = 0) => {{
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  return t.idle[0]
}}

export const spriteFramesFor = (theme, dir, phase = 0) => {{
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  const list = Number(dir) < 0 ? t.prevByPhase[0] : t.nextByPhase[0]
  return [...list]
}}

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({{ src }}))
"""
    (ROOT / "src" / "common" / "sprite-meta.js").write_text(js, encoding="utf-8")
    (OUT / "sprite-meta.json").write_text(
        json.dumps(
            {"version": "2.7.0", "crop": crop, "themes": all_meta, "filesSumBytes": total},
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


def make_previews(idles: dict):
    DOCS.mkdir(parents=True, exist_ok=True)
    font = cjk_font(22)
    labels = [
        ("default", "기본"),
        ("goldwood", "금박 나무"),
        ("jade", "옥"),
        ("pinkjade", "연핑크 옥"),
    ]
    strip = Image.new("RGBA", (W * 4, H + 36), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    for i, (key, lab) in enumerate(labels):
        strip.paste(idles[key], (i * W, 36))
        d.text((i * W + 8, 8), lab, fill=(200, 180, 140, 255), font=font)
    strip.save(DOCS / "preview-2.7.0-themes.png")
    print("wrote preview-2.7.0-themes.png")


def main():
    # 한자 테마 디렉터리 제거
    for old in ("ommani", "namu"):
        d = OUT / old
        if d.exists():
            for p in d.rglob("*"):
                if p.is_file():
                    p.unlink()
            for p in sorted(d.rglob("*"), reverse=True):
                if p.is_dir():
                    p.rmdir()
            if d.exists():
                d.rmdir()

    payload = load_layout()
    print("geom", payload["meta"])

    beads = {}
    for theme, path in THEMES.items():
        if not path.exists():
            raise SystemExit(f"missing bead source: {path}")
        beads[theme] = Image.open(path).convert("RGBA")
        print(f"bead {theme} {beads[theme].size}")

    probe = []
    for key in ("next", "prev"):
        for i in range(4):
            probe.append(render_full(payload["frames"][key][i]["boxes"], beads["default"]))
    crop = content_bbox(probe)
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    print(f"crop={crop} {cw}x{ch}")

    all_meta = {}
    all_sizes = {}
    idles = {}
    for theme in ("default", "goldwood", "jade", "pinkjade"):
        sizes, meta, idle = generate_theme(theme, beads[theme], payload, crop)
        all_sizes.update(sizes)
        all_meta[theme] = meta
        idles[theme] = idle
        print(f"{theme} sum={sum(sizes.values())} files={len(sizes)}")

    total = sum(all_sizes.values())
    print("TOTAL", total)
    write_sprite_meta(
        all_meta, {"left": crop[0], "top": crop[1], "width": cw, "height": ch}, total
    )
    make_previews(idles)


if __name__ == "__main__":
    main()
