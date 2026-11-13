/**
 * 염주 고리 — 2.2.0 플랫 리스트 + 화면 밖 버퍼 슬롯.
 * 슬롯 10·노드≤10. 레인 컨테이너 transform 금지.
 * 재활용(스냅 재배치)은 화면 밖에서만 — 실제로는 슬롯당 1노드로 텔레포트 없음.
 */

export const VIRTUAL_BEADS = 12
export const SLOT_COUNT = 10
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT
export const BUFFER_BEADS = 4
export const RENDER_BEADS = VISIBLE_BEADS + BUFFER_BEADS
export const MAX_RENDER_NODES = 10
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
  /** 양끝 버퍼가 완전 화면 밖이 되도록 확대 */
  ry: 420,
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

/** 위치 베이크 없이 시간=경로 (CSS linear 0/100) */
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

/** AABB가 화면과 겹치지 않으면 완전 화면 밖 */
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

/** 앞·뒤 열 양끝 버퍼(완전 화면 밖) 슬롯 인덱스 */
export const bufferSlotIndices = (opts = {}) =>
  layoutChainSlots(ringOpts(opts))
    .filter((s) => isSlotFullyOffScreen(s, opts))
    .map((s) => s.index)
    .sort((a, b) => a - b)

/** 화면과 겹치는(보이는) 슬롯 — 깊이 기준 앞3+뒤3에 가깝게 유지하되 실제 IN 전체 */
export const onScreenSlotIndices = (opts = {}) =>
  layoutChainSlots(ringOpts(opts))
    .filter((s) => !isSlotFullyOffScreen(s, opts))
    .map((s) => s.index)
    .sort((a, b) => a - b)

/**
 * 렌더 대상: 화면 IN + 버퍼 OUT. 슬롯당 1노드, 길이 ≤ MAX_RENDER_NODES.
 * (10슬롯이면 전 구간)
 */
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

/** @deprecated 이름 호환: 렌더 슬롯(버퍼 포함) */
export const visibleSlotIndices = (opts = {}) => renderSlotIndices(opts)

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

/**
 * 양 끝점이 모두 완전 화면 밖이면 애니 생략(랩/재활용은 화면 밖 스냅).
 * 들어오거나 나가는 구간(한쪽이라도 화면과 겹침)은 애니.
 */
export const shouldAnimateTransition = (fromSlot, toSlot, opts = {}) => {
  const fromOut = isSlotFullyOffScreen(fromSlot, opts)
  const toOut = isSlotFullyOffScreen(toSlot, opts)
  return !(fromOut && toOut)
}

export const transformAtProgress = (fromSlot, toSlot, u, opts = {}) => {
  const n = layoutChainSlots(ringOpts(opts)).length
  const { a0, a1 } = angledPair(fromSlot, toSlot, n)
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
 * 안정 id b0..b{n-1}, 렌더 슬롯(버퍼 포함)에 1:1. 배열 순서 id 고정.
 */
export const createChainBeads = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const idxs = renderSlotIndices(opts)
  if (idxs.length > MAX_RENDER_NODES) {
    throw new Error('render nodes exceed MAX_RENDER_NODES')
  }
  return idxs.map((slotIdx, i) => beadFromSlot('b' + i, slots[slotIdx]))
}

/**
 * 슬롯만 +dir. id·길이·순서·src 유지.
 * 화면 안 텔레포트 없음 — 노드가 링을 돌며 버퍼에서만 랩.
 */
export const advanceChainBeads = (beads, dir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const d = Number(dir) < 0 ? -1 : 1
  return beads.map((b) => {
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
