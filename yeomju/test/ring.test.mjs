/**
 * 염주 고리 배치·위상 단위 테스트
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VISIBLE_BEADS,
  phaseFromBead,
  nextPhase,
  depthAtAngle,
  layoutRing,
  layoutFocusMarker
} from '../src/common/ring.js'

describe('phase', () => {
  it('phaseFromBead 는 visible 로 순환', () => {
    assert.equal(phaseFromBead(0, 16), 0)
    assert.equal(phaseFromBead(15, 16), 15)
    assert.equal(phaseFromBead(16, 16), 0)
    assert.equal(phaseFromBead(26, 16), 10)
  })

  it('nextPhase 한 칸 전진', () => {
    assert.equal(nextPhase(0, 16), 1)
    assert.equal(nextPhase(15, 16), 0)
  })
})

describe('depthAtAngle', () => {
  it('왼쪽(π)이 앞, 오른쪽(0)이 뒤', () => {
    assert.ok(depthAtAngle(Math.PI) > 0.99)
    assert.ok(depthAtAngle(0) < 0.01)
    assert.ok(Math.abs(depthAtAngle(Math.PI / 2) - 0.5) < 0.001)
  })
})

describe('layoutRing', () => {
  it('visible 개수만큼 알을 반환', () => {
    const items = layoutRing({ visible: 16, phaseIndex: 0 })
    assert.equal(items.length, 16)
  })

  it('depth 오름차순(뒤→앞) 정렬', () => {
    const items = layoutRing({ visible: 16, phaseIndex: 3 })
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i].z >= items[i - 1].z)
    }
  })

  it('포커스 알은 왼쪽 근처에 있고 gem src', () => {
    const items = layoutRing({
      visible: 16,
      phaseIndex: 5,
      cx: 180,
      cy: 190,
      rx: 78,
      ry: 152
    })
    const focused = items.filter((b) => b.focused)
    assert.equal(focused.length, 1)
    assert.equal(focused[0].src, '/common/bead-gem.png')
    // 포커스는 왼쪽 → center 보다 left 가 작음
    assert.ok(focused[0].left + focused[0].size / 2 < 180)
  })

  it('위상이 바뀌면 같은 key 알의 좌표가 변함', () => {
    const a = layoutRing({ visible: 16, phaseIndex: 0 }).find((b) => b.key === 0)
    const b = layoutRing({ visible: 16, phaseIndex: 1 }).find((b) => b.key === 0)
    assert.ok(a.left !== b.left || a.top !== b.top)
  })

  it('모든 알 크기는 min~max 사이', () => {
    const items = layoutRing({
      visible: 12,
      phaseIndex: 0,
      minSize: 20,
      maxSize: 58
    })
    items.forEach((b) => {
      assert.ok(b.size >= 20 && b.size <= 58)
    })
  })
})

describe('layoutFocusMarker', () => {
  it('왼쪽 앞 위치에 마커', () => {
    const m = layoutFocusMarker({ cx: 180, cy: 190, rx: 78, maxSize: 58 })
    assert.ok(m.size > 58)
    assert.ok(m.left + m.size / 2 < 180)
  })
})

describe('VISIBLE_BEADS', () => {
  it('기본 가시 알 수', () => {
    assert.equal(VISIBLE_BEADS, 16)
  })
})
