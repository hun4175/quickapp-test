/**
 * 염주 고리 1.8.0 — 동일 타이밍 곡선 / touchmove 임계값 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  SHARED_KEYFRAME_PCTS,
  layoutChainSlots,
  layoutRing,
  createChainBeads,
  advanceChainBeads,
  rollClassForSlot,
  transformAtProgress,
  snapMatchesEndKeyframe,
  buildChainKeyframeCss,
  easeOutCubic,
  pathProgressAtTime,
  pathProgressesAtTime,
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

describe('1.8.0 timing / swipe', () => {
  it('duration 180~200ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 180 && CHAIN_ANIM_MS <= 200)
  })
  it('SWIPE_MIN_DY 20~25', () => {
    assert.ok(SWIPE_MIN_DY >= 20 && SWIPE_MIN_DY <= 25)
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, -(SWIPE_MIN_DY - 1)), 0)
  })
  it('슬롯 8, 포커스 중앙, 위 방향', () => {
    assert.equal(SLOT_COUNT, 8)
    const s = layoutChainSlots()[0]
    assert.ok(Math.abs(s.cx - 216) <= 2)
    assert.ok(focusDeltaYOnAdvance() < 0)
  })
  it('나무만', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood.png')
  })
  it('pathProgressAtTime = easeOutCubic', () => {
    assert.equal(pathProgressAtTime(0), 0)
    assert.equal(pathProgressAtTime(1), 1)
    assert.equal(pathProgressAtTime(0.5), easeOutCubic(0.5))
    assert.ok(pathProgressAtTime(0.5) > 0.5)
  })
})

describe('전 구슬 동일 타이밍', () => {
  it('SHARED_KEYFRAME_PCTS 0/25/50/75/100', () => {
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 0.25, 0.5, 0.75, 1])
  })
  it('임의 t 에서 모든 구슬 경로 진행률 동일', () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const progresses = pathProgressesAtTime(t)
      assert.equal(progresses.length, SLOT_COUNT)
      const u = pathProgressAtTime(t)
      assert.ok(progresses.every((p) => p === u), `t=${t}`)
    }
  })
  it('CSS: 전 클래스 linear + 다점 키프레임 + delay 0 + 동일 duration', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes(`animation-duration: ${CHAIN_ANIM_MS}ms`))
    assert.equal((css.match(/animation-timing-function: linear/g) || []).length, 16)
    assert.equal((css.match(/animation-delay: 0ms/g) || []).length, 16)
    assert.ok(!css.includes('ease-out'))
    assert.ok(css.includes('25%'))
    assert.ok(css.includes('50%'))
    assert.ok(css.includes('75%'))
    // 앞열·가장자리 모두 동일 퍼센트 세트
    assert.match(css, /@keyframes kf-next-0 \{[\s\S]*?25%[\s\S]*?50%[\s\S]*?75%[\s\S]*?100%/)
    assert.match(css, /@keyframes kf-next-2 \{[\s\S]*?25%[\s\S]*?50%[\s\S]*?75%[\s\S]*?100%/)
  })
  it('100% 키프레임 = 스냅 기하', () => {
    const slots = layoutChainSlots()
    for (let i = 0; i < slots.length; i++) {
      const to = slots[(i + 1) % slots.length]
      assert.ok(snapMatchesEndKeyframe(slots[i], to), `snap ${i}`)
      const tr = transformAtProgress(slots[i], to, 1)
      assert.equal(tr.tx, to.cx - slots[i].cx)
      assert.equal(tr.ty, to.cy - slots[i].cy)
    }
  })
})

describe('chain beads', () => {
  it('advance / rollClass', () => {
    const a = createChainBeads()
    const b = advanceChainBeads(a, 1)
    assert.equal(b.find((x) => x.id === 'b0').slot, 1)
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
    assert.ok(b.every((x) => x.animClass === ''))
  })
  it('layoutRing 포커스', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.equal(VIRTUAL_BEADS, 12)
    assert.equal(DEFAULT_RING.maxSize, 228)
  })
})
