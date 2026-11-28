#!/usr/bin/env python3
"""src/pages/index/index.ux 의 <template> 과 <style> 을 디자인 기준 좌표로 만든다(0.1.9, 0.1.10 테마 순서·재개 안내).

- 설정 화면: docs/full-theme-design/settings-merged/A-final/settings.ux.txt 의 m-* 클래스를 그대로 가져오고
  (눈금 opacity 0.45 는 elements.json 값), 휴식 관 끌기 테두리(m-restActive)와 왼쪽 아래 톱니 버튼(m-gear*)을 더한다.
- 테마 타이머: 01-sand / 03-battery / 08-sweep 의 theme.ux.txt 좌표(SWEEP 은 (b) rotate 구조 + (a) 프레임 image).
- BOOSTER 타이머 CSS 는 0.1.8 그대로(scripts/booster-layout.json, test 가 확인).
- 테마 고르기 화면(view 'themes')은 0.1.9 에서 새로 만든 간단한 목록.
<script> 는 index.ux 에 손으로 쓴 것을 그대로 둔다(이 스크립트는 template/style 만 바꾼다).
"""
from __future__ import annotations

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FTD = os.path.join(ROOT, "docs", "full-theme-design")
UX = os.path.join(ROOT, "src", "pages", "index", "index.ux")
BOOSTER_CSS_MARK = ".gauge {"

OUTLINE = "text-shadow: -2px 0px 0px #000000, 2px 0px 0px #000000, 0px -2px 0px #000000, 0px 2px 0px #000000, 0px 0px 4px #000000;"


def css_blocks(path):
    s = open(path, encoding="utf8").read()
    st = s[s.index("<style>") + 7: s.index("</style>")]
    return {m.group(1): m.group(2).strip() for m in re.finditer(r"\.([\w-]+) \{([^}]*)\}", st)}


def block(cls, body):
    lines = [ln.strip() for ln in body.strip().splitlines() if ln.strip()]
    return "." + cls + " {\n" + "\n".join("  " + ln for ln in lines) + "\n}"


def props(**kw):
    return "\n".join(f"{k.replace('_', '-')}: {v};" for k, v in kw.items())


def main():
    A = css_blocks(os.path.join(FTD, "settings-merged", "A-final", "settings.ux.txt"))
    el = json.load(open(os.path.join(FTD, "settings-merged", "A-final", "elements.json"), encoding="utf8"))
    tick_op = {e["cls"]: e["op"] for e in el["default"] if "Tick" in e["cls"]}
    SAND = css_blocks(os.path.join(FTD, "01-sand", "theme.ux.txt"))
    BAT = css_blocks(os.path.join(FTD, "03-battery", "theme.ux.txt"))
    SW = css_blocks(os.path.join(FTD, "08-sweep", "theme.ux.txt"))

    css = []
    # ---------- 설정(A-final) ----------
    for cls, body in A.items():
        name = cls[2:]
        if name in ("focusFill", "restFill", "tog", "knob", "start", "repLab"):
            # 바뀌는 값(top/height, 색, left)은 style 바인딩이 덮는다. 기본값은 시안 그대로 둔다.
            pass
        if "Tick" in name and tick_op.get(name, 1.0) != 1.0:
            body = body + f"\nopacity: {tick_op[name]};"
        css.append(block(cls, body))
    fa = A["m-focusActive"]
    css.append(block("m-restActive", fa.replace("left: 41px", "left: 221px")))
    # 톱니 버튼: START 와 같은 높이 56px(440~496), 지름 56 원. 그려진 원은 모서리 원(80,434)에서 34px(+반지름 28 = 62 ≤ 76)
    css.append(block("m-gear", props(position="absolute", left="52px", top="440px", width="56px", height="56px",
                                       background_color="#262626", border_radius="28px")))
    css.append(block("m-gearIcon", props(position="absolute", left="64px", top="452px", width="32px", height="32px")))

    # ---------- 테마 고르기 ----------
    css.append(block("th-title", props(position="absolute", left="66px", top="36px", width="300px", height="44px",
                                         font_size="30px", color="#FFFFFF", text_align="center", font_weight="bold")))
    for i in range(4):
        top = 96 + 88 * i
        css.append(block(f"th-row{i}", props(position="absolute", left="40px", top=f"{top}px", width="352px", height="80px",
                                              background_color="#1A1A1A", border_width="3px", border_color="#1A1A1A",
                                              border_radius="20px")))
        css.append(block(f"th-thumb{i}", props(position="absolute", left="56px", top=f"{top + 8}px", width="54px", height="64px")))
        css.append(block(f"th-name{i}", props(position="absolute", left="126px", top=f"{top + 12}px", width="200px", height="34px",
                                               font_size="28px", color="#FFFFFF", text_align="left", font_weight="bold")))
        css.append(block(f"th-sub{i}", props(position="absolute", left="126px", top=f"{top + 46}px", width="200px", height="22px",
                                              font_size="16px", color="#8C8C8C", text_align="left")))
        css.append(block(f"th-mark{i}", props(position="absolute", left="336px", top=f"{top + 18}px", width="40px", height="44px",
                                               font_size="34px", color="#3DDC84", text_align="center", font_weight="bold")))

    # ---------- SAND ----------
    for cls in ("t-sand", "t-level", "t-tick1", "t-tick2", "t-tick3", "t-tick4", "t-label", "t-time", "t-total"):
        css.append(block("sd-" + cls[2:] if cls.startswith("t-tick") or cls in ("t-sand", "t-level") else cls, SAND[cls]))
    # ---------- BATTERY ----------
    for cls, body in BAT.items():
        if cls.startswith("t-"):
            css.append(block("bt-" + cls[2:], body))
    # ---------- SWEEP ----------
    full = props(position="absolute", left="216px", top="-81px", width="338px", height="676px")
    css.append(block("w-secA", full + "\nbackground-color: #FF4B4B;"))
    css.append(block("w-mask", full + "\nbackground-color: #000000;\ntransform: rotate(0deg);\ntransform-origin: 0px 338px;"))
    css.append(block("w-secB", full + "\nbackground-color: #FF4B4B;\ntransform: rotate(0deg);\ntransform-origin: 0px 338px;"))
    css.append(block("w-edge", props(position="absolute", left="214px", top="-81px", width="4px", height="338px",
                                       background_color="#FFC9C0") + "\ntransform: rotate(0deg);\ntransform-origin: 2px 338px;"))
    css.append(block("w-frame", SW["t-sweep"]))
    for i in range(12):
        css.append(block(f"w-tick{i}", SW[f"t-tick{i}"]))
    # ---------- 일시정지 재개 안내(0.1.10) ----------
    # 아래 가운데 200x48(y 438~486). 모서리 원 중심 (80,434)·(352,434)에서 바깥 모서리까지 63.2px(BATTERY 는 오른쪽 열 207~407, 75.7px) ≤ 80
    css.append(block("rs-pill", props(position="absolute", left="116px", top="438px", width="200px", height="48px",
                                        background_color="#000000", border_width="2px", border_color="#FFFFFF",
                                        border_radius="24px")))
    css.append(block("rs-txt", props(position="absolute", left="116px", top="438px", width="200px", height="48px",
                                       font_size="20px", color="#FFFFFF", text_align="center", font_weight="bold")))

    ux = open(UX, encoding="utf8").read()
    head, rest = ux.split("<style>", 1)
    booster_css = rest[rest.index(BOOSTER_CSS_MARK): rest.index("</style>")].rstrip() + "\n"
    common = """/* 좌표 출처: 설정 = docs/full-theme-design/settings-merged/A-final, 테마 = 01-sand·03-battery·08-sweep theme.ux.txt,
   BOOSTER = scripts/booster-layout.json. scripts/gen-index-ux.py 가 template·style 을 만든다. */
.page {
  width: 100%;
  height: 100%;
  background-color: #000000;
}
.view {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 432px;
  height: 514px;
}
"""
    style = "<style>\n" + common + "\n".join(css) + "\n" + booster_css + "</style>\n"
    tpl = template()
    script = head[head.index("<script>"):]
    open(UX, "w", encoding="utf8").write(tpl + "\n" + script + style)
    print("index.ux:", len(css), "classes")


def template():
    T = []
    a = T.append
    a('<template>')
    a('  <div\n    class="page"\n    ontouchstart="onTouchStart"\n    ontouchmove="onTouchMove"\n    ontouchend="onTouchEnd"\n    ontouchcancel="onTouchCancel"\n  >')
    # 설정
    a("    <div class=\"view\" if=\"{{view === 'setup'}}\">")
    a('      <div class="m-focusTrack"></div>')
    a('      <div class="m-focusFill" style="top: {{focusFillTop}}px; height: {{focusFillH}}px;"></div>')
    a('      <div class="m-focusActive" if="{{fActive}}"></div>')
    for i in range(1, 12):
        a(f'      <div class="m-focusTick{i}"></div>')
    a('      <text class="m-focusLab">FOCUS</text>')
    a('      <text class="m-focusNum">{{focusNum}}</text>')
    a('      <text class="m-focusUnit">MIN</text>')
    a('      <div class="m-restTrack"></div>')
    a('      <div class="m-restFill" style="top: {{restFillTop}}px; height: {{restFillH}}px;"></div>')
    a('      <div class="m-restActive" if="{{rActive}}"></div>')
    for i in range(1, 6):
        a(f'      <div class="m-restTick{i}"></div>')
    a('      <text class="m-restLab">REST</text>')
    a('      <text class="m-restNum">{{restNum}}</text>')
    a('      <text class="m-restUnit">MIN</text>')
    a('      <div class="m-start" style="background-color: {{startColor}};"></div>')
    a('      <text class="m-startTxt">START</text>')
    a('      <text class="m-repLab" style="color: {{repLabColor}};">REPEAT</text>')
    a('      <div class="m-tog" style="background-color: {{togColor}};"></div>')
    a('      <div class="m-knob" style="left: {{knobLeft}}px;"></div>')
    a('      <div class="m-gear" style="background-color: {{themeBtnColor}};"></div>')
    a('      <image class="m-gearIcon" src="/common/ui/gear.png"></image>')
    a('    </div>')
    # 테마 고르기
    a("    <div class=\"view\" if=\"{{view === 'themes'}}\">")
    a('      <text class="th-title">THEME</text>')
    # 순서 = timer.js THEMES (0.1.10: SWEEP 기본 · SAND · BATTERY · BOOSTER). test/project.test.mjs 가 같은지 확인한다.
    from_info = [("sweep", "SWEEP", "CLOCKWISE SWEEP"), ("sand", "SAND", "FULL SCREEN FILL"),
                 ("battery", "BATTERY", "DRAIN / CHARGE"), ("booster", "BOOSTER", "NEON 36-CELL GAUGE")]
    for i, (tid, name, sub) in enumerate(from_info):
        a(f'      <div class="th-row{i}" style="background-color: {{{{rowBg{i}}}}}; border-color: {{{{rowBc{i}}}}};"></div>')
        a(f'      <image class="th-thumb{i}" src="/common/ui/thumb-{tid}.png"></image>')
        a(f'      <text class="th-name{i}">{name}</text>')
        a(f'      <text class="th-sub{i}">{sub}</text>')
        a(f'      <text class="th-mark{i}" if="{{{{cur{i}}}}}">✓</text>')
    a('    </div>')
    # 타이머
    a("    <div class=\"view\" if=\"{{view === 'timer'}}\">")
    a("      <div class=\"view\" if=\"{{timerTheme === 'booster'}}\">")
    a('        <image class="gauge" src="{{gaugeSrc}}"></image>')
    a('        <image class="label" src="{{labelSrc}}"></image>')
    a('        <image class="dm dm1" src="{{m1Src}}"></image>')
    a('        <image class="dm dm2" src="{{m2Src}}"></image>')
    a('        <image class="colon" src="/common/booster/colon.png"></image>')
    a('        <image class="ds ds1" src="{{s1Src}}"></image>')
    a('        <image class="ds ds2" src="{{s2Src}}"></image>')
    a('        <div class="pause" if="{{paused}}">')
    a('          <div class="bar"></div>')
    a('          <div class="bar bar-r"></div>')
    a('        </div>')
    a('      </div>')
    a("      <div class=\"view\" if=\"{{timerTheme === 'sand'}}\">")
    a('        <div class="sd-sand" if="{{sandShow}}" style="top: {{sandTop}}px; height: {{sandH}}px; background-color: {{sandColor}};"></div>')
    a('        <div class="sd-level" if="{{levelShow}}" style="top: {{levelTop}}px; background-color: {{levelColor}};"></div>')
    for i in range(1, 5):
        a(f'        <div class="sd-tick{i}"></div>')
    a('        <text class="t-label">{{phaseLabel}}</text>')
    a('        <text class="t-time">{{timeText}}</text>')
    a('        <text class="t-total">{{totalText}}</text>')
    a('      </div>')
    a("      <div class=\"view\" if=\"{{timerTheme === 'battery'}}\">")
    a('        <div class="bt-batCap"></div>')
    a('        <div class="bt-batBody"></div>')
    a('        <div class="bt-batEmpty"></div>')
    a('        <div class="bt-batFill" if="{{batShow}}" style="top: {{batTop}}px; height: {{batH}}px; background-color: {{batColor}};"></div>')
    for i in range(1, 5):
        a(f'        <div class="bt-batSep{i}"></div>')
    a('        <div class="bt-pill" style="background-color: {{batColor}};"></div>')
    a('        <text class="bt-pillTxt">{{phaseLabel}}</text>')
    a('        <text class="bt-mm">{{mmText}}</text>')
    a('        <text class="bt-ss">{{ssText}}</text>')
    a('        <text class="bt-pct" style="color: {{batColor}};">{{pctText}}</text>')
    a('      </div>')
    a("      <div class=\"view\" if=\"{{timerTheme === 'sweep'}}\">")
    a('        <div class="w-secA" if="{{secAShow}}" style="background-color: {{secAColor}};"></div>')
    a('        <div class="w-mask" if="{{maskShow}}" style="{{maskStyle}}"></div>')
    a('        <div class="w-secB" if="{{secBShow}}" style="{{secBStyle}}"></div>')
    a('        <div class="w-edge" if="{{edgeShow}}" style="{{edgeStyle}}"></div>')
    a('        <image class="w-frame" if="{{frameShow}}" src="{{frameSrc}}"></image>')
    for i in range(12):
        a(f'        <div class="w-tick{i}"></div>')
    a('        <text class="t-label">{{phaseLabel}}</text>')
    a('        <text class="t-time">{{timeText}}</text>')
    a('        <text class="t-total">{{totalText}}</text>')
    a('      </div>')
    # 0.1.10: 일시정지(백그라운드 복귀 포함) 때 SAND·BATTERY·SWEEP 에 재개 안내. BOOSTER 는 기존 중심 막대 두 개.
    a('      <div class="rs-pill" if="{{resumeShow}}" style="left: {{resumeLeft}}px;"></div>')
    a('      <text class="rs-txt" if="{{resumeShow}}" style="left: {{resumeLeft}}px;">TAP TO RESUME</text>')
    a('    </div>')
    a('  </div>')
    a('</template>')
    return "\n".join(T) + "\n"


if __name__ == "__main__":
    main()
