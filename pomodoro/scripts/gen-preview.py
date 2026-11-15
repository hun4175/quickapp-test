#!/usr/bin/env python3
"""뽀모도로 메인 화면 프리뷰(문서용)와 앱 아이콘을 생성한다.

REDMI Watch 6 화면은 432x514 둥근 사각형이다.
앱 런타임은 미리 합성한 프레임을 쓰지 않고, 아래쪽 색 영역의 높이만 바꾼다.
이 스크립트는 README 프리뷰 PNG 와 logo.png 만 만든다.
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(ROOT, "src", "common", "logo.png")
PREVIEW_DIR = os.path.join(ROOT, "docs")

SCREEN_W, SCREEN_H = 432, 514
FOCUS = (255, 75, 75, 255)  # #FF4B4B
TIME = (255, 255, 255, 255)
SHADOW = (0, 0, 0, 255)


def _font(size: int):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf",
        "/usr/share/fonts/truetype/sand-box/google/Nanum Gothic/NanumGothic-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def logo(path: str):
    """토마토 형태 아이콘. 192x192."""
    im = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((14, 32, 178, 188), fill=FOCUS)
    d.rectangle((90, 18, 102, 42), fill=(46, 120, 64, 255))
    d.polygon([(96, 28), (44, 22), (52, 8), (96, 24)], fill=(61, 180, 100, 255))
    d.polygon([(96, 28), (148, 18), (138, 6), (96, 24)], fill=(46, 150, 80, 255))
    d.polygon([(96, 30), (84, 8), (108, 8)], fill=(56, 160, 88, 255))
    d.ellipse((42, 58, 90, 100), fill=(255, 160, 150, 160))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def preview(path: str, fill_ratio: float, time_text: str, color=FOCUS):
    """화면 아래쪽에 남은 비율만큼 색을 채운 432x514 프리뷰."""
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    ratio = max(0.0, min(1.0, fill_ratio))
    h = int(round(SCREEN_H * ratio))
    if h > 0:
        top = SCREEN_H - h
        d.rectangle((0, top, SCREEN_W, SCREEN_H), fill=color)
    font = _font(80)
    cx, cy = SCREEN_W / 2, SCREEN_H / 2
    # 검정 외곽선 + 본문 흰색
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, -2), (-2, 2), (2, 2)):
        d.text((cx + ox, cy + oy), time_text, font=font, fill=SHADOW, anchor="mm")
    d.text((cx, cy), time_text, font=font, fill=TIME, anchor="mm")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.convert("RGB").save(path, format="PNG", optimize=True)


def main():
    logo(LOGO_PATH)
    full = os.path.join(PREVIEW_DIR, "preview-0.1.1-full.png")
    half = os.path.join(PREVIEW_DIR, "preview-0.1.1-half.png")
    preview(full, 1.0, "25:00")
    preview(half, 0.5, "12:30")
    print(f"logo: {os.path.getsize(LOGO_PATH)}")
    print(f"full: {os.path.getsize(full)}")
    print(f"half: {os.path.getsize(half)}")


if __name__ == "__main__":
    main()
