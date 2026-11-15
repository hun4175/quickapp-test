import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOCUS_MS,
  BREAK_MS,
  FOCUS_MIN_MS,
  FOCUS_MAX_MS,
  FOCUS_STEP_MS,
  TICK_MS,
  VIBRATE_OFFSETS_MS,
  SCREEN_H,
  pad2,
  clampFocusMs,
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
  adjustFocus,
  classifySwipe,
  advance,
  formatTime,
  remainRatio,
  fillHeight,
  nextPhaseOf,
  phaseColor,
  ARROW_OPACITY_ON,
  ARROW_OPACITY_DIM,
  viewModel
} from '../src/common/timer.js'

const T0 = 1_000_000_000_000

describe('formatTime / fillHeight', () => {
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
  it('남은 비율만큼 아래쪽 높이가 남고, 가득은 514, 절반은 257, 끝은 0', () => {
    assert.equal(remainRatio(FOCUS_MS, FOCUS_MS), 1)
    assert.equal(remainRatio(0, FOCUS_MS), 0)
    assert.equal(remainRatio(FOCUS_MS / 2, FOCUS_MS), 0.5)
    assert.equal(fillHeight(FOCUS_MS, FOCUS_MS, SCREEN_H), 514)
    assert.equal(fillHeight(FOCUS_MS / 2, FOCUS_MS, SCREEN_H), 257)
    assert.equal(fillHeight(0, FOCUS_MS, SCREEN_H), 0)
    assert.equal(fillHeight(BREAK_MS, BREAK_MS), 514)
    assert.equal(TICK_MS, 1000)
  })
})

describe('상태 전환', () => {
  it('초기값은 집중 대기 25:00', () => {
    const s = initialState()
    assert.equal(s.phase, 'focus')
    assert.equal(s.running, false)
    assert.equal(s.endAt, null)
    assert.equal(s.remainMs, FOCUS_MS)
    assert.equal(s.focusMs, FOCUS_MS)
    assert.equal(s.idle, true)
    assert.equal(isIdle(s), true)
    assert.equal(durationOf('focus'), FOCUS_MS)
    assert.equal(durationOf('break'), BREAK_MS)
  })
  it('시작하면 endAt = now + remain, 일시정지하면 남은 시간을 보존', () => {
    const running = start(initialState(), T0)
    assert.equal(running.running, true)
    assert.equal(running.idle, false)
    assert.equal(running.endAt, T0 + FOCUS_MS)
    assert.equal(running.remainMs, FOCUS_MS)
    const later = T0 + 90 * 1000
    const { state: mid } = advance(running, later)
    assert.equal(mid.remainMs, FOCUS_MS - 90 * 1000)
    const paused = pause(mid, later)
    assert.equal(paused.running, false)
    assert.equal(paused.idle, false)
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
    assert.equal(b.idle, false)
  })
  it('리셋은 확인 없이 집중 대기로 돌아가고, 설정한 집중 시간은 유지한다', () => {
    const custom = adjustFocus(adjustFocus(initialState(), 'up'), 'up')
    assert.equal(custom.focusMs, 35 * 60 * 1000)
    const running = start(custom, T0)
    const { state: mid } = advance(running, T0 + custom.focusMs + 1000)
    assert.equal(mid.phase, 'break')
    const r = reset(mid)
    assert.equal(r.idle, true)
    assert.equal(r.running, false)
    assert.equal(r.phase, 'focus')
    assert.equal(r.focusMs, 35 * 60 * 1000)
    assert.equal(r.remainMs, 35 * 60 * 1000)
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
    const twoHours = 2 * 60 * 60 * 1000
    const after = advance(running, T0 + twoHours)
    assert.equal(after.crossed, 8)
    assert.equal(after.state.phase, 'focus')
    assert.equal(after.state.remainMs, FOCUS_MS)
    const after2 = advance(running, T0 + twoHours + 10 * 60 * 1000)
    assert.equal(after2.crossed, 8)
    assert.equal(after2.state.phase, 'focus')
    assert.equal(after2.state.remainMs, FOCUS_MS - 10 * 60 * 1000)
  })
  it('커스텀 집중 시간으로도 사이클이 맞게 돌아간다', () => {
    const custom = adjustFocus(initialState(), 'down')
    assert.equal(custom.focusMs, 20 * 60 * 1000)
    const running = start(custom, T0)
    const afterFocus = advance(running, T0 + 20 * 60 * 1000)
    assert.equal(afterFocus.crossed, 1)
    assert.equal(afterFocus.state.phase, 'break')
    assert.equal(afterFocus.state.remainMs, BREAK_MS)
    const afterBreak = advance(running, T0 + 20 * 60 * 1000 + BREAK_MS)
    assert.equal(afterBreak.crossed, 2)
    assert.equal(afterBreak.state.phase, 'focus')
    assert.equal(afterBreak.state.remainMs, 20 * 60 * 1000)
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

describe('집중 시간 설정', () => {
  it('clampFocusMs 는 5분 단위, 5~60분', () => {
    assert.equal(clampFocusMs(FOCUS_MS), FOCUS_MS)
    assert.equal(clampFocusMs(7 * 60 * 1000), 5 * 60 * 1000)
    assert.equal(clampFocusMs(8 * 60 * 1000), 10 * 60 * 1000)
    assert.equal(clampFocusMs(0), FOCUS_MIN_MS)
    assert.equal(clampFocusMs(99 * 60 * 1000), FOCUS_MAX_MS)
    assert.equal(clampFocusMs('nope'), FOCUS_MS)
    assert.equal(FOCUS_STEP_MS, 5 * 60 * 1000)
  })
  it('대기 중 위로 스와이프하면 5분 늘고, 아래로 줄고, 숫자는 바로 바뀐다', () => {
    const up = adjustFocus(initialState(), 'up')
    assert.equal(up.focusMs, 30 * 60 * 1000)
    assert.equal(up.remainMs, 30 * 60 * 1000)
    assert.equal(up.idle, true)
    assert.equal(viewModel(up).timeText, '30:00')
    assert.equal(viewModel(up).fillHeight, 514)
    const down = adjustFocus(initialState(), 'down')
    assert.equal(down.focusMs, 20 * 60 * 1000)
    assert.equal(viewModel(down).timeText, '20:00')
    const also = adjustFocus(initialState(), 1)
    assert.equal(also.focusMs, 30 * 60 * 1000)
  })
  it('5분과 60분에서 더 줄이거나 늘리지 않는다', () => {
    let s = initialState()
    for (let i = 0; i < 10; i++) s = adjustFocus(s, 'down')
    assert.equal(s.focusMs, FOCUS_MIN_MS)
    assert.deepEqual(adjustFocus(s, 'down'), s)
    s = initialState()
    for (let i = 0; i < 20; i++) s = adjustFocus(s, 'up')
    assert.equal(s.focusMs, FOCUS_MAX_MS)
    assert.deepEqual(adjustFocus(s, 'up'), s)
    assert.equal(viewModel(s).timeText, '60:00')
  })
  it('실행 중·일시정지에서는 스와이프를 무시한다', () => {
    const running = start(initialState(), T0)
    assert.deepEqual(adjustFocus(running, 'up'), running)
    const paused = pause(running, T0 + 60 * 1000)
    assert.equal(paused.idle, false)
    assert.deepEqual(adjustFocus(paused, 'down'), paused)
    assert.equal(paused.remainMs, FOCUS_MS - 60 * 1000)
  })
  it('설정값은 직렬화되어 다음 실행에도 유지된다', () => {
    const s = adjustFocus(adjustFocus(initialState(), 'up'), 'up')
    const raw = serializeState(s)
    const back = deserializeState(raw)
    assert.equal(back.focusMs, 35 * 60 * 1000)
    assert.equal(back.remainMs, 35 * 60 * 1000)
    assert.equal(back.idle, true)
  })
})

describe('classifySwipe', () => {
  it('위로 쓸면 up, 아래로 쓸면 down, 짧거나 가로면 null', () => {
    assert.equal(classifySwipe(0, -80), 'up')
    assert.equal(classifySwipe(0, 80), 'down')
    assert.equal(classifySwipe(0, -20), null)
    assert.equal(classifySwipe(0, 20), null)
    assert.equal(classifySwipe(100, -40), null)
    assert.equal(classifySwipe(5, -60), 'up')
  })
})

describe('직렬화', () => {
  it('정상 상태를 복원한다', () => {
    const s = start(initialState(), T0)
    const raw = serializeState(s)
    assert.deepEqual(deserializeState(raw), normalizeState(s))
  })
  it('깨진 값은 대기로 되돌리고, 옛 상태에는 기본 25분을 넣는다', () => {
    assert.deepEqual(deserializeState(''), initialState())
    assert.deepEqual(deserializeState('not-json'), initialState())
    assert.deepEqual(deserializeState('null'), initialState())
    const n = normalizeState({ phase: 'nope', running: true, endAt: 'x', remainMs: -1 })
    assert.equal(n.phase, 'focus')
    assert.equal(n.running, false)
    assert.equal(n.remainMs, FOCUS_MS)
    assert.equal(n.focusMs, FOCUS_MS)
    const old = normalizeState({
      phase: 'focus',
      running: false,
      endAt: null,
      remainMs: FOCUS_MS
    })
    assert.equal(old.idle, true)
    assert.equal(old.focusMs, FOCUS_MS)
  })
})

describe('viewModel', () => {
  it('대기는 어두운 빨강 가득, 실행 중 집중은 밝은 빨강, 휴식은 초록, 일시정지는 막대만', () => {
    const idle = viewModel(initialState())
    assert.equal(idle.timeText, '25:00')
    assert.equal(idle.idle, true)
    assert.equal(idle.paused, false)
    assert.equal(idle.fillHeight, 514)
    assert.equal(idle.fillColor, '#8A3A3A')
    assert.equal(idle.backColor, '#2A6B4A')
    assert.equal(idle.upOpacity, ARROW_OPACITY_ON)
    assert.equal(idle.downOpacity, ARROW_OPACITY_ON)

    const running = viewModel(start(initialState(), T0))
    assert.equal(running.idle, false)
    assert.equal(running.paused, false)
    assert.equal(running.fillHeight, 514)
    assert.equal(running.fillColor, '#FF4B4B')
    assert.equal(running.backColor, '#3DDC84')

    const mid = start(initialState(), T0)
    const paused = viewModel(pause(mid, T0 + 12.5 * 60 * 1000))
    assert.equal(paused.paused, true)
    assert.equal(paused.idle, false)
    assert.equal(paused.timeText, '12:30')
    assert.equal(paused.fillHeight, 257)
    assert.equal(paused.fillColor, '#8A3A3A')
    assert.equal(paused.backColor, '#2A6B4A')

    const toBreak = advance(start(initialState(), T0), T0 + FOCUS_MS)
    const br = viewModel(toBreak.state)
    assert.equal(br.timeText, '05:00')
    assert.equal(br.fillColor, '#3DDC84')
    assert.equal(br.backColor, '#000000')
    assert.equal(br.fillHeight, 514)
    assert.equal(nextPhaseOf('focus'), 'break')
    assert.equal(nextPhaseOf('break'), 'focus')
    assert.equal(phaseColor('focus', false), '#FF4B4B')
    assert.equal(phaseColor('break', true), '#2A6B4A')
  })
  it('집중이 줄면 위쪽은 휴식 초록, 휴식이 줄면 위쪽은 검정', () => {
    const running = start(initialState(), T0)
    const half = viewModel(advance(running, T0 + 12.5 * 60 * 1000).state)
    assert.equal(half.fillHeight, 257)
    assert.equal(half.fillColor, '#FF4B4B')
    assert.equal(half.backColor, '#3DDC84')
    const br = start({ phase: 'break', running: false, remainMs: BREAK_MS, focusMs: FOCUS_MS, idle: false }, T0)
    const brHalf = viewModel(advance(br, T0 + 2.5 * 60 * 1000).state)
    assert.equal(brHalf.timeText, '02:30')
    assert.equal(brHalf.fillHeight, 257)
    assert.equal(brHalf.fillColor, '#3DDC84')
    assert.equal(brHalf.backColor, '#000000')
  })
  it('대기에서만 화살표를 쓰고, 60분이면 ▲, 5분이면 ▼를 흐리게 한다', () => {
    const idle = viewModel(initialState())
    assert.equal(idle.idle, true)
    assert.equal(idle.upOpacity, 1)
    assert.equal(idle.downOpacity, 1)
    let max = initialState()
    for (let i = 0; i < 20; i++) max = adjustFocus(max, 'up')
    const atMax = viewModel(max)
    assert.equal(atMax.timeText, '60:00')
    assert.equal(atMax.upOpacity, ARROW_OPACITY_DIM)
    assert.equal(atMax.downOpacity, ARROW_OPACITY_ON)
    let min = initialState()
    for (let i = 0; i < 10; i++) min = adjustFocus(min, 'down')
    const atMin = viewModel(min)
    assert.equal(atMin.timeText, '05:00')
    assert.equal(atMin.upOpacity, ARROW_OPACITY_ON)
    assert.equal(atMin.downOpacity, ARROW_OPACITY_DIM)
    const running = viewModel(start(initialState(), T0))
    assert.equal(running.idle, false)
    const paused = viewModel(pause(start(initialState(), T0), T0 + 1000))
    assert.equal(paused.idle, false)
  })
  it('진동 간격은 0.5초 간격 3회', () => {
    assert.deepEqual(VIBRATE_OFFSETS_MS, [0, 500, 1000])
  })
})
