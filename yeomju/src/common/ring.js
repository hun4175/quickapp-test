/**
 * 염주 고리 — 1.8.0 체인 슬롯.
 *
 * 1.7.0: 앞열 0→100% ease-out vs 가장자리 다점+linear 로 속도 곡선이 달라
 * 전면 아래 구슬이 늦게 움직이는 체감. 1.8.0은 전 구슬 동일 키프레임·동일 timing.
 */

export const VIRTUAL_BEADS = 12
export const SLOT_COUNT = 8
export const FRONT_COUNT = 3
export const BACK_COUNT = 3
export const VISIBLE_BEADS = SLOT_COUNT

export const CHAIN_DIR = 1
/** 반응성: 180~200ms */
export const CHAIN_ANIM_MS = 190

/** touchmove 즉시 판정용 (1.7.0=40 → 낮춤) */
export const SWIPE_MIN_DY = 22
export const SWIPE_VERTICAL_RATIO = 1.2
export const BEAD_SRC = '/common/bead-wood.png'

/** 전 구슬 공유 키프레임 퍼센트 (시간축). 위치는 pathProgressAtTime 으로 베이크 */
export const SHARED_KEYFRAME_PCTS = Object.freeze([0, 0.25, 0.5, 0.75, 1])

/** scale 변화 완화용 (스냅과 동일 기하 유지) */
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

/** cubic ease-out — 곡선 키프레임 위치 베이크용 */
export const easeOutCubic = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  return 1 - Math.pow(1 - x, 3)
}

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

const ringOpts = (opts = {}) => ({ ...DEFAULT_RING, ...opts })

/**
 * from→to 각도 진행 (래핑 포함). dirSign: +1 next, -1 prev
 */
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

/**
 * 앞열에 가까운 직선 이동이면 false(단일 구간), 가장자리 곡선이면 true.
 */
export const isCurveTransition = (fromSlot, toSlot) => {
  const dx = Math.abs(toSlot.cx - fromSlot.cx)
  const dy = Math.abs(toSlot.cy - fromSlot.cy)
  if (fromSlot.depth >= 0.72 && toSlot.depth >= 0.72 && dy >= dx) return false
  if (dx >= 48) return true
  return fromSlot.depth < 0.55 || toSlot.depth < 0.55
}

/**
 * 화면(패딩 포함)에 거의 안 보이면 애니 생략.
 */
export const shouldAnimateTransition = (fromSlot, toSlot, opts = {}) => {
  const pad = opts.pad != null ? opts.pad : 72
  const w = opts.screenW != null ? opts.screenW : DEFAULT_RING.screenW
  const h = opts.screenH != null ? opts.screenH : DEFAULT_RING.screenH
  const visible = (s) =>
    s.cx > -pad && s.cx < w + pad && s.cy > -pad && s.cy < h + pad
  return visible(fromSlot) || visible(toSlot)
}

/**
 * progress u∈[0,1] (경로 진행) → from 기준 translate/scale.
 * 100% 값은 항상 to 슬롯과 픽셀 일치 (스냅 무튐).
 */
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
  // 크기는 from→to 선형 (경로 샘플 size 대신 끝점 보간 → 스냅 일치)
  const size = fromSlot.size + (toSlot.size - fromSlot.size) * t
  const scale = size / fromSlot.size
  return {
    tx: Math.round(mid.cx - fromSlot.cx),
    ty: Math.round(mid.cy - fromSlot.cy),
    scale: Math.round(scale * 1000) / 1000
  }
}

export const slotTransition = (fromSlot, toSlot, opts = {}) => {
  const end = transformAtProgress(fromSlot, toSlot, 1, opts)
  const mid = transformAtProgress(fromSlot, toSlot, 0.5, opts)
  return { ...end, mid }
}

/**
 * 시간 진행률 t(0..1) → 경로 진행률 u. 전 구슬 동일 함수.
 */
export const pathProgressAtTime = (t) => {
  const x = Math.max(0, Math.min(1, Number(t) || 0))
  if (x <= 0) return 0
  if (x >= 1) return 1
  return easeOutCubic(x)
}

/**
 * 구슬별 애니 클래스. 보이는 슬롯만 클래스 부여(전원 동일 CSS 곡선).
 */
export const rollClassForSlot = (slotIndex, dir, opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const i = ((Math.floor(Number(slotIndex) || 0) % n) + n) % n
  const d = Number(dir) < 0 ? -1 : 1
  const to = slots[(i + d + n) % n]
  if (!shouldAnimateTransition(slots[i], to, opts)) return ''
  return d < 0 ? 'roll-prev-' + i : 'roll-next-' + i
}

const kfLine = (pct, tr) =>
  `  ${pct}% { transform: translate(${tr.tx}px, ${tr.ty}px) scale(${tr.scale}); }`

/**
 * 전 구슬 동일: SHARED_KEYFRAME_PCTS + linear + pathProgressAtTime 베이크.
 */
export const buildChainKeyframeCss = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const n = slots.length
  const ms = CHAIN_ANIM_MS
  const lines = []
  const emit = (from, to, dirLabel) => {
    const cls = `roll-${dirLabel}-${from.index}`
    lines.push(`.${cls} {
  animation-name: kf-${dirLabel}-${from.index};
  animation-duration: ${ms}ms;
  animation-timing-function: linear;
  animation-delay: 0ms;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}`)
    const body = SHARED_KEYFRAME_PCTS.map((k) => {
      const u = pathProgressAtTime(k)
      const tr = transformAtProgress(from, to, u, opts)
      return kfLine(Math.round(k * 100), tr)
    }).join('\n')
    lines.push(`@keyframes kf-${dirLabel}-${from.index} {
${body}
}`)
  }
  for (let i = 0; i < n; i++) {
    emit(slots[i], slots[(i + 1) % n], 'next')
    emit(slots[i], slots[(i - 1 + n) % n], 'prev')
  }
  return lines.join('\n')
}

/**
 * 테스트용: 시각 t 에서 모든 슬롯의 경로 진행률(동일해야 함).
 */
export const pathProgressesAtTime = (t) => {
  const u = pathProgressAtTime(t)
  return layoutChainSlots().map(() => u)
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

/**
 * 스냅: 마지막 키프레임 transform+from ≡ to 기하.
 * animClass 빈 문자열로 transform 제거와 동시에 left/top/size=to.
 */
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

/** 미리보기: shiftProgress 에 ease-out 적용 가능 */
export const layoutRing = (opts = {}) => {
  const slots = layoutChainSlots(ringOpts(opts))
  const raw = Math.max(0, Math.min(1, Number(opts.shiftProgress) || 0))
  const bakeEase = opts.bakeEase !== false
  const p = raw === 0 || raw === 1 ? raw : bakeEase ? easeOutCubic(raw) : raw
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
  if (p > 0) {
    items = items.map((b) => {
      const to = slots[(b.key + dir + slots.length) % slots.length]
      const from = slots[b.key]
      const tr = transformAtProgress(from, to, p, opts)
      const size = Math.round(from.size * tr.scale)
      const cx = from.cx + tr.tx
      const cy = from.cy + tr.ty
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
  const slots = layoutChainSlots(ringOpts(opts))
  return slots[1].top - slots[0].top
}

export const focusCenterNear = (items, fx = 216, fy = 257, tol = 4) => {
  const f = items.find((b) => b.focused)
  if (!f) return false
  const cx = f.left + f.size / 2
  const cy = f.top + f.size / 2
  return Math.abs(cx - fx) <= tol && Math.abs(cy - fy) <= tol
}

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

/**
 * 스냅 일치 검증: 100% transform 적용 시 중심·크기가 to 와 같음.
 */
export const snapMatchesEndKeyframe = (fromSlot, toSlot, tol = 1) => {
  const tr = transformAtProgress(fromSlot, toSlot, 1)
  const visCx = fromSlot.cx + tr.tx
  const visCy = fromSlot.cy + tr.ty
  const visSize = fromSlot.size * tr.scale
  return (
    Math.abs(visCx - toSlot.cx) <= tol &&
    Math.abs(visCy - toSlot.cy) <= tol &&
    Math.abs(visSize - toSlot.size) <= tol
  )
}
