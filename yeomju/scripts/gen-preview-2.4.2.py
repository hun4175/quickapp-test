#!/usr/bin/env python3
"""2.4.2 E2/E4 형상 비교 미리보기 (Pillow). docs/preview-2.4.2-*.png"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
W, H, PAD = 432, 514, 28
BG = (12, 10, 8, 255)

NODE = r"""
import { createChainBeads, layoutOptsFromExps, visualBoxesForBeads, FRONT_DEPTH_MIN, animNodeCountReport, DEFAULT_RING } from './src/common/ring.js'
import { layoutRing } from './src/common/ring-kf.js'
const base = { e1Minimize: true, e2NoScale: false, e3SplitSrc: true, e4SkipBack: false }
const dump = (exps, progress, e4Sim) => {
  const opts = layoutOptsFromExps(exps)
  if (!e4Sim) {
    return layoutRing({ ...DEFAULT_RING, ...opts, shiftProgress: progress, chainDir: 1 }).map(b => ({
      left: b.left, top: b.top, size: b.size, z: b.z, src: b.src, key: b.key
    }))
  }
  const home = createChainBeads(opts)
  const boxes = visualBoxesForBeads(home, { ...opts, atKeyframeEnd: false })
  const mid = layoutRing({ ...DEFAULT_RING, ...opts, e4SkipBack: false, shiftProgress: progress, chainDir: 1 })
  const byHome = new Map(mid.map(b => [b.key, b]))
  return boxes.map(b => {
    const h = home.find(x => x.homeSlot === b.homeSlot)
    const isBack = h && h.depth < FRONT_DEPTH_MIN
    const srcBox = (opts.e4SkipBack && isBack) ? b : (byHome.get(b.homeSlot) || b)
    return { left: srcBox.left, top: srcBox.top, size: srcBox.size, z: srcBox.z ?? b.z, src: srcBox.src || b.src, key: b.homeSlot }
  }).sort((a,c)=>a.z-c.z)
}
console.log(JSON.stringify({
  anim: animNodeCountReport(1),
  baseHome: dump(base, 0, false),
  e2Home: dump({...base, e2NoScale:true}, 0, false),
  baseMid: dump(base, 0.5, false),
  e2Mid: dump({...base, e2NoScale:true}, 0.5, false),
  baseE4mid: dump(base, 0.5, true),
  e4Mid: dump({...base, e4SkipBack:true}, 0.5, true)
}))
"""


def main() -> None:
    raw = subprocess.check_output(
        ["node", "--input-type=module", "-e", NODE],
        cwd=ROOT,
        text=True,
    )
    line = [ln for ln in raw.splitlines() if ln.startswith("{")][-1]
    data = json.loads(line)
    assets = {
        "/common/bead-front-255.png": Image.open(ROOT / "src/common/bead-front-255.png").convert("RGBA"),
        "/common/bead-back-160.png": Image.open(ROOT / "src/common/bead-back-160.png").convert("RGBA"),
        "/common/bead-wood-v3.png": Image.open(ROOT / "src/common/bead-wood-v3.png").convert("RGBA"),
    }

    def render(boxes):
        im = Image.new("RGBA", (W, H), BG)
        for b in sorted(boxes, key=lambda x: x["z"]):
            src = assets.get(b.get("src")) or assets["/common/bead-wood-v3.png"]
            size = max(1, int(round(b["size"])))
            bead = src.resize((size, size), Image.Resampling.LANCZOS)
            im.alpha_composite(bead, (int(round(b["left"])), int(round(b["top"]))))
        return im

    def side(left, right, llab, rlab, name):
        canvas = Image.new("RGBA", (W * 2, H + PAD), (20, 16, 12, 255))
        canvas.paste(left, (0, PAD))
        canvas.paste(right, (W, PAD))
        d = ImageDraw.Draw(canvas)
        d.text((8, 6), llab, fill=(200, 180, 140, 255))
        d.text((W + 8, 6), rlab, fill=(200, 180, 140, 255))
        path = DOCS / name
        canvas.convert("RGB").save(path, optimize=True)
        print("wrote", path, os.path.getsize(path))

    DOCS.mkdir(parents=True, exist_ok=True)
    side(render(data["baseHome"]), render(data["e2Home"]), "base home", "E2 on", "preview-2.4.2-e2.png")
    side(render(data["baseMid"]), render(data["e2Mid"]), "base 50%", "E2 50%", "preview-2.4.2-e2-mid.png")
    side(render(data["baseE4mid"]), render(data["e4Mid"]), "base 50%", "E4 on 50%", "preview-2.4.2-e4.png")
    print("anim", data["anim"])


if __name__ == "__main__":
    main()
