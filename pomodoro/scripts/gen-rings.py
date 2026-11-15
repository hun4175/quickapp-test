#!/usr/bin/env python3
"""뽀모도로 원형 진행 링 프레임과 앱 아이콘, 메인 화면 프리뷰를 생성한다.

REDMI Watch 6 화면은 432x514 둥근 사각형이다.
링은 400x400 투명 PNG 60장 x 집중(빨강)/휴식(초록) 두 색으로 미리 합성하고,
앱에서는 단일 <image>의 src 만 바꿔 표시한다.
프레임 0 = 가득(시작), 프레임 59 = 거의 비움(끝).
"""
from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RING_DIR = os.path.join(ROOT, "src", "common", "rings")
LOGO_PATH = os.path.join(ROOT, "src", "common", "logo.png")
PREVIEW_DIR = os.path.join(ROOT, "docs")

SCREEN_W, SCREEN_H = 432, 514
RING_SIZE = 400
RING_LEFT = 16
RING_TOP = 57
FRAMES = 60
STROKE = 22
MARGIN = 18

FOCUS = (255, 75, 75, 255)       # #FF4B4B
BREAK = (61, 220, 132, 255)      # #3DDC84
TRACK = (36, 36, 36, 255)
BG = (0, 0, 0, 255)


def _circle_at(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, color):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)


def draw_ring(remain_fraction: float, color, size: int = RING_SIZE) -> Image.Image:
    """remain_fraction=1 가득, 0 비움. 12시에서 시계방향으로 남은 호를 그린다."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    bbox = (MARGIN, MARGIN, size - 1 - MARGIN, size - 1 - MARGIN)
    d.arc(bbox, start=0, end=360, fill=TRACK, width=STROKE)
    frac = max(0.0, min(1.0, remain_fraction))
    if frac <= 0:
        return im

    # 12시(-90deg)에서 시계방향
    start = -90.0
    end = -90.0 + 360.0 * frac
    d.arc(bbox, start=start, end=end, fill=color, width=STROKE)

    cx = cy = (size - 1) / 2.0
    radius = (size - 1 - 2 * MARGIN) / 2.0
    cap_r = STROKE / 2.0 - 0.2

    def cap(angle_deg: float):
        rad = math.radians(angle_deg)
        x = cx + radius * math.cos(rad)
        y = cy + radius * math.sin(rad)
        _circle_at(d, x, y, cap_r, color)

    if frac < 0.999:
        cap(start)
        cap(end)
    return im


def save_png(im: Image.Image, path: os.PathLike | str):
    # 팔레트 PNG 로 용량을 줄인다. 투명 유지.
    quantized = im.quantize(colors=32, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    quantized.save(path, format="PNG", optimize=True)


def ring_fraction(index: int, frames: int = FRAMES) -> float:
    # 프레임 0 = 가득, 마지막도 1/frames 얇은 조각을 남겨 빈 링만 보이지 않게 한다.
    if frames <= 1:
        return 1.0
    return (frames - index) / float(frames)


def write_rings():
    os.makedirs(RING_DIR, exist_ok=True)
    # 이전 생성이 남아 있으면 지운다
    for name in os.listdir(RING_DIR):
        if name.endswith(".png"):
            os.remove(os.path.join(RING_DIR, name))
    paths = []
    for kind, color in (("focus", FOCUS), ("break", BREAK)):
        for i in range(FRAMES):
            frac = ring_fraction(i)
            im = draw_ring(frac, color)
            path = os.path.join(RING_DIR, f"{kind}-{i:02d}.png")
            save_png(im, path)
            paths.append(path)
    return paths


def logo(path: str):
    """토마토 형태 아이콘. 192x192."""
    im = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((14, 32, 178, 188), fill=FOCUS)
    # 꼭지
    d.rectangle((90, 18, 102, 42), fill=(46, 120, 64, 255))
    # 잎 두 장
    d.polygon([(96, 28), (44, 22), (52, 8), (96, 24)], fill=(61, 180, 100, 255))
    d.polygon([(96, 28), (148, 18), (138, 6), (96, 24)], fill=(46, 150, 80, 255))
    d.polygon([(96, 30), (84, 8), (108, 8)], fill=(56, 160, 88, 255))
    # 하이라이트
    d.ellipse((42, 58, 90, 100), fill=(255, 160, 150, 160))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf",
        "/usr/share/fonts/truetype/sand-box/google/Nanum Gothic/NanumGothic-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def preview(path: str, phase: str = "focus", frame: int = 15, time_text: str = "18:45", running: bool = True):
    """메인 화면을 432x514 로 합성한 프리뷰. 앱 런타임이 아니라 문서용이다."""
    im = Image.new("RGBA", (SCREEN_W, SCREEN_H), BG)
    kind = "break" if phase == "break" else "focus"
    ring_path = os.path.join(RING_DIR, f"{kind}-{frame:02d}.png")
    ring = Image.open(ring_path).convert("RGBA")
    if ring.size != (RING_SIZE, RING_SIZE):
        ring = ring.resize((RING_SIZE, RING_SIZE), Image.Resampling.LANCZOS)
    if not running:
        # 대기/일시정지 때 앱은 opacity 0.45
        a = ring.split()[-1].point(lambda p: int(p * 0.45))
        ring.putalpha(a)
    im.alpha_composite(ring, (RING_LEFT, RING_TOP))

    color = BREAK if phase == "break" else FOCUS
    if not running:
        color = (42, 107, 74, 255) if phase == "break" else (138, 58, 58, 255)
    d = ImageDraw.Draw(im)
    font = _font(80)
    # 시간 위치: CSS 와 맞춰 left 36, top 214, width 360, height 88
    box = (36, 214, 36 + 360, 214 + 88)
    d.text(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2), time_text, font=font, fill=color, anchor="mm")
    if not running and time_text != "25:00":
        # 일시정지 바
        bar_color = color
        x0, y0 = 198, 318
        d.rounded_rectangle((x0, y0, x0 + 10, y0 + 32), radius=3, fill=bar_color)
        d.rounded_rectangle((x0 + 22, y0, x0 + 32, y0 + 32), radius=3, fill=bar_color)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.convert("RGB").save(path, format="PNG", optimize=True)


def main():
    paths = write_rings()
    logo(LOGO_PATH)
    preview(
        os.path.join(PREVIEW_DIR, "preview-0.1.0-main.png"),
        phase="focus",
        frame=15,
        time_text="18:45",
        running=True,
    )
    print(f"rings: {len(paths)}")
    total = sum(os.path.getsize(p) for p in paths)
    print(f"rings bytes: {total}")
    print(f"logo: {os.path.getsize(LOGO_PATH)}")
    print(f"preview: {os.path.getsize(os.path.join(PREVIEW_DIR, 'preview-0.1.0-main.png'))}")


if __name__ == "__main__":
    main()
