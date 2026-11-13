/**
 * 염주 순수 로직 단위 테스트 (Node, 워치 런타임 불필요)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BEAD_OPTIONS,
  SWIPE_COUNT_MODE,
  ANIM_MODES,
  normalizeState,
  ensureToday,
  advanceBead,
  retreatBead,
  applySwipeCount,
  setBeadsPerRound,
  setVibrateOnBead,
  setAnimMode,
  setDebugLatency,
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
    assert.equal(s.animMode, 'A')
    assert.equal(s.debugLatency, false)
  })

  it('허용되지 않은 알 개수는 108로', () => {
    assert.equal(normalizeState({ beadsPerRound: 99 }).beadsPerRound, 108)
  })

  it('bead 는 주기 내로 정규화', () => {
    assert.equal(normalizeState({ bead: 110, beadsPerRound: 108 }).bead, 2)
  })
})

describe('ensureToday', () => {
  it('같은 날짜면 유지', () => {
    const { state, rolled } = ensureToday(
      { todayDate: '2026-11-13', todayTotal: 5 },
      '2026-11-13'
    )
    assert.equal(rolled, false)
    assert.equal(state.todayTotal, 5)
  })

  it('날짜가 바뀌면 오늘 합계만 리셋', () => {
    const { state, rolled } = ensureToday(
      { todayDate: '2026-11-12', todayTotal: 40, bead: 3, rounds: 2 },
      '2026-11-13'
    )
    assert.equal(rolled, true)
    assert.equal(state.todayTotal, 0)
    assert.equal(state.todayDate, '2026-11-13')
    assert.equal(state.bead, 3)
    assert.equal(state.rounds, 2)
  })
})

describe('SWIPE_COUNT_MODE', () => {
  it('기본은 plus_both (양방향 +1)', () => {
    assert.equal(SWIPE_COUNT_MODE, 'plus_both')
  })
})

describe('applySwipeCount', () => {
  it('plus_both: 위·아래 모두 +1', () => {
    const base = {
      bead: 3,
      rounds: 0,
      beadsPerRound: 27,
      todayDate: '2026-11-13',
      todayTotal: 3
    }
    const up = applySwipeCount(base, 1, '2026-11-13')
    const down = applySwipeCount(base, -1, '2026-11-13')
    assert.equal(up.state.bead, 4)
    assert.equal(down.state.bead, 4)
    assert.equal(up.state.todayTotal, 4)
    assert.equal(down.state.todayTotal, 4)
  })
})

describe('retreatBead', () => {
  it('되돌리기', () => {
    const r = retreatBead(
      { bead: 2, rounds: 1, beadsPerRound: 27, todayDate: '2026-11-13', todayTotal: 5 },
      '2026-11-13'
    )
    assert.equal(r.state.bead, 1)
    assert.equal(r.state.todayTotal, 4)
    assert.equal(r.retreated, true)
  })
})

describe('advanceBead', () => {
  it('알이 하나씩 증가하고 오늘 합계도 증가', () => {
    const { state, completedRound } = advanceBead(
      { bead: 0, beadsPerRound: 27, todayDate: '2026-11-13', todayTotal: 0 },
      '2026-11-13'
    )
    assert.equal(completedRound, false)
    assert.equal(state.bead, 1)
    assert.equal(state.todayTotal, 1)
  })

  it('한 바퀴를 채우면 bead=0, rounds+1', () => {
    const { state, completedRound } = advanceBead(
      {
        bead: 26,
        beadsPerRound: 27,
        rounds: 1,
        todayDate: '2026-11-13',
        todayTotal: 26
      },
      '2026-11-13'
    )
    assert.equal(completedRound, true)
    assert.equal(state.bead, 0)
    assert.equal(state.rounds, 2)
    assert.equal(state.todayTotal, 27)
  })

  it('108알 한 바퀴', () => {
    let state = {
      bead: 0,
      rounds: 0,
      beadsPerRound: 108,
      todayDate: '2026-11-13',
      todayTotal: 0
    }
    let completed = 0
    for (let i = 0; i < 108; i++) {
      const r = advanceBead(state, '2026-11-13')
      state = r.state
      if (r.completedRound) completed += 1
    }
    assert.equal(completed, 1)
    assert.equal(state.bead, 0)
    assert.equal(state.rounds, 1)
    assert.equal(state.todayTotal, 108)
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


  it('2.0.1 E/D→A 마이그레이션', () => {
    assert.deepEqual([...UNSAFE_ANIM_MODES], ['D', 'E'])
    const m = migrateAnimModeForStability({ animMode: 'E', stateSchema: 1 })
    assert.equal(m.migrated, true)
    assert.equal(m.state.animMode, 'A')
    assert.equal(m.state.stateSchema, 2)
    const keep = migrateAnimModeForStability({ animMode: 'E', stateSchema: 2 })
    assert.equal(keep.migrated, false)
    assert.equal(keep.state.animMode, 'E')
  })

  it('animMode A~E · debugLatency', () => {
    assert.deepEqual([...ANIM_MODES], ['A', 'B', 'C', 'D', 'E'])
    assert.equal(setAnimMode({}, 'C').animMode, 'C')
    assert.equal(setAnimMode({}, 'E').animMode, 'E')
    assert.equal(setAnimMode({}, 'Z').animMode, 'A')
    assert.equal(setDebugLatency({}, true).debugLatency, true)
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
    assert.equal(s.rounds, 0)
    assert.equal(s.todayTotal, 0)
    assert.equal(s.todayDate, '2026-11-13')
  })
})

describe('serialize', () => {
  it('왕복 직렬화', () => {
    const raw = serializeState({
      bead: 5,
      rounds: 1,
      beadsPerRound: 54,
      vibrateOnBead: false,
      todayDate: '2026-11-13',
      todayTotal: 12
    })
    const s = deserializeState(raw)
    assert.equal(s.bead, 5)
    assert.equal(s.rounds, 1)
    assert.equal(s.beadsPerRound, 54)
    assert.equal(s.vibrateOnBead, false)
    assert.equal(s.todayTotal, 12)
  })

  it('깨진 JSON 복구', () => {
    const s = deserializeState('{not-json')
    assert.equal(s.beadsPerRound, 108)
    assert.equal(s.todayDate, formatDate())
  })
})

describe('progressRatio', () => {
  it('중간 진행률', () => {
    assert.equal(progressRatio({ bead: 27, beadsPerRound: 108 }), 0.25)
  })
})
