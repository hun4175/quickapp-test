/**
 * 키프레임 CSS·프리뷰·테스트 전용.
 * 2.4.2: roll-/roll0- (scale) + rollt-/rollt0- (translate only, E2)
 *   roll*  = E3 on, roll*0 = E3 off
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
  SLOT_COUNT,
  createChainBeads,
  visualBoxesForBeads
} from './ring.js'

export const SHARED_KEYFRAME_PCTS = Object.freeze([0, 1])
export { pathProgressAtTime, easeOutCubic, endKeyframeTransform, keyframeEndMatchesSnap }

const formatScale = (scale) => {
  const s = Number(scale)
  if (!Number.isFinite(s)) return '1'
  if (s === 1) return '1'
  return String(Math.round(s * 1e8) / 1e8)
}

const kfLineScale = (pct, tr) =>
  `  ${pct}% { transform: translate(${tr.tx}px, ${tr.ty}px) scale(${formatScale(tr.scale)}); }`

const kfLineTranslate = (pct, tr) =>
  `  ${pct}% { transform: translate(${tr.tx}px, ${tr.ty}px); }`

export const buildChainKeyframeCss = (opts = {}) => {
  const lines = []
  const ms = CHAIN_ANIM_MS

  const emitFamily = (slots, prefix, withScale) => {
    const n = slots.length
    const emit = (from, to, dirLabel, alt) => {
      const name = `${dirLabel}-${from.index}${alt ? '-b' : ''}`
      const kfName = `kf-${prefix}${dirLabel}-${from.index}`
      lines.push(`.${prefix}${name} {
  animation-name: ${kfName};
  animation-duration: ${ms}ms;
  animation-timing-function: linear;
  animation-delay: 0ms;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}`)
      if (!alt) {
        const end = endKeyframeTransform(from, to)
        const tr = withScale
          ? end
          : {
              tx: (to.left + to.size / 2) - (from.left + from.size / 2),
              ty: (to.top + to.size / 2) - (from.top + from.size / 2),
              scale: 1
            }
        const body = withScale ? kfLineScale(100, tr) : kfLineTranslate(100, tr)
        const zero = withScale
          ? `  0% { transform: translate(0px, 0px) scale(1); }`
          : `  0% { transform: translate(0px, 0px); }`
        lines.push(`@keyframes ${kfName} {
${zero}
${body}
}`)
      }
    }
    for (let i = 0; i < n; i++) {
      emit(slots[i], slots[(i + 1) % n], 'next', false)
      emit(slots[i], slots[(i + 1) % n], 'next', true)
      emit(slots[i], slots[(i - 1 + n) % n], 'prev', false)
      emit(slots[i], slots[(i - 1 + n) % n], 'prev', true)
    }
  }

  // 기본(E3 on) · E3 off · E2 translate · E2+E3 off
  emitFamily(layoutChainSlots({ ...opts, e3SplitSrc: true }), 'roll-', true)
  emitFamily(layoutChainSlots({ ...opts }), 'roll0-', true)
  emitFamily(
    layoutChainSlots({ ...opts, equalColumnSizes: true, e3SplitSrc: true }),
    'rollt-',
    false
  )
  emitFamily(
    layoutChainSlots({ ...opts, equalColumnSizes: true }),
    'rollt0-',
    false
  )
  return lines.join('\n')
}

export const pathProgressesAtTime = (t) => {
  const u = pathProgressAtTime(t)
  return layoutChainSlots().map(() => u)
}

export const snapMatchesEndKeyframe = (fromSlot, toSlot, tol = 0) =>
  keyframeEndMatchesSnap(fromSlot, toSlot, tol)

/** 프리뷰: 홈 또는 keyframe 끝 시각 박스 */
export const layoutRing = (opts = {}) => {
  const beads = createChainBeads(opts)
  const atEnd = Number(opts.shiftProgress) > 0.999
  const mid = Number(opts.shiftProgress) || 0
  const dir = opts.chainDir != null ? (Number(opts.chainDir) >= 0 ? 1 : -1) : 1
  if (mid <= 0) {
    return visualBoxesForBeads(beads, { ...opts, atKeyframeEnd: false }).map((b) => ({
      key: b.homeSlot,
      left: b.left,
      top: b.top,
      size: b.size,
      depth: 0,
      z: b.z,
      focused: b.homeSlot === 0,
      src: b.src || BEAD_SRC,
      cx: b.left + Math.floor(b.size / 2),
      cy: b.top + Math.floor(b.size / 2)
    }))
  }
  if (atEnd || mid >= 1) {
    return visualBoxesForBeads(beads, { ...opts, atKeyframeEnd: true, dir }).map((b) => ({
      key: b.visualSlot,
      left: b.left,
      top: b.top,
      size: b.size,
      depth: 0,
      z: b.z,
      focused: b.visualSlot === 0,
      src: b.src || BEAD_SRC,
      cx: b.left + Math.floor(b.size / 2),
      cy: b.top + Math.floor(b.size / 2)
    }))
  }
  const slots = layoutChainSlots({
    ...opts,
    equalColumnSizes: !!opts.equalColumnSizes || !!opts.e2NoScale,
    e3SplitSrc: opts.e3SplitSrc === true
  })
  const n = slots.length
  return beads
    .map((b) => {
      const home = b.homeSlot
      const to = slots[(home + dir + n) % n]
      const from = slots[home]
      const tr = transformAtProgress(from, to, mid)
      const size = opts.e2NoScale
        ? from.size
        : Math.round(from.size * tr.scale)
      const left = opts.e2NoScale
        ? from.left +
          ((to.left + to.size / 2) - (from.left + from.size / 2)) * mid
        : from.left + tr.tx
      const top = opts.e2NoScale
        ? from.top +
          ((to.top + to.size / 2) - (from.top + from.size / 2)) * mid
        : from.top + tr.ty
      return {
        key: home,
        left,
        top,
        size,
        depth: from.depth,
        z: b.z,
        focused: false,
        src: from.src || BEAD_SRC,
        cx: left + Math.floor(size / 2),
        cy: top + Math.floor(size / 2)
      }
    })
    .sort((a, b) => a.z - b.z)
}

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 4) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + Math.floor(f.size / 2)
  const cy = f.top + Math.floor(f.size / 2)
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}

export { DEFAULT_RING, SLOT_COUNT, BEAD_SRC, CHAIN_ANIM_MS }
