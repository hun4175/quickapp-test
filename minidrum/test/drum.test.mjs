import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PADS,
  planPlay,
  preloadOrder,
  latencyMs,
  pushSample,
  stats,
  formatLatency,
  padIndexOf,
  STATS_WINDOW,
  MAX_VALID_LATENCY_MS
} from '../src/common/drum.js'

describe('패드 정의', () => {
  it('2x2 = 킥·스네어·하이햇·크래시 순서, 색이 서로 다름', () => {
    assert.deepEqual(PADS.map((p) => p.id), ['kick', 'snare', 'hihat', 'crash'])
    for (const p of PADS) {
      assert.match(p.src, /^\/common\/sounds\/\w+\.wav$/)
      assert.notEqual(p.color, p.hit)
    }
    assert.equal(padIndexOf('hihat'), 2)
    assert.equal(padIndexOf('nope'), -1)
  })
})

describe('단일 플레이어 전략', () => {
  it('같은 소리면 되감기, 다르거나 비어 있으면 src 교체', () => {
    const k = PADS[0].src
    const s = PADS[1].src
    assert.equal(planPlay(k, k), 'rewind')
    assert.equal(planPlay(k, s), 'switch')
    assert.equal(planPlay('', k), 'switch')
    assert.equal(planPlay(undefined, k), 'switch')
  })
  it('프리로드는 4개 모두, 킥이 마지막(첫 킥은 되감기)', () => {
    const order = preloadOrder()
    assert.equal(order.length, 4)
    assert.deepEqual([...order].sort(), PADS.map((p) => p.src).sort())
    assert.equal(order[order.length - 1], PADS[0].src)
    assert.equal(planPlay(order[order.length - 1], PADS[0].src), 'rewind')
    assert.deepEqual(preloadOrder([]), [])
  })
})

describe('지연 측정', () => {
  it('latencyMs: 정상·무효 값', () => {
    assert.equal(latencyMs(1000, 1213.4), 213)
    assert.equal(latencyMs(0, 1000), null)
    assert.equal(latencyMs(2000, 1000), null)
    assert.equal(latencyMs(1, 2 + MAX_VALID_LATENCY_MS), null)
  })
  it('pushSample: null 무시, 최근 STATS_WINDOW 개 유지', () => {
    let s = []
    s = pushSample(s, null)
    assert.deepEqual(s, [])
    for (let i = 1; i <= STATS_WINDOW + 3; i++) s = pushSample(s, i)
    assert.equal(s.length, STATS_WINDOW)
    assert.equal(s[0], 4)
  })
  it('stats/formatLatency', () => {
    assert.deepEqual(stats([]), { n: 0, last: null, min: null, avg: null, max: null })
    assert.deepEqual(stats([200, 210, 250]), { n: 3, last: 250, min: 200, avg: 220, max: 250 })
    assert.equal(formatLatency([]), '-- ms')
    assert.equal(formatLatency([200, 210, 250]), '250ms · 평균 220 (3)')
  })
})
