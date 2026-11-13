/**
 * 키프레임 CSS·프리뷰·테스트 전용 (index 런타임 번들 제외).
 * 2.3.0: 0%/100% linear · origin 0 0 · 정수 left/top 기반 end transform.
 */
import {
  CHAIN_ANIM_MS,
  layoutChainSlots,
  transformAtProgress,
  endKeyframeTransform,
  keyframeEndMatchesSnap,
  pathProgressAtTime,
  easeOutCubic,
  DEFAULT_RING,
  BEAD_SRC,
  SLOT_COUNT
} from './ring.js'

export const SHARED_KEYFRAME_PCTS = Object.freeze([0, 1])
export { pathProgressAtTime, easeOutCubic, endKeyframeTransform, keyframeEndMatchesSnap }

/** CSS scale: 충분히 길게 써서 from.size*scale ≈ to.size */
const formatScale = (scale) => {
  const s = Number(scale)
  if (!Number.isFinite(s)) return '1'
  if (s === 1) return '1'
  return String(Math.round(s * 1e8) / 1e8)
}

const kfLine = (pct, tr) =>
  `  ${pct}% { transform: translate(${tr.tx}px, ${tr.ty}px) scale(${formatScale(tr.scale)}); }`

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
    const end = endKeyframeTransform(from, to, opts)
    lines.push(`@keyframes kf-${name} {
  0% { transform: translate(0px, 0px) scale(1); }
${kfLine(100, end)}
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

/** origin 0 0: from.left+tx == to.left 등 */
export const snapMatchesEndKeyframe = (fromSlot, toSlot, tol = 0) =>
  keyframeEndMatchesSnap(fromSlot, toSlot, tol)

export const layoutRing = (opts = {}) => {
  const slots = layoutChainSlots(opts)
  const raw = Math.max(0, Math.min(1, Number(opts.shiftProgress) || 0))
  const p = raw
  const dir = opts.chainDir != null ? (Number(opts.chainDir) >= 0 ? 1 : -1) : 1
  let items = slots.map((s) => ({
    key: s.index,
    left: s.left,
    top: s.top,
    size: s.size,
    depth: s.depth,
    z: s.z,
    focused: s.index === 0,
    src: BEAD_SRC,
    cx: s.cx,
    cy: s.cy
  }))
  if (p > 0) {
    items = items.map((b) => {
      const to = slots[(b.key + dir + slots.length) % slots.length]
      const from = slots[b.key]
      const tr = transformAtProgress(from, to, p, opts)
      const size = Math.round(from.size * tr.scale)
      const left = from.left + tr.tx
      const top = from.top + tr.ty
      return {
        ...b,
        size,
        left,
        top,
        cx: left + Math.floor(size / 2),
        cy: top + Math.floor(size / 2),
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
  const cx = f.left + Math.floor(f.size / 2)
  const cy = f.top + Math.floor(f.size / 2)
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}

export { DEFAULT_RING, SLOT_COUNT, BEAD_SRC, CHAIN_ANIM_MS }
