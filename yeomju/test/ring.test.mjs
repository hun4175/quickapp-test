/**
 * 염주 고리 2.3.0 — ≤12노드 · 버퍼 · keyframe=스냅 · 앞열 간격
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIRTUAL_BEADS,
  SLOT_COUNT,
  MAX_RENDER_NODES,
  DEFAULT_RING,
  CHAIN_ANIM_MS,
  BEAD_SRC,
  FRONT_GAP_RATIO_MIN,
  FRONT_GAP_RATIO_MAX,
  phaseFromBead,
  nextPhase,
  stepPhase,
  classifyVerticalSwipe,
  SWIPE_MIN_DY,
  layoutChainSlots,
  renderSlotIndices,
  bufferSlotIndices,
  onScreenSlotIndices,
  isSlotFullyOffScreen,
  createChainBeads,
  advanceChainBeads,
  withRollClasses,
  rollClassForSlot,
  shouldAnimateTransition,
  endKeyframeTransform,
  keyframeEndMatchesSnap,
  frontAdjacentGapRatios,
  adjacentGapRatio,
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

describe('2.3.0 nodes / buffers / gap', () => {
  it('노드 ≤12, 슬롯 12', () => {
    assert.equal(SLOT_COUNT, 12)
    assert.equal(MAX_RENDER_NODES, 12)
    assert.equal(createChainBeads().length, 12)
    assert.ok(createChainBeads().length <= MAX_RENDER_NODES)
    assert.equal(renderSlotIndices().length, 12)
  })

  it('버퍼 슬롯 AABB가 화면 밖', () => {
    const W = DEFAULT_RING.screenW
    const H = DEFAULT_RING.screenH
    const slots = layoutChainSlots()
    const buf = bufferSlotIndices()
    assert.ok(buf.length >= 4)
    for (const i of buf) {
      const s = slots[i]
      assert.equal(isSlotFullyOffScreen(s), true)
      const out =
        s.left + s.size <= 0 ||
        s.top + s.size <= 0 ||
        s.left >= W ||
        s.top >= H
      assert.equal(out, true, `slot ${i}`)
    }
    assert.ok(onScreenSlotIndices().length >= 4)
  })

  it('앞열 인접 간격 0.92~1.0 (반지름 합 기준)', () => {
    const g = frontAdjacentGapRatios()
    assert.ok(
      g.next >= FRONT_GAP_RATIO_MIN && g.next <= FRONT_GAP_RATIO_MAX,
      `next ratio ${g.next}`
    )
    assert.ok(
      g.prev >= FRONT_GAP_RATIO_MIN && g.prev <= FRONT_GAP_RATIO_MAX,
      `prev ratio ${g.prev}`
    )
    const slots = layoutChainSlots()
    assert.ok(adjacentGapRatio(slots[0], slots[1]) >= 0.92)
  })

  it('duration · src · SWIPE', () => {
    assert.ok(CHAIN_ANIM_MS >= 140 && CHAIN_ANIM_MS <= 160)
    assert.equal(BEAD_SRC, '/common/bead-wood-v3.png')
    assert.equal(classifyVerticalSwipe(0, -SWIPE_MIN_DY), 1)
    assert.equal(VIRTUAL_BEADS, 12)
  })
})

describe('keyframe 100% = 스냅 (덜컥임)', () => {
  it('모든 인접 전이: left/top/size 픽셀 일치 (origin 0 0)', () => {
    const slots = layoutChainSlots()
    for (let i = 0; i < slots.length; i++) {
      const from = slots[i]
      const toNext = slots[(i + 1) % slots.length]
      const toPrev = slots[(i - 1 + slots.length) % slots.length]
      assert.equal(
        keyframeEndMatchesSnap(from, toNext, 0),
        true,
        `next ${i}`
      )
      assert.equal(
        keyframeEndMatchesSnap(from, toPrev, 0),
        true,
        `prev ${i}`
      )
      const tr = endKeyframeTransform(from, toNext)
      assert.equal(from.left + tr.tx, toNext.left)
      assert.equal(from.top + tr.ty, toNext.top)
      assert.equal(Math.round(from.size * tr.scale), toNext.size)
    }
  })

  it('snapMatchesEndKeyframe / CSS forwards·linear', () => {
    const slots = layoutChainSlots()
    assert.equal(snapMatchesEndKeyframe(slots[0], slots[1], 0), true)
    const css = buildChainKeyframeCss()
    assert.ok(css.includes('animation-fill-mode: forwards'))
    assert.ok(css.includes('animation-duration: 150ms'))
    assert.ok(css.includes('linear'))
    assert.ok(!css.includes('25%'))
    assert.deepEqual([...SHARED_KEYFRAME_PCTS], [0, 1])
    assert.equal(pathProgressAtTime(0.5), 0.5)
  })

  it('advance는 animClass 클리어와 기하를 한 객체에', () => {
    const a = withRollClasses(createChainBeads(), 1)
    assert.ok(a.some((b) => b.animClass))
    const b = advanceChainBeads(a, 1)
    assert.ok(b.every((x) => x.animClass === ''))
    assert.equal(b.length, a.length)
    const ids = a.map((x) => x.id).sort().join(',')
    assert.equal(b.map((x) => x.id).sort().join(','), ids)
  })
})

describe('안정 id · 랩', () => {
  it('withRollClasses는 left/top/size 유지', () => {
    const a = createChainBeads()
    const b = withRollClasses(a, 1)
    for (let i = 0; i < a.length; i++) {
      const x = b.find((t) => t.id === a[i].id)
      assert.equal(x.left, a[i].left)
      assert.equal(x.top, a[i].top)
      assert.equal(x.size, a[i].size)
      assert.equal(x.slot, a[i].slot)
    }
  })

  it('버퍼→버퍼 애니 생략', () => {
    const slots = layoutChainSlots()
    const buf = new Set(bufferSlotIndices())
    for (let i = 0; i < slots.length; i++) {
      const j = (i + 1) % slots.length
      if (buf.has(i) && buf.has(j)) {
        assert.equal(shouldAnimateTransition(slots[i], slots[j]), false)
        assert.equal(rollClassForSlot(i, 1), '')
      }
    }
  })
})

describe('layout', () => {
  it('포커스·z 뒤→앞', () => {
    const items = layoutRing({})
    assert.equal(focusCenterNear(items, 216, 257, 4), true)
    const beads = createChainBeads()
    for (let i = 1; i < beads.length; i++) {
      assert.ok(beads[i].z >= beads[i - 1].z)
    }
    assert.equal(DEFAULT_RING.ry, 430)
    assert.ok(focusDeltaYOnAdvance() < 0)
  })
})
