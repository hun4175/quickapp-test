/**
 * 염주 순수 로직 단위 테스트 (Node, 워치 런타임 불필요)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BEAD_OPTIONS,
  SWIPE_COUNT_MODE,
  INPUT_MODES,
  BEAD_THEMES,
  normalizeState,
  ensureToday,
  advanceBead,
  retreatBead,
  applySwipeCount,
  setBeadsPerRound,
  setVibrateOnBead,
  setInputMode,
  setBeadTheme,
  setShowCount,
  migrateAnimModeForStability,
  resetTodayCount,
  resetSession,
  resetAll,
  DEFAULT_STATE,
  progressRatio,
  serializeState,
  deserializeState,
  formatDate
} from '../src/common/beads.js'

describe('BEAD_OPTIONS', () => {
  it('108/54/27/21 만 허용', () => {
    assert.deepEqual(BEAD_OPTIONS, [108, 54, 27, 21])
  })
})

describe('normalizeState', () => {
  it('잘못된 입력은 기본값 · 한자 테마는 default 폴백', () => {
    const s = normalizeState({
      beadTheme: 'ommani',
      renderMode: 'L',
      foo: 1
    })
    assert.equal(s.beadTheme, 'default')
    assert.equal(s.inputMode, 'slide')
    assert.equal(s.showCount, true)
    assert.equal(s.renderMode, undefined)
    assert.equal(normalizeState({ beadTheme: 'namu' }).beadTheme, 'default')
    assert.equal(normalizeState({ beadTheme: 'jade' }).beadTheme, 'jade')
  })

  it('showCount 기본 on · 명시 false만 끔', () => {
    assert.equal(normalizeState({}).showCount, true)
    assert.equal(normalizeState({ showCount: false }).showCount, false)
    assert.equal(normalizeState({ showCount: true }).showCount, true)
  })

  it('첫 설치·빈 저장값 카운트는 0', () => {
    assert.equal(DEFAULT_STATE.todayTotal, 0)
    assert.equal(normalizeState({}).todayTotal, 0)
    assert.equal(deserializeState('').todayTotal, 0)
    assert.equal(deserializeState(null).todayTotal, 0)
    assert.equal(deserializeState('not-json').todayTotal, 0)
  })

  it('허용되지 않은 알 개수는 108로', () => {
    assert.equal(normalizeState({ beadsPerRound: 99 }).beadsPerRound, 108)
  })

  it('bead 는 주기 내로 정규화', () => {
    assert.equal(normalizeState({ bead: 110, beadsPerRound: 108 }).bead, 2)
  })
})

describe('ensureToday', () => {
  it('날짜가 같으면 유지', () => {
    const { state, rolled } = ensureToday(
      { todayDate: '2026-11-13', todayTotal: 5 },
      '2026-11-13'
    )
    assert.equal(rolled, false)
    assert.equal(state.todayTotal, 5)
  })

  it('날짜가 바뀌면 todayTotal 0', () => {
    const { state, rolled } = ensureToday(
      { todayDate: '2026-11-12', todayTotal: 5, bead: 3 },
      '2026-11-13'
    )
    assert.equal(rolled, true)
    assert.equal(state.todayTotal, 0)
  })
})

describe('advance / retreat / swipe', () => {
  it('기본은 plus_both', () => {
    assert.equal(SWIPE_COUNT_MODE, 'plus_both')
  })

  it('advanceBead 한 바퀴', () => {
    let s = normalizeState({ beadsPerRound: 27 })
    let r = advanceBead(s)
    assert.equal(r.state.bead, 1)
    for (let i = 1; i < 27; i++) r = advanceBead(r.state)
    assert.equal(r.state.bead, 0)
    assert.equal(r.state.rounds, 1)
    assert.equal(r.completedRound, true)
  })

  it('plus_both: 위·아래 모두 +1', () => {
    const a = applySwipeCount({ bead: 0, beadsPerRound: 108 }, 1)
    const b = applySwipeCount({ bead: 0, beadsPerRound: 108 }, -1)
    assert.equal(a.state.bead, 1)
    assert.equal(b.state.bead, 1)
  })

  it('retreatBead', () => {
    const s = retreatBead({ bead: 2, beadsPerRound: 108, todayTotal: 2 })
    assert.equal(s.state.bead, 1)
  })
})

describe('설정·초기화', () => {
  it('setBeadsPerRound / vibrate', () => {
    assert.equal(setBeadsPerRound({}, 54).beadsPerRound, 54)
    assert.equal(setVibrateOnBead({}, false).vibrateOnBead, false)
  })

  it('2.7.1 schema≥14 · 테마 · showCount', () => {
    assert.deepEqual(
      [...BEAD_THEMES],
      ['default', 'goldwood', 'jade', 'pinkjade']
    )
    const m = migrateAnimModeForStability({
      beadTheme: 'ommani',
      stateSchema: 12
    })
    assert.equal(m.migrated, true)
    assert.equal(m.state.stateSchema, 14)
    assert.equal(m.state.beadTheme, 'default')
    assert.equal(m.state.showCount, true)
    assert.equal(setBeadTheme({}, 'goldwood').beadTheme, 'goldwood')
    assert.equal(setBeadTheme({}, 'pinkjade').beadTheme, 'pinkjade')
    assert.equal(setBeadTheme({}, 'ommani').beadTheme, 'default')
    assert.equal(setShowCount({}, false).showCount, false)
    assert.equal(setShowCount({ showCount: false }, true).showCount, true)
  })

  it('inputMode', () => {
    assert.deepEqual([...INPUT_MODES], ['slide', 'touch'])
    assert.equal(setInputMode({}, 'touch').inputMode, 'touch')
  })

  it('serialize가 showCount·todayTotal 유지', () => {
    const s = normalizeState({
      todayTotal: 42,
      showCount: false,
      beadTheme: 'jade'
    })
    const round = deserializeState(serializeState(s))
    assert.equal(round.todayTotal, 42)
    assert.equal(round.showCount, false)
    assert.equal(round.beadTheme, 'jade')
  })

  it('resetTodayCount · 카운트만 0 · bead/rounds 유지', () => {
    const next = resetTodayCount({
      bead: 10,
      rounds: 2,
      todayTotal: 50,
      todayDate: '2026-11-13',
      showCount: true,
      beadTheme: 'pinkjade'
    })
    assert.equal(next.todayTotal, 0)
    assert.equal(next.bead, 10)
    assert.equal(next.rounds, 2)
    assert.equal(next.beadTheme, 'pinkjade')
    assert.equal(next.showCount, true)
    const round = deserializeState(serializeState(next))
    assert.equal(round.todayTotal, 0)
  })

  it('resetSession / resetAll', () => {
    const s = resetSession({
      bead: 10,
      rounds: 2,
      todayTotal: 50,
      todayDate: '2026-11-13'
    })
    assert.equal(s.bead, 0)
    assert.equal(s.todayTotal, 50)
    const a = resetAll(
      { bead: 10, rounds: 2, todayTotal: 50, todayDate: '2026-11-12' },
      '2026-11-13'
    )
    assert.equal(a.todayTotal, 0)
  })
})

describe('serialize', () => {
  it('roundtrip', () => {
    const s = normalizeState({
      bead: 3,
      beadTheme: 'jade',
      todayDate: formatDate()
    })
    assert.deepEqual(deserializeState(serializeState(s)), normalizeState(s))
  })

  it('progressRatio', () => {
    assert.equal(progressRatio({ bead: 54, beadsPerRound: 108 }), 0.5)
  })
})
