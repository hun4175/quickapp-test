#!/usr/bin/env python3
"""
순검정 배경 JPG(1024²)에서 구슬 원 중심·반지름 자동 검출 →
안티에일리어스 원형 알파 PNG (반지름 1.5% 안쪽) 저장.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "scripts" / "assets"
OUT = ASSETS / "beads-cut"

SOURCES = {
    "goldwood": ASSETS / "bead-goldwood-src.jpg",
    "jade": ASSETS / "bead-jade-src.jpg",
    "pinkjade": ASSETS / "bead-pinkjade-src.jpg",
}

# 검정 배경 임계 (RGB 합)
BG_LUMA_MAX = 28
INSET = 0.015  # 1.5% 안쪽 → 후광 제거


def detect_circle(rgb: np.ndarray):
    """비검정 픽셀로 원 중심·반지름 추정."""
    luma = rgb.astype(np.float32).sum(axis=2)
    mask = luma > BG_LUMA_MAX
    ys, xs = np.where(mask)
    if len(xs) < 100:
        raise SystemExit("too few foreground pixels")
    # 무게중심
    cx = float(xs.mean())
    cy = float(ys.mean())
    # 중심에서 가장 먼 전경 픽셀 ≈ 반지름
    dist = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    # 98 퍼센타일로 이상치 억제
    r = float(np.percentile(dist, 98.5))
    return cx, cy, r


def cut_aa(rgb: np.ndarray, cx: float, cy: float, r: float) -> Image.Image:
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    # soft edge ~1.2px
    soft = 1.2
    alpha = np.clip((r - d) / soft + 0.5, 0, 1)
    # 원 밖은 완전 투명, 안은 원본색
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = rgb
    out[:, :, 3] = (alpha * 255).astype(np.uint8)
    # 완전 투명 픽셀 RGB 정리(후광 방지)
    out[out[:, :, 3] == 0, :3] = 0
    return Image.fromarray(out, "RGBA")


def process(key: str, src: Path) -> Path:
    im = Image.open(src).convert("RGB")
    rgb = np.array(im)
    cx, cy, r = detect_circle(rgb)
    r_in = r * (1.0 - INSET)
    print(f"{key}: size={im.size} cx={cx:.1f} cy={cy:.1f} r={r:.1f} → r_in={r_in:.1f}")
    cut = cut_aa(rgb, cx, cy, r_in)
    # 구슬이 이미지에 가득 차도록 바운딩 박스 크롭 후 정사각 패딩
    a = np.array(cut)
    ys, xs = np.where(a[:, :, 3] > 8)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = cut.crop((x0, y0, x1, y1))
    # 1200 정사각으로 리사이즈(기본 bead-src-cut과 유사)
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - cropped.size[0]) // 2
    oy = (side - cropped.size[1]) // 2
    square.paste(cropped, (ox, oy), cropped)
    square = square.resize((1200, 1200), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"bead-{key}-cut.png"
    square.save(dest, "PNG", optimize=True)
    # 코너 알파·중심 불투명 검증
    px = square.load()
    print(
        f"  wrote {dest.name} cornersα={[px[0,0][3], px[1199,0][3], px[0,1199][3], px[1199,1199][3]]} "
        f"centerα={px[600,600][3]}"
    )
    return dest


def main():
    for key, src in SOURCES.items():
        if not src.exists():
            raise SystemExit(f"missing {src}")
        process(key, src)


if __name__ == "__main__":
    main()
