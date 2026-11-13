/**
 * 염주 고리 — 1.5.0 고정 슬롯 배치.
 *
 * 성능: 슬롯 left/top/size 는 한 번만 계산. 굴림은 CSS transform 한 방.
 * 모든 알은 동일 나무 구슬 이미지(시각적 phase 교체 불필요).
 */

export const VIRTUAL_BEADS = 12
/** 앞열(큰 알) 슬롯 수 */
export const FRONT_COUNT = 3
/** 뒤열(작은 알) 슬롯 수 — 화면에 거의 안 보이는 알은 생략 */
export const BACK_COUNT = 3
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT

/** 레이아웃 각도 부호(슬롯 계산용). 1=앞열 쪽 위가 phase+ 방향 */
export const CHAIN_DIR = 1

/** 체인 한 칸 애니메이션(ms) — 단순 ease-out, 오버슈트 없음 */
export const CHAIN_ANIM_MS = 160

export const SWIPE_MIN_DY = 40
export const SWIPE_VERTICAL_RATIO = 1.2

/** 단일 구슬 에셋 (옥/링 제거) */
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
  minSize: 110,
  maxSize: 240,
  virtual: VIRTUAL_BEADS,
  frontCount: FRONT_COUNT,
  backCount: BACK_COUNT
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
 * 레인별 애니메이션 클래스.
 * @param {'front'|'back'} lane
 * @param {number} dir 1=앞열↑, -1=앞열↓
 */
export const rollClassForLane = (lane, dir = CHAIN_DIR) => {
  const up = Number(dir) >= 0
  if (lane === 'front') return up ? 'lane-roll-up' : 'lane-roll-down'
  return up ? 'lane-roll-down' : 'lane-roll-up'
}

/**
 * 가상 고리 위 모든 알 좌표(선택·미리보기용).
 * 포커스 구분 이미지 없음 — 전부 BEAD_SRC.
 */
export const layoutRing = (opts = {}) => {
  const virtual = Math.max(
    8,
    Math.floor(Number(opts.virtual != null ? opts.virtual : opts.visible) || VIRTUAL_BEADS)
  )
  const frontCount = Math.max(1, Math.floor(Number(opts.frontCount) || FRONT_COUNT))
  const backCount = Math.max(1, Math.floor(Number(opts.backCount) || BACK_COUNT))
  const phaseIndex = Math.max(0, Math.floor(Number(opts.phaseIndex) || 0)) % virtual
  const shiftProgress = Math.max(0, Math.min(1, Number(opts.shiftProgress) || 0))
  const chainDir = opts.chainDir != null ? Number(opts.chainDir) : CHAIN_DIR
  const dir = chainDir >= 0 ? 1 : -1

  const focusX = Number(opts.focusX != null ? opts.focusX : DEFAULT_RING.focusX)
  const focusY = Number(opts.focusY != null ? opts.focusY : DEFAULT_RING.focusY)
  const rx = Number(opts.rx != null ? opts.rx : DEFAULT_RING.rx)
  const ry = Number(opts.ry != null ? opts.ry : DEFAULT_RING.ry)
  const cx = Number(opts.cx != null ? opts.cx : focusX + rx)
  const cy = Number(opts.cy != null ? opts.cy : focusY)
  const minSize = Number(opts.minSize != null ? opts.minSize : DEFAULT_RING.minSize)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)

  const step = (Math.PI * 2) / virtual
  const focusAngle = Math.PI
  const stepY = chainStepY(ry, virtual)
  const all = []

  for (let i = 0; i < virtual; i++) {
    const angle = focusAngle + dir * step * (phaseIndex - i)
    const depth = depthAtAngle(angle)
    const factor = sizeFactorFromDepth(depth)
    const size = Math.round(minSize + (maxSize - minSize) * factor)
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const focused = i === phaseIndex
    const distFromFocus = circularDistance(i, phaseIndex, virtual)
    all.push({
      key: i,
      left: Math.round(x - size / 2),
      top: Math.round(y - size / 2),
      size,
      depth: Math.round(depth * 1000) / 1000,
      opacity: 1,
      z: Math.round(depth * 100),
      focused,
      distFromFocus,
      lane: 'back',
      src: BEAD_SRC
    })
  }

  const frontHalf = Math.floor(frontCount / 2)
  const front = all.filter((b) => b.distFromFocus <= frontHalf)
  front.forEach((b) => {
    b.lane = 'front'
  })

  const backPool = all
    .filter((b) => b.distFromFocus > frontHalf)
    .filter((b) => !front.find((f) => f.key === b.key))
    .sort((a, b) => a.depth - b.depth || a.key - b.key)
  const back = backPool.slice(0, backCount)
  back.forEach((b) => {
    b.lane = 'back'
  })

  let items = [...back, ...front]
  items.sort((a, b) => a.z - b.z)

  if (shiftProgress > 0) {
    items = items.map((b) => {
      const dy = b.lane === 'front' ? -dir * stepY * shiftProgress : dir * stepY * shiftProgress
      return { ...b, top: Math.round(b.top + dy), focused: false }
    })
  }

  return items
}

/**
 * UI 고정 슬롯 — phase 0 기준 한 번만 바인딩.
 * @returns {{ front: object[], back: object[], stepY: number }}
 */
export const layoutFixedSlots = (opts = {}) => {
  const items = layoutRing({
    ...DEFAULT_RING,
    ...opts,
    phaseIndex: 0,
    shiftProgress: 0,
    frontCount: opts.frontCount != null ? opts.frontCount : FRONT_COUNT,
    backCount: opts.backCount != null ? opts.backCount : BACK_COUNT
  })
  const front = items
    .filter((b) => b.lane === 'front')
    .sort((a, b) => a.top - b.top)
    .map((b, i) => ({
      id: 'f' + i,
      left: b.left,
      top: b.top,
      size: b.size,
      lane: 'front',
      src: BEAD_SRC
    }))
  const back = items
    .filter((b) => b.lane === 'back')
    .sort((a, b) => a.top - b.top)
    .map((b, i) => ({
      id: 'b' + i,
      left: b.left,
      top: b.top,
      size: b.size,
      lane: 'back',
      src: BEAD_SRC
    }))
  return {
    front,
    back,
    stepY: chainStepY(
      opts.ry != null ? opts.ry : DEFAULT_RING.ry,
      opts.virtual != null ? opts.virtual : VIRTUAL_BEADS
    )
  }
}

export const focusDeltaYOnAdvance = (opts = {}) => {
  const virtual = Math.floor(Number(opts.virtual) || VIRTUAL_BEADS)
  const phase = Math.floor(Number(opts.phaseIndex) || 0) % virtual
  const before = layoutRing({ ...DEFAULT_RING, ...opts, phaseIndex: phase, shiftProgress: 0 })
  const after = layoutRing({
    ...DEFAULT_RING,
    ...opts,
    phaseIndex: nextPhase(phase, virtual),
    shiftProgress: 0
  })
  const focused = before.find((b) => b.focused)
  if (!focused) return -CHAIN_DIR * chainStepY(opts.ry, virtual)
  const b0 = before.find((b) => b.key === focused.key)
  const b1 = after.find((b) => b.key === focused.key)
  if (!b0 || !b1) return -CHAIN_DIR * chainStepY(opts.ry, virtual)
  return b1.top - b0.top
}

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 2) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + f.size / 2
  const cy = f.top + f.size / 2
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}
