#!/usr/bin/env python3
"""2.7.1 메인 미리보기 · 4테마 카운트 표시."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 432, 514
R = 48
CROP_LEFT = 86
ROOT = Path(__file__).resolve().parents[1]
SPRITE = ROOT / "src" / "common" / "sprite"
OUT = ROOT / "docs" / "preview-2.7.1-main.png"
BG = (12, 10, 8, 255)
COUNT = "108"
COUNT_COLOR = (243, 226, 196, 255)
SHADOW = (0, 0, 0, 180)


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


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


def idle_path(theme: str) -> Path:
    if theme == "default":
        return SPRITE / "idle.jpg"
    return SPRITE / theme / "idle.jpg"


def render_theme(theme: str) -> Image.Image:
    frame = Image.new("RGBA", (W, H), BG)
    idle = Image.open(idle_path(theme)).convert("RGBA")
    frame.paste(idle, (CROP_LEFT, 0))
    d = ImageDraw.Draw(frame)
    font = cjk_font(40)
    tw = d.textlength(COUNT, font=font) if hasattr(d, "textlength") else 60
    x = (W - tw) / 2
    y = H - 40 - 48 + 4  # bottom:40 + count height ~48, slight optical nudge
    # thin text-shadow (no box)
    d.text((x + 1, y + 1), COUNT, fill=SHADOW, font=font)
    d.text((x, y), COUNT, fill=COUNT_COLOR, font=font)
    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(frame, (0, 0), mask=mask)
    return out


def main():
    labels = [
        ("default", "기본"),
        ("goldwood", "금박 나무"),
        ("jade", "옥"),
        ("pinkjade", "연핑크 옥"),
    ]
    lab_font = cjk_font(22)
    strip = Image.new("RGBA", (W * 4, H + 36), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    for i, (key, lab) in enumerate(labels):
        strip.paste(render_theme(key), (i * W, 36))
        d.text((i * W + 8, 8), lab, fill=(200, 180, 140, 255), font=lab_font)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, "PNG")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
