#!/usr/bin/env python3
"""2.4.5 진단 패널 미리보기 · 432×514 둥근 사각형 마스크."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 432, 514
R = 48
OUT = Path(__file__).resolve().parents[1] / "docs" / "preview-2.4.5-diag.png"

# DIAG_PANEL from timing-core.js
BOX = (24, 290, 24 + 384, 290 + 214)
LINE_TOPS = [6, 40, 74, 108, 142, 176]
LINES = [
    "n=10 t0=swipe",
    "in→set:12ms",
    "set→start:4ms",
    "anim:148ms",
    "mv→jd:8ms h→set:2ms",
    "avg in/ss/an:15/5/150",
]


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


def main():
    img = Image.new("RGBA", (W, H), (12, 10, 8, 255))
    d = ImageDraw.Draw(img)
    # 구슬 자리 (분위기용)
    for cx, cy, s, col in [
        (216, 210, 90, (139, 90, 43, 220)),
        (120, 280, 70, (110, 70, 35, 180)),
        (310, 270, 70, (110, 70, 35, 180)),
        (160, 140, 55, (90, 60, 30, 140)),
        (270, 140, 55, (90, 60, 30, 140)),
    ]:
        d.ellipse((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2), fill=col)

    d.rectangle(BOX, fill=(18, 14, 10, 255))
    # P1/P2 dots
    d.ellipse((24 + 12, 290 + 10, 24 + 32, 290 + 30), fill=(255, 255, 255, 255))
    d.ellipse((24 + 40, 290 + 10, 24 + 60, 290 + 30), fill=(58, 42, 24, 255))

    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22
        )
    except OSError:
        font = ImageFont.load_default()

    for i, text in enumerate(LINES):
        x = 24 + (68 if i == 0 else 12)
        y = 290 + LINE_TOPS[i]
        d.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    d.text((W - 80, 16), "설정", fill=(232, 196, 138, 255), font=font)

    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask=mask)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
