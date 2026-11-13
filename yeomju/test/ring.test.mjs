/**
 * 염주 고리 1.7.0 — 단일 구간 / 베이크드 ease 테스트
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
  layoutChainSlots,
  layoutRing,
  createChainBeads,
  advanceChainBeads,
  rollClassForSlot,
  isCurveTransition,
  transformAtProgress,
  snapMatchesEndKeyframe,
  buildChainKeyframeCss,
  easeOutCubic,
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

describe('1.7.0 timing / slots', () => {
  it('duration 220~260ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 220 && CHAIN_ANIM_MS <= 260)
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
  it('easeOutCubic', () => {
    assert.equal(easeOutCubic(0), 0)
    assert.equal(easeOutCubic(1), 1)
    assert.ok(easeOutCubic(0.5) > 0.5)
  })
})

describe('2단 이동 방지 키프레임', () => {
  it('앞열 직선은 curve 아님', () => {
    const slots = layoutChainSlots()
    assert.equal(isCurveTransition(slots[0], slots[1]), false)
    assert.equal(isCurveTransition(slots[7], slots[0]), false)
  })
  it('가장자리는 curve', () => {
    const slots = layoutChainSlots()
    assert.equal(isCurveTransition(slots[2], slots[3]), true)
  })
  it('CSS: 직선은 0/100+ease-out, 곡선은 다점+linear', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('animation-duration: 240ms'))
    // next-0 직선
    assert.match(css, /\.roll-next-0 \{[\s\S]*?ease-out/)
    assert.match(css, /@keyframes kf-next-0 \{[\s\S]*?0%[\s\S]*?100%/)
    assert.ok(!/@keyframes kf-next-0 \{[^}]*50%/.test(css))
    // next-2 곡선
    assert.match(css, /\.roll-next-2 \{[\s\S]*?linear/)
    assert.ok(css.includes('@keyframes kf-next-2'))
    assert.ok(css.includes('25%'))
    assert.ok(css.includes('75%'))
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
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
  })
})
