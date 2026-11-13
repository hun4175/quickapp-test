#!/usr/bin/env python3
"""
2.6.0: bead-src-cut 위에 한자 각인(구면 워프) 합성 → scripts/assets/beads-engraved/
OFL Noto Serif CJK 서브셋 사용.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "assets" / "bead-src-cut.png"
FONT = ROOT / "scripts" / "assets" / "fonts" / "NotoSerifCJKsc-Mantra.otf"
OUT = ROOT / "scripts" / "assets" / "beads-engraved"

MANTRAS = {
    "ommani": list("唵嘛呢叭咪吽"),
    "namu": list("南無阿彌陀佛"),
}

# 구슬 지름 대비 글자 크기 비율 (45~55%)
GLYPH_RATIO = 0.50


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def make_glyph_layer(char: str, size: int) -> Image.Image:
    """검은 글자 + 가장자리 소프트 + 1px 파인 그림자."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    font_size = max(8, int(size * GLYPH_RATIO))
    font = load_font(font_size)
    draw = ImageDraw.Draw(canvas)
    # 측정
    bbox = draw.textbbox((0, 0), char, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((x + 1, y + 1), char, font=font, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=0.8))

    ink = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(ink)
    idraw.text((x, y), char, font=font, fill=(12, 8, 4, 210))
    # 가장자리 나무결이 비치도록 살짝 블러
    ink_soft = ink.filter(ImageFilter.GaussianBlur(radius=0.6))
    ink = Image.alpha_composite(ink_soft, ink)

    out = Image.alpha_composite(shadow, ink)
    return out


def sphere_warp_glyph(glyph: Image.Image, size: int) -> Image.Image:
    """
    정면 반구 워프: 가장자리가 구면처럼 눌림.
    dest (nx,ny) → source 를 z에 따라 안쪽으로 샘플.
    """
    g = np.array(glyph.convert("RGBA"), dtype=np.float32)
    out = np.zeros_like(g)
    cx = cy = (size - 1) * 0.5
    r = size * 0.5
    yy, xx = np.mgrid[0:size, 0:size]
    nx = (xx - cx) / r
    ny = (yy - cy) / r
    r2 = nx * nx + ny * ny
    mask = r2 < 0.98
    z = np.zeros_like(r2)
    z[mask] = np.sqrt(np.clip(1.0 - r2[mask], 0, 1))
    # 가장자리 압축: source radius scale = lerp(0.78, 1.0, z)
    scale = 0.78 + 0.22 * z
    sx = cx + nx * scale * r
    sy = cy + ny * scale * r
    # bilinear sample
    sx = np.clip(sx, 0, size - 1.001)
    sy = np.clip(sy, 0, size - 1.001)
    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    x1 = np.minimum(x0 + 1, size - 1)
    y1 = np.minimum(y0 + 1, size - 1)
    wx = sx - x0
    wy = sy - y0
    for c in range(4):
        Ia = g[y0, x0, c]
        Ib = g[y0, x1, c]
        Ic = g[y1, x0, c]
        Id = g[y1, x1, c]
        top = Ia * (1 - wx) + Ib * wx
        bot = Ic * (1 - wx) + Id * wx
        val = top * (1 - wy) + bot * wy
        ch = out[:, :, c]
        ch[mask] = val[mask]
        # 가장자리 알파 추가 감쇠 (나무결)
        if c == 3:
            edge = np.clip((0.98 - r2) / 0.25, 0, 1)
            ch[mask] *= 0.55 + 0.45 * edge[mask] * (0.7 + 0.3 * z[mask])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def engrave(bead: Image.Image, glyph_warped: Image.Image) -> Image.Image:
    """각인: 글자 영역 나무색을 어둡게 multiply."""
    base = np.array(bead.convert("RGBA"), dtype=np.float32)
    gl = np.array(glyph_warped.convert("RGBA"), dtype=np.float32)
    a = (gl[:, :, 3:4] / 255.0) * 0.92
    # multiply darken
    dark = base[:, :, :3] * (1.0 - a * 0.72)
    # slight extra cavity
    dark = dark * (1.0 - a * 0.12)
    out = base.copy()
    out[:, :, :3] = dark
    # keep bead alpha
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def build_char_bead(src: Image.Image, char: str) -> Image.Image:
    size = src.size[0]
    glyph = make_glyph_layer(char, size)
    warped = sphere_warp_glyph(glyph, size)
    return engrave(src, warped)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")
    if not FONT.exists():
        raise SystemExit(f"missing {FONT}")
    src = Image.open(SRC).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    for theme, chars in MANTRAS.items():
        tdir = OUT / theme
        tdir.mkdir(parents=True, exist_ok=True)
        for i, ch in enumerate(chars):
            bead = build_char_bead(src, ch)
            path = tdir / f"{i}-{ch}.png"
            bead.save(path, "PNG", optimize=True)
            print("wrote", path.relative_to(ROOT), bead.size)
        # also plain for back (optional copy of source)
        src.save(tdir / "plain.png", "PNG", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
