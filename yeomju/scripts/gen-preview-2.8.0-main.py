#!/usr/bin/env python3
"""2.8.0 메인 미리보기 · 축하 반짝임 · 해금 안내."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 432, 514
R = 48
CROP_LEFT = 86
ROOT = Path(__file__).resolve().parents[1]
SPRITE = ROOT / "src" / "common" / "sprite"
OUT = ROOT / "docs" / "preview-2.8.0-main.png"
BG = (12, 10, 8, 255)


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


def draw_count(base: Image.Image, text: str, font, color):
    d = ImageDraw.Draw(base)
    tw = d.textlength(text, font=font) if hasattr(d, "textlength") else 80
    x = (W - tw) / 2
    y = H - 36 - 56 + 6
    for dx, dy in (
        (-2, 0),
        (2, 0),
        (0, -2),
        (0, 2),
        (-2, -2),
        (2, -2),
        (-2, 2),
        (2, 2),
    ):
        d.text((x + dx, y + dy), text, fill=(0, 0, 0, 230), font=font)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.text((x, y), text, fill=(255, 215, 0, 120), font=font)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=3))
    base.alpha_composite(glow)
    d = ImageDraw.Draw(base)
    d.text((x, y), text, fill=color, font=font)


def draw_banner(base: Image.Image, text: str, font):
    d = ImageDraw.Draw(base)
    tw = d.textlength(text, font=font) if hasattr(d, "textlength") else 200
    x = (W - tw) / 2
    y = 56
    d.text((x + 1, y + 1), text, fill=(0, 0, 0, 200), font=font)
    d.text((x, y), text, fill=(255, 215, 0, 255), font=font)


def render_frame(theme: str, count: str, glow: bool, banner: str | None):
    frame = Image.new("RGBA", (W, H), BG)
    idle = Image.open(idle_path(theme)).convert("RGBA")
    frame.paste(idle, (CROP_LEFT, 0))
    color = (255, 215, 0, 255) if glow else (255, 244, 214, 255)
    draw_count(frame, count, cjk_font(48), color)
    if banner:
        draw_banner(frame, banner, cjk_font(26))
    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(frame, (0, 0), mask=mask)
    return out


def main():
    panels = [
        ("default", "21", True, None, "목표 축하"),
        ("jade", "108", True, None, "배수 축하"),
        ("goldwood", "1080", True, "금박 나무 염주 해금", "해금"),
        ("pinkjade", "42", False, None, "일반"),
    ]
    lab = cjk_font(22)
    strip = Image.new("RGBA", (W * 4, H + 36), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    for i, (theme, count, glow, banner, label) in enumerate(panels):
        strip.paste(render_frame(theme, count, glow, banner), (i * W, 36))
        d.text((i * W + 8, 8), label, fill=(200, 180, 140, 255), font=lab)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, "PNG")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
