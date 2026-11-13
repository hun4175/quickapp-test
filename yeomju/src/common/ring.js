/**
 * 염주 고리 — 1.6.0 체인 슬롯.
 *
 * 구슬마다 타원 위 고정 슬롯 i → i±1 로 @keyframes(translate+scale).
 * 프레임마다 left/top/size JS 재바인딩 없음. 애니 종료 시 슬롯 인덱스만 교체.
 */

export const VIRTUAL_BEADS = 12
/** 체인에 그리는 슬롯 수 (앞·뒤·가장자리 전환 포함, 6~8) */
export const SLOT_COUNT = 8
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = SLOT_COUNT

export const CHAIN_DIR = 1
/** 체인 한 칸(ms) */
export const CHAIN_ANIM_MS = 180

export const SWIPE_MIN_DY = 40
export const SWIPE_VERTICAL_RATIO = 1.2
export const BEAD_SRC = '/common/bead-wood.png'

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
  minSize: 100,
  maxSize: 240,
  virtual: VIRTUAL_BEADS,
  slotCount: SLOT_COUNT
})

export const phaseFromBead = (bead, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const b = Math.max(0, Math.floor(Number(bead) || 0))
  return b % n
}

export const nextPhase = (phaseIndex, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const p = Math.max(0, Math.floor(Number(phaseIndex) || 0))
  return (p + 1) % n
}

export const prevPhase = (phaseIndex, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const p = Math.max(0, Math.floor(Number(phaseIndex) || 0))
  return (p - 1 + n) % n
}

export const stepPhase = (phaseIndex, dir, virtual = VIRTUAL_BEADS) => {
  return Number(dir) < 0 ? prevPhase(phaseIndex, virtual) : nextPhase(phaseIndex, virtual)
}

export const classifyVerticalSwipe = (dx, dy, opts = {}) => {
  const minDy = Number(opts.minDy != null ? opts.minDy : SWIPE_MIN_DY)
  const ratio = Number(opts.ratio != null ? opts.ratio : SWIPE_VERTICAL_RATIO)
  const adx = Math.abs(Number(dx) || 0)
  const ady = Math.abs(Number(dy) || 0)
  if (ady < minDy) return 0
  if (ady < adx * ratio) return 0
  return dy < 0 ? 1 : -1
}

export const depthAtAngle = (angleRad) => {
  const cos = Math.cos(angleRad)
  return (-cos + 1) / 2
}

export const sizeFactorFromDepth = (depth) => {
  const d = Math.max(0, Math.min(1, Number(depth) || 0))
  return 0.42 + 0.58 * Math.pow(d, 0.85)
}

export const circularDistance = (a, b, n) => {
  const d = Math.abs(((a % n) + n) % n - (((b % n) + n) % n))
  return Math.min(d, n - d)
}

export const chainStepY = (ry = DEFAULT_RING.ry, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(3, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const step = (Math.PI * 2) / n
  return Math.round(Number(ry) * Math.sin(step))
}

/**
 * 타원 위 한 점 → 슬롯 기하.
 * angle: 수학 각도(라디안). focus=π(왼쪽).
 */
export const slotGeomAtAngle = (angle, opts = {}) => {
  const focusX = Number(opts.focusX != null ? opts.focusX : DEFAULT_RING.focusX)
  const focusY = Number(opts.focusY != null ? opts.focusY : DEFAULT_RING.focusY)
  const rx = Number(opts.rx != null ? opts.rx : DEFAULT_RING.rx)
  const ry = Number(opts.ry != null ? opts.ry : DEFAULT_RING.ry)
  const cx = Number(opts.cx != null ? opts.cx : focusX + rx)
  const cy = Number(opts.cy != null ? opts.cy : focusY)
  const minSize = Number(opts.minSize != null ? opts.minSize : DEFAULT_RING.minSize)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)
  const depth = depthAtAngle(angle)
  const factor = sizeFactorFromDepth(depth)
  const size = Math.round(minSize + (maxSize - minSize) * factor)
  const x = cx + rx * Math.cos(angle)
  const y = cy + ry * Math.sin(angle)
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

/**
 * 체인 슬롯.
 * 화면 y는 아래로 증가 → sin&gt;0 이 화면 아래.
 * i=0 포커스(π), i 증가 → 각도 + → 앞열에서 위(화면↑) → 뒤 → 아래 → 앞.
 * 스와이프 위(+1): 구슬 i → i+1.
 * @returns {Array<object>}
 */
export const layoutChainSlots = (opts = {}) => {
  const n = Math.max(6, Math.min(8, Math.floor(Number(opts.slotCount) || SLOT_COUNT)))
  const step = (Math.PI * 2) / n
  const slots = []
  for (let i = 0; i < n; i++) {
    const angle = Math.PI + i * step
    const g = slotGeomAtAngle(angle, opts)
    slots.push({
      index: i,
      ...g,
      src: BEAD_SRC
    })
  }
  return slots
}

/**
 * 슬롯 from → to 변환량 (transform-origin: center 기준).
 * @returns {{ tx: number, ty: number, scale: number, mid: { tx, ty, scale } }}
 */
export const slotTransition = (fromSlot, toSlot) => {
  const scale = toSlot.size / fromSlot.size
  const tx = toSlot.cx - fromSlot.cx
  const ty = toSlot.cy - fromSlot.cy
  // 체인 진행 방향 보간 (인덱스 +1 → 각도 증가, 래핑 포함)
  let a0 = fromSlot.angle
  let a1 = toSlot.angle
  const dIdx = toSlot.index - fromSlot.index
  if (dIdx === 1 || dIdx === 1 - SLOT_COUNT || (dIdx < 0 && (dIdx + SLOT_COUNT) === 1)) {
    while (a1 < a0) a1 += Math.PI * 2
  } else {
    while (a0 < a1) a0 += Math.PI * 2
  }
  const midAngle = (a0 + a1) / 2
  const mid = slotGeomAtAngle(midAngle, {
    focusX: DEFAULT_RING.focusX,
    focusY: DEFAULT_RING.focusY,
    rx: DEFAULT_RING.rx,
    ry: DEFAULT_RING.ry,
    cx: DEFAULT_RING.cx,
    cy: DEFAULT_RING.cy,
    minSize: DEFAULT_RING.minSize,
    maxSize: DEFAULT_RING.maxSize
  })
  const midScale = mid.size / fromSlot.size
  const midTx = mid.cx - fromSlot.cx
  const midTy = mid.cy - fromSlot.cy
  return {
    tx: Math.round(tx),
    ty: Math.round(ty),
    scale: Math.round(scale * 1000) / 1000,
    mid: {
      tx: Math.round(midTx),
      ty: Math.round(midTy),
      scale: Math.round(midScale * 1000) / 1000
    }
  }
}

/**
 * 구슬별 애니 클래스명.
 * @param {number} slotIndex
 * @param {number} dir 1=next(i→i+1), -1=prev
 */
export const rollClassForSlot = (slotIndex, dir) => {
  const n = SLOT_COUNT
  const i = ((Math.floor(Number(slotIndex) || 0) % n) + n) % n
  return Number(dir) < 0 ? 'roll-prev-' + i : 'roll-next-' + i
}

/**
 * @keyframes CSS 문자열 생성 (index.ux style 에 삽입).
 */
export const buildChainKeyframeCss = (opts = {}) => {
  const slots = layoutChainSlots({ ...DEFAULT_RING, ...opts, slotCount: SLOT_COUNT })
  const n = slots.length
  const ms = CHAIN_ANIM_MS
  const lines = []
  for (let i = 0; i < n; i++) {
    const next = slots[(i + 1) % n]
    const prev = slots[(i - 1 + n) % n]
    const tn = slotTransition(slots[i], next)
    const tp = slotTransition(slots[i], prev)
    lines.push(`.roll-next-${i} {
  animation-name: kf-next-${i};
  animation-duration: ${ms}ms;
  animation-timing-function: ease-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}`)
    lines.push(`.roll-prev-${i} {
  animation-name: kf-prev-${i};
  animation-duration: ${ms}ms;
  animation-timing-function: ease-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}`)
    lines.push(`@keyframes kf-next-${i} {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(${tn.mid.tx}px, ${tn.mid.ty}px) scale(${tn.mid.scale}); }
  100% { transform: translate(${tn.tx}px, ${tn.ty}px) scale(${tn.scale}); }
}`)
    lines.push(`@keyframes kf-prev-${i} {
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(${tp.mid.tx}px, ${tp.mid.ty}px) scale(${tp.mid.scale}); }
  100% { transform: translate(${tp.tx}px, ${tp.ty}px) scale(${tp.scale}); }
}`)
  }
  return lines.join('\n')
}

/**
 * UI 초기 구슬 목록 (depth 오름차순 = 뒤→앞 그리기).
 * @returns {Array<{id, slot, left, top, size, src, animClass}>}
 */
export const createChainBeads = (opts = {}) => {
  const slots = layoutChainSlots({ ...DEFAULT_RING, ...opts, slotCount: SLOT_COUNT })
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

/**
 * 애니 종료 후 슬롯 인덱스 교체 + 기하 스냅 (transform 리셋용).
 * @param {Array} beads
 * @param {number} dir
 */
export const advanceChainBeads = (beads, dir, opts = {}) => {
  const slots = layoutChainSlots({ ...DEFAULT_RING, ...opts, slotCount: SLOT_COUNT })
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

/** 미리보기·테스트용: 슬롯 기하를 layoutRing 호환 형태로 */
export const layoutRing = (opts = {}) => {
  const slots = layoutChainSlots({ ...DEFAULT_RING, ...opts, slotCount: opts.slotCount || SLOT_COUNT })
  const shiftProgress = Math.max(0, Math.min(1, Number(opts.shiftProgress) || 0))
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
    distFromFocus: Math.min(s.index, slots.length - s.index),
    lane: s.depth >= 0.55 ? 'front' : 'back',
    src: BEAD_SRC,
    cx: s.cx,
    cy: s.cy,
    angle: s.angle
  }))
  if (shiftProgress > 0) {
    items = items.map((b) => {
      const toIdx = (b.key + dir + slots.length) % slots.length
      const to = slots[toIdx]
      const from = slots[b.key]
      const t = slotTransition(from, to)
      // 선형 보간 (미리보기 중간 프레임)
      const p = shiftProgress
      const tx = t.tx * p
      const ty = t.ty * p
      const sc = 1 + (t.scale - 1) * p
      const size = Math.round(from.size * sc)
      const cx = from.cx + tx
      const cy = from.cy + ty
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

export const focusDeltaYOnAdvance = (opts = {}) => {
  const slots = layoutChainSlots({ ...DEFAULT_RING, ...opts })
  const a = slots[0]
  const b = slots[1]
  return b.top - a.top
}

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 4) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + f.size / 2
  const cy = f.top + f.size / 2
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}

/** 하위 호환 스텁 */
export const layoutFixedSlots = (opts = {}) => {
  const beads = createChainBeads(opts)
  return {
    front: beads.filter((b) => b.depth >= 0.55),
    back: beads.filter((b) => b.depth < 0.55),
    stepY: chainStepY()
  }
}

export const rollClassForLane = (lane, dir = CHAIN_DIR) => {
  const up = Number(dir) >= 0
  if (lane === 'front') return up ? 'lane-roll-up' : 'lane-roll-down'
  return up ? 'lane-roll-down' : 'lane-roll-up'
}
