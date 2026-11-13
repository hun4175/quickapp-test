/**
 * 염주 고리 배치 + 체인 한 칸 이동량.
 *
 * CHAIN_DIR: 1 = 앞열 위로·뒤열 아래로(기본, 사용자 요청)
 *           -1 = 앞열 아래로·뒤열 위로(참고 영상 DdQ21ZlGZGr 쪽)
 * 방향을 바꿀 때는 이 상수만 바꾸면 각도·보간·UI 클래스가 함께 뒤집힌다.
 */

export const VIRTUAL_BEADS = 12
export const FRONT_COUNT = 3
export const BACK_COUNT = 5
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT

/**
 * 레이아웃 기본 각도 부호(테스트·보간용).
 * 실제 스와이프는 호출마다 dir(+1/-1)을 넘긴다.
 */
export const CHAIN_DIR = 1

/** 체인 한 칸 애니메이션 시간(ms) — 150~200ms 경쾌한 구간 */
export const CHAIN_ANIM_MS = 180

/** 포커스 하이라이트(번쩍) 시간(ms) */
export const FOCUS_FLASH_MS = 120

/**
 * 세로 스와이프 최소 이동(px).
 * touchstart→touchend Δy 가 이 값 이상일 때만 한 칸 인정.
 * (onswipe 는 거리 파라미터 없음 → 임계값은 touch 로 처리)
 */
export const SWIPE_MIN_DY = 40

/** 가로 성분이 이 비율보다 크면 세로 굴림으로 보지 않음(시스템 좌↔우 제스처와 분리) */
export const SWIPE_VERTICAL_RATIO = 1.2

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
  minSize: 120,
  maxSize: 247,
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

/**
 * 위상 + dir 한 칸 (dir=+1 전진, -1 후진).
 * @param {number} phaseIndex
 * @param {number} dir
 * @param {number} [virtual]
 * @returns {number}
 */
export const stepPhase = (phaseIndex, dir, virtual = VIRTUAL_BEADS) => {
  return Number(dir) < 0 ? prevPhase(phaseIndex, virtual) : nextPhase(phaseIndex, virtual)
}

/**
 * touch Δ 로 세로 스와이프 방향 판정.
 * @param {number} dx
 * @param {number} dy  화면 좌표: 아래로 갈수록 +
 * @param {object} [opts]
 * @returns {1|-1|0}  1=위로 밀기(앞열↑), -1=아래로 밀기(앞열↓), 0=무시
 */
export const classifyVerticalSwipe = (dx, dy, opts = {}) => {
  const minDy = Number(opts.minDy != null ? opts.minDy : SWIPE_MIN_DY)
  const ratio = Number(opts.ratio != null ? opts.ratio : SWIPE_VERTICAL_RATIO)
  const adx = Math.abs(Number(dx) || 0)
  const ady = Math.abs(Number(dy) || 0)
  if (ady < minDy) return 0
  if (ady < adx * ratio) return 0
  // dy<0 → 손가락이 위로 → 앞열 위로(+1)
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

/**
 * 앞열 한 칸 간격(px). 화면에서 위로 갈수록 y 감소.
 * @param {number} [ry]
 * @param {number} [virtual]
 * @returns {number}
 */
export const chainStepY = (ry = DEFAULT_RING.ry, virtual = VIRTUAL_BEADS) => {
  const n = Math.max(3, Math.floor(Number(virtual) || VIRTUAL_BEADS))
  const step = (Math.PI * 2) / n
  return Math.round(Number(ry) * Math.sin(step))
}

/**
 * UI 애니메이션용 열 클래스.
 * CHAIN_DIR>0 → front-up / back-down, 반대면 뒤집힘.
 * @param {'front'|'back'} lane
 * @param {number} [dir]
 * @returns {string}
 */
export const rollClassForLane = (lane, dir = CHAIN_DIR) => {
  const up = Number(dir) >= 0
  if (lane === 'front') return up ? 'bead-roll-front-up' : 'bead-roll-front-down'
  return up ? 'bead-roll-back-down' : 'bead-roll-back-up'
}

/**
 * 고리 배치.
 * 각도: focus + CHAIN_DIR * step * (phase - i)
 *   CHAIN_DIR=1  → phase++ 시 고정 key 알이 앞열에서 위로
 *   CHAIN_DIR=-1 → phase++ 시 앞열에서 아래로
 *
 * @param {object} [opts]
 * @param {boolean} [opts.animExtra] 애니메이션용으로 앞열 예비 알 1개 추가
 * @param {number} [opts.shiftProgress] 0..1 시각적 체인 이동(미리보기·보간)
 * @param {number} [opts.chainDir] 방향 오버라이드(테스트용)
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
  const animExtra = !!opts.animExtra
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
      lane: 'back',
      rollClass: '',
      flash: false,
      src: focused ? '/common/bead-gem.png' : '/common/bead-wood.png'
    })
  }

  const frontLimit = Math.floor(frontCount / 2) + (animExtra ? 1 : 0)
  const front = all.filter((b) => b.distFromFocus <= frontLimit)
  front.forEach((b) => {
    b.lane = 'front'
  })

  const backPool = all
    .filter((b) => b.distFromFocus > Math.floor(frontCount / 2))
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
      // dir=1: 앞열 위로(음수 y), 뒤열 아래로. dir=-1: 반대.
      const dy = b.lane === 'front' ? -dir * stepY * shiftProgress : dir * stepY * shiftProgress
      return {
        ...b,
        top: Math.round(b.top + dy),
        focused: false,
        src: '/common/bead-wood.png'
      }
    })
    if (shiftProgress < 1) {
      let best = null
      let bestDist = Infinity
      items.forEach((b) => {
        const cyb = b.top + b.size / 2
        const d = Math.abs(cyb - focusY)
        if (d < bestDist) {
          bestDist = d
          best = b
        }
      })
      if (best) {
        best.focused = true
        best.src = '/common/bead-gem.png'
      }
    }
  }

  return items
}

/**
 * phase → phase+1 에서 포커스 알(key)의 y 이동량(음수면 위로).
 * @param {object} [opts]
 * @returns {number}
 */
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

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 2) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + f.size / 2
  const cy = f.top + f.size / 2
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}
