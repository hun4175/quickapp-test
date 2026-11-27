#!/usr/bin/env python3
"""BOOST 앱 아이콘(src/common/logo.png)을 확정 시안 A SECTOR로 맞춘다.

원본은 docs/icon-design/A/icon-192.png(192x192, 생성기 docs/icon-design/gen_icons.py)이고,
이 스크립트는 그 파일을 바이트 그대로 복사한다.
화면 리소스와 미리보기는 scripts/gen-booster.py 가 만든다.
"""
from __future__ import annotations

import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMON = os.path.join(ROOT, "src", "common")
LOGO_PATH = os.path.join(COMMON, "logo.png")
ICON_SRC = os.path.join(ROOT, "docs", "icon-design", "A", "icon-192.png")


def main():
    os.makedirs(COMMON, exist_ok=True)
    shutil.copyfile(ICON_SRC, LOGO_PATH)
    print(f"logo: {os.path.getsize(LOGO_PATH)} (from docs/icon-design/A/icon-192.png)")


if __name__ == "__main__":
    main()
