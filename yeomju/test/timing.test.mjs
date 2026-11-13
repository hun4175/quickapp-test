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
    assert.equal(DIAG_PANEL.height, 214)
    assert.equal(DIAG_PANEL.fontSize, 24)
    assert.ok(DIAG_PANEL.lineH >= Math.ceil(DIAG_PANEL.fontSize * 1.4))
    assert.equal(DIAG_PANEL.lineTops.length, 6)
    for (let i = 1; i < DIAG_PANEL.lineTops.length; i++) {
      assert.ok(
        DIAG_PANEL.lineTops[i] - DIAG_PANEL.lineTops[i - 1] >= DIAG_PANEL.lineH
      )
    }
  })

  it('normalize · avg · format · 세부 구간', () => {
    const list = normalizeTimingList([
      {
        inSet: 10,
        setStart: 2,
        animLen: 150,
        n: 10,
        e1: true,
        e3: true,
        evtDelay: 3,
        endToSet: 8,
        t0Kind: 'swipe'
      },
      {
        inSet: 20,
        setStart: 4,
        animLen: 152,
        n: 3,
        e6: true,
        e7: true,
        e1: false,
        t0Kind: 'e7'
      }
    ])
    assert.equal(list.length, 2)
    assert.equal(list[1].n, 3)
    assert.equal(list[1].e6, true)
    assert.equal(list[1].e7, true)
    assert.equal(list[0].t0Kind, 'swipe')
    const avg = timingAverages(list)
    assert.equal(avg.inSet, 15)
    assert.equal(avg.setStart, 3)
    assert.equal(avg.animLen, 151)
    assert.equal(avg.evtDelay, 3)
    assert.ok(formatSampleLine(list[0], 0).includes('10ms'))
    assert.ok(formatSampleLine(list[1], 1).includes('n3'))
    const detail = formatSampleDetailLines(list[0])
    assert.ok(detail.length >= 6)
    assert.ok(detail[0].includes('t0=swipe'))
    assert.ok(detail.some((l) => l.includes('evtDelay')))
    assert.ok(detail.some((l) => l.includes('end→set')))
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
      raw.push({ inSet: i, setStart: 0, animLen: 150, n: 10 })
    }
    const list = normalizeTimingList(raw)
    assert.equal(list.length, 5)
    assert.equal(list[0].inSet, 3)
    assert.equal(list[4].inSet, 7)
  })
})
