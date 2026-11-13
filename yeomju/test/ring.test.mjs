/**
 * 염주 고리 배치·위상 단위 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VISIBLE_BEADS,
  DEFAULT_RING,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  sizeFactorFromDepth,
  layoutRing,
  layoutFocusMarker
} from '../src/common/ring.js'

describe('phase', () => {
  it('phaseFromBead 는 visible 로 순환', () => {
    assert.equal(phaseFromBead(0, 12), 0)
    assert.equal(phaseFromBead(11, 12), 11)
    assert.equal(phaseFromBead(12, 12), 0)
    assert.equal(phaseFromBead(26, 12), 2)
  })

  it('nextPhase 한 칸 전진', () => {
    assert.equal(nextPhase(0, 12), 1)
    assert.equal(nextPhase(11, 12), 0)
  })
})

describe('depthAtAngle', () => {
  it('왼쪽(π)이 앞, 오른쪽(0)이 뒤', () => {
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.ok(depthAtAngle(0) < 0.01)
    assert.ok(Math.abs(depthAtAngle(Math.PI / 2) - 0.5) < 0.001)
  })
})

describe('sizeFactorFromDepth', () => {
  it('뒤쪽도 0보다 큰 하한', () => {
    assert.ok(sizeFactorFromDepth(0) >= 0.15)
    assert.equal(sizeFactorFromDepth(1), 1)
  })
})

describe('DEFAULT_RING 대형 구슬', () => {
  it('앞 알이 화면 폭의 약 40~50%', () => {
    const ratio = DEFAULT_RING.maxSize / DEFAULT_RING.screenW
    assert.ok(ratio >= 0.4 && ratio <= 0.5, `ratio=${ratio}`)
  })

  it('뒤 알 하한이 점 수준이 아님', () => {
    assert.ok(DEFAULT_RING.minSize >= 80)
    assert.ok(DEFAULT_RING.minSize / DEFAULT_RING.maxSize >= 0.45)
  })
})

describe('layoutRing', () => {
  it('visible 개수만큼 알을 반환', () => {
    const items = layoutRing({ visible: VISIBLE_BEADS, phaseIndex: 0 })
    assert.equal(items.length, VISIBLE_BEADS)
  })

  it('depth 오름차순(뒤→앞) 정렬 — stack 위 그리기용', () => {
    const items = layoutRing({ visible: VISIBLE_BEADS, phaseIndex: 3 })
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].z >= items[i - 1].z)
    }
  })

  it('포커스 알은 gem 이고 크기가 가장 큰 편', () => {
    const items = layoutRing({ ...DEFAULT_RING, visible: 12, phaseIndex: 5 })
    const focused = items.filter((b) => b.focused)
    assert.equal(focused.length, 1)
    assert.equal(focused[0].src, '/common/bead-gem.png')
    assert.ok(focused[0].size >= DEFAULT_RING.maxSize - 2)
  })

  it('인접 알이 겹칠 수 있는 크기(중심 거리 < 반지름 합)', () => {
    const items = layoutRing({ ...DEFAULT_RING, visible: 12, phaseIndex: 0 })
    // 정렬 전 key 순으로 재구성해 인접 비교
    const byKey = [...items].sort((a, b) => a.key - b.key)
    let overlaps = 0
    for (let i = 0; i < byKey.length; i++) {
      const a = byKey[i]
      const b = byKey[(i + 1) % byKey.length]
      const ax = a.left + a.size / 2
      const ay = a.top + a.size / 2
      const bx = b.left + b.size / 2
      const by = b.top + b.size / 2
      const dist = Math.hypot(ax - bx, ay - by)
      if (dist < (a.size + b.size) / 2) overlaps += 1
    }
    assert.ok(overlaps >= 6, `overlaps=${overlaps}`)
  })

  it('위상이 바뀌면 같은 key 알의 좌표가 변함', () => {
    const a = layoutRing({ visible: 12, phaseIndex: 0 }).find((b) => b.key === 0)
    const b = layoutRing({ visible: 12, phaseIndex: 1 }).find((b) => b.key === 0)
    assert.ok(a.left !== b.left || a.top !== b.top)
  })

  it('모든 알 크기는 min~max 사이(크기 곡선 적용)', () => {
    const items = layoutRing({ ...DEFAULT_RING, visible: 12, phaseIndex: 0 })
    items.forEach((b) => {
      assert.ok(b.size >= DEFAULT_RING.minSize && b.size <= DEFAULT_RING.maxSize)
    })
  })

  it('일부 알이 화면(0..432) 밖으로 나감', () => {
    const items = layoutRing({ ...DEFAULT_RING, visible: 12, phaseIndex: 0 })
    const off = items.some(
      (b) => b.left < 0 || b.top < 0 || b.left + b.size > 432 || b.top + b.size > 514
    )
    assert.equal(off, true)
  })
})

describe('layoutFocusMarker', () => {
  it('앞 알보다 큰 호', () => {
    const m = layoutFocusMarker(DEFAULT_RING)
    assert.ok(m.size > DEFAULT_RING.maxSize)
  })
})

describe('VISIBLE_BEADS', () => {
  it('기본 가시 알 수', () => {
    assert.equal(VISIBLE_BEADS, 12)
  })
})
