#!/usr/bin/env python3
"""BOOST 전체 화면 테마 시안 7종(01~05 + 06 TOMATO + 07 VISUAL) (타이머 레이아웃 · 게이지 방식 · 색 · 글자 느낌 통째로).
실행: python3 gen_full_themes.py   (결정적. src/ 는 읽기만 하고 쓰지 않는다)

CSS 테마(1, 3, 4, 5)는 화면을 'Vela 퀵앱 div/text 요소 목록'으로 정의하고, 그 목록을 그대로 그려 미리보기를 만든다.
  요소 = 절대 위치 박스(left/top/width/height) + background-color / border-width·color / border-radius / opacity,
         text = font-size / font-weight / color / text-align / text-shadow(검정 외곽선)
  레포에서 이미 쓰는 CSS 속성만 쓴다(yeomju 실기기 확인 앱의 style 바인딩: left/top/width/height/opacity/color).
  글꼴은 기기 시스템 글꼴(font-family 지정 없음). 미리보기는 대체 글꼴 Roboto 로 그린다 [PLACEHOLDER: 실제 시스템 글꼴].
  같은 요소 목록에서 테마별 template+style 조각(theme.ux.txt)을 만들어 gzip 크기로 패키지 증가량을 잰다.
PNG 테마(2 BOOSTER)는 지금 앱 리소스(src/common/booster, src/common/setup)를 앱 순서대로 겹쳐 만든다(읽기만).
"""
from __future__ import annotations

import gzip
import importlib.util
import json
import math
import os
import sys

sys.dont_write_bytecode = True
from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
W, H, R = 432, 514, 80
SS = 3  # 슈퍼샘플(안티에일리어싱)
FONT_SYS = "/usr/share/fonts/truetype/sand-box/google/Roboto/Roboto-VariableFont_wdth,wght.ttf"
FONT_LBL = "/usr/share/fonts/truetype/sand-box/google/Barlow Semi Condensed/BarlowSemiCondensed-ExtraBoldItalic.ttf"

# THERMO 설정 화면 터치 영역 (setup-final-thermo/touch-zones.json 과 같음 — 모든 테마가 그대로 쓴다)
ZONES = {
    "focusNum": [40, 60, 216, 210], "focusNumUp": [40, 60, 216, 135], "focusNumDown": [40, 135, 216, 210],
    "restNum": [40, 220, 216, 350], "restNumUp": [40, 220, 216, 285], "restNumDown": [40, 285, 216, 350],
    "focusBar": [226, 56, 306, 404], "restBar": [322, 56, 402, 404],
    "repeat": [40, 358, 216, 414], "start": [112, 424, 320, 496],
}
BAR_BOT = 384
F_TOP, R_TOP = BAR_BOT - 12 * 26 + 4, BAR_BOT - 30 * 10 + 2   # 76, 86 (THERMO 막대 위 끝)
CASES = [("focus-mid", "focus", 750, 1500), ("focus-late", "focus", 120, 1500), ("rest", "rest", 150, 300)]


# ---------------- 요소 ----------------
def div(x, y, w, h, bg=None, r=0, bw=0, bc=None, op=1.0, cls="", bind=""):
    return dict(k="div", x=x, y=y, w=w, h=h, bg=bg, r=r, bw=bw, bc=bc, op=op, cls=cls, bind=bind)


def text(x, y, w, h, s, size, color, weight=700, align="center", outline=False, cls="", bind="", font="sys"):
    return dict(k="text", x=x, y=y, w=w, h=h, s=s, size=size, color=color, weight=weight, align=align,
                outline=outline, cls=cls, bind=bind, font=font)


def rgb(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


_F = {}


def font(size, weight, kind="sys"):
    key = (size, weight, kind)
    if key not in _F:
        if kind == "sys":
            f = ImageFont.truetype(FONT_SYS, size * SS)
            f.set_variation_by_axes([weight, 100])
        else:
            f = ImageFont.truetype(FONT_LBL, size * SS)
        _F[key] = f
    return _F[key]


def render(els, bg="#000000", base=None):
    im = Image.new("RGB", (W * SS, H * SS), rgb(bg))
    for e in els:
        if e["k"] == "img":
            src = Image.open(os.path.join(base, e["src"])).convert("RGBA")
            src = src.resize((src.width * SS, src.height * SS), Image.NEAREST)
            im.paste(src, (e["x"] * SS, e["y"] * SS), src)
            continue
        if e["k"] == "div":
            if e["w"] <= 0 or e["h"] <= 0:
                continue
            lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            box = [e["x"] * SS, e["y"] * SS, (e["x"] + e["w"]) * SS - 1, (e["y"] + e["h"]) * SS - 1]
            r = min(e["r"], e["w"] / 2, e["h"] / 2) * SS
            a = int(round(255 * e["op"]))
            d.rounded_rectangle(box, radius=r, fill=(rgb(e["bg"]) + (a,)) if e["bg"] else None,
                                outline=(rgb(e["bc"]) + (a,)) if e["bw"] else None, width=int(e["bw"] * SS))
            im.paste(lay, (0, 0), lay)
        else:
            f = font(e["size"], e["weight"], e["font"])
            asc, desc = f.getmetrics()
            tw = f.getlength(e["s"])
            bx, by, bw_, bh = e["x"] * SS, e["y"] * SS, e["w"] * SS, e["h"] * SS
            tx = bx + (bw_ - tw) / 2 if e["align"] == "center" else bx if e["align"] == "left" else bx + bw_ - tw
            ty = by + (bh - (asc + desc)) / 2
            if e["outline"]:   # text-shadow: -2/2/0/0 4방향 + 0 0 4px 검정 (0.1.1 · yeomju 와 같은 값)
                sh = Image.new("L", im.size, 0)
                ds = ImageDraw.Draw(sh)
                for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2), (0, 0)):
                    ds.text((tx + ox * SS, ty + oy * SS), e["s"], font=f, fill=255)
                sh = sh.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.5 * SS))
                sh = sh.point(lambda v: min(255, v * 2))
                im.paste((0, 0, 0), (0, 0), sh)
            ImageDraw.Draw(im).text((tx, ty), e["s"], font=f, fill=rgb(e["color"]))
    im = im.resize((W, H), Image.LANCZOS)
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=R, fill=255)
    out = Image.new("RGB", (W, H))
    out.paste(im, (0, 0), m)
    return out


SEG = {'0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'}


def seg7(x, y, w, h, t, ch, on, off, cls):
    """div 7개로 만든 7세그먼트 숫자(기울임 없음 — transform 안 씀). 켜짐/꺼짐은 background-color 바인딩."""
    m = (h - t) / 2
    P = {"a": (x + t, y, w - 2 * t, t), "g": (x + t, y + m, w - 2 * t, t), "d": (x + t, y + h - t, w - 2 * t, t),
         "f": (x, y + t * 0.8, t, m - t * 0.6), "b": (x + w - t, y + t * 0.8, t, m - t * 0.6),
         "e": (x, y + m + t * 0.8, t, m - t * 0.6), "c": (x + w - t, y + m + t * 0.8, t, m - t * 0.6)}
    return [div(round(a), round(b), round(c), round(d), on if n in SEG[ch] else off, r=t / 2, cls=f"{cls}-{n}",
                bind="background-color = 켜짐/꺼짐 색") for n, (a, b, c, d) in P.items()]


def p2(v):
    return f"{v:02d}"


# ================= 테마 =================
class Theme:
    id = name = ko = concept = approach = ""
    css = True
    bg = "#000000"


# ---- 1. SAND (초안 0.1.1 다듬기) ----
class Sand(Theme):
    id, name, ko = "01-sand", "SAND", "모래시계 채움(초안)"
    concept = "초안 0.1.1 그대로: 화면 전체가 집중 빨강·휴식 초록으로 가득 찼다가 위에서부터 비워진다. 수위선·눈금·라벨을 더해 다듬음."
    FOCUS, REST = "#FF4B4B", "#3DDC84"
    LINE = {"focus": "#FFC9C0", "rest": "#C4F7DA"}
    approach = ("CSS만. 바닥에 붙은 div 하나(.sand)의 height(= 남은 비율 × 514)와 background-color, 그 위 수위선 div 의 top 만 바꾼다. "
                "숫자·라벨은 text + text-shadow 검정 외곽선(0.1.1 과 같은 값). 눈금 4개는 고정 div.")

    def timer(self, phase, rem, tot):
        col = self.FOCUS if phase == "focus" else self.REST
        h = round(rem / tot * H)
        els = [div(0, H - h, W, h, col, cls="sand", bind="height = round(남은/전체 × 514), background-color = 구간 색"),
               div(0, H - h - 2, W, 4, self.LINE[phase], cls="level", bind="top = 514 - sandHeight - 2 (0 또는 514 일 때 숨김)")]
        for k in (1, 2, 3, 4):     # 20% 마다 눈금 (오른쪽, 모서리 피함)
            y = round(H - H * k / 5)
            els.append(div(390, y - 1, 22, 3, "#9A9A9A", r=1, cls=f"tick{k}"))
        lab = "FOCUS" if phase == "focus" else "REST"
        els += [text(66, 150, 300, 40, lab, 30, "#FFFFFF", 800, outline=True, cls="label", bind="글자 = FOCUS/REST"),
                text(16, 196, 400, 120, f"{rem // 60:02d}:{rem % 60:02d}", 104, "#FFFFFF", 800, outline=True, cls="time", bind="글자 = MM:SS"),
                text(66, 318, 300, 34, f"{tot // 60} MIN", 24, "#FFFFFF", 600, outline=True, cls="total")]
        return els

    def settings(self, fm, rm, rep):
        els = []
        for (lab, y, col, val, vmax, num_y, num_h, zone) in (
                ("FOCUS", 62, self.FOCUS, fm, 60, 104, 104, "focus"), ("REST", 222, self.REST, rm, 30, 262, 84, "rest")):
            els += [text(54, y, 150, 32, lab, 26, col, 800, "left", cls=f"{zone}Lab"),
                    div(48, y + 36, 158, 3, col, cls=f"{zone}Ul"),
                    text(40, num_y, 140, num_h, p2(val), num_h - 8, "#FFFFFF", 800, "left", cls=f"{zone}Num", bind="글자 = 값"),
                    text(176, num_y + 6, 40, 34, "+", 30, "#8C8C8C", 700, cls=f"{zone}Up"),
                    text(176, num_y + num_h - 40, 40, 34, "−", 30, "#8C8C8C", 700, cls=f"{zone}Dn")]
        for (x, top, col, val, vmax, lo, hi, zone) in ((248, F_TOP, self.FOCUS, fm, 60, "5", "60", "focus"),
                                                        (344, R_TOP, self.REST, rm, 30, "1", "30", "rest")):
            hh = BAR_BOT - top
            fh = round(hh * val / vmax)
            els += [div(x, top, 36, hh, "#262626", r=18, cls=f"{zone}Track"),
                    div(x, BAR_BOT - fh, 36, fh, col, r=18, cls=f"{zone}Fill", bind="height = 값/최대 × 막대 높이, top = 384 - height"),
                    text(x - 12, top - 26, 60, 20, hi, 15, "#8C8C8C", 600, cls=f"{zone}Max"),
                    text(x - 12, 390, 60, 20, lo, 15, "#8C8C8C", 600, cls=f"{zone}Min")]
        els += self.repeat_start(rep)
        return els

    def repeat_start(self, rep):
        return [text(54, 370, 76, 36, "REPEAT", 17, "#FFFFFF", 800, "left", cls="repLab"),
                div(130, 369, 50, 32, self.REST if rep else "#333333", r=16, cls="tog", bind="background-color = ON/OFF"),
                div(154 if rep else 134, 373, 24, 24, "#FFFFFF", r=12, cls="knob", bind="left = ON 154 / OFF 134"),
                text(184, 372, 32, 28, "ON" if rep else "OFF", 14, self.REST if rep else "#8C8C8C", 700, "left", cls="togTxt"),
                div(136, 436, 160, 48, self.FOCUS, r=24, cls="start"),
                text(136, 436, 160, 48, "START", 24, "#FFFFFF", 800, cls="startTxt")]


# ---- 2. BOOSTER (현재 0.1.8) ----
class Booster(Theme):
    id, name, ko = "02-booster", "BOOSTER", "부스터(현재)"
    concept = "지금 앱: 레이싱 계기판식 36칸 파이 게이지(집중 30·휴식 6), 노란 네온 테두리, 7세그먼트 숫자."
    css = False
    approach = ("PNG. 게이지는 켜진 칸 수별 전체 화면 프레임 37장(g00~g36, 256색) 중 하나로 image src 교체, "
                "숫자·라벨은 투명 PNG 23장. 설정은 THERMO PNG 52장.")


# ---- 3. BATTERY ----
class Battery(Theme):
    id, name, ko = "03-battery", "BATTERY", "배터리"
    concept = "집중은 배터리를 쓰고(빨강이 줄어듦), 휴식은 충전한다(초록이 차오름). 5칸 배터리와 오른쪽 큰 숫자."
    FOCUS, REST, LINE, DIM = "#FF5A4A", "#3CE07E", "#E6E6E6", "#1A1A1A"
    approach = ("CSS만. 배터리 외곽 div(border 6px, radius) + 캡 div + 안쪽 채움 div 의 height/top/background-color, "
                "그 위 고정 검정 칸막이 div 4개. 휴식은 채움 높이 = 지난 비율(충전). 숫자·라벨은 text.")
    BX, BY, BW, BH = 54, 96, 150, 364

    def battery(self, x, y, w, h, frac, col, cap=True, seps=4, bwid=6, cls="bat"):
        pad = bwid + 5
        ih = h - 2 * pad
        fh = round(ih * frac)
        els = []
        if cap:
            els.append(div(x + w / 2 - w * 0.18, y - 16, w * 0.36, 18, self.LINE, r=5, cls=f"{cls}Cap"))
        els += [div(x, y, w, h, None, r=22 if w > 80 else 12, bw=bwid, bc=self.LINE, cls=f"{cls}Body"),
                div(x + pad, y + h - pad - ih, w - 2 * pad, ih, self.DIM, r=12 if w > 80 else 6, cls=f"{cls}Empty"),
                div(x + pad, y + h - pad - fh, w - 2 * pad, fh, col, r=12 if w > 80 else 6, cls=f"{cls}Fill",
                    bind="height = 비율 × 안쪽 높이, top = 바닥 - height, background-color = 구간 색")]
        for k in range(1, seps + 1):
            yy = y + h - pad - ih * k / (seps + 1)
            els.append(div(x + pad, round(yy - 3), w - 2 * pad, 6, "#000000", cls=f"{cls}Sep{k}"))
        return els

    def timer(self, phase, rem, tot):
        focus = phase == "focus"
        frac = rem / tot if focus else 1 - rem / tot
        col = self.FOCUS if focus else self.REST
        els = self.battery(self.BX, self.BY, self.BW, self.BH, frac, col)
        lab = "FOCUS" if focus else "REST"
        els += [div(232, 104, 150, 40, col, r=20, cls="pill", bind="background-color = 구간 색"),
                text(232, 104, 150, 40, lab, 24, "#000000", 800, cls="pillTxt", bind="글자 = FOCUS/REST"),
                text(222, 160, 180, 150, p2(rem // 60), 150, "#FFFFFF", 800, cls="mm", bind="글자 = 분"),
                text(222, 304, 180, 70, ":" + p2(rem % 60), 62, "#BDBDBD", 600, cls="ss", bind="글자 = :초"),
                text(222, 392, 180, 40, (f"{round(frac * 100)}% LEFT" if focus else f"CHARGING {round(frac * 100)}%"), 20, col, 700,
                     cls="pct", bind="글자 = 퍼센트")]
        return els

    def settings(self, fm, rm, rep):
        els = []
        for (lab, y, col, val, num_y, num_h, zone) in (("FOCUS", 62, self.FOCUS, fm, 104, 104, "focus"),
                                                        ("REST", 222, self.REST, rm, 262, 84, "rest")):
            els += [div(48, y, 104, 32, col, r=16, cls=f"{zone}Pill"),
                    text(48, y, 104, 32, lab, 19, "#000000", 800, cls=f"{zone}Lab"),
                    text(40, num_y, 140, num_h, p2(val), num_h - 8, "#FFFFFF", 800, "left", cls=f"{zone}Num", bind="글자 = 값"),
                    text(178, num_y + 6, 36, 34, "+", 30, "#9A9A9A", 700, cls=f"{zone}Up"),
                    text(178, num_y + num_h - 40, 36, 34, "−", 30, "#9A9A9A", 700, cls=f"{zone}Dn")]
        for (x, top, col, val, vmax, lo, hi, seps, zone) in ((242, F_TOP, self.FOCUS, fm, 60, "5", "60", 11, "f"),
                                                              (338, R_TOP, self.REST, rm, 30, "1", "30", 5, "r")):
            # 안쪽 채움 영역 = THERMO 막대 영역(top~384) 그대로 → 터치 공식(touch-zones.json barMapping)을 바꾸지 않아도 된다
            pad = 4 + 5
            els += self.battery(x, top - pad, 48, BAR_BOT - top + 2 * pad, val / vmax, col, True, seps, 4, cls=f"{zone}Bat")
            els += [text(x - 26, top - 30, 36, 20, hi, 15, "#9A9A9A", 600, "right", cls=f"{zone}Max"),
                    text(x - 6, 396, 60, 20, lo, 15, "#9A9A9A", 600, cls=f"{zone}Min")]
        els += [text(54, 370, 76, 36, "REPEAT", 17, "#FFFFFF", 800, "left", cls="repLab"),
                div(130, 369, 50, 32, None, r=8, bw=3, bc=self.LINE, cls="tog"),
                div(156 if rep else 135, 374, 19, 22, self.REST if rep else "#555555", r=4, cls="knob", bind="left/색 = ON/OFF"),
                text(184, 372, 32, 28, "ON" if rep else "OFF", 14, self.REST if rep else "#8C8C8C", 700, "left", cls="togTxt"),
                div(136, 436, 160, 48, None, r=14, bw=4, bc=self.FOCUS, cls="start"),
                text(136, 436, 160, 48, "START", 24, self.FOCUS, 800, cls="startTxt")]
        return els


# ---- 4. SWISS ----
class Swiss(Theme):
    id, name, ko = "04-swiss", "SWISS", "스위스 타이포"
    concept = "그림 없이 글자로만: 화면 절반을 채우는 큰 분 숫자, 색 블록 라벨, 바닥의 가는 진행선. 조용한 포스터 느낌."
    FOCUS, REST = "#FF3B30", "#30D158"
    approach = "CSS만. 색 블록 div(라벨 바탕) background-color, 진행선 div 의 width, text 3개(분·초·라벨). 가장 가볍다."

    def timer(self, phase, rem, tot):
        focus = phase == "focus"
        col = self.FOCUS if focus else self.REST
        frac = rem / tot
        lab = "FOCUS" if focus else "REST"
        els = [div(48, 70, 132, 40, col, cls="block", bind="background-color = 구간 색"),
               text(58, 70, 122, 40, lab, 26, "#000000", 900, "left", cls="blockTxt", bind="글자 = FOCUS/REST"),
               text(196, 70, 190, 40, f"/ {tot // 60} MIN", 22, "#8E8E93", 600, "right", cls="total"),
               text(30, 118, 380, 236, p2(rem // 60), 250, "#FFFFFF", 900, "left", cls="mm", bind="글자 = 분"),
               text(48, 346, 340, 66, p2(rem % 60) + " SEC", 52, "#8E8E93", 700, "left", cls="ss", bind="글자 = 초"),
               div(48, 430, 336, 6, "#2C2C2E", cls="track"),
               div(48, 430, round(336 * frac), 6, col, cls="prog", bind="width = 남은/전체 × 336")]
        for k in range(1, 5):
            els.append(div(48 + round(336 * k / 5) - 1, 424, 2, 18, "#000000", cls=f"cut{k}"))
        return els

    def settings(self, fm, rm, rep):
        els = []
        for (lab, y, col, val, num_y, num_h, zone) in (("FOCUS", 62, self.FOCUS, fm, 102, 106, "focus"),
                                                        ("REST", 222, self.REST, rm, 262, 86, "rest")):
            els += [div(48, y, 96, 30, col, cls=f"{zone}Block"),
                    text(55, y, 89, 30, lab, 19, "#000000", 900, "left", cls=f"{zone}Lab"),
                    text(150, y, 60, 30, "MIN", 14, "#8E8E93", 700, "right", cls=f"{zone}Unit"),
                    text(40, num_y, 150, num_h, p2(val), num_h + 4, "#FFFFFF", 900, "left", cls=f"{zone}Num", bind="글자 = 값"),
                    text(184, num_y + 4, 28, 30, "+", 26, "#8E8E93", 700, cls=f"{zone}Up"),
                    text(184, num_y + num_h - 34, 28, 30, "−", 26, "#8E8E93", 700, cls=f"{zone}Dn")]
        for (x, top, col, val, vmax, lo, hi, zone) in ((262, F_TOP, self.FOCUS, fm, 60, "5", "60", "f"),
                                                        (358, R_TOP, self.REST, rm, 30, "1", "30", "r")):
            hh = BAR_BOT - top
            fh = round(hh * val / vmax)
            els += [div(x, top, 4, hh, "#2C2C2E", cls=f"{zone}Track"),
                    div(x - 3, BAR_BOT - fh, 10, fh, col, cls=f"{zone}Fill", bind="height/top = 값"),
                    div(x - 13, BAR_BOT - fh - 4, 30, 8, "#FFFFFF", cls=f"{zone}Handle", bind="top = 384 - height - 4"),
                    text(x - 28, top - 26, 60, 20, hi, 15, "#8E8E93", 700, cls=f"{zone}Max"),
                    text(x - 28, 390, 60, 20, lo, 15, "#8E8E93", 700, cls=f"{zone}Min")]
        els += [text(54, 370, 76, 36, "REPEAT", 17, "#FFFFFF", 900, "left", cls="repLab"),
                div(130, 371, 50, 28, "#FFFFFF" if rep else "#2C2C2E", cls="tog", bind="background-color = ON/OFF"),
                div(156 if rep else 134, 375, 20, 20, "#000000" if rep else "#8E8E93", cls="knob", bind="left = ON/OFF"),
                text(184, 372, 32, 28, "ON" if rep else "OFF", 14, "#FFFFFF" if rep else "#8E8E93", 800, "left", cls="togTxt"),
                div(136, 436, 160, 48, "#FFFFFF", cls="start"),
                text(136, 436, 160, 48, "START", 24, "#000000", 900, cls="startTxt")]
        return els


# ---- 5. LCD ----
class Lcd(Theme):
    id, name, ko = "05-lcd", "LCD", "레트로 LCD"
    concept = "80년대 전자시계: div 로 만든 7세그먼트 숫자와 꺼진 칸이 비치는 LCD, FOCUS/REST 표시등, 10칸 배터리식 진행 막대."
    FOCUS, REST, GHOST, FRAME = "#FFB020", "#36E0FF", "#1C1A14", "#3A3A3A"
    approach = ("CSS만. 숫자 4자리 = 세그먼트 div 28개 + 콜론 2개(background-color 만 바꿈), 표시등 text 2개 color, "
                "진행 블록 div 10개 background-color. 이미지·글꼴 없이 7세그먼트 느낌.")

    def timer(self, phase, rem, tot):
        focus = phase == "focus"
        col = self.FOCUS if focus else self.REST
        ghost = "#201A0C" if focus else "#0C1C20"
        els = [div(28, 118, 376, 196, None, r=26, bw=3, bc=self.FRAME, cls="frame")]
        els += [text(56, 70, 120, 34, "FOCUS", 24, self.FOCUS if focus else "#2A2620", 800, "left", cls="indF", bind="color = 켜짐/꺼짐"),
                text(256, 70, 120, 34, "REST", 24, self.REST if not focus else "#1E2A2C", 800, "right", cls="indR", bind="color = 켜짐/꺼짐"),
                div(196, 84, 40, 6, "#2A2A2A", r=3, cls="indSep")]
        mm, ss = p2(rem // 60), p2(rem % 60)
        x0 = 52
        for i, ch in enumerate(mm + ss):
            x = x0 + i * 84 + (24 if i >= 2 else 0)
            els += seg7(x, 146, 66, 140, 13, ch, col, ghost, f"d{i}")
        els += [div(206, 186, 13, 13, col, r=3, cls="col1"), div(206, 234, 13, 13, col, r=3, cls="col2")]
        n = math.ceil(rem / tot * 10)
        for k in range(10):
            els.append(div(52 + k * 33, 352, 26, 46, col if k < n else ghost, r=4, cls=f"blk{k}", bind="background-color = k < ceil(남은 비율 × 10)"))
        els.append(text(52, 410, 328, 30, f"{tot // 60:02d}:00 SET", 20, "#6B6B6B", 700, "left", cls="set"))
        return els

    def settings(self, fm, rm, rep):
        els = []
        for (lab, y, col, ghost, val, dy, dh, dw, t, zone) in (
                ("FOCUS", 62, self.FOCUS, "#201A0C", fm, 106, 98, 52, 11, "focus"),
                ("REST", 222, self.REST, "#0C1C20", rm, 266, 78, 42, 9, "rest")):
            els += [text(52, y, 120, 30, lab, 22, col, 800, "left", cls=f"{zone}Ind"),
                    div(48, y + 34, 160, 3, "#2E2E2E", cls=f"{zone}Rule")]
            for i, ch in enumerate(p2(val)):
                els += seg7(52 + i * (dw + 18), dy, dw, dh, t, ch, col, ghost, f"{zone}{i}")
            els += [text(178, dy + 2, 36, 32, "+", 28, "#6B6B6B", 700, cls=f"{zone}Up"),
                    text(178, dy + dh - 32, 36, 32, "−", 28, "#6B6B6B", 700, cls=f"{zone}Dn")]
        for (x, n, pitch, ch_, col, ghost, val, step, lo, hi, zone) in (
                (248, 12, 26, 22, self.FOCUS, "#201A0C", fm // 5, 5, "5", "60", "f"),
                (344, 30, 10, 8, self.REST, "#0C1C20", rm, 1, "1", "30", "r")):
            for i in range(n):
                yb = BAR_BOT - i * pitch
                els.append(div(x, yb - ch_, 36, ch_, col if i < val else ghost, r=3, cls=f"{zone}Blk{i}",
                               bind="background-color = i < 값"))
            top = BAR_BOT - n * pitch
            els += [text(x - 12, top - 22, 60, 20, hi, 15, "#6B6B6B", 700, cls=f"{zone}Max"),
                    text(x - 12, 390, 60, 20, lo, 15, "#6B6B6B", 700, cls=f"{zone}Min")]
        els += [text(54, 370, 76, 36, "REPEAT", 17, "#BDBDBD", 800, "left", cls="repLab"),
                div(130, 371, 50, 28, None, r=6, bw=3, bc=self.FRAME, cls="tog"),
                text(130, 371, 50, 28, "ON" if rep else "OFF", 15, self.REST if rep else "#6B6B6B", 800, cls="togTxt", bind="글자/color = ON/OFF"),
                div(136, 436, 160, 48, None, r=10, bw=3, bc=self.FOCUS, cls="start"),
                text(136, 436, 160, 48, "START", 24, self.FOCUS, 800, cls="startTxt")]
        return els



# ---- 6. TOMATO (원조 토마토 주방 타이머) ----
class Tomato(Theme):
    id, name, ko = "06-tomato", "TOMATO", "토마토 주방 타이머"
    concept = ("시릴로의 토마토 타이머 그대로: 0~55 숫자가 찍힌 60분 다이얼, 아래 고정 표시핀, 위 꼭지·잎. "
               "남은 분만큼 흰 눈금이 핀에서부터 켜지고, 휴식은 초록 토마토.")
    approach = ("CSS만(회전 없음). 토마토 몸통 원(div border-radius), 홈 원(border), 분 눈금 점 div 60개(5분마다 큰 점)의 "
                "background-color, 숫자 12개·꼭지/잎 div 는 고정. 1분마다 점 색만 바뀌고 매초는 시간 text 만 바뀐다.")
    RED, RED_DARK, GRN, GRN_DARK = "#E5392B", "#8E1E14", "#2E9B44", "#155C25"
    LEAF, LEAF_REST, WHITE = "#1E4D24", "#0F3315", "#FFFFFF"
    CX, CY, RB, RT, RN = 216, 282, 184, 152, 120   # 몸통 반지름, 눈금 반지름, 숫자 반지름

    def ang(self, m):
        """0분 = 6시(아래 고정 핀), 분이 늘수록 시계 반대 방향(사진에서 0 오른쪽이 5, 10 … 왼쪽이 55, 50)."""
        return math.radians(90 - m * 6)

    def pos(self, m, r):
        a = self.ang(m)
        return self.CX + r * math.cos(a), self.CY + r * math.sin(a)

    def calyx(self, col, cx=216, top=48, s=1.0):
        """꼭지 + 별 모양 꽃받침. 회전 없이: 잎 하나 = 점점 작아지는 원 div 사슬(어느 각도든 원만으로 그릴 수 있다)."""
        els = []
        ccx, ccy = cx, top + 40 * s
        for j, (deg, ln) in enumerate(((176, 60), (4, 60), (138, 54), (42, 54), (92, 24))):
            a = math.radians(deg)
            n = 8
            for k in range(n):
                t = (k + 1) / n
                rr = (10 - 7 * t) * s
                x, y = ccx + math.cos(a) * ln * t * s, ccy + math.sin(a) * ln * t * s
                els.append(div(round(x - rr), round(y - rr), round(2 * rr), round(2 * rr), col, r=rr, cls=f"sepal{j}_{k}"))
        els.append(div(round(ccx - 16 * s), round(ccy - 11 * s), round(32 * s), round(22 * s), col, r=11 * s, cls="calyxC"))
        els.append(div(round(ccx - 5 * s), round(top), round(10 * s), round(34 * s), col, r=4 * s, cls="stem"))
        return els

    def timer(self, phase, rem, tot):
        focus = phase == "focus"
        body, dark = (self.RED, self.RED_DARK) if focus else (self.GRN, self.GRN_DARK)
        cx, cy = self.CX, self.CY
        els = [div(cx - self.RB, cy - self.RB, 2 * self.RB, 2 * self.RB, body, r=self.RB, cls="body", bind="background-color = 구간 색(빨강/초록)"),
               div(cx - 136, cy - 136, 272, 272, None, r=136, bw=3, bc=dark, cls="groove")]
        lit = math.ceil(rem / 60)            # 남은 분(올림) = 0 에서부터 켜지는 눈금 수 (60분 다이얼, 사진처럼 절대 분)
        for m in range(60):
            big = m % 5 == 0
            d = 14 if big else 8
            x, y = self.pos(m, self.RT)
            on = 0 < m <= lit or (m == 0 and lit > 0)
            els.append(div(round(x - d / 2), round(y - d / 2), d, d, self.WHITE if on else dark, r=d / 2, cls=f"tick{m}",
                           bind="background-color = m ≤ 남은 분 ? 흰색 : 어두운 색"))
        dimnum = "#F4A097" if focus else "#9ED9AA"
        for m in range(0, 60, 5):
            x, y = self.pos(m, self.RN)
            els.append(text(round(x - 24), round(y - 14), 48, 28, str(m), 22, self.WHITE if m <= lit else dimnum, 800,
                            cls=f"num{m}", bind="color = m ≤ 남은 분 ? 흰색 : 흐린 색"))
        for k, w in enumerate((4, 8, 12, 16, 20)):   # 고정 표시핀 ▲ (가로 막대 5줄로 만든 삼각형, 사진의 흰 삼각형)
            els.append(div(cx - w // 2, cy + self.RB - 22 + k * 3, w, 3, self.WHITE, cls=f"pin{k}"))
        els += self.calyx(self.LEAF if focus else self.LEAF_REST, top=62)
        els += [text(cx - 100, cy - 66, 200, 34, "FOCUS" if focus else "REST", 26, self.WHITE, 800, cls="label", bind="글자 = FOCUS/REST"),
                text(cx - 110, cy - 36, 220, 80, f"{rem // 60:02d}:{rem % 60:02d}", 68, self.WHITE, 800, cls="time", bind="글자 = MM:SS"),
                text(cx - 100, cy + 44, 200, 28, f"{tot // 60} MIN", 20, "#FFD9D4" if focus else "#D4F5DC", 700, cls="total")]
        return els

    def settings(self, fm, rm, rep):
        els = []
        for (lab, y, col, val, num_y, num_h, zone) in (("FOCUS", 62, self.RED, fm, 104, 104, "focus"),
                                                        ("REST", 222, self.GRN, rm, 262, 84, "rest")):
            els += [div(48, y + 6, 22, 22, col, r=11, cls=f"{zone}Dot"),
                    text(78, y, 130, 32, lab, 26, col, 800, "left", cls=f"{zone}Lab"),
                    text(40, num_y, 140, num_h, p2(val), num_h - 8, "#FFFFFF", 800, "left", cls=f"{zone}Num", bind="글자 = 값"),
                    text(176, num_y + 6, 40, 34, "+", 30, "#8C8C8C", 700, cls=f"{zone}Up"),
                    text(176, num_y + num_h - 40, 40, 34, "−", 30, "#8C8C8C", 700, cls=f"{zone}Dn")]
        for (x, top, col, dark, val, vmax, n, lo, hi, zone) in ((248, F_TOP, self.RED, "#3A100C", fm, 60, 12, "5", "60", "f"),
                                                                 (344, R_TOP, self.GRN, "#0E2E16", rm, 30, 6, "1", "30", "r")):
            hh = BAR_BOT - top
            fh = round(hh * val / vmax)
            els += [div(x, top, 36, hh, dark, r=18, cls=f"{zone}Track"),
                    div(x, BAR_BOT - fh, 36, fh, col, r=18, cls=f"{zone}Fill", bind="height = 값/최대 × 막대 높이")]
            for k in range(1, n):        # 다이얼 눈금처럼: 집중 5분마다, 휴식 5분마다 작은 흰 점 (고정)
                yy = BAR_BOT - hh * k / n
                els.append(div(x + 15, round(yy - 3), 6, 6, "#FFFFFF", r=3, op=0.55, cls=f"{zone}Tick{k}"))
            els += [text(x - 12, top - 26, 60, 20, hi, 15, "#8C8C8C", 600, cls=f"{zone}Max"),
                    text(x - 12, 390, 60, 20, lo, 15, "#8C8C8C", 600, cls=f"{zone}Min")]
        els += [text(54, 370, 76, 36, "REPEAT", 17, "#FFFFFF", 800, "left", cls="repLab"),
                div(130, 369, 50, 32, self.GRN if rep else "#333333", r=16, cls="tog", bind="background-color = ON/OFF"),
                div(154 if rep else 134, 373, 24, 24, "#FFFFFF", r=12, cls="knob", bind="left = ON 154 / OFF 134"),
                text(184, 372, 32, 28, "ON" if rep else "OFF", 14, self.GRN if rep else "#8C8C8C", 700, "left", cls="togTxt"),
                div(136, 440, 160, 44, self.RED, r=22, cls="start"),
                text(136, 440, 160, 44, "START", 24, "#FFFFFF", 800, cls="startTxt")]
        els += self.calyx(self.LEAF, cx=216, top=424, s=0.42)   # START 위 작은 꼭지 (터치 영역 start 안)
        return els


# ---- 7. VISUAL (사각 비주얼 타이머 — 사용자 사진) ----
def img(x, y, w, h, src, cls="", bind=""):
    return dict(k="img", x=x, y=y, w=w, h=h, src=src, cls=cls, bind=bind)


class Visual(Theme):
    id, name, ko = "07-visual", "VISUAL", "사각 비주얼 타이머"
    concept = ("사용자 사진의 사각 비주얼 타이머: 연분홍 베젤 안 흰 다이얼, 12시 0부터 시계 방향 0~55 숫자·60분 눈금, "
               "남은 시간만큼 빨간 부채꼴(휴식은 초록)이 줄어들고 가운데 분홍 노브에 남은 시간.")
    css = False
    approach = ("CSS + PNG. 베젤(화면 배경)·흰 다이얼·노브·글자는 div/text, 눈금·숫자·화살표는 고정 PNG 1장, "
                "부채꼴은 (a) 분 단위 프레임 PNG(집중 60 + 휴식 30)를 image src 로 교체. (b) transform: rotate 반원 3장 안은 README.")
    PINK, PINK_D, FACE, INK = "#F3B2AA", "#E0968C", "#FFFFFF", "#1A1A1A"
    RED, GRN, LAB = "#E8322B", "#2FA84F", "#7E2F2A"
    CX, CY, RS = 216, 256, 122            # 다이얼 중심, 부채꼴 반지름
    FACE_BOX = (18, 58, 396, 396, 56)     # x, y, w, h, radius
    SBOX = (CX - RS, CY - RS, 2 * RS, 2 * RS)

    # ---------- 리소스 ----------
    def wedge(self, deg, col, bg=(0, 0, 0, 0), ss=4):
        """단색 부채꼴: RGB 는 전부 같은 색, 모양은 알파(가장자리 안티에일리어싱)만 — PNG 가 가장 잘 압축된다."""
        n = 2 * self.RS
        m = Image.new("L", (n * ss, n * ss), 0)
        if deg > 0:
            d = ImageDraw.Draw(m)
            if deg >= 360:
                d.ellipse((0, 0, n * ss - 1, n * ss - 1), fill=255)
            else:
                d.pieslice((0, 0, n * ss - 1, n * ss - 1), -90, -90 + deg, fill=255)
        im = Image.new("RGBA", (n, n), rgb(col) + (0,))
        im.putalpha(m.resize((n, n), Image.BOX))
        return im

    def dial_png(self, ink, arrow, crop=True):
        """눈금 60개(5분 긴 눈금) + 숫자 0~55(12시 0, 시계 방향) + 0 옆 시계 방향 화살표. 투명 PNG."""
        ss = 4
        x0, y0, w, h, _ = self.FACE_BOX
        im = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        cx, cy = (self.CX - x0) * ss, (self.CY - y0) * ss
        col = rgb(ink) + (255,)
        for m in range(60):
            a = math.radians(-90 + m * 6)
            r0, wd = (126, 3.4) if m % 5 == 0 else (135, 2.0)
            d.line([(cx + r0 * ss * math.cos(a), cy + r0 * ss * math.sin(a)),
                    (cx + 147 * ss * math.cos(a), cy + 147 * ss * math.sin(a))], fill=col, width=round(wd * ss))
        f = ImageFont.truetype(FONT_SYS, 25 * ss)
        f.set_variation_by_axes([800, 100])
        for m in range(0, 60, 5):
            a = math.radians(-90 + m * 6)
            tx, ty = cx + 171 * ss * math.cos(a), cy + 171 * ss * math.sin(a)
            d.text((tx, ty), str(m), font=f, fill=col, anchor="mm")
        ac = rgb(arrow) + (255,)
        ra = 171 * ss
        d.arc((cx - ra, cy - ra, cx + ra, cy + ra), -90 + 9, -90 + 20, fill=ac, width=round(2.6 * ss))
        a = math.radians(-90 + 22)
        tip = (cx + ra * math.cos(a), cy + ra * math.sin(a))
        b = math.radians(-90 + 17)
        for dr in (-7, 7):
            d.line([tip, (cx + (ra + dr * ss) * math.cos(b), cy + (ra + dr * ss) * math.sin(b))], fill=ac, width=round(2.6 * ss))
        im = im.resize((w, h), Image.LANCZOS)
        return im.crop(im.getbbox()) if crop else im

    def build_assets(self, out):
        """(a) 분 단위 부채꼴 프레임: 같은 image 노드에서 src 만 바꾸므로 모두 같은 영역(부채꼴 원의 bbox)으로 잘라 저장.
        저장은 앱 글자 레이어와 같은 방식(RGBA, PNG optimize, 팔레트 없음)."""
        import io
        a = os.path.join(out, "assets")
        for sub in ("sector-focus", "sector-rest", "rotate"):
            os.makedirs(os.path.join(a, sub), exist_ok=True)
        sizes = {"focus": [], "rest": []}
        for m in range(1, 61):
            fn = os.path.join(a, "sector-focus", f"f{m:02d}.png")
            self.wedge(m * 6, self.RED).save(fn, format="PNG", optimize=True)
            sizes["focus"].append(os.path.getsize(fn))
        for m in range(1, 31):
            fn = os.path.join(a, "sector-rest", f"r{m:02d}.png")
            self.wedge(m * 6, self.GRN).save(fn, format="PNG", optimize=True)
            sizes["rest"].append(os.path.getsize(fn))
        dial = self.dial_png(self.INK, "#555555")
        dial.save(os.path.join(a, "dial.png"), format="PNG", optimize=True)
        dial_dark = self.dial_png("#E6E6E6", "#9A9A9A")
        dial_dark.save(os.path.join(a, "dial-dark.png"), format="PNG", optimize=True)
        # (b) 회전용 반원 3장 (오른쪽 반원, 회전 중심 = 왼쪽 가장자리 가운데)
        halves = {}
        for nm, col in (("half-red", self.RED), ("half-green", self.GRN), ("half-white", self.FACE)):
            hd = self.wedge(180, col)
            hd = hd.crop((self.RS, 0, 2 * self.RS, 2 * self.RS))
            hd.save(os.path.join(a, "rotate", nm + ".png"), format="PNG", optimize=True)
            halves[nm] = os.path.getsize(os.path.join(a, "rotate", nm + ".png"))

        def mem(im, **kw):
            b = io.BytesIO()
            im.save(b, format="PNG", optimize=True, **kw)
            return b.tell()
        # 더 촘촘한 프레임(측정만, 파일로 남기지 않음): 1° = 10초마다 360장
        deg1 = [mem(self.wedge(k, self.RED)) for k in range(1, 361)]
        pal = [mem(self.wedge(m * 6, self.RED).quantize(16, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE))
               for m in range(1, 61)]
        dsz = os.path.getsize(os.path.join(a, "dial.png"))
        return {
            "sectorBox": list(self.SBOX),
            "a_perMinute": {"focusFrames": 60, "focusBytes": sum(sizes["focus"]), "restFrames": 30, "restBytes": sum(sizes["rest"]),
                            "frameMinMax": [min(sizes["focus"]), max(sizes["focus"])], "frameSize": [2 * self.RS, 2 * self.RS],
                            "dialPng": [list(dial.size), dsz], "dialDarkPng": [list(dial_dark.size), os.path.getsize(os.path.join(a, "dial-dark.png"))],
                            "palette16_focus60Bytes": sum(pal)},
            "a_per10s_measuredInMemory": {"frames": 360, "bytes": sum(deg1)},
            "a_perSecond_estimate": {"frames": 3600, "bytes": round(sum(deg1) / 360 * 3600)},
            "b_rotate": {"pngs": {k + ".png": v for k, v in halves.items()}, "halfSize": [self.RS, 2 * self.RS]},
            "_sizes": sizes}

    def b_simulate(self, out):
        """(b) 구조를 PIL 로 흉내 내서 (a) 와 같은 그림이 되는지 확인: 흰 바탕 위 R(빨강 반원 고정) + M(흰 반원, θ 회전, θ≤180)
        + C(빨강 반원, θ−180 회전, θ>180). 중심 기준 회전."""
        n = 2 * self.RS
        res = {}
        for deg in (12, 75, 150, 179, 181, 250, 359):
            base = Image.new("RGBA", (n, n), (255, 255, 255, 255))
            half = {k: Image.open(os.path.join(out, "assets", "rotate", k + ".png")).convert("RGBA") for k in ("half-red", "half-white")}

            def put(h, rot):
                lay = Image.new("RGBA", (n, n), (0, 0, 0, 0))
                lay.paste(h, (self.RS, 0))
                lay = lay.rotate(-rot, resample=Image.BICUBIC, center=(self.RS, self.RS))
                base.alpha_composite(lay)
            put(half["half-red"], 0)
            if deg <= 180:
                put(half["half-white"], deg)
            else:
                put(half["half-red"], deg - 180)
            ref = Image.new("RGBA", (n, n), (255, 255, 255, 255))
            ref.alpha_composite(self.wedge(deg, self.RED))
            from PIL import ImageChops as IC
            diff = IC.difference(base.convert("RGB"), ref.convert("RGB")).convert("L")
            hist = diff.histogram()
            res[str(deg)] = {"pixelsDiffOver64": sum(hist[65:]), "meanDiff": round(sum(i * v for i, v in enumerate(hist)) / (n * n), 3)}
        return res

    # ---------- 화면 ----------
    def timer(self, phase, rem, tot, dark=False):
        focus = phase == "focus"
        mins = math.ceil(rem / 60)
        x0, y0, w, h, r = self.FACE_BOX
        pink = "#000000" if dark else self.PINK
        els = [div(0, 0, W, H, pink, cls="bezel"),
               div(x0, y0, w, h, "#141414" if dark else self.FACE, r=r, cls="face")]
        if mins:
            sub, pre = ("sector-focus", "f") if focus else ("sector-rest", "r")
            els.append(img(*self.SBOX, f"assets/{sub}/{pre}{mins:02d}.png", cls="sector",
                           bind="src = 구간별 폴더 / ceil(남은 초/60) 번 프레임 (0 이면 숨김)"))
        dpath = "assets/dial-dark.png" if dark else "assets/dial.png"
        dw, dh = Image.open(os.path.join(HERE, self.id, dpath)).size
        dx, dy = self.dial_xy(dark)
        els.append(img(dx, dy, dw, dh, dpath, cls="dial"))
        kr = 54
        els += [div(self.CX - kr, self.CY - kr, 2 * kr, 2 * kr, "#2A2A2A" if dark else self.PINK, r=kr, bw=3,
                    bc="#4A4A4A" if dark else self.PINK_D, cls="knob"),
                text(self.CX - kr, self.CY - 18, 2 * kr, 36, f"{rem // 60:02d}:{rem % 60:02d}", 27,
                     "#FFFFFF" if dark else "#3A1714", 800, cls="time", bind="글자 = MM:SS"),
                div(152, 22, 18, 18, self.RED if focus else self.GRN, r=9, cls="phaseDot", bind="background-color = 구간 색"),
                text(176, 14, 120, 34, "FOCUS" if focus else "REST", 24, "#FFFFFF" if dark else self.LAB, 800, "left",
                     cls="label", bind="글자 = FOCUS/REST"),
                div(186, 466, 60, 10, "#333333" if dark else self.PINK_D, r=5, cls="notch")]
        return els

    def dial_xy(self, dark=False):
        return self._dxy_dark if dark else self._dxy

    def settings(self, fm, rm, rep):
        x0, y0, w, h, r = 18, 44, 396, 374, 48
        els = [div(0, 0, W, H, self.PINK, cls="bezel"), div(x0, y0, w, h, self.FACE, r=r, cls="face")]
        for (lab, y, col, val, num_y, num_h, zone) in (("FOCUS", 62, self.RED, fm, 104, 104, "focus"),
                                                        ("REST", 222, self.GRN, rm, 262, 84, "rest")):
            els += [div(48, y + 7, 20, 20, col, r=10, cls=f"{zone}Dot"),
                    text(76, y, 130, 32, lab, 24, col, 800, "left", cls=f"{zone}Lab"),
                    text(40, num_y, 140, num_h, p2(val), num_h - 8, self.INK, 800, "left", cls=f"{zone}Num", bind="글자 = 값"),
                    text(176, num_y + 6, 40, 34, "+", 30, "#9A9A9A", 700, cls=f"{zone}Up"),
                    text(176, num_y + num_h - 40, 40, 34, "−", 30, "#9A9A9A", 700, cls=f"{zone}Dn")]
        for (x, top, col, val, vmax, n, lo, hi, zone) in ((248, F_TOP, self.RED, fm, 60, 12, "5", "60", "f"),
                                                           (344, R_TOP, self.GRN, rm, 30, 30, "1", "30", "r")):
            hh = BAR_BOT - top
            fh = round(hh * val / vmax)
            els += [div(x, top, 36, hh, "#EFE7E6", r=18, cls=f"{zone}Track"),
                    div(x, BAR_BOT - fh, 36, fh, col, r=18, cls=f"{zone}Fill", bind="height = 값/최대 × 막대 높이")]
            for k in range(1, n):        # 다이얼처럼 막대 오른쪽에 검정 눈금 (집중 5분마다, 휴식 1분 짧게·5분 길게)
                yy = BAR_BOT - hh * k / n
                long_ = zone == "f" or k % 5 == 0
                els.append(div(x + 40, round(yy - 1), 10 if long_ else 5, 2, self.INK, cls=f"{zone}Tick{k}"))
            els += [text(x - 12, top - 26, 60, 20, hi, 15, "#666666", 700, cls=f"{zone}Max"),
                    text(x - 12, 388, 60, 20, lo, 15, "#666666", 700, cls=f"{zone}Min")]
        els += [text(54, 370, 76, 36, "REPEAT", 17, self.INK, 800, "left", cls="repLab"),
                div(130, 369, 50, 32, self.GRN if rep else "#CFCFCF", r=16, cls="tog", bind="background-color = ON/OFF"),
                div(154 if rep else 134, 373, 24, 24, "#FFFFFF", r=12, cls="knob", bind="left = ON 154 / OFF 134"),
                text(184, 372, 32, 28, "ON" if rep else "OFF", 14, self.GRN if rep else "#888888", 700, "left", cls="togTxt"),
                div(136, 436, 160, 48, self.RED, r=24, cls="start"),
                text(136, 436, 160, 48, "START", 24, "#FFFFFF", 800, cls="startTxt"),
                div(186, 492, 60, 8, self.PINK_D, r=4, cls="notch")]
        return els

    def build(self, out):
        info = self.build_assets(out)
        self._dxy = self._dial_offset(self.INK, "#555555")
        self._dxy_dark = self._dial_offset("#E6E6E6", "#9A9A9A")
        shots = {fn: self.timer(ph, rem, tot) for fn, ph, rem, tot in CASES}
        shots["settings"] = self.settings(25, 5, True)
        shots_dark = {"focus-mid-dark": self.timer("focus", 750, 1500, dark=True)}
        for fn, els in list(shots.items()) + list(shots_dark.items()):
            render(els, "#000000", base=out).save(os.path.join(out, fn + ".png"), optimize=True)
        tpl_t, css_t = ux_snippet(shots["focus-mid"], "t")
        tpl_s, css_s = ux_snippet(shots["settings"], "s")
        snip = f"<!-- {self.name}: 타이머 (부채꼴 = (a) 프레임 image) -->\n{tpl_t}\n<!-- 설정 -->\n{tpl_s}\n<style>\n{css_t}\n{css_s}\n</style>\n"
        with open(os.path.join(out, "theme.ux.txt"), "w") as fp:
            fp.write(snip)
        raw = snip.encode()
        with open(os.path.join(out, "elements.json"), "w") as fp:
            json.dump(dict(shots, **shots_dark), fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        info["b_simulation"] = self.b_simulate(out)
        a = info["a_perMinute"]
        layout = {k: v for k, v in info.items() if not k.startswith("_")}
        layout.update({"dialCenter": [self.CX, self.CY], "sectorRadius": self.RS, "faceBox": list(self.FACE_BOX),
                       "dialImage": {"left": self._dxy[0], "top": self._dxy[1], "size": a["dialPng"][0]},
                       "frameRule": "focus: assets/sector-focus/fNN.png, rest: assets/sector-rest/rNN.png, NN = ceil(남은 초/60), 0 이면 숨김. "
                                    "다이얼은 절대 60분(1분 = 6°, 12시 0 에서 시계 방향).",
                       "colors": {"bezel": self.PINK, "bezelDark": self.PINK_D, "face": self.FACE, "ink": self.INK,
                                  "focus": self.RED, "rest": self.GRN, "label": self.LAB}})
        with open(os.path.join(out, "layout.json"), "w") as fp:
            json.dump(layout, fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        png_files = 60 + 30 + 1
        png_bytes = a["focusBytes"] + a["restBytes"] + a["dialPng"][1]
        return {"pngFiles": png_files, "pngBytes": png_bytes, "uxBytes": len(raw), "uxGzipBytes": len(gzip.compress(raw, 9, mtime=0)),
                "elements": {"timer": len(shots["focus-mid"]), "settings": len(shots["settings"])},
                "sizeLabel": f"CSS+PNG {png_files} files · {png_bytes / 1024:.0f} KB",
                "sector": {k: v for k, v in info.items() if not k.startswith("_")},
                "cornerPixelsOutside": {fn: safe_check(render([e for e in els if e["cls"] not in BLEED], "#000000", base=out))
                                        for fn, els in shots.items()}}

    def _dial_offset(self, ink, arrow):
        """dial_png 이 잘라 낸 bbox 의 화면 좌표 (자르지 않은 같은 그림의 bbox)."""
        x0, y0, w, h, _ = self.FACE_BOX
        im = self.dial_png(ink, arrow, crop=False)
        bb = im.getbbox()
        return (x0 + bb[0], y0 + bb[1])


# ---- 8. SWEEP (SAND 생김새 + VISUAL 움직임) ----
class Sweep(Theme):
    id, name, ko = "08-sweep", "SWEEP", "부채꼴 스윕"
    concept = ("SAND 처럼 검정 바탕을 집중 빨강·휴식 초록이 화면 끝까지 채우고, 12시에서 시계 방향 부채꼴로 줄어든다. "
               "한 바퀴 = 세션 길이, 가운데 큰 흰 MM:SS, 위 FOCUS/REST, 아래 25 MIN, 둘레 12칸 점 눈금.")
    css = False
    timer_only = True
    approach = ("PNG(a) 또는 rotate(b). 색 부채꼴은 (a) 화면 전체 프레임 60장/구간(1칸 = 세션의 1/60, 6°)을 image src 로 교체. "
                "글자·둘레 점 눈금은 SAND 와 같은 CSS text/div. (b) 는 회전 div 3~4개(이미지 0) — README.")
    FOCUS, REST = Sand.FOCUS, Sand.REST
    LINE = Sand.LINE
    CX, CY = W // 2, 257
    RR = math.ceil(math.hypot(W / 2, 257)) + 2     # 화면 모서리까지 덮는 반지름 (= 340)
    N = 60

    def frame(self, k, phase, ss=2):
        """k/N 만큼 남은 부채꼴(12시에서 시계 방향) + 움직이는 쪽 가장자리 밝은 선 4px. 검정 바탕 불투명 RGB, 화면 전체 크기."""
        im = Image.new("RGB", (W * ss, H * ss), (0, 0, 0))
        if k <= 0:
            return im.resize((W, H), Image.BOX)
        d = ImageDraw.Draw(im)
        cx, cy, r = self.CX * ss, self.CY * ss, self.RR * ss
        col = rgb(self.FOCUS if phase == "focus" else self.REST)
        deg = 360 * k / self.N
        if k >= self.N:
            d.rectangle((0, 0, W * ss, H * ss), fill=col)
        else:
            d.pieslice((cx - r, cy - r, cx + r, cy + r), -90, -90 + deg, fill=col)
            a = math.radians(-90 + deg)
            d.line([(cx, cy), (cx + r * math.cos(a), cy + r * math.sin(a))], fill=rgb(self.LINE[phase]), width=4 * ss)
        return im.resize((W, H), Image.BOX)

    def edge_dots(self):
        """둘레 점 눈금 12개(세션의 1/12 마다): 중심에서 나간 선이 둥근 화면을 14px 안쪽에서 만나는 곳. 회전 없이 원 div."""
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).rounded_rectangle((14, 14, W - 15, H - 15), radius=R - 14, fill=255)
        px = m.load()
        out = []
        for j in range(12):
            a = math.radians(-90 + j * 30)
            t = 0.0
            while True:
                x, y = self.CX + (t + 1) * math.cos(a), self.CY + (t + 1) * math.sin(a)
                if not (0 <= x < W and 0 <= y < H) or px[int(x), int(y)] == 0:
                    break
                t += 1
            out.append((self.CX + t * math.cos(a), self.CY + t * math.sin(a)))
        return out

    def timer(self, phase, rem, tot, shot_dir=None):
        k = math.ceil(rem / tot * self.N)
        pre = "f" if phase == "focus" else "r"
        els = []
        if k:
            els.append(img(0, 0, W, H, f"assets/sweep-{phase}/{pre}{k:02d}.png", cls="sweep",
                           bind=f"src = ceil(남은/전체 × {self.N}) 번 프레임 (0 이면 숨김)"))
        for j, (x, y) in enumerate(self.edge_dots()):
            d = 8 if j % 3 == 0 else 6
            els.append(div(round(x - d / 2), round(y - d / 2), d, d, "#9A9A9A", r=d / 2, cls=f"tick{j}"))
        lab = "FOCUS" if phase == "focus" else "REST"
        els += [text(66, 150, 300, 40, lab, 30, "#FFFFFF", 800, outline=True, cls="label", bind="글자 = FOCUS/REST"),
                text(16, 196, 400, 120, f"{rem // 60:02d}:{rem % 60:02d}", 104, "#FFFFFF", 800, outline=True, cls="time", bind="글자 = MM:SS"),
                text(66, 318, 300, 34, f"{tot // 60} MIN", 24, "#FFFFFF", 600, outline=True, cls="total")]
        return els

    def b_sim(self, deg, phase="focus"):
        """(b) 구조 흉내: 검정 위 A(색 직사각형 340×680, 오른쪽 반, 고정) + M(검정 직사각형, θ 회전, θ≤180) + B(색 직사각형, θ−180 회전, θ>180)."""
        ss = 2
        big = Image.new("RGB", (2 * self.RR * ss, 2 * self.RR * ss), (0, 0, 0))
        col = rgb(self.FOCUS if phase == "focus" else self.REST)

        def put(color, rot):
            lay = Image.new("RGBA", big.size, (0, 0, 0, 0))
            ImageDraw.Draw(lay).rectangle((self.RR * ss, 0, 2 * self.RR * ss, 2 * self.RR * ss), fill=color + (255,))
            lay = lay.rotate(-rot, resample=Image.BICUBIC, center=(self.RR * ss, self.RR * ss))
            big.paste(lay, (0, 0), lay)
        if deg > 0:
            put(col, 0)
            if deg <= 180:
                put((0, 0, 0), deg)
            else:
                put(col, deg - 180)
        ox, oy = (self.RR - self.CX) * ss, (self.RR - self.CY) * ss
        return big.crop((ox, oy, ox + W * ss, oy + H * ss)).resize((W, H), Image.BOX)

    def build(self, out):
        import io
        from PIL import ImageChops as IC
        sizes = {}
        for phase, pre in (("focus", "f"), ("rest", "r")):
            dd = os.path.join(out, "assets", f"sweep-{phase}")
            os.makedirs(dd, exist_ok=True)
            sizes[phase] = []
            for k in range(1, self.N + 1):
                fn = os.path.join(dd, f"{pre}{k:02d}.png")
                self.frame(k, phase).save(fn, format="PNG", optimize=True)
                sizes[phase].append(os.path.getsize(fn))

        def mem(im):
            b = io.BytesIO()
            im.save(b, format="PNG", optimize=True)
            return b.tell()
        pal = sum(mem(self.frame(k, "focus").quantize(16, method=Image.Quantize.MAXCOVERAGE, dither=Image.Dither.NONE))
                  for k in range(1, self.N + 1))
        fine = [mem(self.frame(k * self.N / 360, "focus")) for k in range(1, 361)]   # 1° 마다 360장 (메모리에서만)
        sim = {}
        for deg in (30, 150, 179, 181, 270, 354):
            ref = self.frame(deg / 6, "focus")
            # 가장자리 선은 (b) 에서 별도 div 라 비교에서 뺀다: 선 없는 기준을 다시 그림
            ref = Image.new("RGB", (W * 2, H * 2))
            ImageDraw.Draw(ref).pieslice((self.CX * 2 - self.RR * 2, self.CY * 2 - self.RR * 2, self.CX * 2 + self.RR * 2, self.CY * 2 + self.RR * 2),
                                         -90, -90 + deg, fill=rgb(self.FOCUS))
            ref = ref.resize((W, H), Image.BOX)
            hist = IC.difference(self.b_sim(deg), ref).convert("L").histogram()
            sim[str(deg)] = {"pixelsDiffOver64": sum(hist[65:]), "meanDiff": round(sum(i * v for i, v in enumerate(hist)) / (W * H), 3)}
        shots = {fn: self.timer(ph, rem, tot) for fn, ph, rem, tot in CASES}
        for fn, els in shots.items():
            render(els, "#000000", base=out).save(os.path.join(out, fn + ".png"), optimize=True)
        tpl_t, css_t = ux_snippet(shots["focus-mid"], "t")
        snip = f"<!-- {self.name}: 타이머 (부채꼴 = (a) 프레임 image). 설정 화면은 01 SAND 공통 -->\n{tpl_t}\n<style>\n{css_t}\n</style>\n"
        with open(os.path.join(out, "theme.ux.txt"), "w") as fp:
            fp.write(snip)
        with open(os.path.join(out, "elements.json"), "w") as fp:
            json.dump(shots, fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        raw = snip.encode()
        sector = {"a_frames": {"perPhase": self.N, "stepDeg": 360 / self.N, "frameSize": [W, H], "saved": "RGB 불투명 PNG optimize (검정 바탕), 팔레트 없음",
                               "focusBytes": sum(sizes["focus"]), "restBytes": sum(sizes["rest"]),
                               "frameMinMax": [min(sizes["focus"] + sizes["rest"]), max(sizes["focus"] + sizes["rest"])],
                               "palette16_focus60Bytes": pal},
                  "a_1deg_360_measuredInMemory": {"frames": 360, "bytes": sum(fine)},
                  "b_simulation": sim, "radiusToCover": self.RR, "center": [self.CX, self.CY],
                  "edgeDots": [[round(x, 1), round(y, 1)] for x, y in self.edge_dots()],
                  "frameRule": f"focus: assets/sweep-focus/fNN.png, rest: assets/sweep-rest/rNN.png, NN = ceil(남은 초 / 전체 초 × {self.N}), 0 이면 숨김. 한 바퀴 = 세션 길이."}
        with open(os.path.join(out, "layout.json"), "w") as fp:
            json.dump(sector, fp, indent=1, ensure_ascii=False)
            fp.write("\n")
        png_bytes = sum(sizes["focus"]) + sum(sizes["rest"])
        return {"pngFiles": 2 * self.N, "pngBytes": png_bytes, "uxBytes": len(raw), "uxGzipBytes": len(gzip.compress(raw, 9, mtime=0)),
                "elements": {"timer": len(shots["focus-mid"]), "settings": "01-sand 공통"},
                "sizeLabel": f"(a) PNG {2 * self.N} files · {png_bytes / 1024:.0f} KB / (b) 0 KB",
                "sector": sector,
                "cornerPixelsOutside": {fn: safe_check(render([e for e in els if e["cls"] not in BLEED], "#000000", base=out))
                                        for fn, els in shots.items()}}

BLEED = {"sand", "level", "bezel", "sweep"}
THEMES = [Sand(), Booster(), Battery(), Swiss(), Lcd(), Tomato(), Visual(), Sweep()]
FINAL = ["01-sand", "02-booster", "03-battery", "08-sweep"]   # 사용자가 고른 1·2·3 + 08 (06·07 은 보관)
SHARED_SETTINGS = "01-sand"   # 설정 화면은 테마별로 만들지 않고 모든 테마가 01 SAND 설정 하나를 쓴다 (워치 개발 결정)


# ---------------- CSS 조각(크기 추정용) ----------------
def ux_snippet(els, prefix):
    tpl, css = [], []
    for e in els:
        c = f"{prefix}-{e['cls']}"
        dyn = e["bind"]
        if e["k"] == "img":
            src = '{{' + c.replace("-", "_") + '}}' if dyn else "/common/theme/" + e["src"]
            tpl.append(f'<image class="{c}" src="{src}"></image>')
            p = [f"position: absolute", f"left: {e['x']}px", f"top: {e['y']}px", f"width: {e['w']}px", f"height: {e['h']}px"]
            css.append(f".{c} {{\n  " + ";\n  ".join(p) + ";\n}")
            continue
        if e["k"] == "div":
            st = ' style="{{' + c.replace("-", "_") + '}}"' if dyn else ""
            tpl.append(f'<div class="{c}"{st}></div>')
            p = [f"position: absolute", f"left: {round(e['x'])}px", f"top: {round(e['y'])}px", f"width: {round(e['w'])}px",
                 f"height: {round(e['h'])}px"]
            if e["bg"]:
                p.append(f"background-color: {e['bg']}")
            if e["bw"]:
                p += [f"border-width: {e['bw']}px", f"border-color: {e['bc']}"]
            if e["r"]:
                p.append(f"border-radius: {round(e['r'])}px")
        else:
            tpl.append(f'<text class="{c}">{{{{{c.replace("-", "_")}}}}}</text>' if dyn else f'<text class="{c}">{e["s"]}</text>')
            p = [f"position: absolute", f"left: {round(e['x'])}px", f"top: {round(e['y'])}px", f"width: {round(e['w'])}px",
                 f"height: {round(e['h'])}px", f"font-size: {e['size']}px", f"color: {e['color']}", f"text-align: {e['align']}"]
            if e["weight"] >= 700:
                p.append("font-weight: bold")
            if e["outline"]:
                p.append("text-shadow: -2px 0px 0px #000000, 2px 0px 0px #000000, 0px -2px 0px #000000, 0px 2px 0px #000000, 0px 0px 4px #000000")
        css.append(f".{c} {{\n  " + ";\n  ".join(p) + ";\n}")
    return "\n".join(tpl), "\n".join(css)


def safe_check(im):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle((4, 4, W - 5, H - 5), radius=R - 4, fill=255)
    lum = im.convert("L")
    bad = 0
    pm, pl = m.load(), lum.load()
    for y in range(H):
        for x in range(W):
            if pm[x, y] == 0 and pl[x, y] > 40:
                bad += 1
    return bad


def booster_previews(out):
    sys.path.insert(0, os.path.join(ROOT, "docs", "booster-design", "setup-final-thermo"))
    import gen_setup_thermo as T   # import 만 (main 은 src/ 에 쓰므로 부르지 않는다)
    Bm = T.B
    with open(os.path.join(ROOT, "scripts", "booster-layout.json")) as fp:
        bcss = json.load(fp)
    with open(os.path.join(ROOT, "scripts", "setup-layout.json")) as fp:
        scss = json.load(fp)
    for fn, phase, rem, tot in CASES:
        mode = "break" if phase == "rest" else "focus"
        im = Bm.compose(bcss, Bm.lit_of(mode, rem, tot), mode, rem // 60, rem % 60)
        im.save(os.path.join(out, fn + ".png"), optimize=True)
    T.compose(scss, 25, 5, True).save(os.path.join(out, "settings.png"), optimize=True)

    def dsize(d):
        return sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if f.endswith(".png")), \
            len([f for f in os.listdir(d) if f.endswith(".png")])
    b, nb = dsize(os.path.join(ROOT, "src", "common", "booster"))
    s, ns = dsize(os.path.join(ROOT, "src", "common", "setup"))
    return {"pngFiles": nb + ns, "pngBytes": b + s, "timerPng": [nb, b], "setupPng": [ns, s], "gaugeFrames": 37}


def main():
    infos = []
    for t in THEMES:
        out = os.path.join(HERE, t.id)
        os.makedirs(out, exist_ok=True)
        shots = {}
        info = {"id": t.id, "name": t.name, "ko": t.ko, "concept": t.concept, "approach": t.approach, "css": t.css}
        if hasattr(t, "build"):
            info.update(t.build(out))
            infos.append(info)
            continue
        if t.css:
            shots = {fn: t.timer(ph, rem, tot) for fn, ph, rem, tot in CASES}
            shots["settings"] = t.settings(25, 5, True)
            for fn, els in shots.items():
                render(els, t.bg).save(os.path.join(out, fn + ".png"), optimize=True)
            tpl_t, css_t = ux_snippet(shots["focus-mid"], "t")
            tpl_s, css_s = ux_snippet(shots["settings"], "s")
            snip = f"<!-- {t.name}: 타이머 -->\n{tpl_t}\n<!-- 설정 -->\n{tpl_s}\n<style>\n{css_t}\n{css_s}\n</style>\n"
            with open(os.path.join(out, "theme.ux.txt"), "w") as fp:
                fp.write(snip)
            raw = snip.encode()
            info.update({"pngFiles": 0, "pngBytes": 0, "uxBytes": len(raw), "uxGzipBytes": len(gzip.compress(raw, 9, mtime=0)),
                         "elements": {"timer": len(shots["focus-mid"]), "settings": len(shots["settings"])}})
            with open(os.path.join(out, "elements.json"), "w") as fp:
                json.dump({k: v for k, v in shots.items()}, fp, indent=1, ensure_ascii=False)
                fp.write("\n")
        else:
            info.update(booster_previews(out))
        if t.css:   # 화면 전체를 칠하는 바탕(SAND 의 .sand/.level)은 일부러 가장자리까지 가므로 빼고 검사
            info["cornerPixelsOutside"] = {fn: safe_check(render([e for e in els if e["cls"] not in BLEED], t.bg))
                                           for fn, els in shots.items()}
        else:       # BOOSTER 게이지는 원래 화면 전체 그림(둥근 화면에 잘림). 글자·네온만 따로 볼 수 없어 전체로 잼
            info["cornerPixelsOutside"] = {fn: safe_check(Image.open(os.path.join(out, fn + ".png")).convert("RGB"))
                                           for fn in ("focus-mid", "focus-late", "rest", "settings")}
        infos.append(info)
    with open(os.path.join(HERE, "themes.json"), "w") as fp:
        json.dump({"screen": [W, H], "cornerRadius": R, "touchZones": ZONES, "sharedSettings": {"theme": SHARED_SETTINGS, "png": SHARED_SETTINGS + "/settings.png", "note": "설정 화면은 테마별로 만들지 않고 모든 테마가 01 SAND 설정 하나를 쓴다"}, "finalCandidates": FINAL, "themes": infos}, fp, indent=1, ensure_ascii=False)
        fp.write("\n")
    overview([i for i in infos if i["id"] in [t.id for t in THEMES[:5]]], "overview.png", "BOOST FULL THEMES")
    overview([next(i for i in infos if i["id"] == k) for k in FINAL], "overview-final.png", "BOOST FINAL CANDIDATES", shared_settings=SHARED_SETTINGS)
    for i in infos:
        print(i["id"], i.get("uxBytes"), i.get("uxGzipBytes"), i.get("pngBytes"), i.get("elements"), i["cornerPixelsOutside"])


def overview(infos, fname, title, shared_settings=None):
    """shared_settings 가 있으면 설정 줄은 열마다가 아니라 그 테마의 설정 화면 한 칸(모든 테마 공통)만 그린다."""
    sc = 0.5
    cw, chh = int(W * sc), int(H * sc)
    pad, top = 16, 76
    rows = ["focus-mid", "focus-late", "rest"] + ([] if shared_settings else ["settings"])
    Wd = pad + len(infos) * (cw + pad)
    lab_h = 26
    Hd = top + len(rows) * (chh + pad) + 40 + ((lab_h + 12 + chh + pad) if shared_settings else 0)
    im = Image.new("RGB", (Wd, Hd), (24, 24, 26))
    d = ImageDraw.Draw(im)
    fb = ImageFont.truetype(FONT_LBL, 26)
    f20 = ImageFont.truetype(FONT_LBL, 20)
    fs = ImageFont.truetype(FONT_SYS, 13)
    d.text((pad, 12), title, font=fb, fill=(255, 255, 255))
    sub = ("432x514 · 50% · rows: FOCUS 12:30/25 · FOCUS 02:00/25 · REST 02:30/5" + ("" if shared_settings else " · SETUP 25/5"))
    d.text((pad + (260 if len(infos) > 4 else 320), 22 if len(infos) > 4 else 6), sub, font=fs, fill=(170, 170, 170))
    for c, inf in enumerate(infos):
        x = pad + c * (cw + pad)
        d.text((x, top - 28), f"{inf['id'][:2]}  {inf['name']}", font=f20, fill=(255, 255, 255))
        for r, fn in enumerate(rows):
            y = top + r * (chh + pad)
            im.paste(Image.open(os.path.join(HERE, inf["id"], fn + ".png")).convert("RGB").resize((cw, chh), Image.LANCZOS), (x, y))
        y = top + len(rows) * (chh + pad)
        sz = inf["sizeLabel"] if "sizeLabel" in inf else (f"CSS only · +{inf['uxGzipBytes'] / 1024:.1f} KB (gz)" if inf["css"]
              else f"PNG {inf['pngFiles']} files · {inf['pngBytes'] / 1024:.0f} KB")
        d.text((x, y + 2), sz, font=fs, fill=(170, 170, 170))
    if shared_settings:
        y = top + len(rows) * (chh + pad) + 40
        d.line([(pad, y - 10), (Wd - pad, y - 10)], fill=(70, 70, 74), width=1)
        d.text((pad, y), "SETTINGS (ALL THEMES)", font=f20, fill=(255, 255, 255))
        y += lab_h + 12
        im.paste(Image.open(os.path.join(HERE, shared_settings, "settings.png")).convert("RGB").resize((cw, chh), Image.LANCZOS), (pad, y))
        x = pad + cw + pad
        for i, line in enumerate((f"One shared settings screen for every theme: {shared_settings} (SAND).",
                                  "Settings are no longer designed per theme.",
                                  "THERMO touch zones (setup-final-thermo/touch-zones.json).",
                                  "Shown: FOCUS 25 · REST 5 · REPEAT ON")):
            d.text((x, y + 8 + i * 22), line, font=fs, fill=(200, 200, 200) if i == 0 else (150, 150, 150))
    im.save(os.path.join(HERE, fname), optimize=True)


if __name__ == "__main__":
    main()
