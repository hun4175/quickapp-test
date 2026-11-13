/**
 * 염주 고리 2.5.1 — 앞줄 간격 유지 · 뒷줄 밀도 · 커버리지
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SLOT_COUNT,
  BACK_COUNT,
  BACK_GAP_RATIO_TARGET,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  FRONT_GAP_RATIO_MIN,
  FRONT_GAP_RATIO_MAX,
  FRONT_DEPTH_MIN,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  bufferSlotIndices,
  createChainBeads,
  snapBeadsHome,
  frontAdjacentGapRatios,
  fixedDrawOrder,
  keyframeEndCoverageMatchesSnap,
  pathProgressAtTime,
  BEAD_BACK_DISPLAY,
  buildChainAngles
} from '../src/common/ring.js'
import { layoutRing } from '../src/common/ring-kf.js'

describe('swipe classify', () => {
  it('수직 임계', () => {
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, SWIPE_MIN_DY), -1)
    assert.equal(classifyVerticalSwipe(0, 5), 0)
  })
})

describe('2.5.1 denser back · front gap', () => {
  it('앞줄 포커스 인접 ≈0.981 유지', () => {
    const fr = frontAdjacentGapRatios({ e3SplitSrc: true })
    assert.ok(fr.next >= FRONT_GAP_RATIO_MIN && fr.next <= FRONT_GAP_RATIO_MAX)
    assert.ok(Math.abs(fr.next - 0.981) < 0.02)
  })

  it('뒷줄 개수↑ · 간격비 ≈ 목표', () => {
    assert.ok(SLOT_COUNT > 10)
    assert.ok(BACK_COUNT >= 5)
    const slots = layoutChainSlots({ e3SplitSrc: true })
    const back = slots
      .filter((s) => s.depth < FRONT_DEPTH_MIN)
      .sort((a, b) => a.cy - b.cy)
    assert.equal(back.length, BACK_COUNT)
    const ratios = []
    for (let i = 0; i < back.length - 1; i++) {
      const a = back[i]
      const b = back[i + 1]
      const d = Math.hypot(a.cx - b.cx, a.cy - b.cy)
      ratios.push(d / ((a.size + b.size) / 2))
    }
    // 중간 뒷줄 간격은 목표에 가깝다
    const mid = ratios.slice(1, -1)
    assert.ok(mid.length >= 1)
    for (const r of mid) {
      assert.ok(Math.abs(r - BACK_GAP_RATIO_TARGET) < 0.05, 'ratio=' + r)
    }
    assert.ok(back.every((s) => s.size === BEAD_BACK_DISPLAY))
  })

  it('슬롯 수=체인 각도 · 비드 배열=fixedDrawOrder', () => {
    assert.equal(buildChainAngles().length, SLOT_COUNT)
    const beads = createChainBeads({ e3SplitSrc: true })
    assert.equal(beads.length, SLOT_COUNT)
    assert.deepEqual(
      beads.map((b) => b.homeSlot),
      fixedDrawOrder({ e3SplitSrc: true })
    )
  })

  it('버퍼 존재 · 홈 스냅 불변 id', () => {
    assert.ok(bufferSlotIndices({ e3SplitSrc: true }).length >= 2)
    const beads = createChainBeads({ e3SplitSrc: true })
    const ids = beads.map((b) => b.id)
    const snapped = snapBeadsHome(beads, { e3SplitSrc: true })
    assert.deepEqual(
      snapped.map((b) => b.id),
      ids
    )
  })
})

describe('keyframe coverage', () => {
  it('100% 프레임 vs 홈 스냅 커버리지', () => {
    assert.equal(CHAIN_ANIM_MS, 150)
    assert.equal(keyframeEndCoverageMatchesSnap(1, { e3SplitSrc: true }).ok, true)
  })

  it('layoutRing t=0 과 t=1 박스 수 동일', () => {
    const a = layoutRing({
      ...DEFAULT_RING,
      e3SplitSrc: true,
      shiftProgress: pathProgressAtTime(0),
      chainDir: 1
    })
    const b = layoutRing({
      ...DEFAULT_RING,
      e3SplitSrc: true,
      shiftProgress: pathProgressAtTime(1),
      chainDir: 1
    })
    assert.equal(a.length, b.length)
    assert.equal(a.length, SLOT_COUNT)
  })
})
