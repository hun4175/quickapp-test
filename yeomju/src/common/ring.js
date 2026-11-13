/**
 * 염주 고리 — 2.3.0 플랫 리스트.
 * - 덜컥임: keyframe 100% = 스냅 left/top/size (정수·origin 0 0)
 * - 간격: 앞열 중심거리 ≈ 지름 0.92~1.0
 * - 슬롯 12·노드≤12, 화면 밖 버퍼, 레인/opacity 금지
 */

export const VIRTUAL_BEADS = 12
export const SLOT_COUNT = 12
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT
export const MAX_RENDER_NODES = 12
export const FRONT_DEPTH_MIN = 0.55
/** 앞열 인접 중심거리 / ((sizeA+sizeB)/2) 목표 */
export const FRONT_GAP_RATIO_MIN = 0.92
export const FRONT_GAP_RATIO_MAX = 1.0

export const CHAIN_DIR = 1
export const CHAIN_ANIM_MS = 150
export const CHAIN_ANIM_END_SLACK_MS = 16

export const SWIPE_MIN_DY = 22
export const SWIPE_VERTICAL_RATIO = 1.2

export const BEAD_SRC = '/common/bead-wood-v3.png'

export const DEFAULT_RING = Object.freeze({
  screenW: 432,
  screenH: 514,
  width: 432,
  height: 514,
  focusX: 216,
  focusY: 257,
  rx: 118,
  /** n=12에서 앞열 간격·버퍼 OUT 확보 */
  ry: 430,
  cx: 334,
  cy: 257,
  minSize: 140,
  maxSize: 228,
  virtual: VIRTUAL_BEADS,
  slotCount: SLOT_COUNT
})

const ringOpts = (opts = {}) => ({ ...DEFAULT_RING, ...opts })

export const phaseFromBead = (bead, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  return Math.max(0, Math.floor(Number(bead) || 0)) % n
}

export const nextPhase = (phaseIndex, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  return (Math.max(0, Math.floor(Number(phaseIndex) || 0)) + 1) % n
}

export const prevPhase = (phaseIndex, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  return (Math.max(0, Math.floor(Number(phaseIndex) || 0)) - 1 + n) % n
}

export const stepPhase = (phaseIndex, dir, virtual = VIRTUAL_BEADS) =>
  Number(dir) < 0 ? prevPhase(phaseIndex, virtual) : nextPhase(phaseIndex, virtual)

export const classifyVerticalSwipe = (dx, dy, opts = {}) => {
  const minDy = Number(opts.minDy != null ? opts.minDy : SWIPE_MIN_DY)
  const ratio = Number(opts.ratio != null ? opts.ratio : SWIPE_VERTICAL_RATIO)
  const adx = Math.abs(Number(dx) || 0)
  const ady = Math.abs(Number(dy) || 0)
  if (ady < minDy) return 0
  if (ady < adx * ratio) return 0
  return dy < 0 ? 1 : -1
}

export const depthAtAngle = (angleRad) => (-Math.cos(angleRad) + 1) / 2

export const sizeFactorFromDepth = (depth) => {
  const d = Math.max(0, Math.min(1, Number(depth) || 0))
  return 0.42 + 0.58 * Math.pow(d, 0.85)
}

export const easeOutCubic = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  return 1 - Math.pow(1 - x, 3)
}

export const pathProgressAtTime = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  if (x <= 0) return 0
  if (x >= 1) return 1
  return x
}

/**
 * 모든 슬롯 좌표의 단일 정수 계산.
 * left/top/size/cx/cy 정수. left = cx - floor(size/2) 로 keyframe·스냅 공유.
 */
export const slotGeomAtAngle = (angle, opts = {}) => {
  const o = ringOpts(opts)
  const depth = depthAtAngle(angle)
  const size = Math.round(
    o.minSize + (o.maxSize - o.minSize) * sizeFactorFromDepth(depth)
  )
  const cx = Math.round(o.cx + o.rx * Math.cos(angle))
  const cy = Math.round(o.cy + o.ry * Math.sin(angle))
  const left = cx - Math.floor(size / 2)
  const top = cy - Math.floor(size / 2)
  return {
    angle,
    depth: Math.round(depth * 1000) / 1000,
    size,
    cx,
    cy,
    left,
    top,
    z: Math.round(depth * 100)
  }
}

export const layoutChainSlots = (opts = {}) => {
  const o = ringOpts(opts)
  const n = Math.max(
    6,
    Math.min(MAX_RENDER_NODES, Math.floor(Number(o.slotCount) || SLOT_COUNT))
  )
  const step = (Math.PI * 2) / n
  const slots = []
  for (let i = 0; i < n; i++) {
    const angle = Math.PI + i * step
    const g = slotGeomAtAngle(angle, o)
    slots.push({ index: i, ...g, src: BEAD_SRC })
  }
  return slots
}

export const isSlotFullyOffScreen = (slot, opts = {}) => {
  const o = ringOpts(opts)
  const left = Number(slot.left)
  const top = Number(slot.top)
  const size = Number(slot.size)
  return (
    left + size <= 0 ||
    top + size <= 0 ||
    left >= o.screenW ||
    top >= o.screenH
  )
}

export const bufferSlotIndices = (opts = {}) =>
  layoutChainSlots(ringOpts(opts))
    .filter((s) => isSlotFullyOffScreen(s, opts))
    .map((s) => s.index)
    .sort((a, b) => a - b)

export const onScreenSlotIndices = (opts = {}) =>
  layoutChainSlots(ringOpts(opts))
    .filter((s) => !isSlotFullyOffScreen(s, opts))
    .map((s) => s.index)
    .sort((a, b) => a - b)

export const renderSlotIndices = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  if (slots.length <= MAX_RENDER_NODES) {
    return slots.map((s) => s.index)
  }
  const buf = new Set(bufferSlotIndices(opts))
  const front = slots
    .filter((s) => s.depth >= FRONT_DEPTH_MIN)
    .sort((a, b) => b.depth - a.depth || a.index - b.index)
    .slice(0, FRONT_COUNT)
  const back = slots
    .filter((s) => s.depth < FRONT_DEPTH_MIN)
    .sort((a, b) => b.depth - a.depth || a.index - b.index)
    .slice(0, BACK_COUNT)
  const picked = new Set([...front, ...back].map((s) => s.index))
  for (const i of buf) {
    if (picked.size >= MAX_RENDER_NODES) break
    picked.add(i)
  }
  return [...picked].sort((a, b) => a - b)
}

export const visibleSlotIndices = (opts = {}) => renderSlotIndices(opts)

/** 인접 중심거리 / ((sizeA+sizeB)/2) — 두 반지름 합 기준 */
export const adjacentGapRatio = (a, b) => {
  const d = Math.hypot(Number(b.cx) - Number(a.cx), Number(b.cy) - Number(a.cy))
  const sumR = (Number(a.size) + Number(b.size)) / 2
  return sumR > 0 ? d / sumR : 0
}

export const frontAdjacentGapRatios = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  return {
    next: adjacentGapRatio(slots[0], slots[1]),
    prev: adjacentGapRatio(slots[n - 1], slots[0]),
    distNext: Math.hypot(slots[1].cx - slots[0].cx, slots[1].cy - slots[0].cy),
    distPrev: Math.hypot(
      slots[0].cx - slots[n - 1].cx,
      slots[0].cy - slots[n - 1].cy
    ),
    size0: slots[0].size,
    size1: slots[1].size,
    sizePrev: slots[n - 1].size
  }
}

export const angledPair = (fromSlot, toSlot, slotCount = SLOT_COUNT) => {
  let a0 = fromSlot.angle
  let a1 = toSlot.angle
  const n = Math.max(2, Math.floor(Number(slotCount) || SLOT_COUNT))
  const dIdx = ((toSlot.index - fromSlot.index) % n + n) % n
  if (dIdx === 1) {
    while (a1 < a0) a1 += Math.PI * 2
  } else {
    while (a0 < a1) a0 += Math.PI * 2
  }
  return { a0, a1 }
}

export const shouldAnimateTransition = (fromSlot, toSlot, opts = {}) => {
  const fromOut = isSlotFullyOffScreen(fromSlot, opts)
  const toOut = isSlotFullyOffScreen(toSlot, opts)
  return !(fromOut && toOut)
}

/**
 * transform-origin: 0 0 기준.
 * t=1에서 tx/ty/scale이 스냅 left/top/size와 픽셀 일치하도록 정수 left/top에서 유도.
 */
export const transformAtProgress = (fromSlot, toSlot, u, opts = {}) => {
  const t = Math.max(0, Math.min(1, Number(u) || 0))
  if (t <= 0) return { tx: 0, ty: 0, scale: 1 }

  const toLeft = Number(toSlot.left)
  const toTop = Number(toSlot.top)
  const toSize = Number(toSlot.size)
  const fromLeft = Number(fromSlot.left)
  const fromTop = Number(fromSlot.top)
  const fromSize = Number(fromSlot.size)

  if (t >= 1) {
    return {
      tx: toLeft - fromLeft,
      ty: toTop - fromTop,
      scale: fromSize > 0 ? toSize / fromSize : 1
    }
  }

  // 중간: 각도 보간 대신 left/top/size 선형(정수) → 동일 함수로 tx/scale
  const left = Math.round(fromLeft + (toLeft - fromLeft) * t)
  const top = Math.round(fromTop + (toTop - fromTop) * t)
  const size = Math.round(fromSize + (toSize - fromSize) * t)
  return {
    tx: left - fromLeft,
    ty: top - fromTop,
    scale: fromSize > 0 ? size / fromSize : 1
  }
}

/** keyframe 100%용 — transformAtProgress(..., 1)과 동일, 이름 명시 */
export const endKeyframeTransform = (fromSlot, toSlot, opts = {}) =>
  transformAtProgress(fromSlot, toSlot, 1, opts)

/** 애니 끝 시각적 박스(origin 0 0)가 스냅 슬롯과 일치하는지 */
export const keyframeEndMatchesSnap = (fromSlot, toSlot, tol = 0) => {
  const tr = endKeyframeTransform(fromSlot, toSlot)
  const endLeft = fromSlot.left + tr.tx
  const endTop = fromSlot.top + tr.ty
  const endSize = Math.round(fromSlot.size * tr.scale)
  return (
    Math.abs(endLeft - toSlot.left) <= tol &&
    Math.abs(endTop - toSlot.top) <= tol &&
    Math.abs(endSize - toSlot.size) <= tol
  )
}

export const rollClassForSlot = (slotIndex, dir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const i = ((Math.floor(Number(slotIndex) || 0) % n) + n) % n
  const d = Number(dir) < 0 ? -1 : 1
  const to = slots[(i + d + n) % n]
  if (!shouldAnimateTransition(slots[i], to, opts)) return ''
  return d < 0 ? 'roll-prev-' + i : 'roll-next-' + i
}

const beadFromSlot = (id, s, animClass = '') => ({
  id,
  slot: s.index,
  left: s.left,
  top: s.top,
  size: s.size,
  depth: s.depth,
  z: s.z,
  src: BEAD_SRC,
  animClass
})

/** z 오름차순 안정 정렬(뒤→앞). 포커스(높은 z)가 위. 동일 z면 id 유지 */
export const sortBeadsBackToFront = (beads) =>
  [...beads].sort((a, b) => {
    const dz = (Number(a.z) || 0) - (Number(b.z) || 0)
    if (dz !== 0) return dz
    return String(a.id).localeCompare(String(b.id))
  })

/**
 * 안정 id. 렌더 슬롯 1:1. 그리기 순서는 z로 정렬하되 id 매핑은 슬롯 인덱스 순 생성 후 정렬.
 */
export const createChainBeads = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const idxs = renderSlotIndices(opts)
  if (idxs.length > MAX_RENDER_NODES) {
    throw new Error('render nodes exceed MAX_RENDER_NODES')
  }
  const beads = idxs.map((slotIdx, i) => beadFromSlot('b' + i, slots[slotIdx]))
  return sortBeadsBackToFront(beads)
}

/**
 * 슬롯 +dir. id·src 유지. animClass 클리어 + left/top/size 갱신을 한 객체에(같은 tick).
 */
export const advanceChainBeads = (beads, dir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const d = Number(dir) < 0 ? -1 : 1
  const next = beads.map((b) => {
    const slot = (b.slot + d + n) % n
    const s = slots[slot]
    return {
      id: b.id,
      slot,
      left: s.left,
      top: s.top,
      size: s.size,
      depth: s.depth,
      z: s.z,
      src: b.src || BEAD_SRC,
      animClass: ''
    }
  })
  return sortBeadsBackToFront(next)
}

export const advanceChainBeadsWithAnim = (beads, dir, nextDir, opts = {}) => {
  const snapped = advanceChainBeads(beads, dir, opts)
  if (nextDir == null || nextDir === 0) return snapped
  return snapped.map((b) => ({
    ...b,
    animClass: rollClassForSlot(b.slot, nextDir, opts)
  }))
}

/** 애니 시작: animClass만 변경 (left/top/size/id/src 유지) */
export const withRollClasses = (beads, dir, opts = {}) =>
  beads.map((b) => ({
    ...b,
    animClass: rollClassForSlot(b.slot, dir, opts)
  }))

export const focusDeltaYOnAdvance = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  return slots[1].top - slots[0].top
}

export const containerShiftY = (dir, opts = {}) => {
  const step = focusDeltaYOnAdvance(opts)
  return Number(dir) < 0 ? -step : step
}
