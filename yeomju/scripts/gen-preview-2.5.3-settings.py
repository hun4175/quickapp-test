#!/usr/bin/env python3
"""2.5.3 설정 화면 미리보기 · 432×514 둥근 사각형 마스크."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 432, 514
R = 48
PAD_X = 36
OUT = Path(__file__).resolve().parents[1] / "docs" / "preview-2.5.3-settings.png"


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m


def font(size):
    for path in (
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    img = Image.new("RGBA", (W, H), (20, 14, 10, 255))
    d = ImageDraw.Draw(img)

    f_back = font(30)
    f_title = font(36)
    f_label = font(28)
    f_hint = font(24)
    f_opt = font(32)
    f_mark = font(34)
    f_meta = font(20)

    # header
    d.text((PAD_X + 4, 40), "‹ 뒤로", fill=(184, 148, 98, 255), font=f_back)
    title = "설정"
    tw = d.textlength(title, font=f_title) if hasattr(d, "textlength") else 72
    d.text(((W - tw) / 2, 36), title, fill=(232, 196, 138, 255), font=f_title)

    # label + hint
    y = 120
    d.text((PAD_X, y), "입력 방식", fill=(154, 123, 85, 255), font=f_label)
    y += 40
    d.text(
        (PAD_X, y),
        "위·아래 스와이프로 굴리기",
        fill=(110, 86, 60, 255),
        font=f_hint,
    )
    y += 48

    # options: slide selected, touch idle
    opts = [
        ("슬라이드", True),
        ("터치", False),
    ]
    for label, on in opts:
        x0, y0 = PAD_X, y
        x1, y1 = W - PAD_X, y + 96
        fill = (74, 52, 32, 255) if on else (42, 30, 20, 255)
        border = (232, 196, 138, 255) if on else (58, 42, 24, 255)
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=border, width=3)
        d.text((x0 + 22, y0 + 28), label, fill=(243, 226, 196, 255), font=f_opt)
        if on:
            d.text((x1 - 48, y0 + 26), "✓", fill=(232, 196, 138, 255), font=f_mark)
        y += 96 + 14

    d.text(
        ((W - 100) / 2, y + 20),
        "v2.5.3 · S2",
        fill=(110, 86, 60, 255),
        font=f_meta,
    )

    mask = rounded_mask(W, H, R)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask=mask)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "PNG")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
