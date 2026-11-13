/**
 * 염주 고리(세로 타원) 배치 순수 로직.
 * Vela UI 는 stack + left/top 으로 그리고, 회전량은 phaseIndex 로 표현한다.
 */

export const VISIBLE_BEADS = 16

/** Watch 6 432×514 기준 기본 링 치수 */
export const DEFAULT_RING = Object.freeze({
  width: 360,
  height: 380,
  cx: 180,
  cy: 190,
  rx: 78,
  ry: 152,
  minSize: 20,
  maxSize: 58
})

/**
 * 카운트 → 시각적 위상 인덱스
 * @param {number} bead
 * @param {number} [visible]
 * @returns {number}
 */
export const phaseFromBead = (bead, visible = VISIBLE_BEADS) => {
  const n = Math.max(1, Math.floor(Number(visible) || VISIBLE_BEADS))
  const b = Math.max(0, Math.floor(Number(bead) || 0))
  return b % n
}

/**
 * 다음 위상
 * @param {number} phaseIndex
 * @param {number} [visible]
 * @returns {number}
 */
export const nextPhase = (phaseIndex, visible = VISIBLE_BEADS) => {
  const n = Math.max(1, Math.floor(Number(visible) || VISIBLE_BEADS))
  const p = Math.max(0, Math.floor(Number(phaseIndex) || 0))
  return (p + 1) % n
}

/**
 * 타원 위 한 점의 깊이(0=뒤, 1=앞). 왼쪽(cos=-1)이 앞.
 * @param {number} angleRad
 * @returns {number}
 */
export const depthAtAngle = (angleRad) => {
  const cos = Math.cos(angleRad)
  return (-cos + 1) / 2
}

/**
 * 고리 위 알 배치. phaseIndex 가 커질수록 알이 시계 방향으로 한 칸씩 돈다.
 * 반환 배열은 stack 그리기용으로 depth 오름차순(뒤→앞) 정렬.
 *
 * @param {object} [opts]
 * @returns {Array<object>}
 */
export const layoutRing = (opts = {}) => {
  const visible = Math.max(3, Math.floor(Number(opts.visible) || VISIBLE_BEADS))
  const phaseIndex = Math.max(0, Math.floor(Number(opts.phaseIndex) || 0)) % visible
  const cx = Number(opts.cx != null ? opts.cx : DEFAULT_RING.cx)
  const cy = Number(opts.cy != null ? opts.cy : DEFAULT_RING.cy)
  const rx = Number(opts.rx != null ? opts.rx : DEFAULT_RING.rx)
  const ry = Number(opts.ry != null ? opts.ry : DEFAULT_RING.ry)
  const minSize = Number(opts.minSize != null ? opts.minSize : DEFAULT_RING.minSize)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)

  const step = (Math.PI * 2) / visible
  // 기준 위치(포커스): 왼쪽(π). phase 가 늘면 알이 그 자리로 들어온다.
  const focus = Math.PI
  const items = []

  for (let i = 0; i < visible; i++) {
    const angle = focus + step * (i - phaseIndex)
    const depth = depthAtAngle(angle)
    const size = Math.round(minSize + (maxSize - minSize) * depth)
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const opacity = Math.round((0.4 + 0.6 * depth) * 100) / 100
    const focused = i === phaseIndex
    items.push({
      key: i,
      left: Math.round(x - size / 2),
      top: Math.round(y - size / 2),
      size,
      depth: Math.round(depth * 1000) / 1000,
      opacity,
      z: Math.round(depth * 100),
      // 포커스(왼쪽 앞)에 온 알은 보석 질감
      focused,
      src: focused ? '/common/bead-gem.png' : '/common/bead-wood.png'
    })
  }

  items.sort((a, b) => a.z - b.z)
  return items
}

/**
 * 포커스 마커(흰 호) 위치 — 왼쪽 앞 알 둘레
 * @param {object} [opts]
 * @returns {{ left: number, top: number, size: number }}
 */
export const layoutFocusMarker = (opts = {}) => {
  const cx = Number(opts.cx != null ? opts.cx : DEFAULT_RING.cx)
  const cy = Number(opts.cy != null ? opts.cy : DEFAULT_RING.cy)
  const rx = Number(opts.rx != null ? opts.rx : DEFAULT_RING.rx)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)
  const size = Math.round(maxSize + 14)
  // 왼쪽(π) 위치
  const x = cx - rx
  const y = cy
  return {
    left: Math.round(x - size / 2),
    top: Math.round(y - size / 2),
    size
  }
}
