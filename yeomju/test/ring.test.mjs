/**
 * 염주 고리 2.1.0 — 6구슬 플랫 · 0/100 linear
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  VISIBLE_BEADS,
  FRONT_COUNT,
  BACK_COUNT,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  phaseFromBead,
  nextPhase,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  visibleSlotIndices,
  createChainBeads,
  advanceChainBeads,
  advanceChainBeadsWithAnim,
  withRollClasses,
  rollClassForSlot,
  transformAtProgress,
  pathProgressAtTime,
  focusDeltaYOnAdvance
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

describe('2.1.0 render / timing', () => {
  it('6구슬 = 앞3+뒤3', () => {
    assert.equal(FRONT_COUNT, 3)
    assert.equal(BACK_COUNT, 3)
    assert.equal(VISIBLE_BEADS, 6)
    assert.equal(visibleSlotIndices().length, 6)
    assert.equal(createChainBeads().length, 6)
  })
  it('duration ~150ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 140 && CHAIN_ANIM_MS <= 160)
  })
  it('bead-wood-v3', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood-v3.png')
  })
  it('SWIPE', () => {
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, SWIPE_MIN_DY), -1)
  })
})

describe('안정 id · 클래스 토글', () => {
  it('withRollClasses는 id/src/slot 유지', () => {
    const a = createChainBeads()
    const b = withRollClasses(a, 1)
    assert.equal(b.length, a.length)
    for (let i = 0; i < a.length; i++) {
      assert.equal(b[i].id, a[i].id)
      assert.equal(b[i].src, a[i].src)
      assert.equal(b[i].slot, a[i].slot)
      assert.equal(b[i].left, a[i].left)
    }
  })
  it('advance 후 id·길이 유지, src 유지', () => {
    const a = createChainBeads()
    const ids = a.map((x) => x.id).join(',')
    const b = advanceChainBeads(a, 1)
    assert.equal(b.length, 6)
    assert.equal(b.map((x) => x.id).join(','), ids)
    assert.ok(b.every((x) => x.src === BEAD_SRC))
    assert.ok(b.every((x) => x.animClass === ''))
  })
  it('advanceWithAnim', () => {
    const a = createChainBeads()
    const b = advanceChainBeadsWithAnim(a, 1, 1)
    assert.equal(b[0].id, a[0].id)
    assert.ok(typeof b[0].animClass === 'string')
  })
})

describe('키프레임 0/100 linear', () => {
  it('SHARED = 0,1', () => {
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 1])
    assert.equal(pathProgressAtTime(0.5), 0.5)
  })
  it('CSS: 150ms linear, 25% 없음', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('animation-duration: 150ms'))
    assert.ok(css.includes('linear'))
    assert.ok(!css.includes('ease-out'))
    assert.ok(!css.includes('25%'))
    assert.ok(!css.includes('50%'))
    assert.ok(!css.includes('75%'))
    const slots = layoutChainSlots()
    assert.ok(snapMatchesEndKeyframe(slots[0], slots[1]))
  })
})

describe('layout', () => {
  it('포커스·rollClass', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
    assert.equal(VIRTUAL_BEADS, 12)
    assert.equal(SLOT_COUNT, 8)
    assert.ok(focusDeltaYOnAdvance() < 0)
    assert.ok(transformAtProgress)
    assert.equal(DEFAULT_RING.maxSize, 228)
  })
})
