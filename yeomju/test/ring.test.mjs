/**
 * 염주 고리 2.3.1 — 10노드 슬롯 고정 · 지름 확대 간격 · 커버리지 동일
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  MAX_RENDER_NODES,
  BUFFER_BEADS,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  FRONT_GAP_RATIO_MIN,
  FRONT_GAP_RATIO_MAX,
  phaseFromBead,
  nextPhase,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  TAP_MAX_MOVE,
  layoutChainSlots,
  bufferSlotIndices,
  onScreenSlotIndices,
  isSlotFullyOffScreen,
  createChainBeads,
  snapBeadsHome,
  advanceChainBeads,
  withRollClasses,
  rollClassForSlot,
  animClassesForDrawOrder,
  countAnimatingNodes,
  animNodeCountReport,
  shouldAnimateTransition,
  endKeyframeTransform,
  keyframeEndMatchesSnap,
  keyframeEndCoverageMatchesSnap,
  frontAdjacentGapRatios,
  fixedDrawOrder,
  visualBoxesForBeads,
  pathProgressAtTime,
  BEAD_SRC_FRONT,
  BEAD_SRC_BACK,
  BEAD_BACK_DISPLAY,
  VISIBLE_BEAD_COUNTS,
  visibleHomeSlotsForCount,
  visibleDrawOrder,
  createVisibleBeads,
  animClassesForVisible
} from '../src/common/ring.js'
import {
  SHARED_KEYFRAME_PCTS,
  buildChainKeyframeCss,
  snapMatchesEndKeyframe,
  layoutRing,
  focusCenterNear
} from '../src/common/ring-kf.js'

describe('phase', () => {
  it('순환', () => {
    assert.equal(phaseFromBead(12, 12), 0)
    assert.equal(nextPhase(11, 12), 0)
    assert.equal(stepPhase(0, -1, 12), 11)
  })
})

describe('2.3.1 nodes / buffers / gap', () => {
  it('노드 10 (2.2.0과 동일)', () => {
    assert.equal(SLOT_COUNT, 10)
    assert.equal(MAX_RENDER_NODES, 10)
    assert.equal(BUFFER_BEADS, 4)
    assert.equal(createChainBeads().length, 10)
  })

  it('버퍼 4개 완전 화면 밖', () => {
    const W = DEFAULT_RING.screenW
    const H = DEFAULT_RING.screenH
    const slots = layoutChainSlots()
    const buf = bufferSlotIndices()
    assert.equal(buf.length, 4)
    assert.deepEqual(buf, [2, 3, 7, 8])
    for (const i of buf) {
      const s = slots[i]
      assert.equal(isSlotFullyOffScreen(s), true)
      assert.ok(
        s.left + s.size <= 0 ||
          s.top + s.size <= 0 ||
          s.left >= W ||
          s.top >= H
      )
    }
    assert.equal(onScreenSlotIndices().length, 6)
  })

  it('앞열 간격 0.92~1.0 · 중심거리≈2.2.0(248)', () => {
    const g = frontAdjacentGapRatios()
    assert.ok(g.next >= FRONT_GAP_RATIO_MIN && g.next <= FRONT_GAP_RATIO_MAX)
    assert.ok(g.prev >= FRONT_GAP_RATIO_MIN && g.prev <= FRONT_GAP_RATIO_MAX)
    assert.ok(Math.abs(g.distNext - 248.07) < 0.5)
    assert.equal(DEFAULT_RING.minSize, 165)
    assert.equal(DEFAULT_RING.maxSize, 255)
    assert.equal(DEFAULT_RING.ry, 420)
    assert.ok(g.size0 > 228)
  })
})

describe('슬롯 고정 · 그리기 순서', () => {
  it('배열 순서=fixedDrawOrder, 스냅 후 불변', () => {
    const order = fixedDrawOrder()
    assert.equal(order[order.length - 1], 0)
    const a = createChainBeads()
    assert.deepEqual(
      a.map((b) => b.homeSlot),
      order
    )
    const rolled = withRollClasses(a, 1)
    const home = snapBeadsHome(rolled)
    assert.deepEqual(
      home.map((b) => b.id),
      a.map((b) => b.id)
    )
    assert.deepEqual(
      home.map((b) => b.homeSlot),
      a.map((b) => b.homeSlot)
    )
    assert.ok(home.every((b) => b.animClass === ''))
    assert.ok(home.every((b) => b.slot === b.homeSlot))
  })

  it('advanceChainBeads는 홈 스냅(슬롯 이동 없음)', () => {
    const a = createChainBeads()
    const b = advanceChainBeads(a, 1)
    assert.deepEqual(
      b.map((x) => x.homeSlot),
      a.map((x) => x.homeSlot)
    )
  })

  it('포커스가 그리기 순서 마지막', () => {
    const beads = createChainBeads()
    assert.equal(beads[beads.length - 1].homeSlot, 0)
    for (let i = 1; i < beads.length; i++) {
      assert.ok(beads[i].z >= beads[i - 1].z)
    }
  })
})

describe('keyframe=스냅 · 커버리지', () => {
  it('인접 전이 left/top/size 일치', () => {
    const slots = layoutChainSlots()
    for (let i = 0; i < slots.length; i++) {
      const from = slots[i]
      const to = slots[(i + 1) % slots.length]
      assert.equal(keyframeEndMatchesSnap(from, to, 0), true)
      const tr = endKeyframeTransform(from, to)
      assert.equal(from.left + tr.tx, to.left)
      assert.equal(Math.round(from.size * tr.scale), to.size)
    }
    assert.equal(snapMatchesEndKeyframe(slots[0], slots[1], 0), true)
  })

  it('100% 프레임 vs 홈 스냅 화면 커버리지 동일 (슬롯 쪽 순서)', () => {
    const a = keyframeEndCoverageMatchesSnap(1)
    const b = keyframeEndCoverageMatchesSnap(-1)
    assert.equal(a.ok, true, `dir+1 diff=${a.diff}`)
    assert.equal(b.ok, true, `dir-1 diff=${b.diff}`)
    const beads = createChainBeads()
    const endBoxes = visualBoxesForBeads(beads, { atKeyframeEnd: true, dir: 1 })
    const homeBoxes = visualBoxesForBeads(beads, { atKeyframeEnd: false })
    // 각 화면 슬롯에 같은 기하
    const byVis = (boxes) =>
      Object.fromEntries(
        boxes.map((x) => [x.visualSlot, `${x.left},${x.top},${x.size},${x.z}`])
      )
    assert.deepEqual(byVis(endBoxes), byVis(homeBoxes))
  })

  it('CSS forwards · linear', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('animation-fill-mode: forwards'))
    assert.ok(css.includes('150ms'))
    assert.ok(css.includes('linear'))
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 1])
    assert.equal(pathProgressAtTime(0.5), 0.5)
    assert.equal(BEAD_SRC, '/common/bead-wood-v3.png')
    assert.equal(SWIPE_MIN_DY, 12)
    assert.ok(TAP_MAX_MOVE >= SWIPE_MIN_DY)
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, -(SWIPE_MIN_DY - 1)), 0)
    assert.equal(VIRTUAL_BEADS, 12)
    assert.ok(CHAIN_ANIM_MS >= 140 && CHAIN_ANIM_MS <= 160)
  })

  it('교대 클래스 -b (재시작용)', () => {
    assert.equal(
      rollClassForSlot(0, 1, { alt: false, e3SplitSrc: true }),
      'roll-next-0'
    )
    assert.equal(
      rollClassForSlot(0, 1, { alt: true, e3SplitSrc: true }),
      'roll-next-0-b'
    )
    assert.equal(rollClassForSlot(0, 1, { alt: false }), 'roll0-next-0')
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('.roll-next-0-b'))
    assert.ok(css.includes('.roll-prev-0-b'))
    assert.ok(css.includes('.rollt-next-0'))
    assert.ok(css.includes('.roll0-next-0'))
  })

  it('animClassesForDrawOrder · 단일 구슬 · E1/E4 카운트', () => {
    const all = animClassesForDrawOrder(1, { alt: false, e3SplitSrc: true })
    assert.equal(all.length, 10)
    assert.ok(all.some((c) => c.startsWith('roll-')))
    const one = animClassesForDrawOrder(1, {
      singleBead: true,
      e3SplitSrc: true
    })
    const order = fixedDrawOrder()
    const focusIdx = order.indexOf(0)
    assert.ok(one[focusIdx].startsWith('roll-'))
    assert.equal(one.filter((c) => c).length, 1)
    const report = animNodeCountReport(1)
    assert.equal(report.all, 10)
    assert.equal(report.e1, 8)
    assert.equal(report.e1e4, 4)
    assert.equal(countAnimatingNodes(1, { e1Minimize: false }), 10)
    assert.equal(countAnimatingNodes(1, { e1Minimize: true }), 8)
    assert.equal(
      countAnimatingNodes(1, { e1Minimize: true, e4SkipBack: true }),
      4
    )
    assert.equal(
      rollClassForSlot(0, 1, { e2NoScale: true, e3SplitSrc: true }),
      'rollt-next-0'
    )
  })

  it('E3 앞/뒤 원본 분리', () => {
    const beads = createChainBeads({ e3SplitSrc: true })
    const back = beads.filter((b) => b.depth < 0.55)
    const front = beads.filter((b) => b.depth >= 0.55)
    assert.ok(back.every((b) => b.src === BEAD_SRC_BACK && b.size === BEAD_BACK_DISPLAY))
    assert.ok(front.every((b) => b.src === BEAD_SRC_FRONT))
    assert.equal(BEAD_SRC_FRONT, '/common/bead-front-255.png')
    assert.equal(BEAD_SRC_BACK, '/common/bead-back-160.png')
  })

  it('2.4.3 표시 구슬 수 1/3/6/10', () => {
    assert.deepEqual([...VISIBLE_BEAD_COUNTS], [1, 3, 6, 10])
    assert.deepEqual(visibleHomeSlotsForCount(1), [0])
    assert.deepEqual(visibleHomeSlotsForCount(3).sort((a, b) => a - b), [0, 1, 9])
    assert.deepEqual(visibleHomeSlotsForCount(6).sort((a, b) => a - b), [
      0, 1, 4, 5, 6, 9
    ])
    assert.equal(createVisibleBeads(1).length, 1)
    assert.equal(createVisibleBeads(3).length, 3)
    assert.equal(createVisibleBeads(6).length, 6)
    assert.equal(createVisibleBeads(10).length, 10)
    assert.equal(visibleDrawOrder(3).length, 3)
    assert.equal(animClassesForVisible(1, 1, { e3SplitSrc: true }).filter(Boolean).length, 1)
    assert.equal(animClassesForVisible(1, 3, { e3SplitSrc: true }).filter(Boolean).length, 3)
  })
})

describe('layout preview', () => {
  it('포커스 · 버퍼 랩 애니 생략', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    const slots = layoutChainSlots()
    assert.equal(shouldAnimateTransition(slots[2], slots[3]), false)
    assert.equal(rollClassForSlot(2, 1), '')
  })
})
