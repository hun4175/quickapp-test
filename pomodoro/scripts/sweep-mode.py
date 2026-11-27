#!/usr/bin/env python3
"""SWEEP 테마 부채꼴 구현 전환.

  python3 scripts/sweep-mode.py rotate   # 기본(0.1.9): transform: rotate div 4개, 이미지 없음
  python3 scripts/sweep-mode.py frames   # 대체: 08-sweep (a) PNG 프레임(집중 f01~f60, 휴식 r01~r60, 약 235KB)

실기기에서 rotate·transform-origin·음수 top 이 안 되면 frames 로 바꾸고 다시 빌드한다.
src/common/timer.js 의 SWEEP_MODE 와 src/common/sweep/ 프레임을 함께 바꾼다(test/project.test.mjs 가 둘이 맞는지 확인).
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMER = os.path.join(ROOT, "src", "common", "timer.js")
OUT = os.path.join(ROOT, "src", "common", "sweep")
ASSETS = os.path.join(ROOT, "docs", "full-theme-design", "08-sweep", "assets")


def main(mode):
    if mode not in ("rotate", "frames"):
        sys.exit("usage: sweep-mode.py rotate|frames")
    s = open(TIMER, encoding="utf8").read()
    s2 = re.sub(r"export const SWEEP_MODE = '\w+'", f"export const SWEEP_MODE = '{mode}'", s)
    open(TIMER, "w", encoding="utf8").write(s2)
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    if mode == "frames":
        os.makedirs(OUT)
        for sub, p in (("sweep-focus", "f"), ("sweep-rest", "r")):
            for i in range(1, 61):
                shutil.copyfile(os.path.join(ASSETS, sub, f"{p}{i:02d}.png"), os.path.join(OUT, f"{p}{i:02d}.png"))
    print("SWEEP_MODE =", mode, "| frames:", len(os.listdir(OUT)) if os.path.isdir(OUT) else 0)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
