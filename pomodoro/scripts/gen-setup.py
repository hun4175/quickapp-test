#!/usr/bin/env python3
"""설정 화면(0.1.7, THERMO) 리소스와 미리보기를 만든다. gen-booster.py 가 끝에 함께 부른다(단독 실행도 가능).

디자인 기준은 docs/booster-design/setup-final-thermo/gen_setup_thermo.py(디자인봇 확정안 C THERMO)이고,
그 모듈을 import 해서 그대로 실행한다.
- src/common/setup/*.png          : bg(256색), 큰 숫자 f0~f9 / r0~r9, 막대 묶음 fg01m~fg06m·fg06 / rg01m~rg10m·rg10,
                                    미세 조정 ▲▼ 눌림(*-on)·끝값 패치(*-off), 밑줄 강조 fHot/rHot, tog-on/off, start-on
- scripts/setup-layout.json       : 위 image 노드들의 CSS 좌표(디자인 패키지 layout.json 과 같음. index.ux·테스트가 쓴다)
- scripts/setup-touch-zones.json  : 터치 영역과 막대 칸별 y 범위(디자인 패키지 touch-zones.json 과 같음. 테스트가 쓴다)
- docs/preview-<버전>-setup.png, -setup-changing.png, -setup-repeat-off.png
글꼴은 PNG 에 구워 넣고 rpk 에는 넣지 않는다.
"""
from __future__ import annotations

import importlib.util
import os
import shutil
import sys

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "docs", "booster-design", "setup-final-thermo")
sys.path.insert(0, PKG)
import gen_setup_thermo as T  # noqa: E402

_spec = importlib.util.spec_from_file_location("gen_booster", os.path.join(ROOT, "scripts", "gen-booster.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)

VERSION = B.VERSION
OUT = os.path.join(ROOT, "src", "common", "setup")
DOCS = os.path.join(ROOT, "docs")


def main():
    assert os.path.abspath(T.OUT) == os.path.abspath(OUT), T.OUT
    T.main()
    shutil.copyfile(os.path.join(PKG, "layout.json"), os.path.join(ROOT, "scripts", "setup-layout.json"))
    shutil.copyfile(os.path.join(PKG, "touch-zones.json"), os.path.join(ROOT, "scripts", "setup-touch-zones.json"))
    import json
    with open(os.path.join(PKG, "layout.json")) as fp:
        css = json.load(fp)
    shots = {
        "setup": T.compose(css, 25, 5, True),
        "setup-changing": T.compose(css, 25, 12, True, hot="r"),
        "setup-repeat-off": T.compose(css, 60, 1, False),
    }
    for name, im in shots.items():
        im.save(os.path.join(DOCS, f"preview-{VERSION}-{name}.png"), optimize=True)
    files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print(f"setup assets: {len(files)} files, {total} bytes")


if __name__ == "__main__":
    main()
