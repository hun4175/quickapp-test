#!/usr/bin/env python3
"""2.8.1 메인 미리보기 · 현재/목표 · 축하 오버레이 · 1080 해금."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 432, 514
R = 48
CROP_LEFT = 86
ROOT = Path(__file__).resolve().parents[1]
SPRITE = ROOT / "src" / "common" / "sprite"
CELE = ROOT / "src" / "common" / "cele-glow.png"
OUT = ROOT / "docs" / "preview-2.8.1-main.png"
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


def draw_count_pair(base: Image.Image, cur: str, goal: str, glow: bool):
    f_cur, f_goal = cjk_font(48), cjk_font(28)
    d = ImageDraw.Draw(base)
    sep = " / "
    tw_cur = d.textlength(cur, font=f_cur) if hasattr(d, "textlength") else 40
    tw_sep = d.textlength(sep, font=f_goal) if hasattr(d, "textlength") else 20
    tw_goal = d.textlength(goal, font=f_goal) if hasattr(d, "textlength") else 40
    total = tw_cur + tw_sep + tw_goal
    x = (W - total) / 2
    y_cur = H - 32 - 52
    y_goal = y_cur + 14
    color = (255, 215, 0, 255) if glow else (255, 244, 214, 255)
    dim = (168, 144, 104, 255)
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        d.text((x + dx, y_cur + dy), cur, fill=(0, 0, 0, 220), font=f_cur)
    d.text((x, y_cur), cur, fill=color, font=f_cur)
    d.text((x + tw_cur, y_goal), sep, fill=dim, font=f_goal)
    d.text((x + tw_cur + tw_sep, y_goal), goal, fill=dim, font=f_goal)


def draw_msg(base: Image.Image, text: str):
    font = cjk_font(30)
    d = ImageDraw.Draw(base)
    tw = d.textlength(text, font=font) if hasattr(d, "textlength") else 160
    x = (W - tw) / 2
    y = 200
    d.text((x + 1, y + 1), text, fill=(0, 0, 0, 200), font=font)
    d.text((x, y), text, fill=(255, 215, 0, 255), font=font)


def render(theme: str, cur: str, goal: str, celebrate: bool, msg: str | None):
    frame = Image.new("RGBA", (W, H), BG)
    idle = Image.open(idle_path(theme)).convert("RGBA")
    frame.paste(idle, (CROP_LEFT, 0))
    if celebrate and CELE.exists():
        glow = Image.open(CELE).convert("RGBA")
        # match opacity ~0.9
        a = glow.split()[-1].point(lambda p: int(p * 0.9))
        glow.putalpha(a)
        frame.alpha_composite(glow, (CROP_LEFT, 0))
    draw_count_pair(frame, cur, goal, glow=celebrate)
    if msg:
        draw_msg(frame, msg)
    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(frame, (0, 0), mask=mask)
    return out


def main():
    panels = [
        ("default", "12", "21", False, None, "평소 12/21"),
        ("jade", "0", "54", True, "원만 성취", "축하 효과"),
        ("goldwood", "0", "1080", True, "금박 나무 염주 해금", "1080 해금"),
        ("pinkjade", "1080", "1080", False, None, "긴 숫자"),
    ]
    lab = cjk_font(20)
    strip = Image.new("RGBA", (W * 4, H + 36), (20, 16, 12, 255))
    d = ImageDraw.Draw(strip)
    for i, (theme, cur, goal, cele, msg, label) in enumerate(panels):
        strip.paste(render(theme, cur, goal, cele, msg), (i * W, 36))
        d.text((i * W + 8, 8), label, fill=(200, 180, 140, 255), font=lab)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, "PNG")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
