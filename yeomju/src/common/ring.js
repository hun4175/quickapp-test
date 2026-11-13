/**
 * 염주 고리 — 2.0.0 런타임 (Mode E 기본: 앞/뒤 레인 컨테이너 2개).
 * 키프레임 CSS 생성·프리뷰 전용 코드는 ring-kf.js.
 */

export const VIRTUAL_BEADS = 12
export const SLOT_COUNT = 8
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = SLOT_COUNT
export const FRONT_DEPTH_MIN = 0.55

export const CHAIN_DIR = 1
export const CHAIN_ANIM_MS = 190
export const CHAIN_ANIM_END_SLACK_MS = 16

export const SWIPE_MIN_DY = 22
export const SWIPE_VERTICAL_RATIO = 1.2

/** 워치 경로 캐시 회피: v3 팔레트 PNG (2.0.1) */
export const BEAD_SRC = '/common/bead-wood-v3.png'

/** Mode D: 경과시간 기반, 컨테이너 transform만 */
export const JS_FRAME_MS = 16
/** 뒤열 이동량 = 앞열 반대 방향 × 비율 (덩어리감 완화) */
export const BACK_SHIFT_SCALE = 0.72

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

export const pathProgressAtTime = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  if (x <= 0) return 0
  if (x >= 1) return 1
  return easeOutCubic(x)
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

export const createChainBeads = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  return slots
    .map((s) => ({
      id: 'b' + s.index,
      slot: s.index,
      left: s.left,
      top: s.top,
      size: s.size,
      depth: s.depth,
      src: BEAD_SRC,
      animClass: ''
    }))
    .sort((a, b) => a.depth - b.depth || a.slot - b.slot)
}

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
      src: BEAD_SRC,
      animClass: ''
    }
  })
  next.sort((a, b) => a.depth - b.depth || a.slot - b.slot)
  return next
}

export const advanceChainBeadsWithAnim = (beads, dir, nextDir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const d = Number(dir) < 0 ? -1 : 1
  const next = beads.map((b) => {
    const slot = (b.slot + d + n) % n
    const s = slots[slot]
    const animClass =
      nextDir == null || nextDir === 0 ? '' : rollClassForSlot(slot, nextDir, opts)
    return {
      id: b.id,
      slot,
      left: s.left,
      top: s.top,
      size: s.size,
      depth: s.depth,
      src: BEAD_SRC,
      animClass
    }
  })
  next.sort((a, b) => a.depth - b.depth || a.slot - b.slot)
  return next
}

export const focusDeltaYOnAdvance = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  return slots[1].top - slots[0].top
}

/** Mode C 전체 컨테이너 / Mode E 앞열 이동량 (dir=1 → 음수=위) */
export const frontLaneShiftY = (dir, opts = {}) => {
  const step = focusDeltaYOnAdvance(opts)
  return Number(dir) < 0 ? -step : step
}

/** Mode E 뒤열: 반대 방향·축소 */
export const backLaneShiftY = (dir, opts = {}) => {
  const scale = opts.backScale != null ? opts.backScale : BACK_SHIFT_SCALE
  return Math.round(-frontLaneShiftY(dir, opts) * scale)
}

export const containerShiftY = (dir, opts = {}) => frontLaneShiftY(dir, opts)

export const splitChainLanes = (beads) => {
  const frontBeads = []
  const backBeads = []
  for (let i = 0; i < beads.length; i++) {
    const b = beads[i]
    const row = {
      id: b.id,
      slot: b.slot,
      left: b.left,
      top: b.top,
      size: b.size,
      depth: b.depth,
      src: BEAD_SRC,
      animClass: b.animClass || ''
    }
    if (b.depth >= FRONT_DEPTH_MIN) frontBeads.push(row)
    else backBeads.push(row)
  }
  frontBeads.sort((a, b) => a.depth - b.depth || a.slot - b.slot)
  backBeads.sort((a, b) => a.depth - b.depth || a.slot - b.slot)
  return { frontBeads, backBeads }
}

export const laneClassForDir = (lane, dir) => {
  const up = Number(dir) >= 0
  if (lane === 'front') return up ? 'lane-front-up' : 'lane-front-down'
  return up ? 'lane-back-up' : 'lane-back-down'
}

export const tyStyle = (y) =>
  y === 0 ? '' : 'transform:translateY(' + y + 'px);'
