#!/usr/bin/env python3
"""설정 화면 최종안: C THERMO(온도계 막대) 구현 패키지. setup-v3/C-thermo 시안을 앱용 레이어로 쪼갠다.

화면: 왼쪽 = FOCUS/REST 큰 숫자(읽기 + 미세 조정), 오른쪽 = 세로 막대 두 개(집중 12칸, 휴식 30칸).
조작은 전부 세로: 막대를 짚거나 위아래로 끌면 그 높이 값으로 스냅, 숫자 칸 위쪽 반 탭 = +1단계, 아래쪽 반 = -1단계.
구현은 0.1.6 과 같은 'PNG 오버레이 + src 교체'(동적 style 없이 src 만 바꾼다).
  (아래 layers/ = 앱의 src/common/setup/)
  layers/bg.png                 정적 배경(라벨·밑줄·MIN·작은 ▲▼·막대 꺼진 칸·눈금 숫자·REPEAT·START). 256색
  layers/f0~f9.png, r0~r9.png   큰 숫자(한 파일을 f1/f2, r1/r2 두 노드에 씀)
  layers/fg01m~fg06m, fg06.png  집중 막대 '묶음' 이미지: 6칸 묶음 2개 노드(fBar0 아래, fBar1 위)가 같은 파일을 쓴다.
                                fgNNm = 아래서부터 NN칸 켜짐 + 맨 위에 노란 네온 눈금, fg06 = 6칸 다 켜짐(눈금 없음)
  layers/rg01m~rg10m, rg10.png  휴식 막대 묶음 이미지: 10칸 묶음 3개 노드(rBar0~rBar2)
  layers/fUp-on, fDn-on, rUp-on, rDn-on.png    미세 조정 ▲▼ 눌림
  layers/fUp-off, fDn-off, rUp-off, rDn-off.png 끝값일 때 ▲▼ 를 덮는 불투명 패치
  layers/fHot.png, rHot.png     바꾸는 중인 줄의 밑줄을 밝게(선택)
  layers/tog-on.png, tog-off.png, start-on.png
  layout.json, touch-zones.json, touch-zones.png, 01-default.png, 02-changing.png, 03-repeat-off.png
미리보기는 layers/ PNG 만 겹쳐 만든다. 실행: python3 gen_setup_thermo.py (결정적)
앱에서는 scripts/gen-setup.py 가 이 모듈을 import 해 main() 을 부르고(gen-booster.py 가 함께 실행),
layout.json 을 scripts/setup-layout.json 으로 복사하고 docs/preview-<버전>-setup*.png 를 만든다.
그리기 도구는 같은 폴더의 thermo_draw.py(setup-v3 공통 부분을 옮김)에서 가져온다.
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "v11"))
sys.path.insert(0, HERE)
import gen_v11 as V  # noqa: E402
import thermo_draw as C  # noqa: E402  (그리기 도구·영역 검사. setup-v3 공통 부분을 옮긴 것)

_spec = importlib.util.spec_from_file_location("gen_booster", os.path.join(ROOT, "scripts", "gen-booster.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)

W, H = V.W, V.H
# 앱 리소스 폴더에 바로 쓴다(0.1.7 부터 앱이 쓰는 리소스). 미리보기도 이 PNG 만 겹쳐 만든다.
OUT = os.path.join(ROOT, "src", "common", "setup")
blank = C.blank

# ---------------- 값 ----------------
F_MIN, F_MAX, F_STEP = 5, 60, 5
R_MIN, R_MAX, R_STEP = 1, 30, 1
F_N, R_N = 12, 30

# ---------------- 배치(px) ----------------
LX = 54                                  # 왼쪽 글자 x
F_LAB_Y, F_UL_Y = 66, 98
F_DIG = dict(x=54, y=112, w=50, h=92, t=8, pitch=64)
R_LAB_Y, R_UL_Y = 226, 258
R_DIG = dict(x=54, y=270, w=40, h=72, t=7, pitch=52)
UL_X0, UL_X1 = 48, 206
CHX = 196                                # 미세 조정 ▲▼ x 중심
F_CH = (130, 186)                        # 집중 ▲ / ▼ 중심 y
R_CH = (288, 326)
BAR_BOT = 384                            # 두 막대 아래 끝(칸 경계). 위 끝은 칸 수 × 간격으로 정해진다
F_BAR = dict(x0=248, x1=284, n=F_N, gap=4, ch=22, grp=6)   # 칸 높이 22 + 틈 4 = 26px 간격(정수 → 묶음 재사용)
R_BAR = dict(x0=344, x1=380, n=R_N, gap=2, ch=8, grp=10)   # 8 + 2 = 10px
TOG = (130, 369, 180, 401)
REP_Y = 374
BTN = (136, 436, 296, 484)

RED_C, RED_OFF = (214, 42, 26), (34, 8, 6)
GRN_C, GRN_OFF = (115, 224, 116), (8, 30, 14)

ZONES = {
    "focusNum": [40, 60, 216, 210], "focusNumUp": [40, 60, 216, 135], "focusNumDown": [40, 135, 216, 210],
    "restNum": [40, 220, 216, 350], "restNumUp": [40, 220, 216, 285], "restNumDown": [40, 285, 216, 350],
    "focusBar": [226, 56, 306, 404], "restBar": [322, 56, 402, 404],
    "repeat": [40, 358, 216, 414], "start": [112, 424, 320, 496],
}
PARENTS = {"focusNum": ["focusNumUp", "focusNumDown"], "restNum": ["restNumUp", "restNumDown"]}
LABELS = {"focusNum": "", "restNum": "", "focusNumUp": "FOCUS +5", "focusNumDown": "FOCUS -5",
          "restNumUp": "REST +1", "restNumDown": "REST -1", "focusBar": "FOCUS\nBAR", "restBar": "REST\nBAR",
          "repeat": "REPEAT", "start": "START"}


def pitch(bar):
    return bar["ch"] + bar["gap"]


def seg_rects(bar, n=None):
    hs = bar["ch"]
    out = []
    for i in range(bar["n"] if n is None else n):
        yb = BAR_BOT - i * pitch(bar)
        out.append((bar["x0"], yb - hs, bar["x1"], yb))
    return out, hs


def bar_cells(bar, lit, col, off):
    """lit=None 이면 모든 칸 꺼진 색(배경용), 아니면 켜진 lit 칸만."""
    G = blank()
    rects, hs = seg_rects(bar)
    for i, r in enumerate(rects):
        if lit is None:
            G = C.rrect(G, r, fill=off, r=min(4, int(hs / 2)))
        elif i < lit:
            G = C.rrect(G, r, fill=col, r=min(4, int(hs / 2)))
    return G


def bar_group(bar, lit, col, marker):
    """맨 아래 묶음 위치에 그린 묶음 이미지(lit 칸 켜짐, marker=맨 위 켜진 칸 위 노란 네온 눈금).
    위쪽 묶음 노드는 같은 파일을 CSS top 만 묶음 간격만큼 올려서 쓴다."""
    T = blank()
    rects, hs = seg_rects(bar, lit)
    for r in rects:
        T = C.rrect(T, r, fill=col, r=min(4, hs // 2))
    T = ImageChops.add(T, T.filter(ImageFilter.GaussianBlur(5)).point(lambda v: int(v * 0.35)))
    if marker:
        ytop = rects[-1][1] - bar["gap"] / 2 - 1
        T = C.neon(T, [(bar["x0"] - 8, ytop), (bar["x1"] + 8, ytop)], 3, 0.8)
    return T


def bar_nodes(bar, lit):
    """레벨 lit → 묶음 노드별 (파일 이름 또는 None=숨김)."""
    out = []
    for g in range(bar["n"] // bar["grp"]):
        k = lit - g * bar["grp"]
        if k <= 0:
            out.append(None)
        elif k <= bar["grp"]:
            out.append(f"{k:02d}m")
        else:
            out.append(f"{bar['grp']:02d}")
    return out


def background():
    G = blank()
    G = C.text(G, "FOCUS", LX, F_LAB_Y, 24, C.WHITE)
    G = C.text(G, "REST", LX, R_LAB_Y, 24, C.YEL)
    for y, lab_y in ((F_UL_Y, F_LAB_Y), (R_UL_Y, R_LAB_Y)):
        G = C.neon(G, [(UL_X0, y), (UL_X1, y)])
        G = C.text(G, "MIN", UL_X1, lab_y + 8, 14, C.GRAY, C.F_HINT, "r", g=False)
    for (yu, yd) in (F_CH, R_CH):
        G = C.chev(G, CHX, yu, True, C.CHEV_C, 10, 6, 3)
        G = C.chev(G, CHX, yd, False, C.CHEV_C, 10, 6, 3)
    G = ImageChops.add(G, bar_cells(F_BAR, None, None, RED_OFF))
    G = ImageChops.add(G, bar_cells(R_BAR, None, None, GRN_OFF))
    for bar, top, bot in ((F_BAR, "60", "5"), (R_BAR, "30", "1")):
        cx = (bar["x0"] + bar["x1"]) // 2
        G = C.text(G, top, cx, BAR_BOT - bar["n"] * pitch(bar) - 22, 13, C.GRAY, C.F_HINT, "c", g=False)
        G = C.text(G, bot, cx, 392, 13, C.GRAY, C.F_HINT, "c", g=False)
    G = C.text(G, "REPEAT", LX, REP_Y + 1, 16, C.WHITE)
    G = C.start_btn(G, BTN)
    return C.finish(G)


def digit_layer(k, ch):
    d = F_DIG if k == "f" else R_DIG
    col, dim = (C.RED_D, C.RED_DIM) if k == "f" else (C.GRN_D, C.GRN_DIM)
    return C.seg(blank(), ch, d["x"], d["y"], d["w"], d["h"], d["t"], d["pitch"], col, dim)


def chev_on(k, up):
    y = (F_CH if k == "f" else R_CH)[0 if up else 1]
    return C.chev(blank(), CHX, y, up, C.RED_D if k == "f" else C.GRN_D, 10, 6, 3, g=1.0)


def chev_off(k, up):
    y = (F_CH if k == "f" else R_CH)[0 if up else 1]
    box = (CHX - 16, y - 12, CHX + 17, y + 13)
    im = C.chev(blank(), CHX, y, up, (30, 28, 26), 10, 6, 3).crop(box).convert("RGBA")
    im.putalpha(255)
    return im, box


def hot_layer(k):
    y = F_UL_Y if k == "f" else R_UL_Y
    G = C.neon(blank(), [(UL_X0, y), (UL_X1, y)], 4, 1.4)
    return ImageChops.add(G, G.filter(ImageFilter.GaussianBlur(6)))  # 배경 밑줄 위에 겹쳐 확 밝게


def toggle_layer(on):
    G = C.toggle(blank(), TOG, on)
    return C.text(G, "ON" if on else "OFF", TOG[2] + 6, TOG[1] + 10, 13, C.YEL if on else C.GRAY, C.F_HINT, g=False)


def start_on():
    G = C.start_btn(blank(), BTN, pressed=True)
    return G


# ---------------- 저장 ----------------
def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    css = {"bg": {"left": 0, "top": 0, "width": W, "height": H}}

    def box_css(b):
        return {"left": b[0], "top": b[1], "width": b[2] - b[0], "height": b[3] - b[1]}

    def put_group(key, items):
        box = B.union_box([g for _, g in items])
        for fname, g in items:
            B.save_png(B.to_rgba(g, box), os.path.join(OUT, fname + ".png"))
        css[key] = box_css(box)

    B.save_png(background(), os.path.join(OUT, "bg.png"), 256)
    for k, d in (("f", F_DIG), ("r", R_DIG)):
        put_group(k, [(k + c, digit_layer(k, c)) for c in "0123456789"])
        g = css.pop(k)
        css[k + "1"], css[k + "2"] = g, dict(g, left=g["left"] + d["pitch"])
        for up, nm in ((True, "Up"), (False, "Dn")):
            put_group(k + nm, [(k + nm + "-on", chev_on(k, up))])
            im, box = chev_off(k, up)
            im.save(os.path.join(OUT, k + nm + "-off.png"), optimize=True)
            css[k + nm + "Off"] = box_css(box)
        put_group(k + "Hot", [(k + "Hot", hot_layer(k))])
    for p, bar, col in (("f", F_BAR, RED_C), ("r", R_BAR, GRN_C)):
        n = bar["grp"]
        items = [(f"{p}g{k:02d}m", bar_group(bar, k, col, True)) for k in range(1, n + 1)]
        items.append((f"{p}g{n:02d}", bar_group(bar, n, col, False)))
        put_group(p + "Bar", items)
        g0 = css.pop(p + "Bar")
        for g in range(bar["n"] // n):
            css[f"{p}Bar{g}"] = dict(g0, top=g0["top"] - g * n * pitch(bar))
    put_group("tog", [("tog-on", toggle_layer(True)), ("tog-off", toggle_layer(False))])
    put_group("start", [("start-on", start_on())])
    with open(os.path.join(HERE, "layout.json"), "w") as fp:
        json.dump(css, fp, indent=1, sort_keys=True)
        fp.write("\n")

    rep = C.check(ZONES, PARENTS)
    assert rep["ok"], rep
    # 막대 칸 경계(y) → 값 매핑 표: 구현이 그대로 쓰면 그림과 정확히 맞는다
    def bands(bar, lo, step):
        rects, hs = seg_rects(bar)
        return [{"value": lo + i * step, "y0": round(r[1] - bar["gap"] / 2, 1), "y1": round(r[3] + bar["gap"] / 2, 1)}
                for i, r in enumerate(rects)]
    with open(os.path.join(HERE, "touch-zones.json"), "w") as fp:
        json.dump({"screen": [W, H], "cornerRadius": 80, "format": "[x0, y0, x1, y1] (x1/y1 미포함)",
                   "zones": ZONES, "parents(parent contains these tap sub-zones)": PARENTS,
                   "barMapping": {"barBottom": BAR_BOT, "focusTop": BAR_BOT - F_N * pitch(F_BAR) + F_BAR["gap"], "restTop": BAR_BOT - R_N * pitch(R_BAR) + R_BAR["gap"],
                                  "focus": {"levels": F_N, "valueOfLevel": "5*k", "formula": "k = clamp(ceil((384 - y) / 26), 1, 12)"},
                                  "rest": {"levels": R_N, "valueOfLevel": "k", "formula": "k = clamp(ceil((384 - y) / 10), 1, 30)"},
                                  "focusBands": bands(F_BAR, F_MIN, F_STEP), "restBands": bands(R_BAR, R_MIN, R_STEP)},
                   "check": rep}, fp, indent=1, ensure_ascii=False)
        fp.write("\n")

    shots = {
        "01-default.png": compose(css, 25, 5, True),
        "02-changing.png": compose(css, 25, 12, True, hot="r"),
        "03-repeat-off.png": compose(css, 60, 1, False),
    }
    for n, im in shots.items():
        im.save(os.path.join(HERE, n), optimize=True)
    C.zones_png(shots["01-default.png"], ZONES, PARENTS, LABELS).save(os.path.join(HERE, "touch-zones.png"), optimize=True)
    files = sorted(os.listdir(OUT))
    total = sum(os.path.getsize(os.path.join(OUT, x)) for x in files)
    print(f"zones ok={rep['ok']} pairs={rep['checkedPairs']} under48={rep['under48px']}")
    print(f"layers: {len(files)} files, {total} bytes")


def compose(css, fm, bm, repeat, hot=None, pressed=None):
    """앱 image 노드 순서 그대로 layers/ 를 겹친다."""
    im = Image.open(os.path.join(OUT, "bg.png")).convert("RGBA")

    def put(name, key):
        im.alpha_composite(Image.open(os.path.join(OUT, name + ".png")).convert("RGBA"), (css[key]["left"], css[key]["top"]))

    for p, bar, lit in (("f", F_BAR, fm // 5), ("r", R_BAR, bm)):
        for g, nm in enumerate(bar_nodes(bar, lit)):
            if nm:
                put(f"{p}g{nm}", f"{p}Bar{g}")
    for k, v, lo, hi in (("f", fm, F_MIN, F_MAX), ("r", bm, R_MIN, R_MAX)):
        t = f"{v:02d}"
        put(k + t[0], k + "1")
        put(k + t[1], k + "2")
        if v >= hi:
            put(k + "Up-off", k + "UpOff")
        if v <= lo:
            put(k + "Dn-off", k + "DnOff")
    if hot:
        put(hot + "Hot", hot + "Hot")
    if pressed:
        put(pressed + "-on", pressed)
    put("tog-on" if repeat else "tog-off", "tog")
    return im.convert("RGB")


if __name__ == "__main__":
    main()
