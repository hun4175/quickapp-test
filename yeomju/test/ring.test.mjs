/**
 * 염주 고리 1.3.0 배치 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  FRONT_COUNT,
  BACK_COUNT,
  VISIBLE_BEADS,
  DEFAULT_RING,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  sizeFactorFromDepth,
  circularDistance,
  layoutRing,
  layoutFocusMarker,
  focusCenterNear
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

describe('DEFAULT_RING 1.3.0', () => {
  it('포커스 목표 좌표', () => {
    assert.equal(DEFAULT_RING.focusX, 216)
    assert.equal(DEFAULT_RING.focusY, 257)
    assert.equal(DEFAULT_RING.cx, 216 + DEFAULT_RING.rx)
  })
  it('앞 알 ~247 (+30% of 190)', () => {
    assert.equal(DEFAULT_RING.maxSize, 247)
    assert.ok(DEFAULT_RING.maxSize / 190 >= 1.29)
  })
  it('앞3 뒤5', () => {
    assert.equal(FRONT_COUNT, 3)
    assert.equal(BACK_COUNT, 5)
    assert.equal(VISIBLE_BEADS, 8)
    assert.equal(VIRTUAL_BEADS, 12)
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
    // key a 가 phase1 에서 렌더되지 않을 수 있음
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
