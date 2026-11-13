/**
 * 염주 고리(세로 타원) 배치 순수 로직.
 * Vela UI 는 stack + left/top 으로 그리고, 회전량은 phaseIndex 로 표현한다.
 *
 * z-index: 공식 General Style 목록에 없음 → stack 자식 그리기 순서(뒤→앞)로 겹침 처리.
 */

/** 가시 알 수 — 크게 그릴 때 12알이면 앞열 위주로 겹쳐 보임 */
export const VISIBLE_BEADS = 12

/**
 * Watch 6 432×514 기준.
 * 앞쪽 알 지름 ≈ 화면 폭의 44%(190px). 고리는 화면 밖으로 잘리도록 rx/ry·cx 를 키움.
 */
export const DEFAULT_RING = Object.freeze({
  screenW: 432,
  screenH: 514,
  width: 432,
  height: 514,
  // 포커스(왼쪽 π)가 화면 중앙 근처에 오도록 cx 를 오른쪽으로
  cx: 268,
  cy: 268,
  rx: 148,
  ry: 228,
  // 뒤 알도 점처럼 안 보이게 하한 상향 (≈22% / ≈44% of 432)
  minSize: 96,
  maxSize: 190
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
 * 크기용 깊이 곡선 — 뒤쪽도 너무 작아지지 않게 압축
 * @param {number} depth 0..1
 * @returns {number} 0..1
 */
export const sizeFactorFromDepth = (depth) => {
  const d = Math.max(0, Math.min(1, Number(depth) || 0))
  // 하한 0.15 확보 후 제곱근으로 중간대역 키움
  return 0.15 + 0.85 * Math.sqrt(d)
}

/**
 * 고리 위 알 배치. phaseIndex 가 커질수록 알이 한 칸씩 돈다.
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
  const focus = Math.PI
  const items = []

  for (let i = 0; i < visible; i++) {
    const angle = focus + step * (i - phaseIndex)
    const depth = depthAtAngle(angle)
    const factor = sizeFactorFromDepth(depth)
    const size = Math.round(minSize + (maxSize - minSize) * factor)
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    const opacity = Math.round((0.55 + 0.45 * depth) * 100) / 100
    const focused = i === phaseIndex
    items.push({
      key: i,
      left: Math.round(x - size / 2),
      top: Math.round(y - size / 2),
      size,
      depth: Math.round(depth * 1000) / 1000,
      opacity,
      z: Math.round(depth * 100),
      focused,
      src: focused ? '/common/bead-gem.png' : '/common/bead-wood.png'
    })
  }

  // 앞 알이 위에 그려지도록 뒤→앞 (stack: 나중에 그린 자식이 위)
  items.sort((a, b) => a.z - b.z)
  return items
}

/**
 * 포커스 마커(흰 호) — 큰 앞 알을 감싸는 크기
 * @param {object} [opts]
 * @returns {{ left: number, top: number, size: number }}
 */
export const layoutFocusMarker = (opts = {}) => {
  const cx = Number(opts.cx != null ? opts.cx : DEFAULT_RING.cx)
  const cy = Number(opts.cy != null ? opts.cy : DEFAULT_RING.cy)
  const rx = Number(opts.rx != null ? opts.rx : DEFAULT_RING.rx)
  const maxSize = Number(opts.maxSize != null ? opts.maxSize : DEFAULT_RING.maxSize)
  const size = Math.round(maxSize + 28)
  const x = cx - rx
  const y = cy
  return {
    left: Math.round(x - size / 2),
    top: Math.round(y - size / 2),
    size
  }
}
