#!/usr/bin/env python3
"""2.7.2 메인 미리보기 · 4테마 카운트(가독성 강화). 108은 예시값."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 432, 514
R = 48
CROP_LEFT = 86
ROOT = Path(__file__).resolve().parents[1]
SPRITE = ROOT / "src" / "common" / "sprite"
OUT = ROOT / "docs" / "preview-2.7.2-main.png"
BG = (12, 10, 8, 255)
# 예시 카운트(실제 첫 실행은 0)
COUNT = "108"
COUNT_COLOR = (255, 244, 214, 255)


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


def draw_count_outlined(base: Image.Image, text: str, font: ImageFont.ImageFont):
    """굵은 숫자 + 어두운 외곽선(여러 방향) — 배경 박스 없음."""
    d = ImageDraw.Draw(base)
    tw = d.textlength(text, font=font) if hasattr(d, "textlength") else 80
    x = (W - tw) / 2
    y = H - 36 - 56 + 6
    # outline
    for dx, dy in (
        (-2, 0),
        (2, 0),
        (0, -2),
        (0, 2),
        (-2, -2),
        (2, -2),
        (-2, 2),
        (2, 2),
        (0, 0),
    ):
        if dx == 0 and dy == 0:
            continue
        d.text((x + dx, y + dy), text, fill=(0, 0, 0, 230), font=font)
    # soft glow under
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.text((x, y), text, fill=(0, 0, 0, 160), font=font)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=2))
    base.alpha_composite(glow)
    d = ImageDraw.Draw(base)
    d.text((x, y), text, fill=COUNT_COLOR, font=font)


def render_theme(theme: str) -> Image.Image:
    frame = Image.new("RGBA", (W, H), BG)
    idle = Image.open(idle_path(theme)).convert("RGBA")
    frame.paste(idle, (CROP_LEFT, 0))
    font = cjk_font(48)
    draw_count_outlined(frame, COUNT, font)
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
    print(f"wrote {OUT} (COUNT={COUNT} example)")


if __name__ == "__main__":
    main()
