/**
 * 염주 고리 1.9.0 — 동일 타이밍 + 진단 헬퍼 테스트
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
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  SHARED_KEYFRAME_PCTS,
  JS_FRAME_MS,
  JS_FRAME_BEAD_COUNT,
  layoutChainSlots,
  layoutRing,
  createChainBeads,
  advanceChainBeads,
  advanceChainBeadsWithAnim,
  rollClassForSlot,
  transformAtProgress,
  snapMatchesEndKeyframe,
  buildChainKeyframeCss,
  easeOutCubic,
  pathProgressAtTime,
  pathProgressesAtTime,
  containerShiftY,
  sampleChainBeadsAtTime,
  focusDeltaYOnAdvance,
  focusCenterNear
} from '../src/common/ring.js'

describe('phase', () => {
  it('순환', () => {
    assert.equal(phaseFromBead(12, 12), 0)
    assert.equal(nextPhase(11, 12), 0)
    assert.equal(stepPhase(0, -1, 12), 11)
  })
})

describe('1.9.0 timing / swipe', () => {
  it('duration 180~200ms + end slack', () => {
    assert.ok(CHAIN_ANIM_MS >= 180 && CHAIN_ANIM_MS <= 200)
    assert.ok(CHAIN_ANIM_END_SLACK_MS >= 8 && CHAIN_ANIM_END_SLACK_MS <= 32)
  })
  it('SWIPE_MIN_DY 20~25', () => {
    assert.ok(SWIPE_MIN_DY >= 20 && SWIPE_MIN_DY <= 25)
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
  })
  it('나무 경로 유지', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood.png')
  })
  it('pathProgressAtTime = easeOutCubic', () => {
    assert.equal(pathProgressAtTime(0.5), easeOutCubic(0.5))
  })
})

describe('전 구슬 동일 타이밍', () => {
  it('SHARED_KEYFRAME_PCTS', () => {
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 0.25, 0.5, 0.75, 1])
  })
  it('임의 t 경로 진행률 동일', () => {
    for (const t of [0, 0.25, 0.5, 1]) {
      const progresses = pathProgressesAtTime(t)
      const u = pathProgressAtTime(t)
      assert.ok(progresses.every((p) => p === u))
    }
  })
  it('CSS 전 클래스 linear', () => {
    const css = buildChainKeyframeCss()
    assert.equal((css.match(/animation-timing-function: linear/g) || []).length, 16)
    assert.ok(!css.includes('ease-out'))
  })
  it('100% = 스냅', () => {
    const slots = layoutChainSlots()
    for (let i = 0; i < slots.length; i++) {
      assert.ok(snapMatchesEndKeyframe(slots[i], slots[(i + 1) % slots.length]))
    }
  })
})

describe('1.9.0 진단 헬퍼', () => {
  it('advanceChainBeadsWithAnim 스냅+다음 클래스 동시', () => {
    const a = createChainBeads()
    const b = advanceChainBeadsWithAnim(a, 1, 1)
    assert.equal(b.find((x) => x.id === 'b0').slot, 1)
    assert.equal(b.find((x) => x.id === 'b0').animClass, 'roll-next-1')
    const c = advanceChainBeadsWithAnim(a, 1, null)
    assert.equal(c.find((x) => x.id === 'b0').animClass, '')
  })
  it('containerShiftY 방향', () => {
    assert.ok(containerShiftY(1) < 0)
    assert.equal(containerShiftY(-1), -containerShiftY(1))
  })
  it('sampleChainBeadsAtTime 6구슬·끝점 근접', () => {
    assert.equal(JS_FRAME_BEAD_COUNT, 6)
    assert.ok(JS_FRAME_MS >= 16 && JS_FRAME_MS <= 33)
    const a = createChainBeads()
    const mid = sampleChainBeadsAtTime(a, 1, 0.5)
    assert.equal(mid.length, a.length)
    const end = sampleChainBeadsAtTime(a, 1, 1)
    const snapped = advanceChainBeads(a, 1)
    const focus = end.find((x) => x.id === snapped.find((s) => s.slot === 0).id)
    const snapFocus = snapped.find((s) => s.slot === 0)
    assert.ok(Math.abs(focus.left - snapFocus.left) <= 2)
    assert.ok(Math.abs(focus.top - snapFocus.top) <= 2)
  })
})

describe('chain beads', () => {
  it('advance / rollClass', () => {
    const a = createChainBeads()
    const b = advanceChainBeads(a, 1)
    assert.equal(b.find((x) => x.id === 'b0').slot, 1)
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
  })
  it('layoutRing 포커스', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.equal(VIRTUAL_BEADS, 12)
    assert.equal(SLOT_COUNT, 8)
    assert.equal(DEFAULT_RING.maxSize, 228)
    assert.ok(focusDeltaYOnAdvance() < 0)
    assert.ok(transformAtProgress)
  })
})
