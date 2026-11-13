/**
 * 염주 고리 배치 (1.3.0).
 * - 포커스(옥) 알 중심 = 화면 정중앙 (216, 257)
 * - 앞열 3알 + 뒤열 4~5알만 렌더 (나머지 가상 슬롯은 계산만)
 * - z-index 미문서 → stack 그리기 순서(뒤→앞)
 */

/** 위상 순환용 가상 슬롯 수 */
export const VIRTUAL_BEADS = 12
/** 앞열(기준+위+아래) */
export const FRONT_COUNT = 3
/** 뒤열 */
export const BACK_COUNT = 5

/** @deprecated 테스트 호환 — 실제 렌더 개수는 front+back */
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT

/**
 * Watch 6 432×514
 * maxSize 247 ≈ 190×1.3 (폭의 ≈57%)
 * 포커스 at π → cx = focusX + rx = 216 + rx
 */
export const DEFAULT_RING = Object.freeze({
  screenW: 432,
  screenH: 514,
  width: 432,
  height: 514,
  focusX: 216,
  focusY: 257,
  rx: 118,
  ry: 300,
  // 포커스 at π → cx = focusX + rx, cy = focusY
  cx: 334,
  cy: 257,
  minSize: 120,
  maxSize: 247,
  virtual: VIRTUAL_BEADS,
  frontCount: FRONT_COUNT,
  backCount: BACK_COUNT
})

/**
 * @param {number} bead
 * @param {number} [virtual]
 * @returns {number}
 */
export const phaseFromBead = (bead, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const b = Math.max(0, Math.floor(Number(bead) || 0))
  return b % n
}

/**
 * @param {number} phaseIndex
 * @param {number} [virtual]
 * @returns {number}
 */
export const nextPhase = (phaseIndex, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(1, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const p = Math.max(0, Math.floor(Number(phaseIndex) || 0))
  return (p + 1) % n
}

/**
 * @param {number} angleRad
 * @returns {number} 0=뒤, 1=앞
 */
export const depthAtAngle = (angleRad) => {
  const cos = Math.cos(angleRad)
  return (-cos + 1) / 2
}

/**
 * @param {number} depth
 * @returns {number}
 */
export const sizeFactorFromDepth = (depth) => {
  const d = Math.max(0, Math.min(1, Number(depth) || 0))
  // 앞은 크고, 뒤는 ~0.45 이상으로 유지해 연결감
  return 0.42 + 0.58 * Math.pow(d, 0.85)
}

/**
 * 원형 거리 (0..n/2)
 * @param {number} a
 * @param {number} b
 * @param {number} n
 */
export const circularDistance = (a, b, n) => {
  const d = Math.abs(((a % n) + n) % n - (((b % n) + n) % n))
  return Math.min(d, n - d)
}

/**
 * 고리 배치 — 앞 3 + 뒤 backCount 만 반환, depth 오름차순.
 * @param {object} [opts]
 * @returns {Array<object>}
 */
export const layoutRing = (opts = {}) => {
  const virtual = Math.max(
    8,
    Math.floor(Number(opts.virtual != null ? opts.virtual : opts.visible) || VIRTUAL_BEADS)
  )
  const frontCount = Math.max(1, Math.floor(Number(opts.frontCount) || FRONT_COUNT))
  const backCount = Math.max(1, Math.floor(Number(opts.backCount) || BACK_COUNT))
  const phaseIndex = Math.max(0, Math.floor(Number(opts.phaseIndex) || 0)) % virtual

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
  const all = []

  for (let i = 0; i < virtual; i++) {
    const angle = focusAngle + step * (i - phaseIndex)
    const depth = depthAtAngle(angle)
    const factor = sizeFactorFromDepth(depth)
    const size = Math.round(minSize + (maxSize - minSize) * factor)
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const opacity = Math.round((0.62 + 0.38 * depth) * 100) / 100
    const focused = i === phaseIndex
    const distFromFocus = circularDistance(i, phaseIndex, virtual)
    all.push({
      key: i,
      left: Math.round(x - size / 2),
      top: Math.round(y - size / 2),
      size,
      depth: Math.round(depth * 1000) / 1000,
      opacity,
      z: Math.round(depth * 100),
      focused,
      distFromFocus,
      lane: distFromFocus <= Math.floor(frontCount / 2) ? 'front' : 'back',
      src: focused ? '/common/bead-gem.png' : '/common/bead-wood.png'
    })
  }

  // 앞열: 포커스와 원형 거리 ≤ floor(frontCount/2) → 3개면 0,1
  const frontLimit = Math.floor(frontCount / 2)
  const front = all.filter((b) => b.distFromFocus <= frontLimit)
  front.forEach((b) => {
    b.lane = 'front'
  })

  // 뒤열: 앞이 아니고 depth 낮은(뒤) 후보 중 가장 뒤쪽에 가까운 backCount개
  const backPool = all
    .filter((b) => b.distFromFocus > frontLimit)
    .sort((a, b) => a.depth - b.depth || a.key - b.key)
  const back = backPool.slice(0, backCount)
  back.forEach((b) => {
    b.lane = 'back'
  })

  const items = [...back, ...front]
  // 앞 알이 위: depth 오름차순
  items.sort((a, b) => a.z - b.z)
  return items
}

/**
 * 포커스 마커 — 화면 중앙 기준 알을 감쌈
 * @param {object} [opts]
 */
export const layoutFocusMarker = (opts = {}) => {
  const focusX = Number(opts.focusX != null ? opts.focusX : DEFAULT_RING.focusX)
  const focusY = Number(opts.focusY != null ? opts.focusY : DEFAULT_RING.focusY)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)
  const size = Math.round(maxSize + 32)
  return {
    left: Math.round(focusX - size / 2),
    top: Math.round(focusY - size / 2),
    size
  }
}

/**
 * 포커스 알 중심이 목표 좌표인지 검증용
 * @param {Array} items
 * @param {number} [fx]
 * @param {number} [fy]
 * @param {number} [tol]
 */
export const focusCenterNear = (items, fx = 216, fy = 257, tol = 2) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + f.size / 2
  const cy = f.top + f.size / 2
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}
