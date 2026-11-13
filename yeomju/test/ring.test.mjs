/**
 * 염주 고리 2.0.0 — 레인 헬퍼·v2 이미지·키프레임
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  CHAIN_ANIM_END_SLACK_MS,
  BEAD_SRC,
  JS_FRAME_MS,
  phaseFromBead,
  nextPhase,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  createChainBeads,
  advanceChainBeads,
  advanceChainBeadsWithAnim,
  rollClassForSlot,
  transformAtProgress,
  pathProgressAtTime,
  easeOutCubic,
  focusDeltaYOnAdvance,
  frontLaneShiftY,
  backLaneShiftY,
  splitChainLanes,
  laneClassForDir,
  tyStyle
} from '../src/common/ring.js'
import {
  SHARED_KEYFRAME_PCTS,
  buildChainKeyframeCss,
  pathProgressesAtTime,
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

describe('2.0.0 assets / timing', () => {
  it('bead-wood-v3 경로', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood-v3.png')
    assert.ok(createChainBeads().every((b) => b.src === BEAD_SRC))
  })
  it('duration·slack·JS 16ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 180 && CHAIN_ANIM_MS <= 200)
    assert.ok(CHAIN_ANIM_END_SLACK_MS >= 8)
    assert.equal(JS_FRAME_MS, 16)
  })
  it('SWIPE_MIN_DY', () => {
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
  })
})

describe('레인 Mode E/D', () => {
  it('앞열 이동 = focusDelta, 뒤열 반대·축소', () => {
    assert.equal(frontLaneShiftY(1), focusDeltaYOnAdvance())
    assert.ok(frontLaneShiftY(1) < 0)
    assert.ok(backLaneShiftY(1) > 0)
    assert.ok(Math.abs(backLaneShiftY(1)) < Math.abs(frontLaneShiftY(1)))
  })
  it('splitChainLanes 앞·뒤 분리', () => {
    const { frontBeads, backBeads } = splitChainLanes(createChainBeads())
    assert.ok(frontBeads.length >= 2)
    assert.ok(backBeads.length >= 2)
    assert.ok(frontBeads.every((b) => b.depth >= 0.55))
    assert.ok(backBeads.every((b) => b.depth < 0.55))
  })
  it('laneClassForDir', () => {
    assert.equal(laneClassForDir('front', 1), 'lane-front-up')
    assert.equal(laneClassForDir('back', 1), 'lane-back-up')
    assert.equal(tyStyle(0), '')
    assert.ok(tyStyle(-10).includes('-10px'))
  })
})

describe('키프레임(A 비교용)', () => {
  it('SHARED + 동일 진행률', () => {
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 0.25, 0.5, 0.75, 1])
    assert.equal(pathProgressAtTime(0.5), easeOutCubic(0.5))
    const p = pathProgressesAtTime(0.5)
    assert.ok(p.every((x) => x === pathProgressAtTime(0.5)))
  })
  it('CSS linear·스냅', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('linear'))
    assert.ok(!css.includes('ease-out'))
    const slots = layoutChainSlots()
    assert.ok(snapMatchesEndKeyframe(slots[0], slots[1]))
  })
})

describe('chain beads', () => {
  it('advance / withAnim', () => {
    const a = createChainBeads()
    const b = advanceChainBeads(a, 1)
    assert.equal(b.find((x) => x.id === 'b0').slot, 1)
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
    const c = advanceChainBeadsWithAnim(a, 1, 1)
    assert.equal(c.find((x) => x.id === 'b0').animClass, 'roll-next-1')
  })
  it('layoutRing 포커스', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.equal(VIRTUAL_BEADS, 12)
    assert.equal(SLOT_COUNT, 8)
    assert.equal(DEFAULT_RING.maxSize, 228)
    assert.ok(transformAtProgress)
  })
})
