#!/usr/bin/env python3
"""뽀모도로 앱 아이콘(logo.png)을 생성한다.

화면 리소스와 미리보기는 scripts/gen-booster.py 가 만든다.
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMON = os.path.join(ROOT, "src", "common")
LOGO_PATH = os.path.join(COMMON, "logo.png")
FOCUS = (255, 75, 75, 255)  # #FF4B4B


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


def main():
    logo(LOGO_PATH)
    print(f"logo: {os.path.getsize(LOGO_PATH)}")


if __name__ == "__main__":
    main()
