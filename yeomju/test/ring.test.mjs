/**
 * 염주 고리 1.5.0 — 고정 슬롯·체인 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  FRONT_COUNT,
  BACK_COUNT,
  VISIBLE_BEADS,
  DEFAULT_RING,
  CHAIN_DIR,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  sizeFactorFromDepth,
  circularDistance,
  chainStepY,
  rollClassForLane,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutRing,
  layoutFixedSlots,
  focusCenterNear,
  focusDeltaYOnAdvance
} from '../src/common/ring.js'

describe('phase', () => {
  it('phaseFromBead 는 virtual 로 순환', () => {
    assert.equal(phaseFromBead(0, 12), 0)
    assert.equal(phaseFromBead(12, 12), 0)
    assert.equal(phaseFromBead(26, 12), 2)
  })

  it('nextPhase', () => {
    assert.equal(nextPhase(11, 12), 0)
  })
})

describe('circularDistance', () => {
  it('원형 최단 거리', () => {
    assert.equal(circularDistance(0, 1, 12), 1)
    assert.equal(circularDistance(0, 11, 12), 1)
    assert.equal(circularDistance(0, 6, 12), 6)
  })
})

describe('depthAtAngle / sizeFactor', () => {
  it('왼쪽이 앞', () => {
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.ok(depthAtAngle(0) < 0.01)
  })
  it('뒤 크기 하한', () => {
    assert.ok(sizeFactorFromDepth(0) >= 0.4)
  })
})

describe('DEFAULT_RING / 타이밍 1.5.0', () => {
  it('포커스 목표 좌표', () => {
    assert.equal(DEFAULT_RING.focusX, 216)
    assert.equal(DEFAULT_RING.focusY, 257)
  })
  it('앞3 뒤3', () => {
    assert.equal(FRONT_COUNT, 3)
    assert.equal(BACK_COUNT, 3)
    assert.equal(VISIBLE_BEADS, 6)
    assert.equal(VIRTUAL_BEADS, 12)
  })
  it('CHAIN_DIR 기본 +1', () => {
    assert.equal(CHAIN_DIR, 1)
  })
  it('애니메이션 150~200ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 150 && CHAIN_ANIM_MS <= 200)
  })
  it('단일 나무 구슬 에셋', () => {
    assert.equal(BEAD_SRC, '/common/bead-wood.png')
  })
})

describe('chain motion', () => {
  it('chainStepY 는 양수', () => {
    assert.ok(chainStepY(DEFAULT_RING.ry, VIRTUAL_BEADS) > 100)
  })

  it('기본 방향: phase++ 시 포커스 알이 위로', () => {
    const dy = focusDeltaYOnAdvance({ ...DEFAULT_RING, phaseIndex: 0, chainDir: 1 })
    assert.ok(dy < 0, `expected up, got ${dy}`)
  })

  it('CHAIN_DIR=-1 이면 아래로', () => {
    const dy = focusDeltaYOnAdvance({ ...DEFAULT_RING, phaseIndex: 0, chainDir: -1 })
    assert.ok(dy > 0, `expected down, got ${dy}`)
  })

  it('앞열·뒤열은 반대 방향 보간', () => {
    const mid = layoutRing({
      ...DEFAULT_RING,
      phaseIndex: 0,
      shiftProgress: 0.5,
      chainDir: 1
    })
    const base = layoutRing({ ...DEFAULT_RING, phaseIndex: 0, shiftProgress: 0, chainDir: 1 })
    const frontKey = base.find((b) => b.lane === 'front' && !b.focused)?.key
    const backKey = base.find((b) => b.lane === 'back')?.key
    if (frontKey != null) {
      const f0 = base.find((b) => b.key === frontKey)
      const f1 = mid.find((b) => b.key === frontKey)
      if (f0 && f1) assert.ok(f1.top < f0.top)
    }
    if (backKey != null) {
      const b0 = base.find((b) => b.key === backKey)
      const b1 = mid.find((b) => b.key === backKey)
      if (b0 && b1) assert.ok(b1.top > b0.top)
    }
  })

  it('rollClassForLane — 레인 단위 클래스', () => {
    assert.equal(rollClassForLane('front', 1), 'lane-roll-up')
    assert.equal(rollClassForLane('back', 1), 'lane-roll-down')
    assert.equal(rollClassForLane('front', -1), 'lane-roll-down')
    assert.equal(rollClassForLane('back', -1), 'lane-roll-up')
  })

  it('stepPhase 양방향', () => {
    assert.equal(stepPhase(0, 1, 12), 1)
    assert.equal(stepPhase(0, -1, 12), 11)
  })

  it('classifyVerticalSwipe 임계값', () => {
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, SWIPE_MIN_DY), -1)
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY + 1), 0)
    assert.equal(classifyVerticalSwipe(80, -50), 0)
  })
})

describe('layoutRing', () => {
  it('렌더 개수 = front + back', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 })
    assert.equal(items.length, FRONT_COUNT + BACK_COUNT)
  })

  it('앞열 3 · 뒤열 3', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 4 })
    assert.equal(items.filter((b) => b.lane === 'front').length, 3)
    assert.equal(items.filter((b) => b.lane === 'back').length, 3)
  })

  it('포커스 중심 (216,257), 이미지는 나무만', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 })
    assert.equal(focusCenterNear(items, 216, 257, 2), true)
    const f = items.find((b) => b.focused)
    assert.equal(f.size, DEFAULT_RING.maxSize)
    assert.equal(f.src, BEAD_SRC)
    assert.ok(items.every((b) => b.src === BEAD_SRC))
  })

  it('위상만 달라도 포커스는 중앙 유지', () => {
    for (let p = 0; p < 12; p++) {
      const items = layoutRing({ ...DEFAULT_RING, phaseIndex: p })
      assert.ok(focusCenterNear(items, 216, 257, 2), `phase ${p}`)
    }
  })
})

describe('layoutFixedSlots', () => {
  it('고정 슬롯 front/back 분리', () => {
    const s = layoutFixedSlots()
    assert.equal(s.front.length, FRONT_COUNT)
    assert.equal(s.back.length, BACK_COUNT)
    assert.ok(s.stepY > 100)
    assert.ok(s.front.every((b) => b.src === BEAD_SRC))
    assert.ok(s.back.every((b) => b.src === BEAD_SRC))
  })
})
