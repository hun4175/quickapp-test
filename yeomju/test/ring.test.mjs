/**
 * 염주 고리 2.2.0 — ≤10노드 플랫 · 화면 밖 버퍼 · 0/100 linear
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  VISIBLE_BEADS,
  FRONT_COUNT,
  BACK_COUNT,
  BUFFER_BEADS,
  RENDER_BEADS,
  MAX_RENDER_NODES,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  phaseFromBead,
  nextPhase,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  visibleSlotIndices,
  renderSlotIndices,
  bufferSlotIndices,
  onScreenSlotIndices,
  isSlotFullyOffScreen,
  createChainBeads,
  advanceChainBeads,
  advanceChainBeadsWithAnim,
  withRollClasses,
  rollClassForSlot,
  shouldAnimateTransition,
  transformAtProgress,
  pathProgressAtTime,
  focusDeltaYOnAdvance
} from '../src/common/ring.js'
import {
  SHARED_KEYFRAME_PCTS,
  buildChainKeyframeCss,
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

describe('2.2.0 render / buffers', () => {
  it('노드 ≤10, 슬롯 10, 버퍼 4', () => {
    assert.equal(SLOT_COUNT, 10)
    assert.equal(FRONT_COUNT, 3)
    assert.equal(BACK_COUNT, 3)
    assert.equal(VISIBLE_BEADS, 6)
    assert.equal(BUFFER_BEADS, 4)
    assert.equal(RENDER_BEADS, 10)
    assert.equal(MAX_RENDER_NODES, 10)
    assert.ok(createChainBeads().length <= MAX_RENDER_NODES)
    assert.equal(createChainBeads().length, 10)
    assert.equal(renderSlotIndices().length, 10)
    assert.equal(visibleSlotIndices().length, 10)
    assert.equal(bufferSlotIndices().length, 4)
    assert.equal(onScreenSlotIndices().length, 6)
  })

  it('버퍼 슬롯 AABB가 화면 경계 밖(수치)', () => {
    const W = DEFAULT_RING.screenW
    const H = DEFAULT_RING.screenH
    const slots = layoutChainSlots()
    const buf = new Set(bufferSlotIndices())
    assert.ok(buf.size >= 4)
    for (const s of slots) {
      if (!buf.has(s.index)) continue
      const out =
        s.left + s.size <= 0 ||
        s.top + s.size <= 0 ||
        s.left >= W ||
        s.top >= H
      assert.equal(isSlotFullyOffScreen(s), true)
      assert.equal(out, true, `slot ${s.index} L${s.left} T${s.top} S${s.size}`)
    }
  })

  it('앞↔뒤 랩 전이(2→3, 7→8)는 양끝 모두 화면 밖', () => {
    const slots = layoutChainSlots()
    const wrapPairs = [
      [2, 3],
      [7, 8],
      [3, 2],
      [8, 7]
    ]
    for (const [a, b] of wrapPairs) {
      assert.equal(isSlotFullyOffScreen(slots[a]), true)
      assert.equal(isSlotFullyOffScreen(slots[b]), true)
      assert.equal(shouldAnimateTransition(slots[a], slots[b]), false)
    }
  })

  it('duration ~150ms · bead-wood-v3 · SWIPE', () => {
    assert.ok(CHAIN_ANIM_MS >= 140 && CHAIN_ANIM_MS <= 160)
    assert.equal(BEAD_SRC, '/common/bead-wood-v3.png')
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(classifyVerticalSwipe(0, SWIPE_MIN_DY), -1)
  })
})

describe('안정 id · 화면 안 텔레포트 없음', () => {
  it('withRollClasses는 id/src/slot 유지', () => {
    const a = createChainBeads()
    const b = withRollClasses(a, 1)
    assert.equal(b.length, a.length)
    for (let i = 0; i < a.length; i++) {
      assert.equal(b[i].id, a[i].id)
      assert.equal(b[i].src, a[i].src)
      assert.equal(b[i].slot, a[i].slot)
      assert.equal(b[i].left, a[i].left)
    }
  })

  it('advance 후 id·길이 유지, 슬롯만 +1 (재배치 없음)', () => {
    const a = createChainBeads()
    const ids = a.map((x) => x.id).join(',')
    const b = advanceChainBeads(a, 1)
    assert.equal(b.length, a.length)
    assert.equal(b.map((x) => x.id).join(','), ids)
    assert.ok(b.every((x) => x.src === BEAD_SRC))
    assert.ok(b.every((x) => x.animClass === ''))
    const n = SLOT_COUNT
    for (let i = 0; i < a.length; i++) {
      assert.equal(b[i].slot, (a[i].slot + 1) % n)
    }
  })

  it('advanceWithAnim', () => {
    const a = createChainBeads()
    const b = advanceChainBeadsWithAnim(a, 1, 1)
    assert.equal(b[0].id, a[0].id)
    assert.ok(typeof b[0].animClass === 'string')
  })

  it('들어오는/나가는 전이는 애니, 버퍼→버퍼는 생략', () => {
    const slots = layoutChainSlots()
    // 1(IN)→2(OUT) 나감
    assert.equal(shouldAnimateTransition(slots[1], slots[2]), true)
    assert.equal(rollClassForSlot(1, 1), 'roll-next-1')
    // 3(OUT)→4(IN) 들어옴
    assert.equal(shouldAnimateTransition(slots[3], slots[4]), true)
    assert.equal(rollClassForSlot(3, 1), 'roll-next-3')
    // 2→3 버퍼 랩
    assert.equal(rollClassForSlot(2, 1), '')
  })
})

describe('키프레임 0/100 linear', () => {
  it('SHARED = 0,1', () => {
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 1])
    assert.equal(pathProgressAtTime(0.5), 0.5)
  })
  it('CSS: 150ms linear, 중간 키 없음', () => {
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('animation-duration: 150ms'))
    assert.ok(css.includes('linear'))
    assert.ok(!css.includes('ease-out'))
    assert.ok(!css.includes('25%'))
    assert.ok(!css.includes('50%'))
    assert.ok(!css.includes('75%'))
    const slots = layoutChainSlots()
    assert.ok(snapMatchesEndKeyframe(slots[0], slots[1]))
  })
})

describe('layout', () => {
  it('포커스·rollClass', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    assert.equal(rollClassForSlot(0, 1), 'roll-next-0')
    assert.equal(VIRTUAL_BEADS, 12)
    assert.equal(SLOT_COUNT, 10)
    assert.ok(focusDeltaYOnAdvance() < 0)
    assert.ok(transformAtProgress)
    assert.equal(DEFAULT_RING.maxSize, 228)
    assert.equal(DEFAULT_RING.ry, 420)
  })
})
