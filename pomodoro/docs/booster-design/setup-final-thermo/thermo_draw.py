#!/usr/bin/env python3
"""THERMO 설정 화면 그리기 도구(전부 검정 위 가산) + 터치 영역 검사.

setup-v3/gen_setup_v3.py 의 공통 도구 부분(시안 A~E 코드는 뺌)을 그대로 옮겼다.
gen_setup_thermo.py 가 이 모듈만 쓰므로 setup-v3/ 없이도 레이어를 다시 만들 수 있다.
"""
from __future__ import annotations

import json
import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "v11"))
import gen_v11 as V  # noqa: E402

W, H, S = V.W, V.H, V.S
F_BOLD, F_HINT = V.FONT_PATH, V.FONT_HINT
RED_D, RED_DIM, RED_MID = (255, 70, 48), (26, 6, 5), (120, 30, 20)
GRN_D, GRN_DIM, GRN_MID = (128, 232, 120), (6, 24, 10), (44, 110, 50)
GRAY, CHEV_C, DARK = (150, 142, 134), (112, 106, 98), (40, 38, 36)
WHITE, YEL = V.FOCUS_C, V.YEL


# ---------------- 그리기 도구(전부 검정 위 가산) ----------------
def blank():
    return Image.new("RGB", (W, H))


def glow(T, k=1.0):
    G = ImageChops.add(T, T.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: int(v * 0.55 * k)))
    return ImageChops.add(G, V.tint(T.filter(ImageFilter.GaussianBlur(7)), (0.55 * k, 0.45 * k, 0.32 * k)))


def text_mask(txt, h, font=F_BOLD):
    f = ImageFont.truetype(font, 8 * h)
    d = ImageDraw.Draw(Image.new("L", (10, 10)))
    bb = d.textbbox((0, 0), txt, font=f)
    m = Image.new("L", (bb[2] - bb[0] + 8, bb[3] - bb[1] + 8), 0)
    ImageDraw.Draw(m).text((4 - bb[0], 4 - bb[1]), txt, font=f, fill=255)
    sc = h / (bb[3] - bb[1])
    return m.resize((max(1, round(m.width * sc)), max(1, round(m.height * sc))), Image.LANCZOS)


def text(G, txt, x, y, h, col, font=F_BOLD, anchor="l", g=True):
    """y = 글자 윗변. anchor l/c/r."""
    m = text_mask(txt, h, font)
    x = x - (m.width // 2 if anchor == "c" else m.width if anchor == "r" else 0)
    T = blank()
    T.paste(Image.new("RGB", m.size, col), (x, y), m)
    return ImageChops.add(G, glow(T) if g else T)


def seg(G, s, x, y, w, h, t, pitch, col, dim, g=True, k=1.0):
    T = blank()
    d = ImageDraw.Draw(T)
    for i, ch in enumerate(s):
        V.sevenseg(d, ch, x + i * pitch, y, w, h, t, col, dim)
    return ImageChops.add(G, glow(T, k) if g else T)


def seg_c(G, s, cx, y, w, h, t, pitch, col, dim, g=True, k=1.0):
    x = cx - ((len(s) - 1) * pitch + w) // 2
    return seg(G, s, x, y, w, h, t, pitch, col, dim, g, k)


def neon(G, pts, width=3, k=0.7):
    ul = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(ul).line([(p[0] * S, p[1] * S) for p in pts], fill=255, width=width * S, joint="curve")
    line = Image.new("RGB", (W * S, H * S))
    line.paste(Image.new("RGB", line.size, V.YEL), (0, 0), ul)
    core = ul.filter(ImageFilter.MinFilter(2 * S - 1)).filter(ImageFilter.GaussianBlur(S * 0.6))
    line.paste(Image.new("RGB", line.size, V.YEL_CORE), (0, 0), core)
    line = line.resize((W, H), Image.LANCZOS)
    mk = ul.resize((W, H), Image.LANCZOS)
    hc = blank()
    hc.paste(Image.new("RGB", (W, H), V.YEL_HALO), (0, 0), mk)
    halo = ImageChops.add(hc.filter(ImageFilter.GaussianBlur(3)).point(lambda v: min(255, int(v * 1.1))),
                          V.tint(hc.filter(ImageFilter.GaussianBlur(9)), (0.9, 0.55, 0.2)))
    return ImageChops.add(G, ImageChops.add(halo.point(lambda v: int(v * k)), line))


def shape(G, fn, g=0.0):
    """fn(draw, s) 를 S배로 그려 축소해 더한다. g>0 이면 글로우."""
    T = Image.new("RGB", (W * S, H * S))
    fn(ImageDraw.Draw(T), S)
    T = T.resize((W, H), Image.LANCZOS)
    if g:
        T = ImageChops.add(T, T.filter(ImageFilter.GaussianBlur(3)).point(lambda v: int(v * 0.8 * g)))
        T = ImageChops.add(T, T.filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.6 * g)))
    return ImageChops.add(G, T)


def rrect(G, box, fill=None, outline=None, width=2, r=None, g=0.0):
    def fn(d, s):
        b = [v * s for v in box]
        rad = (r if r is not None else (box[3] - box[1]) // 2) * s
        d.rounded_rectangle(b, radius=rad, fill=fill, outline=outline, width=width * s if outline else 0)
    return shape(G, fn, g)


def chev(G, x, y, up, col, hw=22, hh=12, w=5, g=0.0):
    def fn(d, s):
        k = -1 if up else 1
        pts = [((x - hw) * s, (y - hh * k) * s), (x * s, (y + hh * k) * s), ((x + hw) * s, (y - hh * k) * s)]
        d.line(pts, fill=col, width=w * s, joint="curve")
        rr = w * s // 2
        for px, py in (pts[0], pts[2]):
            d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=col)
    return shape(G, fn, g)


def toggle(G, box, on):
    x0, y0, x1, y1 = box
    r = (y1 - y0) // 2

    def fn(d, s):
        b = [v * s for v in box]
        if on:
            d.rounded_rectangle(b, radius=r * s, fill=(120, 92, 8), outline=V.YEL, width=2 * s)
            d.ellipse(((x1 - 2 * r + 5) * s, (y0 + 5) * s, (x1 - 5) * s, (y1 - 5) * s), fill=V.YEL_CORE)
        else:
            d.rounded_rectangle(b, radius=r * s, fill=(20, 19, 18), outline=(90, 86, 80), width=2 * s)
            d.ellipse(((x0 + 5) * s, (y0 + 5) * s, (x0 + 2 * r - 5) * s, (y1 - 5) * s), fill=(120, 114, 106))
    G = shape(G, fn, 0.6 if on else 0)
    return G


def start_btn(G, box, pressed=False, h=22):
    T = blank()
    T = rrect(T, box, fill=V.RED if not pressed else (255, 92, 60))
    G = ImageChops.add(G, ImageChops.add(V.tint(T.filter(ImageFilter.GaussianBlur(8)), (0.7, 0.35, 0.3)), T))
    m = text_mask("START", h)
    x = (box[0] + box[2]) // 2 - m.width // 2
    y = (box[1] + box[3]) // 2 - m.height // 2
    G.paste(Image.new("RGB", m.size, WHITE), (x, y), m)
    return G


def finish(G):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=80, fill=255)
    out = blank()
    out.paste(G, (0, 0), m)
    return out


def repeat_row(G, x, y, tog_box, on, h=22, state=True):
    G = text(G, "REPEAT", x, y, h, WHITE)
    if not state:
        return toggle(G, tog_box, on)
    G = text(G, "ON" if on else "OFF", tog_box[0] - 10, (tog_box[1] + tog_box[3]) // 2 - 8, 16,
             YEL if on else GRAY, F_HINT, "r", g=False)
    return toggle(G, tog_box, on)


def p2(v):
    return f"{v:02d}"


# ---------------- 터치 영역 검사 ----------------
def check(zones, parents):
    """parents: {부모: [자식...]} 부모(스와이프 영역)는 자기 자식과만 겹쳐도 된다. 나머지 모든 쌍은 겹치면 안 된다."""
    R = 80

    def inside(x, y):
        qx = min(max(x, R), W - R)
        qy = min(max(y, R), H - R)
        return (x - qx) ** 2 + (y - qy) ** 2 <= R * R

    def ov(p, q):
        return p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3]

    fam = {}
    for p, ch in parents.items():
        for c in ch:
            fam[c] = p
    names = list(zones)
    bad, n = [], 0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = names[i], names[j]
            if fam.get(a) == b or fam.get(b) == a:
                continue
            n += 1
            if ov(zones[a], zones[b]):
                bad.append([a, b])
    for c, p in fam.items():
        P, C = zones[p], zones[c]
        assert P[0] <= C[0] and P[1] <= C[1] and C[2] <= P[2] and C[3] <= P[3], (c, p)
    outside = [k for k, v in zones.items() if not all(inside(x, y) for x in (v[0], v[2]) for y in (v[1], v[3]))]
    left = [k for k, v in zones.items() if v[0] < 30]
    sizes = {k: [v[2] - v[0], v[3] - v[1]] for k, v in zones.items()}
    small = {k: s for k, s in sizes.items() if min(s) < 48}
    rep = {"checkedPairs": n, "overlaps": bad, "outsideRoundRect": outside, "inLeftEdge(x<30)": left,
           "sizes": sizes, "under48px": small}
    rep["ok"] = not bad and not outside and not left
    return rep


def zones_png(base, zones, parents, labels):
    im = base.convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    pal = [(255, 80, 60), (120, 230, 120), (255, 214, 36), (90, 170, 255), (230, 120, 255), (255, 160, 60), (80, 230, 230)]
    i = 0
    for k, z in zones.items():
        if k in parents:
            d.rectangle(z, outline=(255, 255, 255, 230), width=2)
            continue
        c = pal[i % len(pal)]
        i += 1
        d.rectangle((z[0] + 3, z[1] + 3, z[2] - 3, z[3] - 3), fill=c + (70,), outline=c + (255,), width=2)
    d.rectangle((0, 0, 29, H - 1), fill=(255, 255, 255, 40))
    im.alpha_composite(ov)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F_HINT, 13)
    for k, z in zones.items():
        lab = labels.get(k, k)
        if k in parents:
            d.text((z[0] + 6, z[3] - 18), lab, font=f, fill=(255, 255, 255))
        else:
            d.text((z[0] + 7, z[1] + 5), lab, font=f, fill=(255, 255, 255))
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=80, outline=(255, 0, 255), width=1)
    return im.convert("RGB")
