/**
 * 염주 고리 — 2.5.1 (앞줄 간격=2.3.1 유지, 뒷줄 밀도↑).
 * - 스프라이트 합성용 기하. 런타임 DOM 노드 제한 없음(S2).
 * - 뒷줄 gap ratio ≈ 앞줄 포커스 인접(≈0.981).
 */

export const VIRTUAL_BEADS = 12
export const FRONT_COUNT = 3
export const FRONT_DEPTH_MIN = 0.55
export const FRONT_GAP_RATIO_MIN = 0.92
export const FRONT_GAP_RATIO_MAX = 1.0
/** 뒷줄 목표 간격비 (앞줄 포커스 인접과 동일) */
export const BACK_GAP_RATIO_TARGET = 0.981
export const MAX_RENDER_NODES = 32

export const CHAIN_DIR = 1
export const CHAIN_ANIM_MS = 150
export const CHAIN_ANIM_END_SLACK_MS = 16

/** 입력→애니: 22px 대기 완화 (속도 대신 거리 임계만 조정) */
export const SWIPE_MIN_DY = 12
export const SWIPE_VERTICAL_RATIO = 1.2
/** 탭으로 인정하는 최대 이동(px) — 롱프레스/슬라이드와 구분 */
export const TAP_MAX_MOVE = 14

export const BEAD_SRC = '/common/bead-wood-v3.png'
/** E3 호환 경로명(스프라이트는 단일 원본 리샘플) */
export const BEAD_SRC_FRONT = '/common/bead-front-255.png'
export const BEAD_SRC_BACK = '/common/bead-back-160.png'
export const BEAD_BACK_DISPLAY = 160

/** 2.2.0 중심거리 유지(ry=420), 지름만 확대해 간격비 맞춤 */
export const DEFAULT_RING = Object.freeze({
  screenW: 432,
  screenH: 514,
  width: 432,
  height: 514,
  focusX: 216,
  focusY: 257,
  rx: 118,
  ry: 420,
  cx: 334,
  cy: 257,
  minSize: 165,
  maxSize: 255,
  virtual: VIRTUAL_BEADS
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

/**
 * 앞줄 각도=고전 10슬롯 유지, 뒷호만 목표 현 길이로 채움.
 * @returns {number[]}
 */
export const buildChainAngles = (opts = {}) => {
  const o = ringOpts(opts)
  const backSize =
    opts.backSize != null ? Number(opts.backSize) : BEAD_BACK_DISPLAY
  const targetRatio =
    opts.backGapRatio != null
      ? Number(opts.backGapRatio)
      : BACK_GAP_RATIO_TARGET
  const chordTarget = Math.max(8, targetRatio * backSize)
  const baseN = 10
  const step = (Math.PI * 2) / baseN
  const aFocus = Math.PI
  const a1 = Math.PI + step
  const a2 = Math.PI + 2 * step
  const a8 = Math.PI + 8 * step
  const a9 = Math.PI + 9 * step

  const cxcy = (angle) => ({
    cx: Math.round(o.cx + o.rx * Math.cos(angle)),
    cy: Math.round(o.cy + o.ry * Math.sin(angle))
  })

  let aStart = a2 + 0.02
  for (let k = 1; k <= 48; k++) {
    const a = a2 + ((a8 - a2) * k) / 48
    if (depthAtAngle(a) < FRONT_DEPTH_MIN) {
      aStart = a
      break
    }
  }

  const back = [aStart]
  let a = aStart
  for (let guard = 0; guard < 48; guard++) {
    let lo = 0.004
    let hi = 0.9
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2
      const g0 = cxcy(a)
      const g1 = cxcy(a + mid)
      const d = Math.hypot(g1.cx - g0.cx, g1.cy - g0.cy)
      if (d < chordTarget) lo = mid
      else hi = mid
    }
    const na = a + (lo + hi) / 2
    if (na >= a8 - 0.02) break
    if (depthAtAngle(na) >= FRONT_DEPTH_MIN) break
    const gN = cxcy(na)
    const g8 = cxcy(a8)
    if (Math.hypot(gN.cx - g8.cx, gN.cy - g8.cy) < chordTarget * 0.55) break
    a = na
    back.push(a)
  }

  return [aFocus, a1, a2, ...back, a8, a9]
}

const _defaultAngles = buildChainAngles()
export const SLOT_COUNT = _defaultAngles.length
export const BACK_COUNT = _defaultAngles.filter(
  (ang) => depthAtAngle(ang) < FRONT_DEPTH_MIN
).length
export const VISIBLE_BEADS = FRONT_COUNT + BACK_COUNT
export const BUFFER_BEADS = Math.max(0, SLOT_COUNT - 6)
export const RENDER_BEADS = SLOT_COUNT

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

/** 정수 left/top/size/cx/cy 단일 경로 */
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
    z: 0
  }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.equalColumnSizes] 열별 동일 size (레거시)
 * @param {boolean} [opts.e3SplitSrc] 뒷열 size=BEAD_BACK_DISPLAY (기본 on)
 */
export const layoutChainSlots = (opts = {}) => {
  const o = ringOpts(opts)
  const angles = buildChainAngles(opts)
  let raw = angles.map((angle, i) => {
    const g = slotGeomAtAngle(angle, o)
    return { index: i, ...g, src: BEAD_SRC }
  })
  if (opts.equalColumnSizes) {
    const front = raw.filter((s) => s.depth >= FRONT_DEPTH_MIN)
    const back = raw.filter((s) => s.depth < FRONT_DEPTH_MIN)
    const fs = Math.max(...front.map((s) => s.size))
    const bs = Math.max(...back.map((s) => s.size))
    raw = raw.map((s) => {
      const size = s.depth >= FRONT_DEPTH_MIN ? fs : bs
      return {
        ...s,
        size,
        left: s.cx - Math.floor(size / 2),
        top: s.cy - Math.floor(size / 2)
      }
    })
  }
  // 2.5.1: 뒷줄 고정 표시 지름 (단일 원본을 리샘플). e3SplitSrc!==false 기본.
  if (opts.e3SplitSrc !== false) {
    raw = raw.map((s) => {
      if (s.depth >= FRONT_DEPTH_MIN) {
        return { ...s, src: BEAD_SRC_FRONT }
      }
      const size = BEAD_BACK_DISPLAY
      return {
        ...s,
        size,
        left: s.cx - Math.floor(size / 2),
        top: s.cy - Math.floor(size / 2),
        src: BEAD_SRC_BACK
      }
    })
  }
  const order = fixedDrawOrderFromSlots(raw)
  const rank = new Map(order.map((idx, r) => [idx, r]))
  return raw.map((s) => ({ ...s, z: rank.get(s.index) || 0 }))
}

export const srcForHomeSlot = (homeSlot, opts = {}) => {
  const slots = layoutChainSlots(opts)
  const s = slots[((homeSlot % slots.length) + slots.length) % slots.length]
  return s.src || BEAD_SRC
}

/**
 * 슬롯 고정 그리기 순서(뒤→앞):
 * 1) 뒤열 전체(depth 낮은 것 먼저)
 * 2) 앞열: 포커스에서 먼 가장자리 → 중앙 포커스(index 0) 마지막
 */
export const fixedDrawOrderFromSlots = (slots) => {
  const back = slots
    .filter((s) => s.depth < FRONT_DEPTH_MIN)
    .sort((a, b) => a.depth - b.depth || a.index - b.index)
  const front = slots.filter((s) => s.depth >= FRONT_DEPTH_MIN)
  const n = slots.length
  front.sort((a, b) => {
    if (a.index === 0) return 1
    if (b.index === 0) return -1
    const da = Math.min(a.index, n - a.index)
    const db = Math.min(b.index, n - b.index)
    if (db !== da) return db - da
    return a.depth - b.depth || a.index - b.index
  })
  return [...back, ...front].map((s) => s.index)
}

export const fixedDrawOrder = (opts = {}) => {
  const slots = layoutChainSlots(opts)
  return fixedDrawOrderFromSlots(slots)
}

export const paintRankBySlot = (opts = {}) => {
  const order = fixedDrawOrder(opts)
  const rank = new Array(order.length)
  order.forEach((slot, r) => {
    rank[slot] = r
  })
  return rank
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
  return slots.map((s) => s.index)
}

export const visibleSlotIndices = (opts = {}) => renderSlotIndices(opts)

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

/**
 * E1(기본): 버퍼↔버퍼(양끝 완전 화면 밖)는 애니 생략.
 * e1Minimize===false 이면 전 슬롯 애니.
 */
export const shouldAnimateTransition = (fromSlot, toSlot, opts = {}) => {
  if (opts.e1Minimize === false) return true
  const fromOut = isSlotFullyOffScreen(fromSlot, opts)
  const toOut = isSlotFullyOffScreen(toSlot, opts)
  return !(fromOut && toOut)
}

/** origin 0 0: t=1에서 스냅 left/top/size와 일치 */
export const transformAtProgress = (fromSlot, toSlot, u) => {
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
  const left = Math.round(fromLeft + (toLeft - fromLeft) * t)
  const top = Math.round(fromTop + (toTop - fromTop) * t)
  const size = Math.round(fromSize + (toSize - fromSize) * t)
  return {
    tx: left - fromLeft,
    ty: top - fromTop,
    scale: fromSize > 0 ? size / fromSize : 1
  }
}

export const endKeyframeTransform = (fromSlot, toSlot) =>
  transformAtProgress(fromSlot, toSlot, 1)

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

/** layoutChainSlots 에 넘길 기하 플래그만 */
export const slotLayoutOpts = (opts = {}) => ({
  equalColumnSizes: !!opts.equalColumnSizes || !!opts.e2NoScale,
  e3SplitSrc: opts.e3SplitSrc === true
})

/** 애니 클래스 접두사: E2→rollt, E3 off→*0 */
export const rollClassPrefix = (opts = {}) => {
  const e3 = opts.e3SplitSrc === true
  if (opts.e2NoScale) return e3 ? 'rollt-' : 'rollt0-'
  return e3 ? 'roll-' : 'roll0-'
}

export const rollClassForSlot = (slotIndex, dir, opts = {}) => {
  const layoutOpts = slotLayoutOpts(opts)
  const slots = layoutChainSlots({ ...ringOpts(opts), ...layoutOpts })
  const n = slots.length
  const i = ((Math.floor(Number(slotIndex) || 0) % n) + n) % n
  const d = Number(dir) < 0 ? -1 : 1
  const to = slots[(i + d + n) % n]
  if (!shouldAnimateTransition(slots[i], to, opts)) return ''
  // E4: 출발이 뒷열이면 애니 생략(종료 시 기하만 — 홈 스냅과 동일)
  if (opts.e4SkipBack && slots[i].depth < FRONT_DEPTH_MIN) return ''
  const alt = opts.alt ? '-b' : ''
  return rollClassPrefix(opts) + (d < 0 ? 'prev-' : 'next-') + i + alt
}

const beadFromHomeSlot = (slotIdx, s, rank) => ({
  id: 'b' + slotIdx,
  slot: slotIdx,
  homeSlot: slotIdx,
  left: s.left,
  top: s.top,
  size: s.size,
  depth: s.depth,
  z: rank[slotIdx] != null ? rank[slotIdx] : s.z,
  src: s.src || BEAD_SRC,
  animClass: ''
})

/** createChainBeads / layout 에 실험 플래그 반영 (E1·E3 기본 on) */
export const layoutOptsFromExps = (exps = {}) => ({
  equalColumnSizes: !!exps.e2NoScale,
  e3SplitSrc: exps.e3SplitSrc !== false,
  e1Minimize: exps.e1Minimize !== false,
  e2NoScale: !!exps.e2NoScale,
  e4SkipBack: !!exps.e4SkipBack,
  singleBead: !!exps.singleBead,
  alt: !!exps.alt
})

/**
 * 노드=슬롯 고정. 배열 순서=fixedDrawOrder (절대 재정렬하지 않음).
 */
export const createChainBeads = (opts = {}) => {
  const layoutOpts = slotLayoutOpts(opts)
  const slots = layoutChainSlots({ ...ringOpts(opts), ...layoutOpts })
  const order = fixedDrawOrder(opts)
  const rank = paintRankBySlot(opts)
  return order.map((slotIdx) => beadFromHomeSlot(slotIdx, slots[slotIdx], rank))
}

/** 홈 스냅: 기하·z를 홈 슬롯으로, animClass 클리어. 배열 순서·id 불변 */
export const snapBeadsHome = (beads, opts = {}) => {
  const layoutOpts = slotLayoutOpts(opts)
  const slots = layoutChainSlots({ ...ringOpts(opts), ...layoutOpts })
  const rank = paintRankBySlot(opts)
  return beads.map((b) => {
    const home = b.homeSlot != null ? b.homeSlot : b.slot
    const s = slots[home]
    return {
      id: b.id,
      slot: home,
      homeSlot: home,
      left: s.left,
      top: s.top,
      size: s.size,
      depth: s.depth,
      z: rank[home],
      src: s.src || BEAD_SRC,
      animClass: ''
    }
  })
}

/** @deprecated 이름 호환 — 홈 스냅 (슬롯 이동 없음) */
export const advanceChainBeads = (beads, _dir, opts = {}) =>
  snapBeadsHome(beads, opts)

/**
 * 애니 시작: 홈 기하 유지, animClass만.
 * z는 목적지 슬롯 paintRank (슬롯 쪽 겹침 순서 — 스냅 후 홈 rank와 화면 슬롯 기준 동일).
 */
export const withRollClasses = (beads, dir, opts = {}) => {
  const layoutOpts = slotLayoutOpts(opts)
  const slots = layoutChainSlots({ ...ringOpts(opts), ...layoutOpts })
  const n = slots.length
  const d = Number(dir) < 0 ? -1 : 1
  const rank = paintRankBySlot(opts)
  const focusOnly = opts.singleBead === true
  return beads.map((b) => {
    const home = b.homeSlot != null ? b.homeSlot : b.slot
    const to = (home + d + n) % n
    const animClass =
      focusOnly && home !== 0 ? '' : rollClassForSlot(home, d, opts)
    return {
      ...b,
      slot: home,
      homeSlot: home,
      left: slots[home].left,
      top: slots[home].top,
      size: slots[home].size,
      depth: slots[home].depth,
      src: slots[home].src || BEAD_SRC,
      animClass,
      z: rank[to]
    }
  })
}

/**
 * 그리기 순서 배열에 대한 animClass만 (기하·src 없음).
 * 정적 노드 바인딩용 — setData에 클래스 문자열만 넘길 때 사용.
 */
export const animClassesForDrawOrder = (dir, opts = {}) => {
  const order = fixedDrawOrder(opts)
  const d = Number(dir) < 0 ? -1 : 1
  const focusOnly = opts.singleBead === true
  return order.map((home) => {
    if (focusOnly && home !== 0) return ''
    return rollClassForSlot(home, d, opts)
  })
}

/** 굴림당 애니 클래스 수 (빈 문자열 제외) */
export const countAnimatingNodes = (dir = 1, opts = {}) =>
  animClassesForDrawOrder(dir, opts).filter((c) => !!c).length

/** 진단용: E1 off vs on 애니 노드 수 */
export const animNodeCountReport = (dir = 1) => {
  const all = countAnimatingNodes(dir, { e1Minimize: false })
  const e1 = countAnimatingNodes(dir, { e1Minimize: true })
  const e1e4 = countAnimatingNodes(dir, { e1Minimize: true, e4SkipBack: true })
  return { all, e1, e1e4 }
}

/** 2.4.3: 화면에 실제로 올릴 구슬 수 */
export const VISIBLE_BEAD_COUNTS = Object.freeze([1, 3, 6, 10])

/**
 * 표시 개수별 homeSlot 집합.
 * 1=포커스, 3=앞열 화면 내, 6=화면 내(버퍼 제외), 10=전체
 */
export const visibleHomeSlotsForCount = (count, opts = {}) => {
  const n = Math.floor(Number(count) || 10)
  if (n <= 1) return [0]
  if (n === 3) {
    const slots = layoutChainSlots(ringOpts(opts))
    return slots
      .filter((s) => s.depth >= FRONT_DEPTH_MIN && !isSlotFullyOffScreen(s, opts))
      .map((s) => s.index)
      .sort((a, b) => a - b)
  }
  if (n === 6) return onScreenSlotIndices(opts)
  return fixedDrawOrder(opts).slice().sort((a, b) => a - b)
}

/** fixedDrawOrder 중 표시 대상만 (그리기 순서 유지) */
export const visibleDrawOrder = (count, opts = {}) => {
  const allow = new Set(visibleHomeSlotsForCount(count, opts))
  return fixedDrawOrder(opts).filter((h) => allow.has(h))
}

/**
 * 표시용 비드 배열 (그리기 순서, 길이=count).
 */
export const createVisibleBeads = (count, opts = {}) => {
  const order = visibleDrawOrder(count, opts)
  const all = createChainBeads(opts)
  const byHome = new Map(all.map((b) => [b.homeSlot, b]))
  return order.map((h) => byHome.get(h)).filter(Boolean)
}

/** 표시 순서에 대응하는 animClass 배열 */
export const animClassesForVisible = (dir, count, opts = {}) => {
  const order = visibleDrawOrder(count, opts)
  const d = Number(dir) < 0 ? -1 : 1
  const focusOnly = opts.singleBead === true || Math.floor(Number(count) || 10) <= 1
  return order.map((home) => {
    if (focusOnly && home !== 0) return ''
    return rollClassForSlot(home, d, opts)
  })
}

export const advanceChainBeadsWithAnim = (beads, _dir, nextDir, opts = {}) => {
  const home = snapBeadsHome(beads, opts)
  if (nextDir == null || nextDir === 0) return home
  return withRollClasses(home, nextDir, opts)
}

/**
 * 렌더 시뮬레이션용 박스.
 * atKeyframeEnd: 각 노드가 dir 방향으로 도착한 슬롯 기하 + 그 슬롯 paintRank.
 * 아니면 홈 슬롯 기하 + 홈 paintRank.
 */
export const visualBoxesForBeads = (beads, opts = {}) => {
  const atEnd = opts.atKeyframeEnd === true
  const dir = Number(opts.dir) < 0 ? -1 : 1
  const layoutOpts = slotLayoutOpts(opts)
  const slots = layoutChainSlots({ ...ringOpts(opts), ...layoutOpts })
  const n = slots.length
  const rank = paintRankBySlot(opts)
  return beads.map((b) => {
    const home = b.homeSlot != null ? b.homeSlot : b.slot
    const visualSlot = atEnd ? (home + dir + n) % n : home
    const s = slots[visualSlot]
    return {
      id: b.id,
      homeSlot: home,
      visualSlot,
      left: s.left,
      top: s.top,
      size: s.size,
      z: rank[visualSlot],
      src: s.src || b.src || BEAD_SRC
    }
  })
}

/**
 * 슬롯 쪽 그리기 순서로 박스 합성 → 커버리지 맵(슬롯 인덱스).
 * 동일 이미지 가정: 픽셀 값은 visualSlot id (겹치면 높은 z가 덮음).
 */
export const composeSlotCoverage = (boxes, opts = {}) => {
  const o = ringOpts(opts)
  const W = o.screenW
  const H = o.screenH
  const map = new Int16Array(W * H)
  map.fill(-1)
  const sorted = [...boxes].sort((a, b) => a.z - b.z || a.homeSlot - b.homeSlot)
  for (const box of sorted) {
    const x0 = Math.max(0, box.left)
    const y0 = Math.max(0, box.top)
    const x1 = Math.min(W, box.left + box.size)
    const y1 = Math.min(H, box.top + box.size)
    const sid = box.visualSlot
    for (let y = y0; y < y1; y++) {
      const row = y * W
      for (let x = x0; x < x1; x++) {
        map[row + x] = sid
      }
    }
  }
  return map
}

/** 100% 프레임 vs 홈 스냅 커버리지 동일 여부 */
export const keyframeEndCoverageMatchesSnap = (dir = 1, opts = {}) => {
  const beads = createChainBeads(opts)
  const atEnd = visualBoxesForBeads(beads, { ...opts, atKeyframeEnd: true, dir })
  const atHome = visualBoxesForBeads(beads, { ...opts, atKeyframeEnd: false, dir })
  const a = composeSlotCoverage(atEnd, opts)
  const b = composeSlotCoverage(atHome, opts)
  if (a.length !== b.length) return { ok: false, diff: a.length }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++
  }
  return { ok: diff === 0, diff }
}

export const focusDeltaYOnAdvance = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  return slots[1].top - slots[0].top
}

export const containerShiftY = (dir, opts = {}) => {
  const step = focusDeltaYOnAdvance(opts)
  return Number(dir) < 0 ? -step : step
}
