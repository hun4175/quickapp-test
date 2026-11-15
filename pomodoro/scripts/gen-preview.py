#!/usr/bin/env python3
"""뽀모도로 메인 화면 프리뷰(문서용), 앱 아이콘, 스와이프 화살표 PNG를 생성한다.

REDMI Watch 6 화면은 432x514 둥근 사각형이다.
앱 런타임은 미리 합성한 프레임을 쓰지 않고, 아래쪽 색 영역의 높이만 바꾼다.
대기 화면의 ▲/▼ 는 폰트 글리프 대신 작은 PNG 를 쓴다.
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMON = os.path.join(ROOT, "src", "common")
LOGO_PATH = os.path.join(COMMON, "logo.png")
ARROW_UP = os.path.join(COMMON, "arrow-up.png")
ARROW_DOWN = os.path.join(COMMON, "arrow-down.png")
PREVIEW_DIR = os.path.join(ROOT, "docs")

SCREEN_W, SCREEN_H = 432, 514
ARROW_W, ARROW_H = 48, 32
ARROW_LEFT = 192
ARROW_UP_TOP = 168
ARROW_DOWN_TOP = 310

FOCUS = (255, 75, 75, 255)  # #FF4B4B
BREAK = (61, 220, 132, 255)  # #3DDC84
FOCUS_DIM = (138, 58, 58, 255)  # #8A3A3A
BREAK_DIM = (42, 107, 74, 255)  # #2A6B4A
EMPTY = (0, 0, 0, 255)
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


def _triangle(up: bool) -> Image.Image:
    """흰색 삼각형 + 검은 외곽선. 투명 배경."""
    im = Image.new("RGBA", (ARROW_W, ARROW_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if up:
        black = [(ARROW_W / 2, 1), (ARROW_W - 1, ARROW_H - 1), (1, ARROW_H - 1)]
        white = [(ARROW_W / 2, 6), (ARROW_W - 6, ARROW_H - 5), (6, ARROW_H - 5)]
    else:
        black = [(1, 1), (ARROW_W - 1, 1), (ARROW_W / 2, ARROW_H - 1)]
        white = [(6, 5), (ARROW_W - 6, 5), (ARROW_W / 2, ARROW_H - 6)]
    d.polygon(black, fill=(0, 0, 0, 255))
    d.polygon(white, fill=(255, 255, 255, 255))
    return im


def write_arrows():
    os.makedirs(COMMON, exist_ok=True)
    _triangle(True).save(ARROW_UP, format="PNG", optimize=True)
    _triangle(False).save(ARROW_DOWN, format="PNG", optimize=True)


def _draw_time(d: ImageDraw.ImageDraw, time_text: str):
    font = _font(80)
    cx, cy = SCREEN_W / 2, SCREEN_H / 2
    for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, -2), (-2, 2), (2, 2)):
        d.text((cx + ox, cy + oy), time_text, font=font, fill=SHADOW, anchor="mm")
    d.text((cx, cy), time_text, font=font, fill=TIME, anchor="mm")


def preview(path: str, fill_ratio: float, time_text: str, fill, back, arrows=False, up_dim=False, down_dim=False):
    """아래쪽은 현재 구간 색, 위쪽은 다음 구간 색인 432x514 프리뷰."""
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), back)
    d = ImageDraw.Draw(im)
    ratio = max(0.0, min(1.0, fill_ratio))
    h = int(round(SCREEN_H * ratio))
    if h > 0:
        top = SCREEN_H - h
        d.rectangle((0, top, SCREEN_W, SCREEN_H), fill=fill)
    if arrows:
        up = Image.open(ARROW_UP).convert("RGBA")
        down = Image.open(ARROW_DOWN).convert("RGBA")
        if up_dim:
            a = up.split()[-1].point(lambda p: int(p * 0.3))
            up.putalpha(a)
        if down_dim:
            a = down.split()[-1].point(lambda p: int(p * 0.3))
            down.putalpha(a)
        im.alpha_composite(up, (ARROW_LEFT, ARROW_UP_TOP))
        im.alpha_composite(down, (ARROW_LEFT, ARROW_DOWN_TOP))
    _draw_time(d, time_text)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.convert("RGB").save(path, format="PNG", optimize=True)


def main():
    logo(LOGO_PATH)
    write_arrows()
    idle = os.path.join(PREVIEW_DIR, "preview-0.1.2-idle.png")
    focus_half = os.path.join(PREVIEW_DIR, "preview-0.1.2-focus-half.png")
    break_half = os.path.join(PREVIEW_DIR, "preview-0.1.2-break-half.png")
    preview(idle, 1.0, "25:00", FOCUS_DIM, BREAK_DIM, arrows=True)
    preview(focus_half, 0.5, "12:30", FOCUS, BREAK, arrows=False)
    preview(break_half, 0.5, "02:30", BREAK, EMPTY, arrows=False)
    print(f"logo: {os.path.getsize(LOGO_PATH)}")
    print(f"arrow-up: {os.path.getsize(ARROW_UP)}")
    print(f"arrow-down: {os.path.getsize(ARROW_DOWN)}")
    print(f"idle: {os.path.getsize(idle)}")
    print(f"focus-half: {os.path.getsize(focus_half)}")
    print(f"break-half: {os.path.getsize(break_half)}")


if __name__ == "__main__":
    main()
