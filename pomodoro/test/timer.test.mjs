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
  DIR_LOCK_PX,
  TAP_MAX_MOVE,
  BACK_GUARD_MS,
  INTRO_MS,
  SETTINGS_KEY,
  LEGACY_STATE_KEY,
  THEMES,
  THEME_DEFAULT,
  THEME_INFO,
  SETUP_ZONES,
  TUBE_TOP,
  TUBE_BOTTOM,
  TUBE_H,
  TUBE_LEVELS,
  START_COLOR,
  START_PRESSED,
  THEME_BTN,
  THEME_BTN_PRESSED,
  SAND_H,
  BATTERY_INNER,
  SWEEP_MODE,
  SWEEP_ORIGIN,
  SWEEP_EDGE_ORIGIN,
  VIEW_KEYS,
  pad2,
  clampFocusMs,
  clampBreakMs,
  normalizeTheme,
  defaultSettings,
  normalizeSettings,
  serializeSettings,
  deserializeSettings,
  stepSetting,
  toggleRepeat,
  setTheme,
  sameSettings,
  setupHit,
  zoneTarget,
  tubeLevel,
  tubeSetting,
  tubeFillHeight,
  dirLock,
  isTapMove,
  setupTouchStart,
  setupTouchMove,
  setupTouchEnd,
  setupGestureUi,
  shouldSwallowBack,
  setupViewModel,
  themeRowZone,
  themeHit,
  themeTap,
  themesViewModel,
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
  introProgress,
  gaugeSrc,
  sandHeight,
  batteryFill,
  sweepAngle,
  sweepFrame,
  sweepParts,
  viewModel
} from '../src/common/timer.js'

const T0 = 1_000_000_000_000
const MIN = 60 * 1000
const S = (focusMin, breakMin, repeat, theme) => ({ focusMs: focusMin * MIN, breakMs: breakMin * MIN, repeat, theme: theme || 'sand' })
const rot = (style) => parseFloat(JSON.parse(style.transform).rotate)

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
  it('기본값은 집중 25분, 휴식 5분, 반복 켬, 테마 SAND', () => {
    assert.deepEqual(defaultSettings(), { focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'sand' })
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
  it('stepSetting 은 한 칸씩, 끝에서 멈추고 반복·테마는 그대로', () => {
    let s = S(25, 5, true, 'battery')
    s = stepSetting(s, 'focus', 1)
    assert.equal(s.focusMs, 30 * MIN)
    s = stepSetting(s, 'break', -1)
    assert.equal(s.breakMs, 4 * MIN)
    assert.equal(s.repeat, true)
    assert.equal(s.theme, 'battery')
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
    const off = toggleRepeat(S(25, 5, true, 'sweep'))
    assert.equal(off.repeat, false)
    assert.equal(off.focusMs, FOCUS_MS)
    assert.equal(off.theme, 'sweep')
    assert.equal(toggleRepeat(off).repeat, true)
  })
})

describe('테마 저장 · 기본값', () => {
  it('테마 4개, 기본은 SAND, 모르는 값은 SAND', () => {
    assert.deepEqual(THEMES, ['sand', 'booster', 'battery', 'sweep'])
    assert.equal(THEME_DEFAULT, 'sand')
    assert.deepEqual(THEMES.map((t) => THEME_INFO[t].name), ['SAND', 'BOOSTER', 'BATTERY', 'SWEEP'])
    for (const t of THEMES) assert.equal(normalizeTheme(t), t)
    for (const bad of [undefined, null, '', 'SAND', 'tomato', 3, {}]) assert.equal(normalizeTheme(bad), 'sand')
  })
  it('theme 은 기존 키(pomodoro.settings.v1) 안의 필드로 저장·복원된다', () => {
    assert.equal(SETTINGS_KEY, 'pomodoro.settings.v1')
    for (const t of THEMES) {
      const s = S(40, 12, false, t)
      const raw = serializeSettings(s)
      assert.deepEqual(JSON.parse(raw), s)
      assert.deepEqual(deserializeSettings(raw, ''), s)
    }
  })
  it('theme 이 없는 0.1.8 저장값은 값은 그대로, 테마는 SAND', () => {
    const v018 = JSON.stringify({ focusMs: 40 * MIN, breakMs: 12 * MIN, repeat: false })
    assert.deepEqual(deserializeSettings(v018, ''), S(40, 12, false, 'sand'))
    const bad = JSON.stringify({ focusMs: 40 * MIN, breakMs: 12 * MIN, repeat: false, theme: 'lcd' })
    assert.equal(deserializeSettings(bad, '').theme, 'sand')
  })
  it('setTheme 은 테마만 바꾸고, 관·반복 조작은 테마를 지우지 않는다', () => {
    const s = setTheme(S(35, 8, false, 'sand'), 'booster')
    assert.deepEqual(s, S(35, 8, false, 'booster'))
    assert.equal(setTheme(s, 'nope').theme, 'sand')
    assert.equal(tubeSetting(s, 'focus', 100).theme, 'booster')
    assert.equal(tubeSetting(s, 'break', 100).theme, 'booster')
    assert.equal(toggleRepeat(s).theme, 'booster')
    assert.equal(sameSettings(s, setTheme(s, 'battery')), false)
    assert.equal(sameSettings(s, setTheme(s, 'booster')), true)
  })
  it('깨진 값은 기본값, 새 키가 없으면 0.1.5 상태의 집중 시간만 이어받고 진행 상태는 버린다', () => {
    assert.deepEqual(deserializeSettings('', ''), defaultSettings())
    assert.deepEqual(deserializeSettings('not-json', 'null'), defaultSettings())
    assert.equal(LEGACY_STATE_KEY, 'pomodoro.state.v1')
    const legacy = JSON.stringify({ phase: 'break', running: true, endAt: T0, remainMs: 1000, focusMs: 35 * MIN, idle: false })
    const s = deserializeSettings('', legacy)
    assert.deepEqual(s, { focusMs: 35 * MIN, breakMs: BREAK_MS, repeat: true, theme: 'sand' })
    assert.equal('running' in s, false)
  })
})

/** 터치 한 번을 흉내 낸다: pts = [[x, y], ...] 첫 점 = 손 댐, 마지막 점 = 손 뗌. */
function gesture(settings, pts) {
  let g = setupTouchStart(settings, pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) g = setupTouchMove(g, pts[i][0], pts[i][1])
  const last = pts[pts.length - 1]
  return setupTouchEnd(g, last[0], last[1])
}
const FX = 126 // 집중 관 가운데
const RX = 306 // 휴식 관 가운데

describe('설정 화면(TWIN TUBES) 터치 영역', () => {
  it('A-final touch-zones.json 영역 + 왼쪽 아래 톱니(x1/y1 미포함)', () => {
    assert.deepEqual(SETUP_ZONES.focusGauge, [40, 64, 212, 428])
    assert.deepEqual(SETUP_ZONES.restGauge, [220, 64, 392, 428])
    assert.deepEqual(SETUP_ZONES.repeat, [304, 432, 384, 500])
    assert.deepEqual(SETUP_ZONES.start, [124, 432, 300, 506])
    assert.deepEqual(SETUP_ZONES.theme, [40, 432, 120, 500])
    assert.equal(setupHit(40, 64), 'focusGauge')
    assert.equal(setupHit(211, 427), 'focusGauge')
    assert.equal(setupHit(212, 200), null) // 관 사이 8px 틈
    assert.equal(setupHit(220, 200), 'restGauge')
    assert.equal(setupHit(391, 427), 'restGauge')
    assert.equal(setupHit(200, 60), null) // 위 가장자리 시스템 풀다운 여백
    assert.equal(setupHit(216, 470), 'start')
    assert.equal(setupHit(340, 470), 'repeat')
    assert.equal(setupHit(80, 468), 'theme')
    assert.equal(setupHit(119, 468), 'theme')
    assert.equal(setupHit(121, 468), null) // 톱니↔START 사이 4px 틈
    assert.equal(setupHit(124, 468), 'start')
    assert.equal(setupHit(20, 300), null) // x<30 은 비움(시스템 뒤로 가장자리)
    assert.equal(setupHit(29, 470), null)
    assert.equal(setupHit(NaN, 3), null)
    assert.equal(zoneTarget('focusGauge'), 'focus')
    assert.equal(zoneTarget('restGauge'), 'break')
    assert.equal(zoneTarget('theme'), null)
  })
})

describe('설정 화면(TWIN TUBES) 관 칸 매핑', () => {
  it('k = clamp(ceil((420 - y) / (352 / 칸 수)), 1, 칸 수): 집중 29.33px·12칸, 휴식 11.73px·30칸', () => {
    assert.equal(TUBE_TOP, 68)
    assert.equal(TUBE_BOTTOM, 420)
    assert.equal(TUBE_H, 352)
    assert.deepEqual(TUBE_LEVELS, { focus: 12, break: 30 })
    // 정수 연산으로 쓴 같은 식. touch-zones.json 의 29.3333 / 11.7333(반올림한 칸 높이)와는 칸 경계가 정확히
    // 정수 y 에 걸리는 점(집중 y=332·244·156, 휴식 y=244)에서만 다르고, 그 점은 채움 그림의 맨 윗줄(아래 칸)로 친다.
    const boundary = { focus: [332, 244, 156, 68], break: [244, 68] }
    for (const [which, n, px] of [['focus', 12, 29.3333], ['break', 30, 11.7333]]) {
      for (let y = 40; y <= 460; y += 0.25) {
        const k = Math.min(n, Math.max(1, Math.ceil(((420 - y) * n) / 352)))
        assert.equal(tubeLevel(which, y), k, which + ' y=' + y)
        if (!boundary[which].includes(y)) {
          assert.equal(tubeLevel(which, y), Math.min(n, Math.max(1, Math.ceil((420 - y) / px))), which + ' json y=' + y)
        }
      }
    }
    assert.equal(tubeLevel('focus', 419), 1)
    assert.equal(tubeLevel('focus', 68), 12)
    assert.equal(tubeLevel('focus', 420 - 29.34), 2)
    assert.equal(tubeLevel('break', 420 - 11.7), 1)
    assert.equal(tubeLevel('break', 420 - 11.8), 2)
    assert.equal(tubeLevel('break', 69), 30)
    assert.equal(tubeLevel('focus', NaN), 1)
  })
  it('관 밖으로 끌어도 5~60, 1~30 에서 멈춘다(y<68 최대, y>420 최소)', () => {
    assert.equal(tubeSetting(defaultSettings(), 'focus', -50).focusMs, 60 * MIN)
    assert.equal(tubeSetting(defaultSettings(), 'focus', 600).focusMs, 5 * MIN)
    assert.equal(tubeSetting(defaultSettings(), 'break', -50).breakMs, 30 * MIN)
    assert.equal(tubeSetting(defaultSettings(), 'break', 600).breakMs, 1 * MIN)
  })
  it('채움 높이 = k / 칸 수 × 352, top = 420 - 높이', () => {
    assert.equal(tubeFillHeight(12, 12), 352)
    assert.equal(tubeFillHeight(5, 12), 147)
    assert.equal(tubeFillHeight(5, 30), 59)
    assert.equal(tubeFillHeight(1, 30), 12)
    const v = setupViewModel(S(25, 5, true))
    assert.equal(v.focusNum, '25')
    assert.equal(v.restNum, '05')
    assert.equal(v.focusFillH, 147)
    assert.equal(v.focusFillTop, 273)
    assert.equal(v.restFillH, 59)
    assert.equal(v.restFillTop, 361)
  })
})

describe('설정 화면 제스처', () => {
  it('관을 짚으면 바로 스냅, 끄는 동안 칸마다 따라간다', () => {
    const g0 = setupTouchStart(defaultSettings(), FX, 300)
    assert.equal(g0.settings.focusMs, 25 * MIN) // ceil(120/29.33)=5 → 25분
    const g1 = setupTouchMove(g0, FX + 2, 200)
    assert.equal(g1.lock, 'v')
    assert.equal(g1.settings.focusMs, 40 * MIN)
    const r = setupTouchEnd(g1, FX + 2, 80)
    assert.equal(r.settings.focusMs, 60 * MIN)
    assert.equal(r.changed, true)
    assert.equal(r.action, null)
    const rest = gesture(defaultSettings(), [[RX, 400], [RX, 200], [RX, 300]])
    assert.equal(rest.settings.breakMs, 11 * MIN) // ceil(120/11.73)=11
  })
  it('가로로 먼저 움직이면 값을 바꾸지 않는다(스냅도 되돌림)', () => {
    const r = gesture(defaultSettings(), [[FX, 100], [FX + 20, 102], [FX + 60, 110]])
    assert.equal(r.settings.focusMs, 25 * MIN)
    assert.equal(r.changed, false)
    assert.equal(dirLock(13, 0), 'h')
    assert.equal(dirLock(0, 13), 'v')
    assert.equal(dirLock(8, 8), null) // 11.3px ≤ 12
    assert.equal(DIR_LOCK_PX, 12)
  })
  it('세로로 잠긴 뒤에는 가로로 크게 비껴도 y 만 따라간다', () => {
    const r = gesture(defaultSettings(), [[RX, 400], [RX + 2, 380], [RX + 110, 200], [RX + 120, 200]])
    assert.equal(r.settings.breakMs, 19 * MIN) // ceil(220/11.73)=19
  })
  it('REPEAT 탭 = 토글, START 탭 = 시작, 톱니 탭 = 테마 고르기, 끌면 아무 일도 안 함', () => {
    const rep = gesture(defaultSettings(), [[340, 470], [342, 472]])
    assert.equal(rep.settings.repeat, false)
    assert.equal(rep.changed, true)
    assert.equal(gesture(defaultSettings(), [[216, 470], [216, 470]]).action, 'start')
    const th = gesture(defaultSettings(), [[80, 468], [82, 470]])
    assert.equal(th.action, 'themes')
    assert.equal(th.changed, false)
    assert.equal(gesture(defaultSettings(), [[216, 470], [216, 400], [216, 380]]).action, null)
    assert.equal(gesture(defaultSettings(), [[80, 468], [100, 470], [140, 470]]).action, null) // 가로 잠김
    assert.equal(gesture(defaultSettings(), [[20, 300], [20, 300]]).action, null)
    assert.ok(isTapMove(TAP_MAX_MOVE, 0) && !isTapMove(TAP_MAX_MOVE + 1, 0))
  })
  it('터치 중 강조: 끄는 관 테두리, START·톱니 눌림 색', () => {
    const idle = setupGestureUi(null)
    assert.deepEqual(idle, { fActive: false, rActive: false, startOn: false, themeOn: false, startColor: START_COLOR, themeBtnColor: THEME_BTN })
    assert.equal(setupGestureUi(setupTouchStart(defaultSettings(), FX, 300)).fActive, true)
    assert.equal(setupGestureUi(setupTouchStart(defaultSettings(), RX, 300)).rActive, true)
    const h = setupTouchMove(setupTouchStart(defaultSettings(), FX, 300), FX + 30, 300)
    assert.equal(setupGestureUi(h).fActive, false)
    assert.equal(setupGestureUi(setupTouchStart(defaultSettings(), 216, 470)).startColor, START_PRESSED)
    assert.equal(setupGestureUi(setupTouchStart(defaultSettings(), 80, 468)).themeBtnColor, THEME_BTN_PRESSED)
  })
  it('시스템 뒤로: 설정 컨트롤 터치 중·직후(BACK_GUARD_MS)만 삼킨다', () => {
    assert.equal(shouldSwallowBack('setup', true, 'focusGauge', 0, T0), true)
    assert.equal(shouldSwallowBack('setup', false, 'restGauge', T0, T0 + BACK_GUARD_MS - 1), true)
    assert.equal(shouldSwallowBack('setup', false, 'restGauge', T0, T0 + BACK_GUARD_MS), false)
    assert.equal(shouldSwallowBack('setup', true, null, 0, T0), false) // x<30 에서 시작
    assert.equal(shouldSwallowBack('timer', true, 'start', 0, T0), false)
  })
  it('설정 viewModel: REPEAT 켬/끔 색과 손잡이', () => {
    const on = setupViewModel(S(60, 30, true))
    assert.equal(on.focusFillH, 352)
    assert.equal(on.restFillTop, 68)
    assert.deepEqual([on.repLabColor, on.togColor, on.knobLeft], ['#FFFFFF', '#3DDC84', 343])
    const off = setupViewModel(S(5, 1, false))
    assert.deepEqual([off.focusNum, off.restNum], ['05', '01'])
    assert.deepEqual([off.repLabColor, off.togColor, off.knobLeft], ['#8C8C8C', '#333333', 321])
  })
})

describe('테마 고르기 화면', () => {
  it('줄 4개: x 40~392, y 96+88i, 높이 80, 줄 사이 틈은 null', () => {
    assert.deepEqual(themeRowZone(0), [40, 96, 392, 176])
    assert.deepEqual(themeRowZone(3), [40, 360, 392, 440])
    assert.equal(themeHit(200, 96), 'sand')
    assert.equal(themeHit(200, 175), 'sand')
    assert.equal(themeHit(200, 180), null)
    assert.equal(themeHit(200, 184), 'booster')
    assert.equal(themeHit(391, 300), 'battery')
    assert.equal(themeHit(200, 439), 'sweep')
    assert.equal(themeHit(200, 440), null)
    assert.equal(themeHit(35, 300), null)
    assert.equal(themeHit(200, 50), null)
  })
  it('탭(이동 ≤ 40px)만 고른다', () => {
    assert.equal(themeTap(200, 300, 205, 303), 'battery')
    assert.equal(themeTap(200, 300, 200, 360), null)
    assert.equal(themeTap(200, 300, 300, 300), null)
    assert.equal(themeTap(200, 180, 200, 180), null)
    assert.equal(themeTap(200, 300, null, null), null)
  })
  it('현재 테마는 흰 테두리 + ✓, 누른 줄은 밝은 바탕', () => {
    const v = themesViewModel(S(25, 5, true, 'battery'), 'sand')
    assert.deepEqual([v.cur0, v.cur1, v.cur2, v.cur3], [false, false, true, false])
    assert.equal(v.rowBc2, '#FFFFFF')
    assert.equal(v.rowBc0, '#1A1A1A')
    assert.equal(v.rowBg0, '#333333')
    assert.equal(v.rowBg2, '#1A1A1A')
    assert.equal(themesViewModel({}).cur0, true) // 기본 SAND
  })
})

describe('시작 애니메이션', () => {
  it('게이지는 0에서 시작해 INTRO_MS 에 가득 차고, 그 동안 시간은 흐르지 않는다', () => {
    assert.ok(INTRO_MS >= 500 && INTRO_MS <= 1200)
    assert.equal(introLit(0), 0)
    assert.equal(introLit(INTRO_MS / 2), 18)
    assert.equal(introLit(INTRO_MS * 3), GAUGE_CELLS)
    assert.equal(introProgress(-5), 0)
    assert.equal(introProgress(INTRO_MS / 2), 0.5)
    assert.equal(introProgress(INTRO_MS * 3), 1)
    for (let t = 0; t <= INTRO_MS; t += 7) {
      // BOOSTER 칸 수는 0.1.8 introLit 과 같다
      assert.equal(viewModel(armedState(defaultSettings()), 'booster', introProgress(t)).gaugeSrc, gaugeSrc(introLit(t)))
    }
    const armed = armedState(S(30, 5, true))
    assert.equal(armed.running, false)
    const v0 = viewModel(armed, 'booster', 0)
    assert.equal(v0.gaugeSrc, '/common/booster/g00.png')
    assert.equal(v0.timeText, '30:00')
    assert.equal(v0.paused, false)
    assert.equal(viewModel(armed, 'sand', 0).sandH, 0)
    assert.equal(viewModel(armed, 'sand', 0.5).sandH, 257)
    assert.equal(viewModel(armed, 'battery', 1).batH, 342)
    assert.equal(viewModel(armed, 'sweep', 0.25).sweepTheta, 90)
    assert.equal(viewModel(armed, 'sweep', 0.25).paused, false)
  })
  it('애니메이션이 끝난 시각부터 설정한 집중 시간 그대로 카운트다운', () => {
    const run = start(armedState(S(30, 5, true)), T0 + INTRO_MS)
    assert.equal(run.running, true)
    assert.equal(run.endAt, T0 + INTRO_MS + 30 * MIN)
    assert.equal(viewModel(run, 'booster').gaugeSrc, '/common/booster/g36.png')
  })
})

describe('세션 진행(advance) — 끝시각 기준', () => {
  it('일시정지는 남은 시간을 보존하고 재개하면 이어진다', () => {
    const run = start(armedState(defaultSettings()), T0)
    const p = pause(run, T0 + 90 * 1000)
    assert.equal(p.running, false)
    assert.equal(p.remainMs, FOCUS_MS - 90 * 1000)
    assert.equal(viewModel(p, 'booster').paused, true)
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

describe('BOOSTER 타이머(0.1.8 그대로)', () => {
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
    const v = viewModel(pause(run, T0 + 12.5 * MIN), 'booster')
    assert.equal(v.timeText, '12:30')
    assert.equal(v.gaugeSrc, '/common/booster/g21.png')
    assert.equal(v.m1Src, '/common/booster/m1.png')
    assert.equal(v.m2Src, '/common/booster/m2.png')
    assert.equal(v.s1Src, '/common/booster/s3.png')
    assert.equal(v.s2Src, '/common/booster/s0.png')
    assert.equal(v.paused, true)
    const br = viewModel(advance(run, T0 + FOCUS_MS).state, 'booster')
    assert.equal(br.labelSrc, '/common/booster/rest.png')
    assert.equal(br.timeText, '05:00')
    assert.equal(br.gaugeSrc, '/common/booster/g06.png')
    assert.equal(br.paused, false)
  })
})

/** 실행 중 상태: phase, 남은 ms, 설정(분) */
const runAt = (phase, remainMs, f, b) => {
  const st = armedState(S(f || 25, b || 5, true))
  return { ...st, phase, running: true, endAt: T0 + remainMs, remainMs }
}

describe('SAND 타이머: 높이 = round(남은 비율 × 514)', () => {
  it('높이·top·수위선', () => {
    assert.equal(SAND_H, 514)
    assert.equal(sandHeight(1), 514)
    assert.equal(sandHeight(0.5), 257)
    assert.equal(sandHeight(0), 0)
    assert.equal(sandHeight(2), 514)
    assert.equal(sandHeight(-1), 0)
    for (let rem = 0; rem <= FOCUS_MS; rem += 6113) {
      const v = viewModel(runAt('focus', rem), 'sand')
      const h = Math.round((rem / FOCUS_MS) * 514)
      assert.equal(v.sandH, h)
      assert.equal(v.sandTop, 514 - h)
      assert.equal(v.levelTop, 514 - h - 2)
      assert.equal(v.levelShow, h > 0 && h < 514)
      assert.equal(v.sandShow, h > 0)
    }
    const mid = viewModel(runAt('focus', 12.5 * MIN), 'sand')
    assert.deepEqual([mid.sandTop, mid.sandH, mid.sandColor, mid.levelColor], [257, 257, '#FF4B4B', '#FFC9C0'])
    assert.equal(mid.totalText, '25 MIN')
    assert.equal(mid.phaseLabel, 'FOCUS')
    const late = viewModel(runAt('focus', 2 * MIN), 'sand')
    assert.equal(late.sandH, 41) // 시안 focus-late 와 같은 높이
    const rest = viewModel(runAt('break', 2.5 * MIN), 'sand')
    assert.deepEqual([rest.sandH, rest.sandColor, rest.phaseLabel, rest.totalText], [257, '#3DDC84', 'REST', '5 MIN'])
    const full = viewModel(runAt('focus', 25 * MIN), 'sand')
    assert.equal(full.levelShow, false)
  })
  it('일시정지는 어두운 색(0.1.1 과 같은 #8A3A3A / #2A6B4A)', () => {
    const p = viewModel(pause(runAt('focus', 10 * MIN), T0 + 1000), 'sand')
    assert.equal(p.paused, true)
    assert.equal(p.sandColor, '#8A3A3A')
    const pr = viewModel(pause(runAt('break', 2 * MIN), T0), 'sand')
    assert.equal(pr.sandColor, '#2A6B4A')
  })
})

describe('BATTERY 타이머: 집중은 닳고(남은 비율), 휴식은 충전(지난 비율)', () => {
  it('높이 = round(비율 × 342), top = 449 - 높이, 퍼센트 글자', () => {
    assert.deepEqual(BATTERY_INNER, { top: 107, bottom: 449, h: 342 })
    assert.deepEqual(batteryFill('focus', 0.5), { ratio: 0.5, height: 171, top: 278, pct: 50 })
    assert.deepEqual(batteryFill('break', 0.25), { ratio: 0.75, height: 257, top: 192, pct: 75 })
    assert.equal(batteryFill('focus', 0).height, 0)
    assert.equal(batteryFill('break', 1).height, 0) // 휴식 시작 = 빈 배터리
    assert.equal(batteryFill('break', 0).height, 342)
    for (let rem = 0; rem <= BREAK_MS; rem += 7001) {
      const v = viewModel(runAt('break', rem), 'battery')
      const h = Math.round((1 - rem / BREAK_MS) * 342)
      assert.equal(v.batH, h)
      assert.equal(v.batTop, 449 - h)
      assert.equal(v.batShow, h > 0)
    }
    const mid = viewModel(runAt('focus', 12.5 * MIN), 'battery')
    assert.deepEqual([mid.batTop, mid.batH, mid.batColor], [278, 171, '#FF5A4A'])
    assert.deepEqual([mid.mmText, mid.ssText, mid.pctText, mid.phaseLabel], ['12', ':30', '50% LEFT', 'FOCUS'])
    const rest = viewModel(runAt('break', 2.5 * MIN), 'battery')
    assert.deepEqual([rest.batH, rest.batColor, rest.pctText, rest.mmText], [171, '#3CE07E', 'CHARGING 50%', '02'])
    const p = viewModel(pause(runAt('focus', 12.5 * MIN), T0), 'battery')
    assert.equal(p.batColor, '#8A3A3A')
  })
})

describe('SWEEP 타이머: θ = 남은 비율 × 360°, 12시부터 시계 방향', () => {
  it('θ 와 프레임 번호', () => {
    assert.equal(sweepAngle(1), 360)
    assert.equal(sweepAngle(0.5), 180)
    assert.equal(sweepAngle(0), 0)
    assert.equal(sweepAngle(1 / 3), 120)
    assert.equal(sweepFrame(1), 60)
    assert.equal(sweepFrame(0.5), 30)
    assert.equal(sweepFrame(0.501), 31)
    assert.equal(sweepFrame(1e-6), 1)
    assert.equal(sweepFrame(0), 0)
    for (let rem = 0; rem <= FOCUS_MS; rem += 5003) {
      const v = viewModel(runAt('focus', rem), 'sweep')
      assert.ok(Math.abs(v.sweepTheta - (rem / FOCUS_MS) * 360) <= 0.005)
    }
    const mid = viewModel(runAt('focus', 12.5 * MIN), 'sweep')
    assert.equal(mid.sweepTheta, 180)
    const late = viewModel(runAt('focus', 2 * MIN), 'sweep')
    assert.equal(late.sweepTheta, 28.8)
    const rest = viewModel(runAt('break', 2.5 * MIN), 'sweep')
    assert.equal(rest.sweepTheta, 180)
    assert.equal(rest.secAColor, '#3DDC84')
  })
  it('(b) rotate: secA 고정, mask = rotate(θ) (0<θ≤180), secB = rotate(θ-180) (θ>180), edge = rotate(θ) (0<θ<360)', () => {
    const cases = [
      [360, { secAShow: true, maskShow: false, secBShow: true, edgeShow: false }],
      [270, { secAShow: true, maskShow: false, secBShow: true, edgeShow: true }],
      [180.5, { secAShow: true, maskShow: false, secBShow: true, edgeShow: true }],
      [180, { secAShow: true, maskShow: true, secBShow: false, edgeShow: true }],
      [30, { secAShow: true, maskShow: true, secBShow: false, edgeShow: true }],
      [0, { secAShow: false, maskShow: false, secBShow: false, edgeShow: false }]
    ]
    for (const [th, want] of cases) {
      const p = sweepParts('focus', th / 360, false, 'rotate')
      for (const k of Object.keys(want)) assert.equal(p[k], want[k], th + ' ' + k)
      assert.equal(rot(p.maskStyle), th)
      assert.equal(rot(p.secBStyle), Math.max(0, th - 180))
      assert.equal(rot(p.edgeStyle), th)
      assert.equal(p.maskStyle.transformOrigin, '0px 338px')
      assert.equal(p.secBStyle.transformOrigin, '0px 338px')
      assert.equal(p.edgeStyle.transformOrigin, '2px 338px')
      assert.equal(p.secBStyle.backgroundColor, '#FF4B4B')
      assert.equal(p.frameShow, false)
    }
    assert.equal(SWEEP_ORIGIN, '0px 338px')
    assert.equal(SWEEP_EDGE_ORIGIN, '2px 338px')
    // transform 값은 toolkit 2.0 동적 형식(JSON 문자열 {"rotate":"θdeg"})
    assert.equal(sweepParts('focus', 0.25, false, 'rotate').maskStyle.transform, '{"rotate":"90deg"}')
  })
  it('(a) frames: ceil(비율 × 60) 번 프레임, 0 이면 숨김, 집중 f / 휴식 r', () => {
    const p = sweepParts('focus', 0.5, false, 'frames')
    assert.deepEqual([p.frameShow, p.frameSrc, p.secAShow, p.maskShow, p.secBShow, p.edgeShow], [true, '/common/sweep/f30.png', false, false, false, false])
    assert.equal(sweepParts('break', 1, false, 'frames').frameSrc, '/common/sweep/r60.png')
    assert.equal(sweepParts('break', 0.01, false, 'frames').frameSrc, '/common/sweep/r01.png')
    assert.equal(sweepParts('focus', 0, false, 'frames').frameShow, false)
  })
  it('viewModel 은 SWEEP_MODE(0.1.9 기본 rotate, 대체 frames)를 따른다', () => {
    assert.ok(['rotate', 'frames'].includes(SWEEP_MODE))
    const v = viewModel(runAt('focus', 12.5 * MIN), 'sweep')
    assert.equal(v.maskShow, SWEEP_MODE === 'rotate')
    assert.equal(v.frameShow, SWEEP_MODE === 'frames')
  })
  it('일시정지는 어두운 색', () => {
    const p = sweepParts('focus', 0.75, true, 'rotate')
    assert.equal(p.secAColor, '#8A3A3A')
    assert.equal(p.secBStyle.backgroundColor, '#8A3A3A')
  })
})

describe('viewModel 공통', () => {
  it('테마마다 VIEW_KEYS 의 키를 모두 채운다, 모르는 테마는 SAND', () => {
    const st = runAt('focus', 12.5 * MIN)
    for (const t of THEMES) {
      const v = viewModel(st, t)
      assert.equal(v.theme, t)
      for (const k of VIEW_KEYS.common.concat(VIEW_KEYS[t])) assert.ok(k in v, t + ' ' + k)
    }
    assert.equal(viewModel(st, 'lcd').theme, 'sand')
    assert.equal(viewModel(st).theme, 'sand')
  })
  it('진동 간격은 0.5초 간격 3회', () => {
    assert.deepEqual(VIBRATE_OFFSETS_MS, [0, 500, 1000])
  })
})
