import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTimingList,
  timingAverages,
  formatSampleLine,
  TIMING_AVG_N,
  DIAG_PANEL
} from '../src/common/timing-core.js'

describe('timing helpers', () => {
  it('normalize · avg · format', () => {
    assert.equal(TIMING_AVG_N, 5)
    assert.equal(DIAG_PANEL.top, 330)
    assert.ok(DIAG_PANEL.height <= 70)
    const list = normalizeTimingList([
      { inSet: 10, setStart: 2, animLen: 150, n: 10, e1: true, e3: true },
      { inSet: 20, setStart: 4, animLen: 152, n: 3, e6: true, e1: false }
    ])
    assert.equal(list.length, 2)
    assert.equal(list[1].n, 3)
    assert.equal(list[1].e6, true)
    const avg = timingAverages(list)
    assert.equal(avg.inSet, 15)
    assert.equal(avg.setStart, 3)
    assert.equal(avg.animLen, 151)
    assert.ok(formatSampleLine(list[0], 0).includes('10ms'))
    assert.ok(formatSampleLine(list[1], 1).includes('n3'))
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
