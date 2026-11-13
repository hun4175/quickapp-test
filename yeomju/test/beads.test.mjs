/**
 * 염주 순수 로직 단위 테스트 (Node, 워치 런타임 불필요)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BEAD_OPTIONS,
  SWIPE_COUNT_MODE,
  INPUT_MODES,
  normalizeState,
  ensureToday,
  advanceBead,
  retreatBead,
  applySwipeCount,
  setBeadsPerRound,
  setVibrateOnBead,
  setInputMode,
  migrateAnimModeForStability,
  resetSession,
  resetAll,
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
  it('잘못된 입력은 기본값으로 · 모르는 키 무시', () => {
    const s = normalizeState({
      e1Minimize: true,
      renderMode: 'L',
      diagnoseLatency: true,
      visibleBeadCount: 3,
      foo: 1
    })
    assert.equal(s.bead, 0)
    assert.equal(s.beadsPerRound, 108)
    assert.equal(s.inputMode, 'slide')
    assert.equal(s.diagnoseLatency, undefined)
    assert.equal(s.e1Minimize, undefined)
    assert.equal(s.renderMode, undefined)
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
    assert.equal(state.todayDate, '2026-11-13')
  })
})

describe('advance / retreat / swipe', () => {
  it('기본은 plus_both (양방향 +1)', () => {
    assert.equal(SWIPE_COUNT_MODE, 'plus_both')
  })

  it('advanceBead 한 바퀴', () => {
    let s = normalizeState({ beadsPerRound: 27 })
    let r = advanceBead(s)
    assert.equal(r.state.bead, 1)
    assert.equal(r.completedRound, false)
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
    assert.equal(s.state.todayTotal, 1)
  })
})

describe('설정·초기화', () => {
  it('setBeadsPerRound', () => {
    assert.equal(setBeadsPerRound({}, 54).beadsPerRound, 54)
  })

  it('setVibrateOnBead', () => {
    assert.equal(setVibrateOnBead({}, false).vibrateOnBead, false)
  })

  it('2.5.3 schema≥11 마이그레이션 · 진단 키 폐기', () => {
    const m = migrateAnimModeForStability({
      animMode: 'E',
      e7TouchStartRoll: true,
      renderMode: 'L',
      diagnoseLatency: true,
      stateSchema: 1
    })
    assert.equal(m.migrated, true)
    assert.equal(m.state.stateSchema, 11)
    assert.equal(m.state.inputMode, 'slide')
    assert.equal(m.state.diagnoseLatency, undefined)
    assert.equal(m.state.renderMode, undefined)
    const from10 = migrateAnimModeForStability({
      inputMode: 'touch',
      diagnoseLatency: true,
      stateSchema: 10
    })
    assert.equal(from10.migrated, true)
    assert.equal(from10.state.stateSchema, 11)
    assert.equal(from10.state.inputMode, 'touch')
    assert.equal(from10.state.diagnoseLatency, undefined)
    const stable = migrateAnimModeForStability({
      inputMode: 'touch',
      stateSchema: 11
    })
    assert.equal(stable.migrated, false)
  })

  it('inputMode', () => {
    assert.deepEqual([...INPUT_MODES], ['slide', 'touch'])
    assert.equal(setInputMode({}, 'touch').inputMode, 'touch')
  })

  it('resetSession 은 오늘 합계 유지', () => {
    const s = resetSession({
      bead: 10,
      rounds: 2,
      todayTotal: 50,
      todayDate: '2026-11-13'
    })
    assert.equal(s.bead, 0)
    assert.equal(s.rounds, 0)
    assert.equal(s.todayTotal, 50)
  })

  it('resetAll 은 오늘 합계도 0', () => {
    const s = resetAll(
      { bead: 10, rounds: 2, todayTotal: 50, todayDate: '2026-11-12' },
      '2026-11-13'
    )
    assert.equal(s.bead, 0)
    assert.equal(s.todayTotal, 0)
    assert.equal(s.todayDate, '2026-11-13')
  })
})

describe('serialize', () => {
  it('roundtrip', () => {
    const s = normalizeState({ bead: 3, todayDate: formatDate() })
    assert.deepEqual(deserializeState(serializeState(s)), normalizeState(s))
  })

  it('progressRatio', () => {
    assert.equal(progressRatio({ bead: 54, beadsPerRound: 108 }), 0.5)
  })
})
