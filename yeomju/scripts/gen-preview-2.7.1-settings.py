#!/usr/bin/env python3
"""2.7.1 설정 미리보기 · 상단/하단 (CJK 폰트)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 432, 514
R = 48
PAD_X = 36
HEADER_H = 78
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "preview-2.7.1-settings.png"


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


def render_content():
    f_label, f_hint = cjk_font(28), cjk_font(22)
    f_opt, f_mark, f_meta = cjk_font(32), cjk_font(34), cjk_font(20)
    canvas_h = 1400
    img = Image.new("RGBA", (W, canvas_h), (20, 14, 10, 255))
    d = ImageDraw.Draw(img)
    y = 8

    def section(label, hint):
        nonlocal y
        d.text((PAD_X, y), label, fill=(154, 123, 85, 255), font=f_label)
        y += 36
        d.text((PAD_X, y), hint, fill=(110, 86, 60, 255), font=f_hint)
        y += 32

    def opt(label, on):
        nonlocal y
        x0, y0, x1, y1 = PAD_X, y, W - PAD_X, y + 96
        fill = (74, 52, 32, 255) if on else (42, 30, 20, 255)
        border = (232, 196, 138, 255) if on else (58, 42, 24, 255)
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=border, width=3)
        d.text((x0 + 22, y0 + 28), label, fill=(243, 226, 196, 255), font=f_opt)
        if on:
            d.text((x1 - 48, y0 + 26), "✓", fill=(232, 196, 138, 255), font=f_mark)
        y += 96 + 12

    section("입력 방식", "위·아래 스와이프로 굴리기")
    opt("슬라이드", True)
    opt("터치", False)
    section("염주", "구슬 재질")
    opt("기본", True)
    opt("금박 나무", False)
    opt("옥", False)
    opt("연핑크 옥", False)
    section("횟수 표시", "메인 화면 하단 카운트")
    opt("켜기", True)
    opt("끄기", False)
    y += 8
    meta = "v2.7.1"
    tw = d.textlength(meta, font=f_meta) if hasattr(d, "textlength") else 60
    d.text(((W - tw) / 2, y), meta, fill=(110, 86, 60, 255), font=f_meta)
    y += 36
    return img.crop((0, 0, W, y + 8)), y + 8


def with_header(content, scroll_y):
    frame = Image.new("RGBA", (W, H), (20, 14, 10, 255))
    d = ImageDraw.Draw(frame)
    f_back, f_title = cjk_font(30), cjk_font(36)
    d.text((PAD_X + 4, 32), "‹ 뒤로", fill=(184, 148, 98, 255), font=f_back)
    title = "설정"
    tw = d.textlength(title, font=f_title) if hasattr(d, "textlength") else 72
    d.text(((W - tw) / 2, 28), title, fill=(232, 196, 138, 255), font=f_title)
    view_h = H - HEADER_H
    sy = max(0, min(scroll_y, max(0, content.size[1] - view_h)))
    frame.paste(content.crop((0, sy, W, sy + view_h)), (0, HEADER_H))
    return frame


def apply_mask(img):
    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask=mask)
    return out


def main():
    content, content_h = render_content()
    view_h = H - HEADER_H
    top = apply_mask(with_header(content, 0))
    bot = apply_mask(with_header(content, max(0, content_h - view_h)))
    lab = cjk_font(22)
    strip = Image.new("RGBA", (W * 2, H + 36), (16, 12, 10, 255))
    sd = ImageDraw.Draw(strip)
    sd.text((8, 8), "설정 상단", fill=(200, 180, 140, 255), font=lab)
    sd.text((W + 8, 8), "설정 하단", fill=(200, 180, 140, 255), font=lab)
    strip.paste(top, (0, 36))
    strip.paste(bot, (W, 36))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT, "PNG")
    print(f"wrote {OUT} content_h={content_h}")


if __name__ == "__main__":
    main()
