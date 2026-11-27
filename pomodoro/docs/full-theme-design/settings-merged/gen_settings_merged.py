#!/usr/bin/env python3
"""BOOST 공용 설정 화면(01 SAND 설정) 개선안: 숫자와 게이지를 한 요소로 합친 시안 3개.
실행: python3 gen_settings_merged.py   (결정적. src/ 는 건드리지 않는다. 그리기 도구는 ../gen_full_themes.py 를 import 만 한다)

공통 규칙: 세로 조작만(좌우 제스처 없음), x<30 터치 없음, 영역 겹침 없음, 12px 움직이면 축 고정(세로 → 끌기),
축 고정 없이 손을 떼고 움직임 ≤40px 이면 탭. 끌기 영역은 y≥64 (시스템 풀다운과 떨어뜨림).
"""
from __future__ import annotations

import gzip
import json
import math
import os
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import gen_full_themes as G  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

div, text, render, ux_snippet = G.div, G.text, G.render, G.ux_snippet
W, H, R = G.W, G.H, G.R
FOCUS, REST = G.Sand.FOCUS, G.Sand.REST
LINE = G.Sand.LINE
TRACK, GRAY = "#262626", "#8C8C8C"
TOP_MARGIN = 64          # 끌기 영역 시작 y
FMAX, RMAX = 12, 30      # 단계 수 (집중 5분×1..12, 휴식 1..30)

# 공통 아래 줄: REPEAT 토글(왼쪽) + START(오른쪽)
REPEAT_Z = [40, 412, 200, 468]
START_Z = [204, 408, 392, 484]


def bottom_row(rep):
    return [text(48, 424, 84, 32, "REPEAT", 18, "#FFFFFF", 800, "left", cls="repLab"),
            div(134, 424, 54, 32, REST if rep else "#333333", r=16, cls="tog", bind="background-color = ON/OFF"),
            div(160 if rep else 138, 428, 24, 24, "#FFFFFF", r=12, cls="knob", bind="left = ON 160 / OFF 138"),
            div(214, 420, 168, 54, FOCUS, r=27, cls="start"),
            text(214, 420, 168, 54, "START", 26, "#FFFFFF", 800, cls="startTxt")]


def finger(x, y):
    """미리보기 전용 손가락 자국(앱 요소 아님 — 요소 수·CSS 크기에서 뺀다)."""
    return [div(x - 26, y - 26, 52, 52, "#FFFFFF", r=26, op=0.28, cls="_finger"),
            div(x - 6, y - 6, 12, 12, "#FFFFFF", r=6, op=0.8, cls="_fingerDot")]


def app_els(els):
    return [e for e in els if not e["cls"].startswith("_")]


# ================= 시안 =================
class Concept:
    id = name = ko = ""

    def bottom(self, rep):
        return bottom_row(rep)

    def safe_items(self, els):
        return []
    bleed = ()      # 화면 가장자리까지 일부러 칠하는 바탕(둥근 화면이 잘라 줌) — 모서리 검사에서 뺀다


# ---- A. TWIN TUBES: 나란히 선 넓은 세로 관 2개, 숫자는 관 안 고정 위치 ----
class TwinTubes(Concept):
    id, name, ko = "A-twin-tubes", "TWIN TUBES", "나란한 두 관"
    one = "넓은 세로 관 두 개(FOCUS·REST) 안에 값만큼 색이 차오르고, 관 위쪽에 라벨과 큰 숫자가 겹쳐 있다. 손가락 높이 = 값(바로 지정)."
    TUBES = {"focus": (44, 208), "rest": (224, 388)}
    Y0, Y1 = 72, 392     # 관 안쪽 위·아래

    def zones(self):
        return {"focusGauge": [40, TOP_MARGIN, 212, 404], "restGauge": [220, TOP_MARGIN, 392, 404],
                "repeat": REPEAT_Z, "start": START_Z}

    def mapping(self):
        hh = self.Y1 - self.Y0
        return {"type": "absolute",
                "tap": "탭한 높이의 칸으로 바로 설정",
                "drag": "세로 끌기 동안 손가락 높이의 칸을 따라감(스냅)",
                "focus": {"levels": FMAX, "pxPerStep": round(hh / FMAX, 2), "formula": f"k = clamp(ceil(({self.Y1} - y) / {hh / FMAX:.4f}), 1, 12); 값 = 5k"},
                "rest": {"levels": RMAX, "pxPerStep": round(hh / RMAX, 2), "formula": f"k = clamp(ceil(({self.Y1} - y) / {hh / RMAX:.4f}), 1, 30); 값 = k"},
                "clamp": f"y < {self.Y0} 는 최대, y > {self.Y1} 는 최소로 (영역 {TOP_MARGIN}~404 밖으로 나가도 끌기 유지)"}

    def screen(self, fm, rm, rep, active=None, fy=None):
        els = []
        for zone, val, vmax, col, lab, shown in (("focus", fm // 5, FMAX, FOCUS, "FOCUS", f"{fm:02d}"),
                                                  ("rest", rm, RMAX, REST, "REST", f"{rm:02d}")):
            x0, x1 = self.TUBES[zone]
            w = x1 - x0
            hh = self.Y1 - self.Y0
            fh = round(hh * val / vmax)
            els += [div(x0, self.Y0, w, hh, TRACK, r=30, cls=f"{zone}Track"),
                    div(x0, self.Y1 - fh, w, fh, col, r=30, cls=f"{zone}Fill", bind=f"height = k/최대 × {hh}, top = {self.Y1} - height")]
            if active == zone:
                els.append(div(x0 - 3, self.Y0 - 3, w + 6, hh + 6, None, r=33, bw=3, bc="#FFFFFF", cls=f"{zone}Active", bind="끌기 중에만 보임"))
            n = 12 if zone == "focus" else 6
            for k in range(1, n):     # 관 오른쪽 안쪽 눈금 (집중 5분마다, 휴식 5분마다)
                yy = round(self.Y1 - hh * k / n)
                els.append(div(x1 - 18, yy - 1, 10, 2, "#FFFFFF", op=0.45, cls=f"{zone}Tick{k}"))
            els += [text(x0, 88, w, 30, lab, 24, "#FFFFFF", 800, outline=True, cls=f"{zone}Lab"),
                    text(x0, 118, w, 110, shown, 96, "#FFFFFF", 800, outline=True, cls=f"{zone}Num", bind="글자 = 값"),
                    text(x0, 224, w, 26, "MIN", 18, "#FFFFFF", 700, outline=True, cls=f"{zone}Unit")]
        els += self.bottom(rep)
        if fy:
            els += finger(*fy)
        return els

    def shots(self):
        return {"default": self.screen(25, 5, True),
                "changing": self.screen(40, 5, True, active="focus", fy=(126, self.Y1 - round((self.Y1 - self.Y0) * 8 / 12) + 13)),
                "repeat-off": self.screen(25, 5, False)}


# ---- B. SPLIT SAND: 화면을 반으로 나눈 SAND, 숫자가 채움 윗면에 올라탄다 ----
class SplitSand(Concept):
    id, name, ko = "B-split-sand", "SPLIT SAND", "반반 모래 + 올라탄 숫자"
    one = ("SAND 를 세로로 반 갈라 왼쪽 집중·오른쪽 휴식이 아래에서 차오르고, 큰 숫자가 채움 윗면(수위선)에 올라타 함께 움직인다. "
           "끌면 수위선이 손가락을 따라오고, 수위선 위/아래 탭 = ±1.")
    HALF = {"focus": (0, 214), "rest": (218, 432)}
    bleed = ("focusTrack", "focusFill", "focusLevel", "restTrack", "restFill", "restLevel", "restActive", "focusActive")
    Y0, Y1 = 72, 400

    def zones(self):
        return {"focusGauge": [40, TOP_MARGIN, 212, 404], "restGauge": [220, TOP_MARGIN, 392, 404],
                "repeat": REPEAT_Z, "start": START_Z}

    def mapping(self):
        hh = self.Y1 - self.Y0
        return {"type": "absolute drag + relative tap",
                "drag": "세로 끌기 동안 수위선(채움 윗면)이 손가락 높이의 칸을 따라감(스냅)",
                "tap": "수위선보다 위를 탭 = +1단계, 아래를 탭 = −1단계 (수위선 = 현재 값의 top, 동적으로 나뉨)",
                "focus": {"levels": FMAX, "pxPerStep": round(hh / FMAX, 2), "formula": f"끌기: k = clamp(ceil(({self.Y1} - y) / {hh / FMAX:.4f}), 1, 12); 탭: y < fillTop ? k+1 : k−1"},
                "rest": {"levels": RMAX, "pxPerStep": round(hh / RMAX, 2), "formula": f"끌기: k = clamp(ceil(({self.Y1} - y) / {hh / RMAX:.4f}), 1, 30); 탭: y < fillTop ? k+1 : k−1"},
                "fillTop": f"{self.Y1} - round({hh} × k / 최대)",
                "clamp": "1 미만·최대 초과는 막힘"}

    def screen(self, fm, rm, rep, active=None, fy=None):
        els = []
        hh = self.Y1 - self.Y0
        for zone, val, vmax, col, lab, shown in (("focus", fm // 5, FMAX, FOCUS, "FOCUS", f"{fm:02d}"),
                                                  ("rest", rm, RMAX, REST, "REST", f"{rm:02d}")):
            x0, x1 = self.HALF[zone]
            w = x1 - x0
            fh = round(hh * val / vmax)
            top = self.Y1 - fh
            els += [div(x0, self.Y0, w, hh, "#141414", cls=f"{zone}Track"),
                    div(x0, top, w, fh, col, cls=f"{zone}Fill", bind="height = k/최대 × 328, top = 400 - height"),
                    div(x0, top - 2, w, 4, LINE[zone], cls=f"{zone}Level", bind="top = fillTop - 2")]
            if active == zone:
                els.append(div(x0, top - 3, w, 6, "#FFFFFF", cls=f"{zone}Active", bind="끌기 중 수위선 굵게"))
            # 숫자는 수위선 바로 위(채움이 낮을 때) 또는 바로 아래(높을 때)에 올라탄다
            ny = top - 104 if top - 104 >= self.Y0 + 36 else top + 8
            cx = (max(x0, 30) + min(x1, 402)) // 2
            els += [text(cx - 90, ny, 180, 100, shown, 92, "#FFFFFF", 800, outline=True, cls=f"{zone}Num",
                         bind="글자 = 값, top = fillTop-104 (위 공간 없으면 fillTop+8)"),
                    text(cx - 90, 80, 180, 30, lab, 24, "#FFFFFF", 800, outline=True, cls=f"{zone}Lab"),
                    text(cx - 90, 372, 180, 24, "MIN", 16, "#FFFFFF", 700, outline=True, cls=f"{zone}Unit")]
        els += self.bottom(rep)
        if fy:
            els += finger(*fy)
        return els

    def shots(self):
        hh = self.Y1 - self.Y0
        return {"default": self.screen(25, 5, True),
                "changing": self.screen(25, 12, True, active="rest", fy=(306, self.Y1 - round(hh * 12 / 30) + 5)),
                "repeat-off": self.screen(25, 5, False)}


# ---- C. STACKED BLOCKS: 가로로 넓은 블록 두 개를 위아래로, 세로 문지르기(상대 끌기) ----
class Stacked(Concept):
    id, name, ko = "C-stacked", "STACKED", "위아래 블록 + 문지르기"
    one = ("화면 폭 전체의 FOCUS 블록과 REST 블록을 위아래로 쌓고, 블록 안에 값만큼 색이 차오르며 큰 숫자가 겹친다. "
           "위아래로 문지르면 값이 오르내리고(상대 끌기, 손가락 위치와 무관), 블록 위/아래 반 탭 = ±1.")
    BLK = {"focus": (72, 216), "rest": (240, 384)}
    X0, X1 = 44, 388
    PX = {"focus": 26, "rest": 12}     # 상대 끌기: 한 단계당 px

    def zones(self):
        return {"focusBlock": [40, TOP_MARGIN, 392, 226], "restBlock": [40, 232, 392, 394],
                "repeat": REPEAT_Z, "start": START_Z}

    def mapping(self):
        return {"type": "relative drag (scrub) + half tap",
                "drag": "끌기 시작 값 k0 에서 k = clamp(k0 + round((y0 - y) / pxPerStep), 1, 최대). 위로 = 증가. 손가락이 블록 밖으로 나가도 끌기 유지",
                "tap": "블록 위쪽 반 = +1단계, 아래쪽 반 = −1단계",
                "focus": {"levels": FMAX, "pxPerStep": self.PX["focus"], "fullRangeDragPx": self.PX["focus"] * (FMAX - 1),
                          "halfSplitY": (TOP_MARGIN + 226) // 2},
                "rest": {"levels": RMAX, "pxPerStep": self.PX["rest"], "fullRangeDragPx": self.PX["rest"] * (RMAX - 1),
                         "halfSplitY": (232 + 394) // 2},
                "note": "휴식 1→30 은 348px 끌기 — 한 번에 안 되면 두 번 문지른다(상대 방식이라 이어서 됨)"}

    def screen(self, fm, rm, rep, active=None, fy=None):
        els = []
        for zone, val, vmax, col, lab, shown in (("focus", fm // 5, FMAX, FOCUS, "FOCUS", f"{fm:02d}"),
                                                  ("rest", rm, RMAX, REST, "REST", f"{rm:02d}")):
            y0, y1 = self.BLK[zone]
            hh = y1 - y0
            w = self.X1 - self.X0
            fh = round(hh * val / vmax)
            els += [div(self.X0, y0, w, hh, TRACK, r=26, cls=f"{zone}Track"),
                    div(self.X0, y1 - fh, w, fh, col, r=26 if fh >= 52 else fh // 2, cls=f"{zone}Fill", bind="height = k/최대 × 144, top = 블록 아래 - height")]
            if active == zone:
                els.append(div(self.X0 - 3, y0 - 3, w + 6, hh + 6, None, r=29, bw=3, bc="#FFFFFF", cls=f"{zone}Active", bind="끌기 중에만 보임"))
            els += [text(self.X0 + 22, y0 + 10, 160, 30, lab, 24, "#FFFFFF", 800, "left", outline=True, cls=f"{zone}Lab"),
                    text(self.X0 + 16, y0 + 36, 170, 104, shown, 96, "#FFFFFF", 800, "left", outline=True, cls=f"{zone}Num", bind="글자 = 값"),
                    text(self.X0 + 186, y0 + 94, 60, 30, "MIN", 20, "#FFFFFF", 700, "left", outline=True, cls=f"{zone}Unit")]
            # 오른쪽 ▲▼ 힌트(위 반/아래 반 탭 = ±1): 글자 대신 가로 막대 4줄 div 로 만든 삼각형(기기 글꼴에 ▲ 가 없을 수 있음)
            cx = self.X1 - 40
            for k, bw in enumerate((4, 10, 16, 22)):
                els.append(div(cx - bw // 2, y0 + 22 + k * 4, bw, 4, "#FFFFFF", op=0.7, cls=f"{zone}Up{k}"))
                els.append(div(cx - bw // 2, y1 - 26 - k * 4, bw, 4, "#FFFFFF", op=0.7, cls=f"{zone}Dn{k}"))
        els += self.bottom(rep)
        if fy:
            els += finger(*fy)
        return els

    def shots(self):
        return {"default": self.screen(25, 5, True),
                "changing": self.screen(25, 8, True, active="rest", fy=(250, 300)),
                "repeat-off": self.screen(25, 5, False)}



# ---- A-final: 사용자가 고른 A TWIN TUBES 확정안 — 아래 줄만 바꾸고 관을 최대한 키움 ----
def corner_margin(box):
    """사각형 box(x0,y0,x1,y1, x1/y1 미포함)의 네 꼭짓점이 둥근 화면(반경 80) 안쪽으로 얼마나 떨어져 있는지(px, 음수 = 밖).
    모서리 원 영역(x<80 또는 x>352, 그리고 y<80 또는 y>434)에 있는 꼭짓점만 원까지의 거리로 재고, 나머지는 직선 가장자리까지."""
    x0, y0, x1, y1 = box
    worst = None
    for x, y in ((x0, y0), (x1 - 1, y0), (x0, y1 - 1), (x1 - 1, y1 - 1)):
        cx = R if x < R else (W - 1 - R if x > W - 1 - R else None)
        cy = R if y < R else (H - 1 - R if y > H - 1 - R else None)
        if cx is not None and cy is not None:
            m = R - math.hypot(x - cx, y - cy)
        else:
            m = min(x, y, W - 1 - x, H - 1 - y)
        worst = m if worst is None else min(worst, m)
    return round(worst, 1)


class TwinTubesFinal(TwinTubes):
    id, name, ko = "A-final", "TWIN TUBES (final)", "나란한 두 관 확정안"
    one = ("A TWIN TUBES 확정안: 관을 위아래로 최대한 키우고(y 68~420), 아래 가운데 START, 오른쪽 아래 REPEAT(글자 위·토글 아래, START 와 같은 높이). "
           "왼쪽 아래는 비워 둔다.")
    Y0, Y1 = 68, 420                       # 관 안쪽: 끌기 위 여백 64 바로 아래 ~ 아래 줄 바로 위
    START_BOX = (136, 440, 296, 496)       # 56px 높이
    REP_LABEL = (304, 440, 384, 460)       # 20px
    REP_TOG = (317, 464, 371, 496)         # 54×32 → 글자+간격+토글 = 440~496 = START 높이
    START_Z = [124, 432, 300, 506]
    REPEAT_Z = [304, 432, 384, 500]      # 오른쪽 아래 곡선에서 8px 안쪽

    def zones(self):
        return {"focusGauge": [40, TOP_MARGIN, 212, 428], "restGauge": [220, TOP_MARGIN, 392, 428],
                "repeat": self.REPEAT_Z, "start": self.START_Z}

    def mapping(self):
        m = super().mapping()
        m["clamp"] = f"y < {self.Y0} 는 최대, y > {self.Y1} 는 최소로 (영역 {TOP_MARGIN}~428 밖으로 나가도 끌기 유지)"
        return m

    def bottom(self, rep):
        sx0, sy0, sx1, sy1 = self.START_BOX
        lx0, ly0, lx1, ly1 = self.REP_LABEL
        tx0, ty0, tx1, ty1 = self.REP_TOG
        th = ty1 - ty0
        return [div(sx0, sy0, sx1 - sx0, sy1 - sy0, FOCUS, r=(sy1 - sy0) // 2, cls="start"),
                text(sx0, sy0, sx1 - sx0, sy1 - sy0, "START", 26, "#FFFFFF", 800, cls="startTxt"),
                text(lx0, ly0, lx1 - lx0, ly1 - ly0, "REPEAT", 16, "#FFFFFF" if rep else GRAY, 800, cls="repLab", bind="color = ON 흰색 / OFF 회색"),
                div(tx0, ty0, tx1 - tx0, th, REST if rep else "#333333", r=th // 2, cls="tog", bind="background-color = ON/OFF"),
                div(tx1 - 28 if rep else tx0 + 4, ty0 + 4, 24, 24, "#FFFFFF", r=12, cls="knob", bind=f"left = ON {tx1 - 28} / OFF {tx0 + 4}")]

    def safe_items(self, els):
        boxes = {e["cls"]: [e["x"], e["y"], e["x"] + e["w"], e["y"] + e["h"]] for e in els
                 if e["cls"] in ("start", "repLab", "tog", "knob", "focusTrack", "restTrack")}
        return boxes


CONCEPTS = [TwinTubes(), SplitSand(), Stacked(), TwinTubesFinal()]


# ================= 검사 =================
def check_zones(z):
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=R, fill=255)
    px = mask.load()
    names = list(z)
    overlaps = [[a, b] for i, a in enumerate(names) for b in names[i + 1:]
                if min(z[a][2], z[b][2]) > max(z[a][0], z[b][0]) and min(z[a][3], z[b][3]) > max(z[a][1], z[b][1])]
    outside = [n for n, (x0, y0, x1, y1) in z.items()
               if any(px[x, y] == 0 for x, y in ((x0, y0), (x1 - 1, y0), (x0, y1 - 1), (x1 - 1, y1 - 1)))]
    left = [n for n, v in z.items() if v[0] < 30]
    drag_top = {n: v[1] for n, v in z.items() if n not in ("repeat", "start")}
    small = {n: [v[2] - v[0], v[3] - v[1]] for n, v in z.items() if min(v[2] - v[0], v[3] - v[1]) < 48}
    ok = not overlaps and not outside and not left and not small and min(drag_top.values()) >= TOP_MARGIN
    return {"overlaps": overlaps, "cornerOutsideRoundRect": outside, "inLeftEdge(x<30)": left,
            "dragZoneTopY": drag_top, "under48px": small,
            "sizes": {n: [v[2] - v[0], v[3] - v[1]] for n, v in z.items()}, "ok": ok}


def main():
    infos = []
    for c in CONCEPTS:
        out = os.path.join(HERE, c.id)
        os.makedirs(out, exist_ok=True)
        shots = c.shots()
        for fn, els in shots.items():
            render(els).save(os.path.join(out, fn + ".png"), optimize=True)
        tpl, css = ux_snippet(app_els(shots["changing"]), "m")
        snip = f"<!-- {c.name} 설정 화면 -->\n{tpl}\n<style>\n{css}\n</style>\n"
        with open(os.path.join(out, "settings.ux.txt"), "w") as fp:
            fp.write(snip)
        raw = snip.encode()
        zones = c.zones()
        tz = {"screen": [W, H], "cornerRadius": R, "format": "[x0, y0, x1, y1] (x1/y1 미포함)", "zones": zones,
              "gestures": {"vertical": "12px 움직이면 축 고정. 세로 고정 → 그 영역의 끌기. 가로 고정 → 아무것도 안 함(앱은 좌우 제스처 없음)",
                           "tap": "축 고정 없이 손을 떼고 총 움직임 ≤ 40px", "repeat": "탭 = ON/OFF", "start": "탭 = 시작",
                           "dragStart": f"끌기 영역은 y ≥ {TOP_MARGIN} 에서 시작해야 함(위 가장자리 시스템 풀다운과 분리)"},
              "mapping": c.mapping(), "check": check_zones(zones)}
        items = c.safe_items(app_els(shots["default"]))
        if items:
            tz["safeArea"] = {"rule": "둥근 화면(반경 80) 안쪽까지의 최소 거리 px (음수 = 밖). 화면 요소는 4px 이상, 터치 영역은 0 이상이면 통과",
                              "zones": {n: corner_margin(v) for n, v in zones.items()},
                              "elements": {n: corner_margin(v) for n, v in items.items()},
                              "bottomRowAlign": {"start": list(c.START_BOX[1::2]), "repeatLabelTop": c.REP_LABEL[1], "repeatToggleBottom": c.REP_TOG[3],
                                                 "sameHeight": c.START_BOX[3] - c.START_BOX[1] == c.REP_TOG[3] - c.REP_LABEL[1]}}
            tz["safeArea"]["ok"] = (min(tz["safeArea"]["zones"].values()) >= 0 and min(tz["safeArea"]["elements"].values()) >= 4
                                    and tz["safeArea"]["bottomRowAlign"]["sameHeight"])
        with open(os.path.join(out, "touch-zones.json"), "w") as fp:
            json.dump(tz, fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        with open(os.path.join(out, "elements.json"), "w") as fp:
            json.dump({k: app_els(v) for k, v in shots.items()}, fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        info = {"id": c.id, "name": c.name, "ko": c.ko, "oneLine": c.one, "elements": len(app_els(shots["default"])),
                "elementsWhileDragging": len(app_els(shots["changing"])),
                "uxBytes": len(raw), "uxGzipBytes": len(gzip.compress(raw, 9, mtime=0)), "zonesOk": tz["check"]["ok"], "safeAreaOk": tz.get("safeArea", {}).get("ok"),
                "pxPerStep": {k: tz["mapping"][k]["pxPerStep"] for k in ("focus", "rest")},
                "corner": {fn: G.safe_check(render([e for e in app_els(els) if e["cls"] not in c.bleed])) for fn, els in shots.items()}}
        infos.append(info)
        print(c.id, info["elements"], info["uxBytes"], info["uxGzipBytes"], tz["check"]["ok"], info["corner"])
    with open(os.path.join(HERE, "concepts.json"), "w") as fp:
        json.dump({"topMargin": TOP_MARGIN, "concepts": infos}, fp, indent=1, ensure_ascii=False)
        fp.write("\n")
    overview(infos)


def overview(infos):
    sc = 0.5
    cw, chh = int(W * sc), int(H * sc)
    pad, top = 16, 92
    rows = ["default", "changing", "repeat-off"]
    cols = [("NOW", "01 SAND (current)", None)] + [(c["id"][0], c["name"], c["id"]) for c in infos]
    Wd = pad + len(cols) * (cw + pad)
    Hd = top + len(rows) * (chh + pad) + 30
    im = Image.new("RGB", (Wd, Hd), (24, 24, 26))
    d = ImageDraw.Draw(im)
    fb = ImageFont.truetype(G.FONT_LBL, 26)
    f20 = ImageFont.truetype(G.FONT_LBL, 20)
    fs = ImageFont.truetype(G.FONT_SYS, 13)
    d.text((pad, 12), "BOOST SETTINGS · NUMBER + GAUGE MERGED", font=fb, fill=(255, 255, 255))
    d.text((pad, 46), "432x514 · 50% · rows: default 25/5 ON · changing (finger = preview only) · repeat OFF", font=fs, fill=(170, 170, 170))
    for ci, (tag, name, cid) in enumerate(cols):
        x = pad + ci * (cw + pad)
        d.text((x, top - 26), f"{tag}  {name}" if tag != "NOW" else name, font=f20, fill=(255, 255, 255) if cid else (150, 150, 150))
        for r, fn in enumerate(rows):
            y = top + r * (chh + pad)
            if cid is None:
                if r == 0:
                    im.paste(Image.open(os.path.join(os.path.dirname(HERE), "01-sand", "settings.png")).convert("RGB").resize((cw, chh), Image.LANCZOS), (x, y))
                else:
                    d.rounded_rectangle((x, y, x + cw, y + chh), radius=40, outline=(60, 60, 64), width=1)
                continue
            im.paste(Image.open(os.path.join(HERE, cid, fn + ".png")).convert("RGB").resize((cw, chh), Image.LANCZOS), (x, y))
        if cid:
            inf = next(i for i in infos if i["id"] == cid)
            d.text((x, top + len(rows) * (chh + pad) + 2), f"{inf['elements']} elements · CSS {inf['uxGzipBytes'] / 1024:.1f} KB (gz)", font=fs, fill=(170, 170, 170))
    im.save(os.path.join(HERE, "overview.png"), optimize=True)


if __name__ == "__main__":
    main()
