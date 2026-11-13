#!/usr/bin/env python3
"""
2.6.0: 기본 + 육자진언 + 나무아미타불 S2 JPG 프레임 생성.

- 기본: 기존 sprite/*.jpg 유지(재생성 가능)
- 한자 테마: phase 0..5 (6알 주기) × idle + next-1/2 + prev-1/2
- 앞줄 각인 글자, 뒷줄 plain(글자 없음)
- sprite-meta.js 갱신
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DEFAULT = ROOT / "src" / "common" / "sprite"
OUT_THEMES = ROOT / "src" / "common" / "sprite"
ENGRAVED = ROOT / "scripts" / "assets" / "beads-engraved"
SRC_PLAIN = ROOT / "scripts" / "assets" / "bead-src-cut.png"
DOCS = ROOT / "docs"
FONT = ROOT / "scripts" / "assets" / "fonts" / "NotoSerifCJKsc-Mantra.otf"

W, H = 432, 514
BG = (12, 10, 8, 255)
PROGRESS = [0.0, 1.0 / 3.0, 2.0 / 3.0, 1.0]
PAD = 4
JPG_QUALITY = 90
JPG_QUALITY_HANJA = 85
PHASES = 6
FRONT_DEPTH_MIN = 0.55

MANTRAS = {
    "ommani": list("唵嘛呢叭咪吽"),
    "namu": list("南無阿彌陀佛"),
}

NODE = r"""
import { DEFAULT_RING, layoutOptsFromExps, pathProgressAtTime, FRONT_DEPTH_MIN, layoutChainSlots, frontAdjacentGapRatios, SLOT_COUNT, BACK_COUNT } from './src/common/ring.js'
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
      ...DEFAULT_RING,
      ...opts,
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
    frontDepthMin: FRONT_DEPTH_MIN,
    focusGap: frontAdjacentGapRatios(opts),
    idleBoxes: frames.next[0].boxes
  }
}))
"""


def save_jpg(im: Image.Image, path: Path, quality: int = JPG_QUALITY) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(
        path, format="JPEG", quality=quality, subsampling=0, optimize=True
    )
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


def load_theme_beads(theme: str):
    if theme == "default":
        plain = Image.open(SRC_PLAIN).convert("RGBA")
        return {"plain": plain, "chars": [plain] * PHASES}
    chars = MANTRAS[theme]
    beads = []
    for i, ch in enumerate(chars):
        path = ENGRAVED / theme / f"{i}-{ch}.png"
        beads.append(Image.open(path).convert("RGBA"))
    plain = Image.open(ENGRAVED / theme / "plain.png").convert("RGBA")
    return {"plain": plain, "chars": beads}


def render_full(boxes, theme_assets, phase: int):
    """앞줄은 화면 위→아래 연속 글자(포커스=phase), 뒷줄은 plain."""
    im = Image.new("RGBA", (W, H), BG)
    plain = theme_assets["plain"]
    chars = theme_assets["chars"]
    annotated = []
    for b in boxes:
        size = max(1, int(round(b["size"])))
        depth = float(b.get("depth", 1))
        is_back = depth < FRONT_DEPTH_MIN if "depth" in b else size <= 170
        cy = float(b["top"]) + size * 0.5
        annotated.append({**b, "size": size, "is_back": is_back, "cy": cy})

    front = [b for b in annotated if not b["is_back"]]
    front_sorted = sorted(front, key=lambda b: b["cy"])
    focus_i = 0
    if front_sorted:
        # 포커스: 화면 중앙에 가장 가까운 앞줄
        focus_i = min(
            range(len(front_sorted)),
            key=lambda i: abs(front_sorted[i]["cy"] - (H * 0.5)),
        )
    char_for_id = {}
    for i, b in enumerate(front_sorted):
        char_for_id[id(b)] = (phase + (i - focus_i)) % PHASES

    for b in sorted(annotated, key=lambda x: x["z"]):
        size = b["size"]
        if b["is_back"]:
            src = plain
        else:
            idx = char_for_id.get(id(b), phase % PHASES)
            src = chars[idx]
        bead = src.resize((size, size), Image.Resampling.LANCZOS)
        im.alpha_composite(bead, (int(round(b["left"])), int(round(b["top"]))))
    return im


def ensure_depth_on_boxes(payload):
    """Attach depth from idle slot map by key when missing."""
    idle = {int(b["key"]): b for b in payload["meta"]["idleBoxes"]}
    for key in ("next", "prev"):
        for fr in payload["frames"][key]:
            for b in fr["boxes"]:
                if "depth" not in b:
                    ref = idle.get(int(b["key"]))
                    if ref and "depth" in ref:
                        b["depth"] = ref["depth"]
                    else:
                        b["depth"] = 1.0 if b["size"] > 170 else 0.0
    return payload


def generate_theme(theme: str, payload, crop, theme_assets):
    base = OUT_THEMES / theme if theme != "default" else OUT_DEFAULT
    if theme != "default":
        if base.exists():
            for p in base.glob("**/*"):
                if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".json"):
                    p.unlink()
        base.mkdir(parents=True, exist_ok=True)
    else:
        base.mkdir(parents=True, exist_ok=True)

    sizes = {}
    frames_meta = {"phases": PHASES, "idle": [], "next": [], "prev": []}

    def crop_im(im):
        return im.crop(crop)

    q = JPG_QUALITY if theme == "default" else JPG_QUALITY_HANJA

    def write(name: str, im: Image.Image) -> str:
        if theme == "default":
            path = OUT_DEFAULT / f"{name}.jpg"
            key = path.name
            url = f"/common/sprite/{name}.jpg"
        else:
            path = base / f"{name}.jpg"
            key = f"{theme}/{path.name}"
            url = f"/common/sprite/{theme}/{name}.jpg"
        sizes[key] = save_jpg(crop_im(im), path, quality=q)
        return url

    # idle phases
    idle_ims = []
    idle_paths = []
    for p in range(PHASES if theme != "default" else 1):
        im = render_full(payload["frames"]["next"][0]["boxes"], theme_assets, p)
        idle_ims.append(im)
        if theme == "default":
            idle_paths.append(write("idle", im))
        else:
            idle_paths.append(write(f"idle-{p}", im))

    if theme == "default":
        next_paths = [idle_paths[0]]
        for i in (1, 2):
            im = render_full(payload["frames"]["next"][i]["boxes"], theme_assets, 0)
            next_paths.append(write(f"next-{i}", im))
        next_paths.append(idle_paths[0])
        # force last==first already idle
        prev_paths = [idle_paths[0]]
        for i in (1, 2):
            im = render_full(payload["frames"]["prev"][i]["boxes"], theme_assets, 0)
            prev_paths.append(write(f"prev-{i}", im))
        prev_paths.append(idle_paths[0])
        frames_meta = {
            "phases": 1,
            "idle": idle_paths,
            "nextByPhase": [next_paths],
            "prevByPhase": [prev_paths],
        }
        return sizes, frames_meta, idle_ims

    next_by = []
    prev_by = []
    for p in range(PHASES):
        p2 = (p + 1) % PHASES
        nlist = [idle_paths[p]]
        for i in (1, 2):
            im = render_full(payload["frames"]["next"][i]["boxes"], theme_assets, p)
            nlist.append(write(f"p{p}-next-{i}", im))
        nlist.append(idle_paths[p2])
        next_by.append(nlist)

        plist = [idle_paths[p]]
        for i in (1, 2):
            im = render_full(payload["frames"]["prev"][i]["boxes"], theme_assets, p)
            plist.append(write(f"p{p}-prev-{i}", im))
        plist.append(idle_paths[p2])
        prev_by.append(plist)

    frames_meta = {
        "phases": PHASES,
        "idle": idle_paths,
        "nextByPhase": next_by,
        "prevByPhase": prev_by,
    }
    return sizes, frames_meta, idle_ims


def write_sprite_meta(all_meta: dict, crop, total_bytes: int):
    js = f"""/**
 * 2.6.0 스프라이트 메타 (gen-theme-sprites.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = 150
export const SPRITE_FRAME_COUNT = 4
export const SPRITE_CROP = Object.freeze({json.dumps(crop)})
export const SPRITE_PHASES = 6

export const SPRITE_THEMES = Object.freeze({json.dumps(all_meta, ensure_ascii=False)})

export const SPRITE_IDLE = SPRITE_THEMES.default.idle[0]
export const SPRITE_NEXT = Object.freeze(SPRITE_THEMES.default.nextByPhase[0])
export const SPRITE_PREV = Object.freeze(SPRITE_THEMES.default.prevByPhase[0])
export const SPRITE_FILES_SUM_BYTES = {total_bytes}

/** theme: default | ommani | namu */
export const themePhase = (todayTotal) =>
  ((Math.max(0, Math.floor(Number(todayTotal) || 0)) % SPRITE_PHASES) + SPRITE_PHASES) % SPRITE_PHASES

export const spriteIdleFor = (theme, phase = 0) => {{
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  if (t.phases <= 1) return t.idle[0]
  return t.idle[themePhase(phase)]
}}

export const spriteFramesFor = (theme, dir, phase = 0) => {{
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  const p = t.phases <= 1 ? 0 : themePhase(phase)
  const list = Number(dir) < 0 ? t.prevByPhase[p] : t.nextByPhase[p]
  return [...list]
}}

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({{ src }}))
"""
    (ROOT / "src" / "common" / "sprite-meta.js").write_text(js, encoding="utf-8")
    meta_json = {
        "version": "2.6.0",
        "crop": crop,
        "durationMs": 150,
        "themes": all_meta,
        "filesSumBytes": total_bytes,
    }
    (OUT_DEFAULT / "sprite-meta.json").write_text(
        json.dumps(meta_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def make_previews(ommani_idle, namu_idle, ommani_mid, namu_mid, payload, assets):
    DOCS.mkdir(parents=True, exist_ok=True)
    # strip: ommani idle/mid | namu idle/mid
    strip = Image.new("RGBA", (W * 4, H + 36), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    cols = [
        (ommani_idle[0], "육자 idle"),
        (ommani_mid, "육자 mid"),
        (namu_idle[0], "나무 idle"),
        (namu_mid, "나무 mid"),
    ]
    try:
        font = ImageFont.truetype(str(FONT), 22)
    except OSError:
        font = ImageFont.load_default()
    for i, (im, lab) in enumerate(cols):
        strip.paste(im, (i * W, 36))
        d.text((i * W + 8, 8), lab, fill=(200, 180, 140, 255), font=font)
    strip.save(DOCS / "preview-2.6.0-hanja.png")

    # 6-bead sequence strip for both themes
    seq = Image.new("RGBA", (W * 6, H * 2 + 48), (20, 16, 12, 255))
    sd = ImageDraw.Draw(seq)
    for ti, (theme, label, idles) in enumerate(
        [
            ("ommani", "육자진언 唵嘛呢叭咪吽", ommani_idle),
            ("namu", "나무아미타불 南無阿彌陀佛", namu_idle),
        ]
    ):
        sd.text((8, ti * (H + 24) + 4), label, fill=(200, 180, 140, 255), font=font)
        for p in range(6):
            seq.paste(idles[p], (p * W, ti * (H + 24) + 24))
    seq.save(DOCS / "preview-2.6.0-hanja-seq.png")
    print("previews ok")


def main():
    payload = ensure_depth_on_boxes(load_layout())
    print("geom", payload["meta"])

    # crop from default renders
    default_assets = load_theme_beads("default")
    probe = []
    for key in ("next", "prev"):
        for i in range(4):
            probe.append(render_full(payload["frames"][key][i]["boxes"], default_assets, 0))
    crop = content_bbox(probe)
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    print(f"crop={crop} size={cw}x{ch}")

    all_meta = {}
    all_sizes = {}

    # default
    sizes, meta, _ = generate_theme("default", payload, crop, default_assets)
    all_sizes.update(sizes)
    all_meta["default"] = meta
    print("default files", len(sizes), "sum", sum(sizes.values()))

    ommani_assets = load_theme_beads("ommani")
    sizes, meta, ommani_idle = generate_theme("ommani", payload, crop, ommani_assets)
    all_sizes.update(sizes)
    all_meta["ommani"] = meta
    print("ommani files", len(sizes), "sum", sum(sizes.values()))
    ommani_mid = render_full(payload["frames"]["next"][1]["boxes"], ommani_assets, 0)

    namu_assets = load_theme_beads("namu")
    sizes, meta, namu_idle = generate_theme("namu", payload, crop, namu_assets)
    all_sizes.update(sizes)
    all_meta["namu"] = meta
    print("namu files", len(sizes), "sum", sum(sizes.values()))
    namu_mid = render_full(payload["frames"]["next"][1]["boxes"], namu_assets, 0)

    total = sum(all_sizes.values())
    print("TOTAL sprite bytes", total)
    write_sprite_meta(
        all_meta,
        {"left": crop[0], "top": crop[1], "width": cw, "height": ch},
        total,
    )
    make_previews(ommani_idle, namu_idle, ommani_mid, namu_mid, payload, None)


if __name__ == "__main__":
    main()
