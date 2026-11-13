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
  setDiagnoseLatency,
  setSingleBeadTest,
  migrateAnimModeForStability,
  UNSAFE_ANIM_MODES,
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
  it('잘못된 입력은 기본값으로', () => {
    const s = normalizeState(null)
    assert.equal(s.bead, 0)
    assert.equal(s.rounds, 0)
    assert.equal(s.beadsPerRound, 108)
    assert.equal(s.vibrateOnBead, true)
    assert.equal(s.inputMode, 'slide')
    assert.equal(s.animMode, undefined)
    assert.equal(s.debugLatency, undefined)
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
    assert.equal(state.bead, 3)
    assert.equal(state.todayDate, '2026-11-13')
  })
})

describe('advance / retreat / swipe', () => {
  it('기본은 plus_both (양방향 +1)', () => {
    assert.equal(SWIPE_COUNT_MODE, 'plus_both')
  })

  it('advanceBead 한 바퀴', () => {
    let s = normalizeState({ bead: 107, beadsPerRound: 108, todayDate: formatDate() })
    const r = advanceBead(s)
    assert.equal(r.completedRound, true)
    assert.equal(r.state.bead, 0)
    assert.equal(r.state.rounds, 1)
  })

  it('plus_both: 위·아래 모두 +1', () => {
    const base = normalizeState({ bead: 0, todayDate: formatDate() })
    assert.equal(applySwipeCount(base, 1).state.bead, 1)
    assert.equal(applySwipeCount(base, -1).state.bead, 1)
  })

  it('retreatBead', () => {
    const s = normalizeState({ bead: 2, todayTotal: 2, todayDate: formatDate() })
    const r = retreatBead(s)
    assert.equal(r.state.bead, 1)
    assert.equal(r.retreated, true)
  })
})

describe('설정·초기화', () => {
  it('setBeadsPerRound', () => {
    const s = setBeadsPerRound({ bead: 30, beadsPerRound: 108 }, 27)
    assert.equal(s.beadsPerRound, 27)
    assert.equal(s.bead, 3)
  })

  it('setVibrateOnBead', () => {
    assert.equal(setVibrateOnBead({}, false).vibrateOnBead, false)
  })

  it('2.4.1 schema≥5 마이그레이션 · animMode 제거', () => {
    assert.deepEqual([...UNSAFE_ANIM_MODES], ['D', 'E'])
    const m = migrateAnimModeForStability({
      animMode: 'E',
      debugLatency: true,
      stateSchema: 1
    })
    assert.equal(m.migrated, true)
    assert.equal(m.state.stateSchema, 5)
    assert.equal(m.state.inputMode, 'slide')
    assert.equal(m.state.diagnoseLatency, false)
    assert.equal(m.state.animMode, undefined)
    const from4 = migrateAnimModeForStability({
      inputMode: 'touch',
      stateSchema: 4
    })
    assert.equal(from4.migrated, true)
    assert.equal(from4.state.stateSchema, 5)
    const stable = migrateAnimModeForStability({
      inputMode: 'touch',
      stateSchema: 5
    })
    assert.equal(stable.migrated, false)
    assert.equal(stable.state.inputMode, 'touch')
  })

  it('inputMode · 진단 토글', () => {
    assert.deepEqual([...INPUT_MODES], ['slide', 'touch'])
    assert.equal(setInputMode({}, 'touch').inputMode, 'touch')
    assert.equal(setInputMode({}, 'slide').inputMode, 'slide')
    assert.equal(setInputMode({}, 'zap').inputMode, 'slide')
    assert.equal(setDiagnoseLatency({}, true).diagnoseLatency, true)
    assert.equal(setSingleBeadTest({}, true).singleBeadTest, true)
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
    const s = normalizeState({
      bead: 3,
      inputMode: 'touch',
      todayDate: '2026-11-13'
    })
    const again = deserializeState(serializeState(s))
    assert.equal(again.bead, 3)
    assert.equal(again.inputMode, 'touch')
    assert.equal(again.animMode, undefined)
  })

  it('progressRatio', () => {
    assert.equal(progressRatio({ bead: 54, beadsPerRound: 108 }), 0.5)
  })
})
