import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTimingList,
  timingAverages,
  formatSampleLine,
  formatSampleDetailLines,
  eventDeliveryDelay,
  deltaMs,
  TIMING_AVG_N,
  DIAG_PANEL,
  SCREEN
} from '../src/common/timing-core.js'

describe('timing helpers', () => {
  it('사각형 패널 · 줄 간격 ≥ font×1.4', () => {
    assert.equal(TIMING_AVG_N, 5)
    assert.equal(SCREEN.width, 432)
    assert.equal(SCREEN.height, 514)
    assert.equal(DIAG_PANEL.top, 290)
    assert.ok(DIAG_PANEL.lineH >= Math.ceil(DIAG_PANEL.fontSize * 1.4))
  })

  it('normalize · avg · format', () => {
    const list = normalizeTimingList([
      {
        inSet: 10,
        setStart: 2,
        animLen: 150,
        evtDelay: 3,
        endToSet: 8,
        t0Kind: 'swipe'
      },
      { inSet: 20, setStart: 4, animLen: 152, t0Kind: 'tap' }
    ])
    assert.equal(list.length, 2)
    assert.equal(list[0].t0Kind, 'swipe')
    const avg = timingAverages(list)
    assert.equal(avg.inSet, 15)
    assert.ok(formatSampleLine(list[0], 0).includes('10ms'))
    const detail = formatSampleDetailLines(list[0])
    assert.ok(detail[0].includes('t0=swipe'))
  })

  it('eventDeliveryDelay · deltaMs', () => {
    const now = 1_700_000_000_123
    const d = eventDeliveryDelay({ timeStamp: now - 40 }, now)
    assert.equal(d.delay, 40)
    assert.equal(deltaMs(100, 40), 60)
    assert.equal(deltaMs(0, 40), -1)
  })

  it('최근 5개만 유지', () => {
    const raw = []
    for (let i = 0; i < 8; i++) {
      raw.push({ inSet: i, setStart: 0, animLen: 150 })
    }
    const list = normalizeTimingList(raw)
    assert.equal(list.length, 5)
    assert.equal(list[0].inSet, 3)
  })
})
