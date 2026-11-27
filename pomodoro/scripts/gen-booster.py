#!/usr/bin/env python3
"""부스터 계기판(0.1.8) 런타임 리소스와 문서용 미리보기를 만든다.

디자인 기준은 docs/booster-design/v11/gen_v11.py 이고, 그 함수를 그대로 가져다 쓴다.
- src/common/booster/g00.png ~ g36.png : 켜진 칸 수(0~36)별 전체 화면 게이지 프레임(V.gauge_frame).
  시간 박스 검정 바탕과 휴식 테두리(네온)는 포함, 글자·숫자는 뺐다. 256색 팔레트 PNG.
- src/common/booster/m0~m9.png(분), s0~s9.png(초), colon.png, focus.png, rest.png(라벨+네온 밑줄),
  : 투명 PNG 오버레이(v11 text_layer 와 같은 2단 글로우).
- src/common/setup/ : 설정 화면(0.1.7, THERMO) 리소스. scripts/gen-setup.py 가 만든다(이 스크립트가 함께 부른다).
- docs/preview-<버전>-*.png : 위 리소스를 앱과 같은 좌표로 겹쳐 합성한 미리보기.
앱은 게이지 image 하나의 src 만 바꾸고, 숫자 image 몇 개를 겹쳐 둔다.
라벨 글꼴(Barlow Semi Condensed, SIL OFL 1.1)은 PNG 에 구워 넣고 rpk 에는 넣지 않는다.
"""
from __future__ import annotations

import json
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "v11"))
import gen_v11 as V  # noqa: E402

VERSION = "0.1.8"
OUT = os.path.join(ROOT, "src", "common", "booster")
DOCS = os.path.join(ROOT, "docs")
W, H, CX, CY, S = V.W, V.H, V.CX, V.CY, V.S
N, NF, NB = V.N, V.NF, V.NB
GAUGE_COLORS = 256
X0, Y0 = V.X0, V.Y0
PAUSE_C = V.TC  # 일시정지 막대도 숫자와 같은 웜화이트


def text_glow(T: Image.Image) -> Image.Image:
    """gen_v11.text_layer 와 같은 2단 글로우: 가까운 흰빛 + 따뜻한 넓은 번짐."""
    G = ImageChops.add(T, T.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: int(v * 0.55)))
    return ImageChops.add(G, V.tint(T.filter(ImageFilter.GaussianBlur(7)), (0.55, 0.45, 0.32)))


def underline_layer() -> Image.Image:
    """gen_v11.text_layer 의 네온 밑줄(꺾인 선 + 헤일로)만."""
    ul = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(ul).line([(p[0] * S, p[1] * S) for p in V.underline_pts()], fill=255, width=4 * S, joint="curve")
    line, halo = V._underline_cache(ul)
    return ImageChops.add(halo.point(lambda v: int(v * 0.8)), line)


def to_rgba(G: Image.Image, box) -> Image.Image:
    """검정 바탕 RGB(가산 레이어)를 box 로 잘라 투명 PNG 로. 검정 위에 겹치면 원래 값과 같다."""
    G = G.crop(box)
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
                out[xx, yy] = tuple(min(255, round(v * 255 / al)) for v in px_rgb[xx, yy]) + (al,)
    return rgba


def layer(draw_fn, extra: Image.Image | None = None) -> Image.Image:
    """전체 화면 검정 위 글자 + 글로우(가산 레이어)."""
    T = Image.new("RGB", (W, H))
    draw_fn(T, ImageDraw.Draw(T))
    G = text_glow(T)
    if extra is not None:
        G = ImageChops.add(G, extra)
    return G


def union_box(layers) -> tuple[int, int, int, int]:
    """같은 image 노드에서 src 만 바꿀 리소스들은 잘라내는 영역이 같아야 한다."""
    bbs = [g.getbbox() for g in layers]
    return (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))


def label(lab: str):
    col = V.YEL if lab == "REST" else V.FOCUS_C

    def fn(T, d):
        m = V.label_img(lab, col)
        T.paste(Image.new("RGB", m.size, col), (V.TX - 1, Y0 - 14 - V.LAB_H - 1), m)
    return fn


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
    for lit in range(N + 1):
        save_png(V.gauge_frame(lit), os.path.join(OUT, f"g{lit:02d}.png"), GAUGE_COLORS)
    def put_group(key, items):
        """items: [(파일 이름, 레이어)] → 같은 영역으로 잘라 저장하고 좌표를 layout[key] 에."""
        box = union_box([g for _, g in items])
        for fname, g in items:
            save_png(to_rgba(g, box), os.path.join(OUT, fname + ".png"))
        layout[key] = (box[0], box[1], (box[2] - box[0], box[3] - box[1]))

    put_group("m", [("m" + ch, layer(lambda T, d, ch=ch: V.sevenseg(d, ch, X0, Y0, 32, 60, V.MAIN_T, V.TC, V.DM))) for ch in "0123456789"])
    put_group("s", [("s" + ch, layer(lambda T, d, ch=ch: V.sevenseg(d, ch, X0 + 98, Y0 + 22, 22, 38, V.SEC_T, V.TC, V.DM))) for ch in "0123456789"])

    def colon(T, d):
        d.ellipse((X0 + 83.5, Y0 + 16.5, X0 + 88.5, Y0 + 21.5), fill=V.TC)
        d.ellipse((X0 + 83.5, Y0 + 38.5, X0 + 88.5, Y0 + 43.5), fill=V.TC)

    ul = underline_layer()
    # focus/rest 는 같은 .label 노드에서 src 만 바뀐다 → layout 키는 "label"
    put_group("label", [("focus", layer(label("FOCUS"), ul)), ("rest", layer(label("REST"), ul))])
    put_group("colon", [("colon", layer(colon))])
    css = {k: {"left": v[0], "top": v[1], "width": v[2][0], "height": v[2][1]} for k, v in layout.items()}
    css["m2"] = dict(css["m"], left=css["m"]["left"] + 40)
    css["s2"] = dict(css["s"], left=css["s"]["left"] + 29)
    with open(os.path.join(ROOT, "scripts", "booster-layout.json"), "w") as f:
        json.dump(css, f, indent=1, sort_keys=True)
        f.write("\n")
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    gsum = sum(os.path.getsize(os.path.join(OUT, f"g{i:02d}.png")) for i in range(N + 1))
    print(json.dumps(css, sort_keys=True))
    print(f"gauge frames: {gsum} bytes, all assets: {total} bytes")
    previews(css)


def compose(css, lit, mode, mm, ss, paused=False) -> Image.Image:
    """앱과 같은 순서·좌표로 실제 리소스를 겹친다(검정 위 alpha 합성)."""
    im = Image.open(os.path.join(OUT, f"g{lit:02d}.png")).convert("RGBA")

    def put(name, key):
        o = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
        im.alpha_composite(o, (css[key]["left"], css[key]["top"]))

    put("rest" if mode == "break" else "focus", "label")
    put("m" + f"{mm:02d}"[0], "m")
    put("m" + f"{mm:02d}"[1], "m2")
    put("colon", "colon")
    put("s" + f"{ss:02d}"[0], "s")
    put("s" + f"{ss:02d}"[1], "s2")
    if paused:  # index.ux .pause: 중심 구멍 안 웜화이트 막대 8x26 두 개
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((204, 244, 211, 269), radius=2, fill=PAUSE_C + (255,))
        d.rounded_rectangle((220, 244, 227, 269), radius=2, fill=PAUSE_C + (255,))
    return im.convert("RGB")


def lit_of(phase, rem, tot):
    if phase == "break":
        return math.ceil(rem / tot * NB)
    return NB + math.ceil(rem / tot * NF)


def previews(css):
    cases = [
        ("timer-focus", compose(css, lit_of("focus", 750, 1500), "focus", 12, 30), V.draw("focus", 12, 30, V.off_focus(750, 1500))),
        ("timer-break", compose(css, lit_of("break", 150, 300), "break", 2, 30), V.draw("break", 2, 30, V.off_break(150, 300))),
    ]
    # 시작 애니메이션 중간(약 0.45초): 게이지 18칸, 숫자는 설정한 집중 시간 그대로
    compose(css, 18, "focus", 25, 0).save(os.path.join(DOCS, f"preview-{VERSION}-intro-mid.png"), optimize=True)
    for name, mine, ref in cases:
        mine.save(os.path.join(DOCS, f"preview-{VERSION}-{name}.png"), optimize=True)
        diff = ImageChops.difference(mine, ref).convert("L")
        hist = diff.histogram()
        tot = sum(hist)
        big = sum(hist[16:])
        mean = sum(i * c for i, c in enumerate(hist)) / tot
        print(f"preview {name}: mean diff {mean:.2f}, px diff>=16: {big} ({big * 100 / tot:.2f}%)")


if __name__ == "__main__":
    main()
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_setup", os.path.join(ROOT, "scripts", "gen-setup.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.main()
