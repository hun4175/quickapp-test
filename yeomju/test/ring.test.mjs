/**
 * 염주 고리 1.6.0 — 체인 슬롯 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  VISIBLE_BEADS,
  DEFAULT_RING,
  CHAIN_DIR,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  sizeFactorFromDepth,
  chainStepY,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  layoutRing,
  createChainBeads,
  advanceChainBeads,
  rollClassForSlot,
  slotTransition,
  focusCenterNear,
  focusDeltaYOnAdvance,
  buildChainKeyframeCss
} from '../src/common/ring.js'

describe('phase', () => {
  it('phaseFromBead 순환', () => {
    assert.equal(phaseFromBead(0, 12), 0)
    assert.equal(phaseFromBead(12, 12), 0)
    assert.equal(nextPhase(11, 12), 0)
  })
})

describe('depth / size', () => {
  it('왼쪽이 앞', () => {
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.ok(depthAtAngle(0) < 0.01)
  })
  it('뒤 크기 하한', () => {
    assert.ok(sizeFactorFromDepth(0) >= 0.4)
  })
})

describe('1.6.0 slots', () => {
  it('슬롯 6~8개', () => {
    assert.ok(SLOT_COUNT >= 6 && SLOT_COUNT <= 8)
    assert.equal(VISIBLE_BEADS, SLOT_COUNT)
    assert.equal(layoutChainSlots().length, SLOT_COUNT)
  })
  it('포커스 슬롯 0 중앙', () => {
    const s = layoutChainSlots()[0]
    assert.ok(Math.abs(s.cx - 216) <= 2)
    assert.ok(Math.abs(s.cy - 257) <= 2)
    assert.equal(s.size, DEFAULT_RING.maxSize)
  })
  it('스와이프 위 방향: 슬롯0→1 은 화면 위(음수 Δy)', () => {
    const dy = focusDeltaYOnAdvance()
    assert.ok(dy < 0, `got ${dy}`)
  })
  it('CHAIN_ANIM 150~200ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 150 && CHAIN_ANIM_MS <= 200)
  })
  it('나무 구슬만', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood.png')
    assert.ok(createChainBeads().every((b) => b.src === BEAD_SRC))
  })
})

describe('chain transitions', () => {
  it('rollClassForSlot', () => {
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
    assert.equal(rollClassForSlot(3, -1), 'roll-prev-3')
  })
  it('slotTransition scale/translate', () => {
    const slots = layoutChainSlots()
    const t = slotTransition(slots[0], slots[1])
    assert.ok(t.ty < 0)
    assert.ok(t.scale > 0 && t.scale <= 1.01)
    assert.ok(t.mid)
  })
  it('advanceChainBeads 가 슬롯을 dir 만큼 이동', () => {
    const a = createChainBeads()
    const b = advanceChainBeads(a, 1)
    const byId = Object.fromEntries(b.map((x) => [x.id, x]))
    a.forEach((x) => {
      assert.equal(byId[x.id].slot, (x.slot + 1) % SLOT_COUNT)
    })
  })
  it('keyframes CSS 생성', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('@keyframes kf-next-0'))
    assert.ok(css.includes('@keyframes kf-prev-7'))
    assert.ok(css.includes('scale('))
  })
  it('stepPhase / swipe 분류', () => {
    assert.equal(stepPhase(0, 1, 12), 1)
    assert.equal(stepPhase(0, -1, 12), 11)
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, SWIPE_MIN_DY), -1)
    assert.equal(CHAIN_DIR, 1)
    assert.ok(chainStepY() > 0)
    assert.equal(VIRTUAL_BEADS, 12)
  })
})

describe('layoutRing preview', () => {
  it('포커스·나무만', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 })
    assert.equal(items.length, SLOT_COUNT)
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.ok(items.every((b) => b.src === BEAD_SRC))
  })
  it('shiftProgress 중간은 구슬마다 다른 위치', () => {
    const mid = layoutRing({ shiftProgress: 0.5, chainDir: 1 })
    const tops = mid.map((b) => b.top)
    const unique = new Set(tops)
    assert.ok(unique.size >= 4)
  })
})
