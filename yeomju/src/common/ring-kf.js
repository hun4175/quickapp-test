/**
 * 키프레임 CSS·프리뷰·테스트 전용 (index 런타임 번들에서 제외).
 */
import {
  CHAIN_ANIM_MS,
  layoutChainSlots,
  transformAtProgress,
  pathProgressAtTime,
  easeOutCubic,
  DEFAULT_RING,
  BEAD_SRC,
  SLOT_COUNT
} from './ring.js'

export const SHARED_KEYFRAME_PCTS = Object.freeze([0, 0.25, 0.5, 0.75, 1])
export { pathProgressAtTime, easeOutCubic }

const KEYS = SHARED_KEYFRAME_PCTS

const kfLine = (pct, tr) =>
  `  ${pct}% { transform: translate(${tr.tx}px, ${tr.ty}px) scale(${tr.scale}); }`

export const buildChainKeyframeCss = (opts = {}) => {
  const slots = layoutChainSlots(opts)
  const n = slots.length
  const ms = CHAIN_ANIM_MS
  const lines = []
  const emit = (from, to, dirLabel) => {
    const name = `${dirLabel}-${from.index}`
    lines.push(`.roll-${name} {
  animation-name: kf-${name};
  animation-duration: ${ms}ms;
  animation-timing-function: linear;
  animation-delay: 0ms;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}`)
    const body = KEYS.map((k) => {
      const u = pathProgressAtTime(k)
      const tr = transformAtProgress(from, to, u, opts)
      return kfLine(Math.round(k * 100), tr)
    }).join('\n')
    lines.push(`@keyframes kf-${name} {
${body}
}`)
  }
  for (let i = 0; i < n; i++) {
    emit(slots[i], slots[(i + 1) % n], 'next')
    emit(slots[i], slots[(i - 1 + n) % n], 'prev')
  }
  return lines.join('\n')
}

export const pathProgressesAtTime = (t) => {
  const u = pathProgressAtTime(t)
  return layoutChainSlots().map(() => u)
}

export const snapMatchesEndKeyframe = (fromSlot, toSlot, tol = 1) => {
  const tr = transformAtProgress(fromSlot, toSlot, 1)
  const visCx = fromSlot.cx + tr.tx
  const visCy = fromSlot.cy + tr.ty
  const visSize = fromSlot.size * tr.scale
  return (
    Math.abs(visCx - toSlot.cx) <= tol &&
    Math.abs(visCy - toSlot.cy) <= tol &&
    Math.abs(visSize - toSlot.size) <= tol
  )
}

export const layoutRing = (opts = {}) => {
  const slots = layoutChainSlots(opts)
  const raw = Math.max(0, Math.min(1, Number(opts.shiftProgress) || 0))
  const bakeEase = opts.bakeEase !== false
  const p = raw === 0 || raw === 1 ? raw : bakeEase ? easeOutCubic(raw) : raw
  const dir = opts.chainDir != null ? (Number(opts.chainDir) >= 0 ? 1 : -1) : 1
  let items = slots.map((s) => ({
    key: s.index,
    left: s.left,
    top: s.top,
    size: s.size,
    depth: s.depth,
    opacity: 1,
    z: s.z,
    focused: s.index === 0,
    src: BEAD_SRC,
    cx: s.cx,
    cy: s.cy,
    angle: s.angle
  }))
  if (p > 0) {
    items = items.map((b) => {
      const to = slots[(b.key + dir + slots.length) % slots.length]
      const from = slots[b.key]
      const tr = transformAtProgress(from, to, p, opts)
      const size = Math.round(from.size * tr.scale)
      const cx = from.cx + tr.tx
      const cy = from.cy + tr.ty
      return {
        ...b,
        size,
        left: Math.round(cx - size / 2),
        top: Math.round(cy - size / 2),
        focused: false
      }
    })
  }
  items.sort((a, b) => a.z - b.z)
  return items
}

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 4) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  return (
    Math.abs(f.left + f.size / 2 - fx) <= tol &&
    Math.abs(f.top + f.size / 2 - fy) <= tol
  )
}

export { DEFAULT_RING, SLOT_COUNT, BEAD_SRC, CHAIN_ANIM_MS }
