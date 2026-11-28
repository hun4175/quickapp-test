#!/usr/bin/env python3
"""UI 리소스와 미리보기를 만든다(0.1.9 에서 시작, 0.1.10 은 테마 순서·일시정지 화면 미리보기).

- src/common/ui/gear.png : 설정 화면 왼쪽 아래 톱니 아이콘(32x32, 투명 PNG).
- src/common/ui/thumb-<테마>.png : 테마 고르기 화면 견본(54x64). 아래 집중 미리보기를 줄인 것.
- docs/preview-<VERSION>-*.png : 실제 src/pages/index/index.ux 를 scripts/render-tree.mjs 로 평가한 요소 목록을 그린 미리보기.
  (기기 렌더링이 아니라 근사: 글꼴은 Roboto 로 대신, 텍스트는 상자 안 세로 가운데로 그린다.)
"""
from __future__ import annotations

import json
import math
import os
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
UI = os.path.join(SRC, "common", "ui")
DOCS = os.path.join(ROOT, "docs")
VERSION = "0.1.10"
W, H, R, SS = 432, 514, 80, 3
FONT_SYS = "/usr/share/fonts/truetype/sand-box/google/Roboto/Roboto-VariableFont_wdth,wght.ttf"
FONT_SYM = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"  # Roboto 에 없는 ✓ 만 (기기 시스템 글꼴에는 있음: yeomju 설정 화면)
THEMES = ["sweep", "sand", "battery", "booster"]  # = timer.js THEMES 순서(0.1.10)
# 저장하는 미리보기. 썸네일은 {테마}-focus 를 그려 만든다(파일로는 저장 안 함).
# 0.1.9 의 설정·테마별 집중/휴식 미리보기는 docs/preview-0.1.9-*.png 로 남겨 둔다(화면이 같음).
SCENES = ["themes", "sweep-focus"] + [f"{t}-paused" for t in THEMES]


def rgb(c):
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


_F = {}


def font(size, bold):
    key = (size, bold)
    if key not in _F:
        f = ImageFont.truetype(FONT_SYS, int(size * SS))
        f.set_variation_by_axes([800 if bold else 500, 100])
        _F[key] = f
    return _F[key]


def gear_icon():
    n, S = 32, 8
    im = Image.new("L", (n * S, n * S), 0)
    d = ImageDraw.Draw(im)
    c = n * S / 2
    ro, ri, rh = 15 * S, 11 * S, 5 * S
    pts = []
    teeth = 8
    for i in range(teeth * 4):
        a = (i / (teeth * 4)) * 2 * math.pi - math.pi / 2
        r = ro if (i % 4) in (0, 1) else ri
        pts.append((c + r * math.cos(a), c + r * math.sin(a)))
    d.polygon(pts, fill=255)
    d.ellipse((c - ri - S, c - ri - S, c + ri + S, c + ri + S), fill=255)
    d.ellipse((c - rh, c - rh, c + rh, c + rh), fill=0)
    a = im.resize((n, n), Image.LANCZOS)
    out = Image.new("RGBA", (n, n), (230, 230, 230, 0))
    out.putalpha(a)
    os.makedirs(UI, exist_ok=True)
    out.save(os.path.join(UI, "gear.png"), optimize=True)


def tree(scene):
    r = subprocess.run(["node", os.path.join(ROOT, "scripts", "render-tree.mjs"), scene], cwd=ROOT,
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def rot_pts(x, y, w, h, deg, ox, oy):
    cx, cy = x + ox, y + oy
    t = math.radians(deg)
    out = []
    for px_, py_ in ((x, y), (x + w, y), (x + w, y + h), (x, y + h)):
        dx, dy = px_ - cx, py_ - cy
        out.append(((cx + dx * math.cos(t) - dy * math.sin(t)) * SS, (cy + dx * math.sin(t) + dy * math.cos(t)) * SS))
    return out


def render(els):
    im = Image.new("RGB", (W * SS, H * SS), (0, 0, 0))
    for e in els:
        k = e["k"]
        if k == "img":
            p = os.path.join(SRC, e["src"].lstrip("/"))
            src = Image.open(p).convert("RGBA").resize((int(e["w"] * SS), int(e["h"] * SS)), Image.LANCZOS)
            im.paste(src, (int(e["x"] * SS), int(e["y"] * SS)), src)
            continue
        if k == "div":
            if not e["w"] or not e["h"] or e["w"] <= 0 or e["h"] <= 0:
                continue
            lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            a = int(round(255 * e["op"]))
            if e["rot"]:
                d.polygon(rot_pts(e["x"], e["y"], e["w"], e["h"], e["rot"], *e["origin"]), fill=rgb(e["bg"]) + (a,))
            else:
                box = [e["x"] * SS, e["y"] * SS, (e["x"] + e["w"]) * SS - 1, (e["y"] + e["h"]) * SS - 1]
                r = min(e["r"], e["w"] / 2, e["h"] / 2) * SS
                d.rounded_rectangle(box, radius=r, fill=(rgb(e["bg"]) + (a,)) if e["bg"] else None,
                                    outline=(rgb(e["bc"]) + (a,)) if e["bw"] and e["bc"] else None, width=int(e["bw"] * SS))
            im.paste(lay, (0, 0), lay)
            continue
        f = font(e["size"], e["bold"]) if e["s"] != "✓" else ImageFont.truetype(FONT_SYM, int(e["size"] * SS))
        asc, desc = f.getmetrics()
        tw = f.getlength(e["s"])
        bx, by, bw_, bh = e["x"] * SS, e["y"] * SS, e["w"] * SS, e["h"] * SS
        tx = bx + (bw_ - tw) / 2 if e["align"] == "center" else bx if e["align"] == "left" else bx + bw_ - tw
        ty = by + (bh - (asc + desc)) / 2
        if e["outline"]:
            sh = Image.new("L", im.size, 0)
            ds = ImageDraw.Draw(sh)
            for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (0, 0)):
                ds.text((tx + ox * SS, ty + oy * SS), e["s"], font=f, fill=255)
            sh = sh.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5 * SS)).point(lambda v: min(255, v * 2))
            im.paste((0, 0, 0), (0, 0), sh)
        ImageDraw.Draw(im).text((tx, ty), e["s"], font=f, fill=rgb(e["color"]))
    im = im.resize((W, H), Image.LANCZOS)
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=R, fill=255)
    out = Image.new("RGB", (W, H))
    out.paste(im, (0, 0), m)
    return out


def thumb(im, theme):
    t = im.resize((54, 64), Image.LANCZOS)
    m = Image.new("L", (54 * 4, 64 * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 54 * 4 - 1, 64 * 4 - 1), radius=10 * 4, fill=255)
    out = Image.new("RGB", (54, 64))
    out.paste(t, (0, 0), m.resize((54, 64), Image.LANCZOS))
    out = out.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
    out.save(os.path.join(UI, f"thumb-{theme}.png"), optimize=True)


def main():
    gear_icon()
    done = {}
    for t in THEMES:
        thumb(render(tree(f"{t}-focus")["elements"]), t)
    for s in SCENES:
        im = render(tree(s)["elements"])
        done[s] = im
        im.save(os.path.join(DOCS, f"preview-{VERSION}-{s}.png"), optimize=True)
        print("preview", s)
    for f in sorted(os.listdir(UI)):
        print("ui", f, os.path.getsize(os.path.join(UI, f)))


if __name__ == "__main__":
    main()
