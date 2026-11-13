/**
 * 염주 순수 로직 단위 테스트 (Node, 워치 런타임 불필요)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BEAD_OPTIONS,
  GOAL_OPTIONS,
  GOLDWOOD_UNLOCK_AT,
  SWIPE_COUNT_MODE,
  INPUT_MODES,
  BEAD_THEMES,
  normalizeState,
  ensureToday,
  advanceBead,
  retreatBead,
  applySwipeCount,
  evaluateGoalEvents,
  setBeadsPerRound,
  setVibrateOnBead,
  setInputMode,
  setBeadTheme,
  setShowCount,
  setGoalCount,
  visibleBeadThemes,
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

describe('GOAL_OPTIONS', () => {
  it('21/54/108/1080 · 기본 21', () => {
    assert.deepEqual([...GOAL_OPTIONS], [21, 54, 108, 1080])
    assert.equal(DEFAULT_STATE.goalCount, 21)
    assert.equal(GOLDWOOD_UNLOCK_AT, 1080)
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
    assert.equal(s.goalCount, 21)
    assert.equal(s.unlockGoldwood, false)
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

  it('미해금 goldwood는 default 폴백', () => {
    assert.equal(
      normalizeState({ beadTheme: 'goldwood', unlockGoldwood: false }).beadTheme,
      'default'
    )
    assert.equal(
      normalizeState({ beadTheme: 'goldwood', unlockGoldwood: true }).beadTheme,
      'goldwood'
    )
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

describe('목표·해금', () => {
  it('목표 달성 시 축하 후 카운트 0 · 배수 재축하 없음', () => {
    const a = evaluateGoalEvents(20, {
      todayTotal: 21,
      goalCount: 21,
      unlockGoldwood: false
    })
    assert.equal(a.goalReached, true)
    assert.equal(a.unlockJustNow, false)
    assert.equal(a.state.todayTotal, 0)

    // 리셋 후 다시 굴리면 배수(42)에서 자동 재축하하지 않음
    const b = evaluateGoalEvents(0, {
      todayTotal: 1,
      goalCount: 21,
      unlockGoldwood: false
    })
    assert.equal(b.goalReached, false)
    assert.equal(b.state.todayTotal, 1)
  })

  it('목표 1080 설정에서만 금박 해금', () => {
    const r = evaluateGoalEvents(1079, {
      todayTotal: 1080,
      goalCount: 1080,
      beadTheme: 'jade',
      unlockGoldwood: false
    })
    assert.equal(r.unlockJustNow, true)
    assert.equal(r.goalReached, true)
    assert.equal(r.state.unlockGoldwood, true)
    assert.equal(r.state.beadTheme, 'goldwood')
    assert.equal(r.state.todayTotal, 0)
  })

  it('목표 21로 1080 누적이어도 해금 안 됨(달성 시 0 리셋)', () => {
    // 목표 21이면 21에서 리셋되므로 1080까지 한 번에 가지 않음
    const r = evaluateGoalEvents(20, {
      todayTotal: 21,
      goalCount: 21,
      unlockGoldwood: false,
      beadTheme: 'default'
    })
    assert.equal(r.unlockJustNow, false)
    assert.equal(r.state.unlockGoldwood, false)
    assert.equal(r.state.todayTotal, 0)
  })

  it('목표 변경 시 카운트 0', () => {
    const next = setGoalCount(
      { todayTotal: 15, goalCount: 21, unlockGoldwood: true },
      108
    )
    assert.equal(next.goalCount, 108)
    assert.equal(next.todayTotal, 0)
    assert.equal(next.unlockGoldwood, true)
    assert.equal(setGoalCount({ todayTotal: 5, goalCount: 21 }, 21).todayTotal, 5)
  })

  it('visibleBeadThemes · 미해금 시 goldwood 숨김', () => {
    assert.deepEqual(visibleBeadThemes({ unlockGoldwood: false }), [
      'default',
      'jade',
      'pinkjade'
    ])
    assert.deepEqual(visibleBeadThemes({ unlockGoldwood: true }), [
      ...BEAD_THEMES
    ])
  })

  it('setBeadTheme 미해금 goldwood 무시', () => {
    const s = setBeadTheme({ unlockGoldwood: false, beadTheme: 'jade' }, 'goldwood')
    assert.equal(s.beadTheme, 'jade')
    assert.equal(
      setBeadTheme({ unlockGoldwood: true, beadTheme: 'jade' }, 'goldwood')
        .beadTheme,
      'goldwood'
    )
  })

  it('횟수 초기화해도 해금 유지', () => {
    const next = resetTodayCount({
      todayTotal: 50,
      unlockGoldwood: true,
      beadTheme: 'goldwood',
      goalCount: 108
    })
    assert.equal(next.todayTotal, 0)
    assert.equal(next.unlockGoldwood, true)
    assert.equal(next.beadTheme, 'goldwood')
    assert.equal(next.goalCount, 108)
  })
})

describe('설정·초기화', () => {
  it('setBeadsPerRound / vibrate / goal', () => {
    assert.equal(setBeadsPerRound({}, 54).beadsPerRound, 54)
    assert.equal(setVibrateOnBead({}, false).vibrateOnBead, false)
    assert.equal(setGoalCount({ todayTotal: 3 }, 108).goalCount, 108)
    assert.equal(setGoalCount({ todayTotal: 3 }, 108).todayTotal, 0)
    assert.equal(setGoalCount({}, 999).goalCount, 21)
  })

  it('2.8.0 schema≥15 · 목표 기본 21 · 기존 goldwood 해금', () => {
    assert.deepEqual(
      [...BEAD_THEMES],
      ['default', 'goldwood', 'jade', 'pinkjade']
    )
    const m = migrateAnimModeForStability({
      beadTheme: 'ommani',
      stateSchema: 12
    })
    assert.equal(m.migrated, true)
    assert.equal(m.state.stateSchema, 15)
    assert.equal(m.state.beadTheme, 'default')
    assert.equal(m.state.goalCount, 21)
    assert.equal(m.state.unlockGoldwood, false)
    assert.equal(m.state.showCount, true)

    const g = migrateAnimModeForStability({
      beadTheme: 'goldwood',
      stateSchema: 14,
      todayTotal: 10
    })
    assert.equal(g.migrated, true)
    assert.equal(g.state.unlockGoldwood, true)
    assert.equal(g.state.beadTheme, 'goldwood')
    assert.equal(g.state.goalCount, 21)

    assert.equal(setBeadTheme({ unlockGoldwood: true }, 'pinkjade').beadTheme, 'pinkjade')
    assert.equal(setShowCount({}, false).showCount, false)
  })

  it('inputMode', () => {
    assert.deepEqual([...INPUT_MODES], ['slide', 'touch'])
    assert.equal(setInputMode({}, 'touch').inputMode, 'touch')
  })

  it('serialize가 goal·unlock·todayTotal 유지', () => {
    const s = normalizeState({
      todayTotal: 42,
      showCount: false,
      beadTheme: 'jade',
      goalCount: 108,
      unlockGoldwood: true
    })
    const round = deserializeState(serializeState(s))
    assert.equal(round.todayTotal, 42)
    assert.equal(round.showCount, false)
    assert.equal(round.beadTheme, 'jade')
    assert.equal(round.goalCount, 108)
    assert.equal(round.unlockGoldwood, true)
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
      todayDate: formatDate(),
      goalCount: 54
    })
    assert.deepEqual(deserializeState(serializeState(s)), normalizeState(s))
  })

  it('progressRatio', () => {
    assert.equal(progressRatio({ bead: 54, beadsPerRound: 108 }), 0.5)
  })
})
