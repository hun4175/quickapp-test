import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOCUS_MS,
  BREAK_MS,
  FRAMES,
  VIBRATE_OFFSETS_MS,
  pad2,
  durationOf,
  initialState,
  normalizeState,
  serializeState,
  deserializeState,
  isIdle,
  start,
  pause,
  toggle,
  reset,
  advance,
  formatTime,
  frameIndex,
  ringSrc,
  viewModel
} from '../src/common/timer.js'

const T0 = 1_000_000_000_000

describe('formatTime / frameIndex', () => {
  it('pad2 는 두 자리로 맞춘다', () => {
    assert.equal(pad2(0), '00')
    assert.equal(pad2(9), '09')
    assert.equal(pad2(25), '25')
  })
  it('시작 25:00, 1ms 지나도 25:00, 0ms 는 00:00', () => {
    assert.equal(formatTime(FOCUS_MS), '25:00')
    assert.equal(formatTime(FOCUS_MS - 1), '25:00')
    assert.equal(formatTime(FOCUS_MS - 1000), '24:59')
    assert.equal(formatTime(1000), '00:01')
    assert.equal(formatTime(1), '00:01')
    assert.equal(formatTime(0), '00:00')
    assert.equal(formatTime(BREAK_MS), '05:00')
    assert.equal(formatTime(-10), '00:00')
  })
  it('프레임 0 은 가득, 마지막은 비움', () => {
    assert.equal(frameIndex(FOCUS_MS, FOCUS_MS, 60), 0)
    assert.equal(frameIndex(0, FOCUS_MS, 60), 59)
    assert.equal(frameIndex(FOCUS_MS / 2, FOCUS_MS, 60), 30)
    assert.equal(frameIndex(BREAK_MS, BREAK_MS), 0)
    assert.ok(frameIndex(FOCUS_MS * 2, FOCUS_MS, 60) === 0)
  })
  it('ringSrc 경로와 색 폴더', () => {
    assert.equal(ringSrc('focus', FOCUS_MS), '/common/rings/focus-00.png')
    assert.equal(ringSrc('break', 0), '/common/rings/break-59.png')
  })
})

describe('상태 전환', () => {
  it('초기값은 집중 대기 25:00', () => {
    const s = initialState()
    assert.equal(s.phase, 'focus')
    assert.equal(s.running, false)
    assert.equal(s.endAt, null)
    assert.equal(s.remainMs, FOCUS_MS)
    assert.equal(isIdle(s), true)
    assert.equal(durationOf('focus'), FOCUS_MS)
    assert.equal(durationOf('break'), BREAK_MS)
  })
  it('시작하면 endAt = now + remain, 일시정지하면 남은 시간을 보존', () => {
    const running = start(initialState(), T0)
    assert.equal(running.running, true)
    assert.equal(running.endAt, T0 + FOCUS_MS)
    assert.equal(running.remainMs, FOCUS_MS)
    const later = T0 + 90 * 1000
    const { state: mid } = advance(running, later)
    assert.equal(mid.remainMs, FOCUS_MS - 90 * 1000)
    const paused = pause(mid, later)
    assert.equal(paused.running, false)
    assert.equal(paused.endAt, null)
    assert.equal(paused.remainMs, FOCUS_MS - 90 * 1000)
    const resumed = start(paused, later + 5000)
    assert.equal(resumed.endAt, later + 5000 + (FOCUS_MS - 90 * 1000))
    assert.equal(resumed.remainMs, FOCUS_MS - 90 * 1000)
  })
  it('toggle 은 시작/일시정지를 오간다', () => {
    const a = toggle(initialState(), T0)
    assert.equal(a.running, true)
    const b = toggle(a, T0 + 1000)
    assert.equal(b.running, false)
    assert.equal(b.remainMs, FOCUS_MS - 1000)
  })
  it('리셋은 확인 없이 집중 대기로 돌아간다', () => {
    const running = start(initialState(), T0)
    const { state: mid } = advance(running, T0 + FOCUS_MS + 1000)
    assert.equal(mid.phase, 'break')
    const r = reset()
    assert.deepEqual(r, initialState())
    assert.equal(isIdle(r), true)
  })
  it('실행 중 start 를 다시 호출해도 끝시각을 바꾸지 않는다', () => {
    const running = start(initialState(), T0)
    assert.deepEqual(start(running, T0 + 9999), running)
  })
})

describe('구간 진행(advance) — 끝시각 기준, 누적 감산 없음', () => {
  it('집중이 끝나면 휴식으로 자동 전환하고 남은 시간을 다시 계산한다', () => {
    const running = start(initialState(), T0)
    const atEnd = advance(running, T0 + FOCUS_MS)
    assert.equal(atEnd.crossed, 1)
    assert.equal(atEnd.state.phase, 'break')
    assert.equal(atEnd.state.running, true)
    assert.equal(atEnd.state.remainMs, BREAK_MS)
    assert.equal(atEnd.state.endAt, T0 + FOCUS_MS + BREAK_MS)
  })
  it('한 사이클(집중+휴식)이 지나면 다시 집중이다', () => {
    const running = start(initialState(), T0)
    const after = advance(running, T0 + FOCUS_MS + BREAK_MS)
    assert.equal(after.crossed, 2)
    assert.equal(after.state.phase, 'focus')
    assert.equal(after.state.remainMs, FOCUS_MS)
  })
  it('앱 밖에 있는 동안 여러 구간이 지나면 그만큼 진행한다', () => {
    const running = start(initialState(), T0)
    // 2시간 = 4 사이클(집중 25 + 휴식 5) = 8 구간, 정확히 끝나면 다음 집중 시작
    const twoHours = 2 * 60 * 60 * 1000
    const after = advance(running, T0 + twoHours)
    assert.equal(after.crossed, 8)
    assert.equal(after.state.phase, 'focus')
    assert.equal(after.state.remainMs, FOCUS_MS)
    // 2시간 + 10분 → 집중 15분 남음
    const after2 = advance(running, T0 + twoHours + 10 * 60 * 1000)
    assert.equal(after2.crossed, 8)
    assert.equal(after2.state.phase, 'focus')
    assert.equal(after2.state.remainMs, FOCUS_MS - 10 * 60 * 1000)
  })
  it('정지 상태에서는 시간이 흐르지 않는다', () => {
    const paused = pause(start(initialState(), T0), T0 + 1000)
    const later = advance(paused, T0 + 10 * 60 * 1000)
    assert.equal(later.crossed, 0)
    assert.deepEqual(later.state, paused)
  })
  it('남은 시간은 endAt - now 이지, 이전 remain 을 빼지 않는다', () => {
    const running = start(initialState(), T0)
    const a = advance(running, T0 + 4000)
    const b = advance(running, T0 + 4000)
    assert.equal(a.state.remainMs, b.state.remainMs)
    assert.equal(a.state.remainMs, FOCUS_MS - 4000)
  })
})

describe('직렬화', () => {
  it('정상 상태를 복원한다', () => {
    const s = start(initialState(), T0)
    const raw = serializeState(s)
    assert.deepEqual(deserializeState(raw), normalizeState(s))
  })
  it('깨진 값은 대기로 되돌린다', () => {
    assert.deepEqual(deserializeState(''), initialState())
    assert.deepEqual(deserializeState('not-json'), initialState())
    assert.deepEqual(deserializeState('null'), initialState())
    const n = normalizeState({ phase: 'nope', running: true, endAt: 'x', remainMs: -1 })
    assert.equal(n.phase, 'focus')
    assert.equal(n.running, false)
    assert.equal(n.remainMs, FOCUS_MS)
  })
})

describe('viewModel', () => {
  it('대기는 어두운 빨강, 실행 중 집중은 밝은 빨강, 휴식은 초록, 일시정지는 막대만', () => {
    const idle = viewModel(initialState())
    assert.equal(idle.timeText, '25:00')
    assert.equal(idle.idle, true)
    assert.equal(idle.paused, false)
    assert.equal(idle.ringOpacity, 0.45)
    assert.equal(idle.timeColor, '#8A3A3A')
    assert.equal(idle.ringSrc, '/common/rings/focus-00.png')

    const running = viewModel(start(initialState(), T0))
    assert.equal(running.idle, false)
    assert.equal(running.paused, false)
    assert.equal(running.ringOpacity, 1)
    assert.equal(running.timeColor, '#FF4B4B')

    const mid = start(initialState(), T0)
    const paused = viewModel(pause(mid, T0 + 60 * 1000))
    assert.equal(paused.paused, true)
    assert.equal(paused.idle, false)
    assert.equal(paused.timeText, '24:00')
    assert.equal(paused.ringOpacity, 0.45)

    const toBreak = advance(start(initialState(), T0), T0 + FOCUS_MS)
    const br = viewModel(toBreak.state)
    assert.equal(br.timeText, '05:00')
    assert.equal(br.timeColor, '#3DDC84')
    assert.equal(br.ringSrc, '/common/rings/break-00.png')
  })
  it('진동 간격은 0.5초 간격 3회', () => {
    assert.deepEqual(VIBRATE_OFFSETS_MS, [0, 500, 1000])
    assert.equal(FRAMES, 60)
  })
})
