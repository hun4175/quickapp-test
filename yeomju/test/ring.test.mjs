/**
 * 염주 고리 1.4.0 — 체인 한 칸 이동 테스트
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
  FOCUS_FLASH_MS,
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
  layoutFocusMarker,
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

describe('DEFAULT_RING / 타이밍', () => {
  it('포커스 목표 좌표', () => {
    assert.equal(DEFAULT_RING.focusX, 216)
    assert.equal(DEFAULT_RING.focusY, 257)
    assert.equal(DEFAULT_RING.cx, 216 + DEFAULT_RING.rx)
  })
  it('앞 알 ~247', () => {
    assert.equal(DEFAULT_RING.maxSize, 247)
  })
  it('앞3 뒤5', () => {
    assert.equal(FRONT_COUNT, 3)
    assert.equal(BACK_COUNT, 5)
    assert.equal(VISIBLE_BEADS, 8)
    assert.equal(VIRTUAL_BEADS, 12)
  })
  it('CHAIN_DIR 기본은 앞열 위(+1)', () => {
    assert.equal(CHAIN_DIR, 1)
  })
  it('애니메이션 150~200ms', () => {
    assert.ok(CHAIN_ANIM_MS >= 150 && CHAIN_ANIM_MS <= 200)
    assert.ok(FOCUS_FLASH_MS > 0 && FOCUS_FLASH_MS <= 200)
  })
})

describe('chain motion', () => {
  it('chainStepY 는 양수', () => {
    assert.ok(chainStepY(DEFAULT_RING.ry, VIRTUAL_BEADS) > 100)
  })

  it('기본 방향: phase++ 시 포커스 알이 위로(음수 Δy)', () => {
    const dy = focusDeltaYOnAdvance({ ...DEFAULT_RING, phaseIndex: 0, chainDir: 1 })
    assert.ok(dy < 0, `expected up (neg y), got ${dy}`)
  })

  it('CHAIN_DIR=-1 이면 포커스 알이 아래로(양수 Δy)', () => {
    const dy = focusDeltaYOnAdvance({ ...DEFAULT_RING, phaseIndex: 0, chainDir: -1 })
    assert.ok(dy > 0, `expected down (pos y), got ${dy}`)
  })

  it('앞열·뒤열은 반대 방향 보간', () => {
    const step = chainStepY(DEFAULT_RING.ry, VIRTUAL_BEADS)
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
      if (f0 && f1) assert.ok(f1.top < f0.top, '앞열은 위로')
    }
    if (backKey != null) {
      const b0 = base.find((b) => b.key === backKey)
      const b1 = mid.find((b) => b.key === backKey)
      if (b0 && b1) assert.ok(b1.top > b0.top, '뒤열은 아래로')
    }
    assert.ok(step > 0)
  })

  it('rollClassForLane 이 CHAIN_DIR 을 따름', () => {
    assert.equal(rollClassForLane('front', 1), 'bead-roll-front-up')
    assert.equal(rollClassForLane('back', 1), 'bead-roll-back-down')
    assert.equal(rollClassForLane('front', -1), 'bead-roll-front-down')
    assert.equal(rollClassForLane('back', -1), 'bead-roll-back-up')
  })

  it('stepPhase 양방향', () => {
    assert.equal(stepPhase(0, 1, 12), 1)
    assert.equal(stepPhase(0, -1, 12), 11)
  })

  it('classifyVerticalSwipe 임계값·세로 우선', () => {
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

  it('앞열 3 · 뒤열 5', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 4 })
    assert.equal(items.filter((b) => b.lane === 'front').length, 3)
    assert.equal(items.filter((b) => b.lane === 'back').length, 5)
  })

  it('포커스 알 중심이 (216,257)', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 })
    assert.equal(focusCenterNear(items, 216, 257, 2), true)
    const f = items.find((b) => b.focused)
    assert.equal(f.size, DEFAULT_RING.maxSize)
    assert.equal(f.src, '/common/bead-gem.png')
  })

  it('위상만 달라도 포커스는 중앙 유지', () => {
    for (let p = 0; p < 12; p++) {
      const items = layoutRing({ ...DEFAULT_RING, phaseIndex: p })
      assert.ok(focusCenterNear(items, 216, 257, 2), `phase ${p}`)
    }
  })

  it('depth 오름차순(앞이 위)', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 2 })
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].z >= items[i - 1].z)
    }
  })

  it('앞열 위·아래 알이 화면 밖으로 일부 잘림', () => {
    const items = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 })
    const front = items.filter((b) => b.lane === 'front' && !b.focused)
    assert.equal(front.length, 2)
    const clipped = front.some((b) => b.top < 0 || b.top + b.size > 514)
    assert.equal(clipped, true)
  })

  it('위상이 바뀌면 비포커스 key 좌표가 변함', () => {
    const a = layoutRing({ ...DEFAULT_RING, phaseIndex: 0 }).find((b) => !b.focused)
    const b = layoutRing({ ...DEFAULT_RING, phaseIndex: 1 }).find((b) => b.key === a.key)
    if (b) {
      assert.ok(a.left !== b.left || a.top !== b.top)
    } else {
      assert.ok(true)
    }
  })
})

describe('layoutFocusMarker', () => {
  it('중앙 기준 알을 감쌈', () => {
    const m = layoutFocusMarker(DEFAULT_RING)
    assert.ok(m.size > DEFAULT_RING.maxSize)
    assert.ok(Math.abs(m.left + m.size / 2 - 216) < 1)
    assert.ok(Math.abs(m.top + m.size / 2 - 257) < 1)
  })
})
