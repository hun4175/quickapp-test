/**
 * 염주 고리 — 2.1.0 플랫 리스트 only (레인/D/E 제거).
 * 렌더 6구슬(앞3+뒤3), keyframe 0/100 linear ~150ms.
 */

export const VIRTUAL_BEADS = 12
export const SLOT_COUNT = 8
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT
export const FRONT_DEPTH_MIN = 0.55

export const CHAIN_DIR = 1
/** 반응성: ~150ms */
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
  ry: 300,
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

/** 2.1.0: 위치 베이크 없이 시간=경로 (CSS linear 0/100) */
export const pathProgressAtTime = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  if (x <= 0) return 0
  if (x >= 1) return 1
  return x
}

export const slotGeomAtAngle = (angle, opts = {}) => {
  const o = ringOpts(opts)
  const depth = depthAtAngle(angle)
  const size = Math.round(
    o.minSize + (o.maxSize - o.minSize) * sizeFactorFromDepth(depth)
  )
  const x = o.cx + o.rx * Math.cos(angle)
  const y = o.cy + o.ry * Math.sin(angle)
  return {
    angle,
    depth: Math.round(depth * 1000) / 1000,
    size,
    cx: Math.round(x),
    cy: Math.round(y),
    left: Math.round(x - size / 2),
    top: Math.round(y - size / 2),
    z: Math.round(depth * 100)
  }
}

export const layoutChainSlots = (opts = {}) => {
  const n = Math.max(6, Math.min(8, Math.floor(Number(opts.slotCount) || SLOT_COUNT)))
  const step = (Math.PI * 2) / n
  const slots = []
  for (let i = 0; i < n; i++) {
    const angle = Math.PI + i * step
    const g = slotGeomAtAngle(angle, { ...DEFAULT_RING, ...opts })
    slots.push({ index: i, ...g, src: BEAD_SRC })
  }
  return slots
}

/** 앞 3 + 뒤 3 슬롯 인덱스 (고정 기하) */
export const visibleSlotIndices = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const front = slots
    .filter((s) => s.depth >= FRONT_DEPTH_MIN)
    .sort((a, b) => b.depth - a.depth || a.index - b.index)
    .slice(0, FRONT_COUNT)
  const back = slots
    .filter((s) => s.depth < FRONT_DEPTH_MIN)
    .sort((a, b) => b.depth - a.depth || a.index - b.index)
    .slice(0, BACK_COUNT)
  return [...front, ...back]
    .map((s) => s.index)
    .sort((a, b) => a - b)
}

export const angledPair = (fromSlot, toSlot) => {
  let a0 = fromSlot.angle
  let a1 = toSlot.angle
  const dIdx = ((toSlot.index - fromSlot.index) % SLOT_COUNT + SLOT_COUNT) % SLOT_COUNT
  if (dIdx === 1) {
    while (a1 < a0) a1 += Math.PI * 2
  } else {
    while (a0 < a1) a0 += Math.PI * 2
  }
  return { a0, a1 }
}

export const shouldAnimateTransition = (fromSlot, toSlot, opts = {}) => {
  const pad = opts.pad != null ? opts.pad : 72
  const w = opts.screenW != null ? opts.screenW : DEFAULT_RING.screenW
  const h = opts.screenH != null ? opts.screenH : DEFAULT_RING.screenH
  const visible = (s) =>
    s.cx > -pad && s.cx < w + pad && s.cy > -pad && s.cy < h + pad
  return visible(fromSlot) || visible(toSlot)
}

export const transformAtProgress = (fromSlot, toSlot, u, opts = {}) => {
  const { a0, a1 } = angledPair(fromSlot, toSlot)
  const t = Math.max(0, Math.min(1, Number(u) || 0))
  if (t <= 0) return { tx: 0, ty: 0, scale: 1 }
  if (t >= 1) {
    return {
      tx: toSlot.cx - fromSlot.cx,
      ty: toSlot.cy - fromSlot.cy,
      scale: Math.round((toSlot.size / fromSlot.size) * 1000) / 1000
    }
  }
  const angle = a0 + (a1 - a0) * t
  const mid = slotGeomAtAngle(angle, ringOpts(opts))
  const size = fromSlot.size + (toSlot.size - fromSlot.size) * t
  const scale = size / fromSlot.size
  return {
    tx: Math.round(mid.cx - fromSlot.cx),
    ty: Math.round(mid.cy - fromSlot.cy),
    scale: Math.round(scale * 1000) / 1000
  }
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

/**
 * 안정 id b0..b5, 앞3+뒤3 슬롯에 배치. 배열 순서는 id 고정.
 */
export const createChainBeads = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const vis = visibleSlotIndices(opts)
  return vis.map((slotIdx, i) => beadFromSlot('b' + i, slots[slotIdx]))
}

/**
 * 슬롯만 +dir. 화면 밖이 된 노드는 빈 visible 슬롯으로 재배치(텔레포트).
 * id·배열 길이·순서·src 유지.
 */
export const advanceChainBeads = (beads, dir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const d = Number(dir) < 0 ? -1 : 1
  const visSet = new Set(visibleSlotIndices(opts))
  const next = beads.map((b) => {
    const slot = (b.slot + d + n) % n
    return { ...b, slot, animClass: '' }
  })
  const occupied = new Set(next.map((b) => b.slot))
  const empty = [...visSet].filter((s) => !occupied.has(s))
  let ei = 0
  for (let i = 0; i < next.length; i++) {
    if (!visSet.has(next[i].slot) && ei < empty.length) {
      next[i] = { ...next[i], slot: empty[ei++] }
    }
  }
  return next.map((b) => {
    const s = slots[b.slot]
    return {
      id: b.id,
      slot: b.slot,
      left: s.left,
      top: s.top,
      size: s.size,
      depth: s.depth,
      z: s.z,
      src: b.src || BEAD_SRC,
      animClass: ''
    }
  })
}

/** 스냅 + 다음 굴림 클래스를 한 할당(원점 프레임 방지). id/src 유지 */
export const advanceChainBeadsWithAnim = (beads, dir, nextDir, opts = {}) => {
  const snapped = advanceChainBeads(beads, dir, opts)
  if (nextDir == null || nextDir === 0) return snapped
  return snapped.map((b) => ({
    ...b,
    animClass: rollClassForSlot(b.slot, nextDir, opts)
  }))
}

/** 애니 시작: animClass만 변경 (src·id·슬롯 기하 유지) */
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
