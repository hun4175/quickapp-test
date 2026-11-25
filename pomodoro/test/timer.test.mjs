import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOCUS_MS,
  BREAK_MS,
  FOCUS_MIN_MS,
  FOCUS_MAX_MS,
  FOCUS_STEP_MS,
  BREAK_MIN_MS,
  BREAK_MAX_MS,
  TICK_MS,
  VIBRATE_OFFSETS_MS,
  SCROLL_STEP_PX,
  INTRO_MS,
  SETTINGS_KEY,
  LEGACY_STATE_KEY,
  pad2,
  clampFocusMs,
  clampBreakMs,
  defaultSettings,
  normalizeSettings,
  serializeSettings,
  deserializeSettings,
  stepSetting,
  toggleRepeat,
  scrollSteps,
  setupHit,
  tapSide,
  setupViewModel,
  durationOf,
  armedState,
  normalizeState,
  start,
  pause,
  toggle,
  advance,
  formatTime,
  remainRatio,
  GAUGE_CELLS,
  litCells,
  introLit,
  gaugeSrc,
  viewModel
} from '../src/common/timer.js'

const T0 = 1_000_000_000_000
const MIN = 60 * 1000
const S = (focusMin, breakMin, repeat) => ({ focusMs: focusMin * MIN, breakMs: breakMin * MIN, repeat })

describe('formatTime', () => {
  it('pad2 는 두 자리로 맞춘다', () => {
    assert.equal(pad2(0), '00')
    assert.equal(pad2(9), '09')
    assert.equal(pad2(25), '25')
  })
  it('시작 25:00, 1ms 지나도 25:00, 0ms 는 00:00', () => {
    assert.equal(formatTime(FOCUS_MS), '25:00')
    assert.equal(formatTime(FOCUS_MS - 1), '25:00')
    assert.equal(formatTime(FOCUS_MS - 1000), '24:59')
    assert.equal(formatTime(1), '00:01')
    assert.equal(formatTime(0), '00:00')
    assert.equal(formatTime(-10), '00:00')
    assert.equal(remainRatio(FOCUS_MS / 2, FOCUS_MS), 0.5)
    assert.equal(TICK_MS, 1000)
  })
})

describe('설정 값 범위', () => {
  it('기본값은 집중 25분, 휴식 5분, 반복 켬', () => {
    assert.deepEqual(defaultSettings(), { focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true })
    assert.deepEqual(normalizeSettings(null), defaultSettings())
  })
  it('집중은 5분 단위 5~60분, 휴식은 1분 단위 1~30분', () => {
    assert.equal(clampFocusMs(7 * MIN), 5 * MIN)
    assert.equal(clampFocusMs(8 * MIN), 10 * MIN)
    assert.equal(clampFocusMs(0), FOCUS_MIN_MS)
    assert.equal(clampFocusMs(99 * MIN), FOCUS_MAX_MS)
    assert.equal(clampFocusMs('nope'), FOCUS_MS)
    assert.equal(clampFocusMs(null), FOCUS_MS)
    assert.equal(FOCUS_STEP_MS, 5 * MIN)
    assert.equal(clampBreakMs(0), BREAK_MIN_MS)
    assert.equal(clampBreakMs(7.4 * MIN), 7 * MIN)
    assert.equal(clampBreakMs(45 * MIN), BREAK_MAX_MS)
    assert.equal(clampBreakMs(undefined), BREAK_MS)
  })
  it('stepSetting 은 한 칸씩, 끝에서 멈춘다', () => {
    let s = defaultSettings()
    s = stepSetting(s, 'focus', 1)
    assert.equal(s.focusMs, 30 * MIN)
    s = stepSetting(s, 'break', -1)
    assert.equal(s.breakMs, 4 * MIN)
    assert.equal(s.repeat, true)
    let lo = defaultSettings()
    for (let i = 0; i < 20; i++) lo = stepSetting(stepSetting(lo, 'focus', -1), 'break', -1)
    assert.equal(lo.focusMs, FOCUS_MIN_MS)
    assert.equal(lo.breakMs, BREAK_MIN_MS)
    let hi = defaultSettings()
    for (let i = 0; i < 40; i++) hi = stepSetting(stepSetting(hi, 'focus', 1), 'break', 1)
    assert.equal(hi.focusMs, FOCUS_MAX_MS)
    assert.equal(hi.breakMs, BREAK_MAX_MS)
    assert.deepEqual(stepSetting(hi, 'focus', 0), hi)
  })
  it('toggleRepeat 은 반복만 뒤집는다', () => {
    const off = toggleRepeat(defaultSettings())
    assert.equal(off.repeat, false)
    assert.equal(off.focusMs, FOCUS_MS)
    assert.equal(toggleRepeat(off).repeat, true)
  })
})

describe('설정 저장', () => {
  it('설정만 직렬화하고 복원한다(키는 settings.v1)', () => {
    assert.equal(SETTINGS_KEY, 'pomodoro.settings.v1')
    const s = S(40, 12, false)
    const raw = serializeSettings(s)
    assert.deepEqual(JSON.parse(raw), s)
    assert.deepEqual(deserializeSettings(raw, ''), s)
  })
  it('깨진 값은 기본값, 새 키가 없으면 0.1.5 상태의 집중 시간만 이어받고 진행 상태는 버린다', () => {
    assert.deepEqual(deserializeSettings('', ''), defaultSettings())
    assert.deepEqual(deserializeSettings('not-json', 'null'), defaultSettings())
    assert.equal(LEGACY_STATE_KEY, 'pomodoro.state.v1')
    const legacy = JSON.stringify({ phase: 'break', running: true, endAt: T0, remainMs: 1000, focusMs: 35 * MIN, idle: false })
    const s = deserializeSettings('', legacy)
    assert.deepEqual(s, { focusMs: 35 * MIN, breakMs: BREAK_MS, repeat: true })
    assert.equal('running' in s, false)
  })
})

describe('설정 화면 조작', () => {
  it('왼쪽으로 끌면 늘고 오른쪽으로 끌면 준다(SCROLL_STEP_PX 마다 한 칸)', () => {
    assert.equal(scrollSteps(0), 0)
    assert.equal(scrollSteps(-SCROLL_STEP_PX + 1), 0)
    assert.equal(scrollSteps(-SCROLL_STEP_PX), 1)
    assert.equal(scrollSteps(-3 * SCROLL_STEP_PX - 5), 3)
    assert.equal(scrollSteps(SCROLL_STEP_PX - 1), 0)
    assert.equal(scrollSteps(SCROLL_STEP_PX), -1)
    assert.equal(scrollSteps(2.5 * SCROLL_STEP_PX), -2)
  })
  it('터치 위치로 줄을 고른다: 집중 / 휴식 / 반복 / START', () => {
    assert.equal(setupHit(216, 130), 'focus')
    assert.equal(setupHit(216, 280), 'break')
    assert.equal(setupHit(330, 384), 'repeat')
    assert.equal(setupHit(216, 454), 'start')
    assert.equal(setupHit(20, 454), null)
    assert.equal(tapSide(40), -1)
    assert.equal(tapSide(216), 0)
    assert.equal(tapSide(400), 1)
  })
  it('setupViewModel: 큰 숫자, 좌우 이웃 값, 끝에서는 이웃 숨김, 토글 이미지', () => {
    const v = setupViewModel(defaultSettings())
    assert.equal(v.focusText, '25')
    assert.equal(v.breakText, '05')
    assert.equal(v.f1Src, '/common/setup/f2.png')
    assert.equal(v.f2Src, '/common/setup/f5.png')
    assert.equal(v.r1Src, '/common/setup/r0.png')
    assert.equal(v.r2Src, '/common/setup/r5.png')
    assert.equal(v.fPrev1Src + v.fPrev2Src, '/common/setup/n2.png/common/setup/n0.png')
    assert.equal(v.fNext1Src + v.fNext2Src, '/common/setup/n3.png/common/setup/n0.png')
    assert.equal(v.rPrev2Src, '/common/setup/n4.png')
    assert.equal(v.rNext2Src, '/common/setup/n6.png')
    assert.equal(v.toggleSrc, '/common/setup/tog-on.png')
    const lo = setupViewModel(S(5, 1, false))
    assert.equal(lo.fPrevShow, false)
    assert.equal(lo.rPrevShow, false)
    assert.equal(lo.fNextShow, true)
    assert.equal(lo.toggleSrc, '/common/setup/tog-off.png')
    const hi = setupViewModel(S(60, 30, true))
    assert.equal(hi.fNextShow, false)
    assert.equal(hi.rNextShow, false)
    assert.equal(hi.f1Src, '/common/setup/f6.png')
    assert.equal(hi.r1Src, '/common/setup/r3.png')
  })
})

describe('시작 애니메이션', () => {
  it('게이지는 0칸에서 시작해 INTRO_MS 에 36칸으로 차고, 그 동안 시간은 흐르지 않는다', () => {
    assert.ok(INTRO_MS >= 500 && INTRO_MS <= 1200)
    assert.equal(introLit(0), 0)
    assert.equal(introLit(-5), 0)
    assert.equal(introLit(INTRO_MS / 2), 18)
    assert.equal(introLit(INTRO_MS), GAUGE_CELLS)
    assert.equal(introLit(INTRO_MS * 3), GAUGE_CELLS)
    let prev = 0
    for (let t = 0; t <= INTRO_MS; t += 7) {
      const l = introLit(t)
      assert.ok(l >= prev)
      prev = l
    }
    const armed = armedState(S(30, 5, true))
    assert.equal(armed.running, false)
    assert.equal(armed.remainMs, 30 * MIN)
    const v0 = viewModel(armed, 0)
    assert.equal(v0.gaugeSrc, '/common/booster/g00.png')
    assert.equal(v0.timeText, '30:00')
    assert.equal(v0.paused, false)
    assert.equal(viewModel(armed, 18).gaugeSrc, '/common/booster/g18.png')
  })
  it('애니메이션이 끝난 시각부터 설정한 집중 시간 그대로 카운트다운', () => {
    const run = start(armedState(S(30, 5, true)), T0 + INTRO_MS)
    assert.equal(run.running, true)
    assert.equal(run.endAt, T0 + INTRO_MS + 30 * MIN)
    assert.equal(viewModel(run).gaugeSrc, '/common/booster/g36.png')
  })
})

describe('세션 진행(advance) — 끝시각 기준', () => {
  it('일시정지는 남은 시간을 보존하고 재개하면 이어진다', () => {
    const run = start(armedState(defaultSettings()), T0)
    const p = pause(run, T0 + 90 * 1000)
    assert.equal(p.running, false)
    assert.equal(p.remainMs, FOCUS_MS - 90 * 1000)
    assert.equal(viewModel(p).paused, true)
    const r = toggle(p, T0 + 100 * 1000)
    assert.equal(r.running, true)
    assert.equal(r.endAt, T0 + 100 * 1000 + FOCUS_MS - 90 * 1000)
    assert.deepEqual(start(r, T0 + 999999), r)
  })
  it('반복 켬: 집중→휴식→집중으로 순환, 휴식 길이는 설정값', () => {
    const run = start(armedState(S(25, 7, true)), T0)
    const a = advance(run, T0 + 25 * MIN)
    assert.equal(a.crossed, 1)
    assert.equal(a.finished, false)
    assert.equal(a.state.phase, 'break')
    assert.equal(a.state.remainMs, 7 * MIN)
    const b = advance(run, T0 + 32 * MIN)
    assert.equal(b.crossed, 2)
    assert.equal(b.state.phase, 'focus')
    assert.equal(b.state.remainMs, 25 * MIN)
    const c = advance(run, T0 + 3 * 32 * MIN + 60 * 1000)
    assert.equal(c.crossed, 6)
    assert.equal(c.state.remainMs, 24 * MIN)
  })
  it('반복 끔: 집중 + 휴식 한 번이 끝나면 finished, 정지 상태', () => {
    const run = start(armedState(S(10, 3, false)), T0)
    const a = advance(run, T0 + 10 * MIN)
    assert.equal(a.finished, false)
    assert.equal(a.state.phase, 'break')
    const b = advance(a.state, T0 + 13 * MIN)
    assert.equal(b.finished, true)
    assert.equal(b.crossed, 1)
    assert.equal(b.state.running, false)
    assert.equal(b.state.done, true)
    assert.equal(b.state.remainMs, 0)
    const far = advance(run, T0 + 100 * MIN)
    assert.equal(far.finished, true)
    assert.equal(far.crossed, 2)
    assert.deepEqual(start(b.state, T0 + 14 * MIN), b.state)
  })
  it('정지 상태에서는 시간이 흐르지 않고, 남은 시간은 endAt - now 로만 계산한다', () => {
    const paused = pause(start(armedState(defaultSettings()), T0), T0 + 1000)
    assert.deepEqual(advance(paused, T0 + 10 * MIN).state, paused)
    const run = start(armedState(defaultSettings()), T0)
    assert.equal(advance(run, T0 + 4000).state.remainMs, FOCUS_MS - 4000)
    assert.equal(advance(run, T0 + 4000).state.remainMs, FOCUS_MS - 4000)
  })
  it('normalizeState 는 깨진 값을 안전하게 바꾼다', () => {
    const n = normalizeState({ phase: 'nope', running: true, endAt: 'x', remainMs: -1 })
    assert.equal(n.phase, 'focus')
    assert.equal(n.running, false)
    assert.equal(n.remainMs, FOCUS_MS)
    assert.equal(durationOf('break', S(25, 9, true)), 9 * MIN)
  })
})

describe('타이머 viewModel', () => {
  it('켜진 칸: 집중은 휴식 6칸 + ceil(rem/tot*30), 휴식은 ceil(rem/tot*6)', () => {
    assert.equal(GAUGE_CELLS, 36)
    assert.equal(litCells('focus', FOCUS_MS, FOCUS_MS), 36)
    assert.equal(litCells('focus', FOCUS_MS / 2, FOCUS_MS), 21)
    assert.equal(litCells('focus', 1, FOCUS_MS), 7)
    assert.equal(litCells('focus', 0, FOCUS_MS), 6)
    assert.equal(litCells('break', BREAK_MS, BREAK_MS), 6)
    assert.equal(litCells('break', 150 * 1000, BREAK_MS), 3)
    assert.equal(litCells('break', 0, BREAK_MS), 0)
    for (let rem = 0; rem <= FOCUS_MS; rem += 7919) {
      assert.equal(litCells('focus', rem, FOCUS_MS), 6 + Math.ceil((rem / FOCUS_MS) * 30))
    }
    assert.equal(gaugeSrc(0), '/common/booster/g00.png')
    assert.equal(gaugeSrc(99), '/common/booster/g36.png')
    assert.equal(gaugeSrc(-3), '/common/booster/g00.png')
  })
  it('집중 절반 일시정지 = 12:30 + g21 + 막대, 휴식은 REST 라벨', () => {
    const run = start(armedState(defaultSettings()), T0)
    const v = viewModel(pause(run, T0 + 12.5 * MIN))
    assert.equal(v.timeText, '12:30')
    assert.equal(v.gaugeSrc, '/common/booster/g21.png')
    assert.equal(v.m1Src, '/common/booster/m1.png')
    assert.equal(v.m2Src, '/common/booster/m2.png')
    assert.equal(v.s1Src, '/common/booster/s3.png')
    assert.equal(v.s2Src, '/common/booster/s0.png')
    assert.equal(v.paused, true)
    const br = viewModel(advance(run, T0 + FOCUS_MS).state)
    assert.equal(br.labelSrc, '/common/booster/rest.png')
    assert.equal(br.timeText, '05:00')
    assert.equal(br.gaugeSrc, '/common/booster/g06.png')
    assert.equal(br.paused, false)
  })
  it('진동 간격은 0.5초 간격 3회', () => {
    assert.deepEqual(VIBRATE_OFFSETS_MS, [0, 500, 1000])
  })
})
