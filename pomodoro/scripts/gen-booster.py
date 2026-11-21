#!/usr/bin/env python3
"""부스터 계기판(0.1.3) 런타임 리소스와 문서용 미리보기를 만든다.

디자인 기준은 docs/booster-design/v9/gen_v9.py 이고, 그 함수를 그대로 가져다 쓴다.
- src/common/booster/g00.png ~ g36.png : 켜진 칸 수(0~36)별 전체 화면 게이지 프레임.
  시간 박스 검정 바탕과 휴식 테두리는 포함, 글자·숫자는 뺐다. 팔레트 PNG.
- src/common/booster/m0~m9.png(분), s0~s9.png(초), colon.png, focus.png, rest.png,
  hint-up.png, hint-text.png, hint-down.png : 투명 PNG 오버레이(글로우 포함).
- docs/preview-0.1.3-*.png : 위 리소스를 앱과 같은 좌표로 겹쳐 합성한 미리보기.
앱은 게이지 image 하나의 src 만 바꾸고, 숫자 image 몇 개를 겹쳐 둔다.
"""
from __future__ import annotations

import json
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "v9"))
import gen_v9 as V  # noqa: E402

OUT = os.path.join(ROOT, "src", "common", "booster")
DOCS = os.path.join(ROOT, "docs")
W, H, CX, CY, S = V.W, V.H, V.CX, V.CY, V.S
N, NF, NB = V.N, V.NF, V.NB
GAUGE_COLORS = 256
PAD = 12  # 글로우 여유

# 숫자 위치 (gen_v9.draw 와 동일)
X0, Y0 = 242, CY - 70
TC, DM = (255, 238, 220), (24, 22, 22)


def screen_mask() -> Image.Image:
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=80, fill=255)
    return m


def gauge_frame(lit: int) -> Image.Image:
    """gen_v9.draw 에서 글자 레이어(T)만 뺀 것. lit = 켜진 칸 수."""
    off = N - lit
    base = V.gauge(off)
    if off < N:
        gl = V.glow(base.point(lambda v: v if v > 60 else 0), 9, 1.3)
        base = ImageChops.add(base, gl.point(lambda v: int(v * 0.5)))
    hole = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(hole).ellipse(((CX - V.RIN + 4) * S, (CY - V.RIN + 4) * S, (CX + V.RIN - 4) * S, (CY + V.RIN - 4) * S), fill=255)
    base = Image.composite(Image.new("RGB", (W, H)), base, hole.resize((W, H), Image.LANCZOS))
    cm = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(cm).rounded_rectangle((0, 0, (W - 1) * S, (H - 1) * S), radius=80 * S, fill=255)
    cm = cm.resize((W, H), Image.LANCZOS)
    base = Image.composite(base, Image.new("RGB", (W, H)), cm)
    Y = V.rest_border()
    bk = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(bk).rounded_rectangle((228 * S, V.BOXTOP * S, 404 * S, CY * S), radius=14 * S, fill=255)
    base = Image.composite(Image.new("RGB", (W, H)), base, bk.resize((W, H), Image.LANCZOS))
    Y = Image.composite(Y, Image.new("RGB", (W, H)), cm)
    base = ImageChops.add(base, Y)
    base = ImageChops.add(base, V.glow(Y, 5, 1.0).point(lambda v: int(v * 0.6)))
    out = Image.new("RGB", (W, H))
    out.paste(base, (0, 0), screen_mask())
    return out


def overlay(draw_fn) -> tuple[Image.Image, int, int]:
    """전체 화면 검정 위에 그리고 글로우(gen_v9 와 같은 glow(T,5,0.9))를 입힌 뒤
    내용 영역만 잘라 투명 PNG 로. 검정 위에 겹치면 디자인과 같은 값이 된다."""
    T = Image.new("RGB", (W, H))
    draw_fn(ImageDraw.Draw(T))
    bb = T.getbbox()
    G = V.glow(T, 5, 0.9)
    x0, y0 = max(0, bb[0] - PAD), max(0, bb[1] - PAD)
    x1, y1 = min(W, bb[2] + PAD), min(H, bb[3] + PAD)
    G = G.crop((x0, y0, x1, y1))
    r, g, b = G.split()
    a = ImageChops.lighter(ImageChops.lighter(r, g), b)
    px_rgb, px_a = G.load(), a.load()
    rgba = Image.new("RGBA", G.size)
    out = rgba.load()
    for yy in range(G.size[1]):
        for xx in range(G.size[0]):
            al = px_a[xx, yy]
            if al == 0:
                out[xx, yy] = (0, 0, 0, 0)
            else:
                c = px_rgb[xx, yy]
                out[xx, yy] = tuple(min(255, round(v * 255 / al)) for v in c) + (al,)
    return rgba, x0, y0


def label_y(lab: str) -> tuple[ImageFont.ImageFont, tuple, int]:
    fl = V.label_font()
    d = ImageDraw.Draw(Image.new("L", (10, 10)))
    bb = d.textbbox((0, 0), lab, font=fl)
    return fl, bb, Y0 - 14 - (bb[3] - bb[1])


def draw_label(lab: str, col):
    def fn(d):
        fl, bb, ly = label_y(lab)
        d.text((V.TX - bb[0], ly - bb[1]), lab, font=fl, fill=col)
        d.rectangle((V.TX, Y0 - 10, V.TX + V.TW, Y0 - 7), fill=V.YEL)
    return fn


HY = V.BOXTOP - 14
HINT_C = (170, 160, 150)


def save_png(im: Image.Image, path: str, colors: int | None = None):
    if colors:
        im = im.quantize(colors, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE)
    im.save(path, format="PNG", optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    layout = {}
    frames = {}
    for lit in range(N + 1):
        fr = gauge_frame(lit)
        frames[lit] = fr
        save_png(fr, os.path.join(OUT, f"g{lit:02d}.png"), GAUGE_COLORS)
    # 숫자: 위치는 첫 자리 기준, 둘째 자리는 오프셋만큼 오른쪽
    for ch in "0123456789":
        im, x, y = overlay(lambda d, ch=ch: V.sevenseg(d, ch, X0, Y0, 32, 60, 7, TC, DM))
        save_png(im, os.path.join(OUT, f"m{ch}.png"))
        layout["m"] = (x, y, im.size)
        im, x, y = overlay(lambda d, ch=ch: V.sevenseg(d, ch, X0 + 98, Y0 + 22, 22, 38, 5, TC, DM))
        save_png(im, os.path.join(OUT, f"s{ch}.png"))
        layout["s"] = (x, y, im.size)

    def colon(d):
        d.ellipse((X0 + 83, Y0 + 16, X0 + 89, Y0 + 22), fill=TC)
        d.ellipse((X0 + 83, Y0 + 38, X0 + 89, Y0 + 44), fill=TC)

    def hint_up(d):
        d.line([(300, HY + 5), (308, HY - 3), (316, HY + 5)], fill=HINT_C, width=2)

    def hint_text(d):
        d.text((324, HY - 9), "5~60", font=ImageFont.load_default(size=15), fill=(130, 125, 118))

    def hint_down(d):
        d.line([(370, HY - 3), (378, HY + 5), (386, HY - 3)], fill=HINT_C, width=2)

    for name, fn in (
        ("colon", colon),
        ("focus", draw_label("FOCUS", (235, 228, 218))),
        ("rest", draw_label("REST", V.YEL)),
        ("hint-up", hint_up),
        ("hint-text", hint_text),
        ("hint-down", hint_down),
    ):
        im, x, y = overlay(fn)
        save_png(im, os.path.join(OUT, f"{name}.png"))
        layout[name] = (x, y, im.size)
    # 앱 CSS 좌표(left, top, width, height)
    css = {k: {"left": v[0], "top": v[1], "width": v[2][0], "height": v[2][1]} for k, v in layout.items()}
    css["m2"] = dict(css["m"], left=css["m"]["left"] + 40)
    css["s2"] = dict(css["s"], left=css["s"]["left"] + 29)
    with open(os.path.join(OUT, "..", "..", "..", "scripts", "booster-layout.json"), "w") as f:
        json.dump(css, f, indent=1, sort_keys=True)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    gsum = sum(os.path.getsize(os.path.join(OUT, f"g{i:02d}.png")) for i in range(N + 1))
    print(json.dumps(css, sort_keys=True))
    print(f"gauge frames: {gsum} bytes, all assets: {total} bytes")
    previews(css)


def compose(css, lit, mode, mm, ss, hint=False, up=1.0, down=1.0, paused=False) -> Image.Image:
    """앱과 같은 순서·좌표로 실제 리소스를 겹친다(검정 위 alpha 합성)."""
    im = Image.open(os.path.join(OUT, f"g{lit:02d}.png")).convert("RGBA")

    def put(name, key, opacity=1.0):
        o = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
        if opacity < 1:
            o.putalpha(o.getchannel("A").point(lambda p: int(p * opacity)))
        im.alpha_composite(o, (css[key]["left"], css[key]["top"]))

    put("rest" if mode == "break" else "focus", "rest" if mode == "break" else "focus")
    put("m" + f"{mm:02d}"[0], "m")
    put("m" + f"{mm:02d}"[1], "m2")
    put("colon", "colon")
    put("s" + f"{ss:02d}"[0], "s")
    put("s" + f"{ss:02d}"[1], "s2")
    if hint:
        put("hint-up", "hint-up", up)
        put("hint-text", "hint-text")
        put("hint-down", "hint-down", down)
    if paused:  # index.ux .pause: 중심 구멍 안 흰 막대 8x26 두 개
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((204, 244, 211, 269), radius=2, fill=(255, 255, 255, 255))
        d.rounded_rectangle((220, 244, 227, 269), radius=2, fill=(255, 255, 255, 255))
    return im.convert("RGB")


def lit_of(phase, rem, tot):
    if phase == "break":
        return math.ceil(rem / tot * NB)
    return NB + math.ceil(rem / tot * NF)


def previews(css):
    cases = [
        ("idle", compose(css, N, "focus", 25, 0, hint=True), V.draw("idle", 25, 0, 0, True)),
        ("focus-mid", compose(css, lit_of("focus", 750, 1500), "focus", 12, 30), V.draw("focus", 12, 30, V.off_focus(750, 1500))),
        ("break", compose(css, lit_of("break", 150, 300), "break", 2, 30), V.draw("break", 2, 30, V.off_break(150, 300))),
    ]
    compose(css, lit_of("focus", 750, 1500), "focus", 12, 30, paused=True).save(
        os.path.join(DOCS, "preview-0.1.3-paused.png"), optimize=True)
    for name, mine, ref in cases:
        mine.save(os.path.join(DOCS, f"preview-0.1.3-{name}.png"), optimize=True)
        diff = ImageChops.difference(mine, ref).convert("L")
        hist = diff.histogram()
        tot = sum(hist)
        big = sum(hist[16:])
        mean = sum(i * c for i, c in enumerate(hist)) / tot
        print(f"preview {name}: mean diff {mean:.2f}, px diff>=16: {big} ({big * 100 / tot:.2f}%)")


if __name__ == "__main__":
    main()
