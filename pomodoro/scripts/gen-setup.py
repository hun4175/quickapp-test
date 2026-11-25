#!/usr/bin/env python3
"""설정 화면(0.1.6) 리소스와 미리보기를 만든다. gen-booster.py 가 끝에 함께 부른다(단독 실행도 가능).

톤은 부스터 계기판 v11(docs/booster-design/v11/gen_v11.py)과 같다:
검정 바탕, 집중 빨강 / 휴식 초록 7세그먼트, 노란 네온 밑줄, Barlow Semi Condensed ExtraBold Italic 라벨.
- src/common/setup/bg.png        : 정적 배경(라벨·밑줄·좌우 화살표·MIN·REPEAT·START 버튼). 256색.
- src/common/setup/f0~f9.png     : 집중 값 큰 숫자(빨강)
- src/common/setup/r0~r9.png     : 휴식 값 큰 숫자(초록)
- src/common/setup/n0~n9.png     : 좌우 이웃 값 작은 숫자(회색, 스크롤 단서)
- src/common/setup/tog-on.png, tog-off.png : 반복 토글
- scripts/setup-layout.json      : 위 이미지들의 CSS 좌표(index.ux 와 테스트가 같은 값을 쓴다)
- docs/preview-0.1.6-setup.png, preview-0.1.6-setup-repeat-off.png
글꼴은 PNG 에 구워 넣고 rpk 에는 넣지 않는다.
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "v11"))
import gen_v11 as V  # noqa: E402

_spec = importlib.util.spec_from_file_location("gen_booster", os.path.join(ROOT, "scripts", "gen-booster.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)

VERSION = B.VERSION
OUT = os.path.join(ROOT, "src", "common", "setup")
DOCS = os.path.join(ROOT, "docs")
W, H, S = V.W, V.H, V.S

# ---- 배치(px) ----
ROW_DY = 156                 # 집중 줄 → 휴식 줄 세로 간격
LAB_X, LAB_Y, LAB_H = 70, 40, 22
UL_Y = 74                    # 노란 네온 밑줄
UL_X0, UL_X1 = 62, 370
BIG_W, BIG_H, BIG_T, BIG_GAP = 50, 92, 8, 64   # 큰 7세그먼트: 폭, 높이, 획, 두 자리 간격
BIG_X, BIG_Y = 159, 88
NB_W, NB_H, NB_T, NB_GAP = 20, 38, 4, 26       # 이웃 값 작은 7세그먼트
NB_Y = BIG_Y + (BIG_H - NB_H) // 2
NB_LX, NB_RX = 64, 322
CHEV_LX, CHEV_RX = 40, 392
TOG = (290, 366, 362, 402)   # 반복 토글 pill
REP_Y = 372
BTN = (136, 430, 296, 478)   # START 버튼

RED_D = (255, 70, 48)
RED_DIM = (26, 6, 5)
GRN_D = (128, 232, 120)
GRN_DIM = (6, 24, 10)
NB_C = (120, 114, 106)
NB_DIM = None  # 이웃 값은 꺼진 세그먼트를 그리지 않는다(덜 복잡하게)
GRAY = (150, 142, 134)
WHITE = V.FOCUS_C


def text_mask(txt: str, h: int, font=V.FONT_PATH) -> Image.Image:
    """글자 높이 h 로 래스터(8배 그린 뒤 축소)."""
    big = 8 * h
    f = ImageFont.truetype(font, big)
    d = ImageDraw.Draw(Image.new("L", (10, 10)))
    bb = d.textbbox((0, 0), txt, font=f)
    m = Image.new("L", (bb[2] - bb[0] + 8, bb[3] - bb[1] + 8), 0)
    ImageDraw.Draw(m).text((4 - bb[0], 4 - bb[1]), txt, font=f, fill=255)
    sc = h / (bb[3] - bb[1])
    return m.resize((max(1, round(m.width * sc)), max(1, round(m.height * sc))), Image.LANCZOS)


def paste_text(T: Image.Image, txt, x, y, h, col, font=V.FONT_PATH, anchor="l"):
    m = text_mask(txt, h, font)
    if anchor == "c":
        x = x - m.width // 2
    elif anchor == "r":
        x = x - m.width
    T.paste(Image.new("RGB", m.size, col), (x, y), m)
    return m.size


def neon_line(pts, width=3) -> Image.Image:
    """v11 밑줄과 같은 네온(흰빛 코어 + 노랑 + 호박색 헤일로)."""
    ul = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(ul).line([(p[0] * S, p[1] * S) for p in pts], fill=255, width=width * S, joint="curve")
    line = Image.new("RGB", (W * S, H * S))
    line.paste(Image.new("RGB", line.size, V.YEL), (0, 0), ul)
    core = ul.filter(ImageFilter.MinFilter(2 * S - 1 if width > 2 else 1)).filter(ImageFilter.GaussianBlur(S * 0.6))
    line.paste(Image.new("RGB", line.size, V.YEL_CORE), (0, 0), core)
    line = line.resize((W, H), Image.LANCZOS)
    mk = ul.resize((W, H), Image.LANCZOS)
    hc = Image.new("RGB", (W, H))
    hc.paste(Image.new("RGB", (W, H), V.YEL_HALO), (0, 0), mk)
    halo = ImageChops.add(hc.filter(ImageFilter.GaussianBlur(3)).point(lambda v: min(255, int(v * 1.1))),
                          V.tint(hc.filter(ImageFilter.GaussianBlur(9)), (0.9, 0.55, 0.2)))
    return ImageChops.add(halo.point(lambda v: int(v * 0.7)), line)


def chevron(d, x, yc, left: bool, col=GRAY):
    k = -1 if left else 1
    d.line([(x - 6 * k, yc - 12), (x + 6 * k, yc), (x - 6 * k, yc + 12)], fill=col, width=3, joint="curve")


def background() -> Image.Image:
    T = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(T)
    for k, (lab, col) in enumerate((("FOCUS", WHITE), ("REST", V.YEL))):
        oy = k * ROW_DY
        paste_text(T, lab, LAB_X, LAB_Y + oy, LAB_H, col)
        paste_text(T, "MIN", UL_X1 - 4, LAB_Y + oy + 6, 15, GRAY, V.FONT_HINT, "r")
        yc = BIG_Y + oy + BIG_H // 2
        chevron(d, CHEV_LX, yc, True)
        chevron(d, CHEV_RX, yc, False)
    paste_text(T, "REPEAT", LAB_X, REP_Y, LAB_H, WHITE)
    G = B.text_glow(T)
    lines = ImageChops.add(neon_line([(UL_X0, UL_Y), (UL_X1, UL_Y)]), neon_line([(UL_X0, UL_Y + ROW_DY), (UL_X1, UL_Y + ROW_DY)]))
    G = ImageChops.add(G, lines)
    # START 버튼: 셀 레드 pill + 웜화이트 굵은 이탤릭
    btn = Image.new("RGB", (W, H))
    bd = ImageDraw.Draw(btn)
    bd.rounded_rectangle(BTN, radius=(BTN[3] - BTN[1]) // 2, fill=V.RED)
    glow = V.tint(btn.filter(ImageFilter.GaussianBlur(8)), (0.7, 0.35, 0.3))
    G = ImageChops.add(ImageChops.add(G, glow), btn)
    tx = Image.new("RGB", (W, H))
    paste_text(tx, "START", (BTN[0] + BTN[2]) // 2, BTN[1] + 13, 22, WHITE, anchor="c")
    m = tx.convert("L")
    G.paste(tx, (0, 0), m)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=80, fill=255)
    out = Image.new("RGB", (W, H))
    out.paste(G, (0, 0), mask)
    return out


def seg_layer(ch, x, y, w, h, t, col, dim, glow=True) -> Image.Image:
    T = Image.new("RGB", (W, H))
    V.sevenseg(ImageDraw.Draw(T), ch, x, y, w, h, t, col, dim)
    return B.text_glow(T) if glow else T


def toggle_layer(on: bool) -> Image.Image:
    T = Image.new("RGB", (W * S, H * S))
    d = ImageDraw.Draw(T)
    x0, y0, x1, y1 = (v * S for v in TOG)
    r = (y1 - y0) // 2
    if on:
        d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=(120, 92, 8), outline=V.YEL, width=2 * S)
        d.ellipse((x1 - 2 * r + 5 * S, y0 + 5 * S, x1 - 5 * S, y1 - 5 * S), fill=V.YEL_CORE)
    else:
        d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=(20, 19, 18), outline=(90, 86, 80), width=2 * S)
        d.ellipse((x0 + 5 * S, y0 + 5 * S, x0 + 2 * r - 5 * S, y1 - 5 * S), fill=(120, 114, 106))
    T = T.resize((W, H), Image.LANCZOS)
    tx = Image.new("RGB", (W, H))
    if on:
        paste_text(tx, "ON", TOG[0] - 12, TOG[1] + 10, 16, V.YEL, V.FONT_HINT, "r")
    else:
        paste_text(tx, "OFF", TOG[0] - 12, TOG[1] + 10, 16, GRAY, V.FONT_HINT, "r")
    G = ImageChops.add(T, tx)
    if on:
        G = ImageChops.add(G, V.tint(T.filter(ImageFilter.GaussianBlur(6)), (0.8, 0.6, 0.2)))
    return G


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    layout = {}

    def put_group(key, items):
        box = B.union_box([g for _, g in items])
        for fname, g in items:
            B.save_png(B.to_rgba(g, box), os.path.join(OUT, fname + ".png"))
        layout[key] = {"left": box[0], "top": box[1], "width": box[2] - box[0], "height": box[3] - box[1]}

    B.save_png(background(), os.path.join(OUT, "bg.png"), 256)
    put_group("f", [("f" + c, seg_layer(c, BIG_X, BIG_Y, BIG_W, BIG_H, BIG_T, RED_D, RED_DIM)) for c in "0123456789"])
    put_group("r", [("r" + c, seg_layer(c, BIG_X, BIG_Y + ROW_DY, BIG_W, BIG_H, BIG_T, GRN_D, GRN_DIM)) for c in "0123456789"])
    put_group("n", [("n" + c, seg_layer(c, NB_LX, NB_Y, NB_W, NB_H, NB_T, NB_C, NB_DIM, glow=False)) for c in "0123456789"])
    put_group("tog", [("tog-on", toggle_layer(True)), ("tog-off", toggle_layer(False))])

    css = {"tog": layout["tog"]}
    f, r, n = layout["f"], layout["r"], layout["n"]
    css["f1"], css["f2"] = f, dict(f, left=f["left"] + BIG_GAP)
    css["r1"], css["r2"] = r, dict(r, left=r["left"] + BIG_GAP)
    for row, oy in (("f", 0), ("r", ROW_DY)):
        for side, ox in (("Prev", 0), ("Next", NB_RX - NB_LX)):
            css[row + side + "1"] = dict(n, left=n["left"] + ox, top=n["top"] + oy)
            css[row + side + "2"] = dict(n, left=n["left"] + ox + NB_GAP, top=n["top"] + oy)
    css["bg"] = {"left": 0, "top": 0, "width": W, "height": H}
    with open(os.path.join(ROOT, "scripts", "setup-layout.json"), "w") as fp:
        json.dump(css, fp, indent=1, sort_keys=True)
        fp.write("\n")
    total = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
    print(f"setup assets: {len(os.listdir(OUT))} files, {total} bytes")
    preview(css, 25, 5, True).save(os.path.join(DOCS, f"preview-{VERSION}-setup.png"), optimize=True)
    preview(css, 25, 5, False).save(os.path.join(DOCS, f"preview-{VERSION}-setup-repeat-off.png"), optimize=True)


def preview(css, fm, bm, repeat) -> Image.Image:
    im = Image.open(os.path.join(OUT, "bg.png")).convert("RGBA")

    def put(name, key):
        o = Image.open(os.path.join(OUT, name + ".png")).convert("RGBA")
        im.alpha_composite(o, (css[key]["left"], css[key]["top"]))

    def two(prefix, v, k1, k2):
        t = f"{v:02d}"
        put(prefix + t[0], k1)
        put(prefix + t[1], k2)

    two("f", fm, "f1", "f2")
    two("r", bm, "r1", "r2")
    if fm > 5:
        two("n", fm - 5, "fPrev1", "fPrev2")
    if fm < 60:
        two("n", fm + 5, "fNext1", "fNext2")
    if bm > 1:
        two("n", bm - 1, "rPrev1", "rPrev2")
    if bm < 30:
        two("n", bm + 1, "rNext1", "rNext2")
    put("tog-on" if repeat else "tog-off", "tog")
    return im.convert("RGB")


if __name__ == "__main__":
    main()
