#!/usr/bin/env python3
"""2.6.0 설정 화면 미리보기 · 입력 + 염주 3테마 · 432×514 둥근 마스크."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 432, 514
R = 48
PAD_X = 36
OUT = Path(__file__).resolve().parents[1] / "docs" / "preview-2.6.0-settings.png"


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


def font(size):
    for path in (
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        str(
            Path(__file__).resolve().parents[1]
            / "scripts/assets/fonts/NotoSerifCJKsc-Mantra.otf"
        ),
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    img = Image.new("RGBA", (W, H), (20, 14, 10, 255))
    d = ImageDraw.Draw(img)
    f_back, f_title = font(28), font(34)
    f_label, f_hint = font(26), font(20)
    f_opt, f_mark, f_meta = font(28), font(30), font(18)

    d.text((PAD_X + 4, 22), "‹ 뒤로", fill=(184, 148, 98, 255), font=f_back)
    title = "설정"
    tw = d.textlength(title, font=f_title) if hasattr(d, "textlength") else 72
    d.text(((W - tw) / 2, 18), title, fill=(232, 196, 138, 255), font=f_title)

    y = 78

    def section(label, hint):
        nonlocal y
        d.text((PAD_X, y), label, fill=(154, 123, 85, 255), font=f_label)
        y += 32
        d.text((PAD_X, y), hint, fill=(110, 86, 60, 255), font=f_hint)
        y += 28

    def opt(label, on):
        nonlocal y
        x0, y0, x1, y1 = PAD_X, y, W - PAD_X, y + 72
        fill = (74, 52, 32, 255) if on else (42, 30, 20, 255)
        border = (232, 196, 138, 255) if on else (58, 42, 24, 255)
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=border, width=3)
        d.text((x0 + 16, y0 + 18), label, fill=(243, 226, 196, 255), font=f_opt)
        if on:
            d.text((x1 - 40, y0 + 16), "✓", fill=(232, 196, 138, 255), font=f_mark)
        y += 72 + 8

    section("입력 방식", "위·아래 스와이프로 굴리기")
    opt("슬라이드", True)
    opt("터치", False)
    section("염주", "나무 구슬")
    opt("기본", True)
    opt("육자진언", False)
    opt("나무아미타불", False)
    d.text(((W - 110) / 2, min(y + 4, H - 28)), "v2.6.0 · S2", fill=(110, 86, 60, 255), font=f_meta)

    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask=mask)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
