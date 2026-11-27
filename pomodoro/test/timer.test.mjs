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
  NUM_SWIPE_PX,
  TAP_MAX_MOVE,
  BACK_GUARD_MS,
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
  setupHit,
  zoneTarget,
  numTapDir,
  barLevel,
  barSetting,
  barNodes,
  dirLock,
  numSwipeSteps,
  setupTouchStart,
  setupTouchMove,
  setupTouchEnd,
  setupGestureUi,
  shouldSwallowBack,
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

/** 터치 한 번을 흉내 낸다: pts = [[x, y], ...] 첫 점 = 손 댐, 마지막 점 = 손 뗌. */
function gesture(settings, pts) {
  let g = setupTouchStart(settings, pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) g = setupTouchMove(g, pts[i][0], pts[i][1])
  const last = pts[pts.length - 1]
  return setupTouchEnd(g, last[0], last[1])
}
const FOCUS_BAR_X = 266
const REST_BAR_X = 362

describe('설정 화면(THERMO) 터치 영역', () => {
  it('처음 닿은 곳으로 영역을 고른다(touch-zones.json, x1/y1 미포함)', () => {
    assert.equal(setupHit(100, 100), 'focusNumUp')
    assert.equal(setupHit(100, 134), 'focusNumUp')
    assert.equal(setupHit(100, 135), 'focusNumDown')
    assert.equal(setupHit(100, 209), 'focusNumDown')
    assert.equal(setupHit(100, 210), null) // 집중↔휴식 숫자 사이 10px 틈
    assert.equal(setupHit(100, 220), 'restNumUp')
    assert.equal(setupHit(100, 285), 'restNumDown')
    assert.equal(setupHit(226, 56), 'focusBar')
    assert.equal(setupHit(305, 403), 'focusBar')
    assert.equal(setupHit(306, 200), null) // 막대 사이 16px 틈
    assert.equal(setupHit(322, 200), 'restBar')
    assert.equal(setupHit(100, 380), 'repeat')
    assert.equal(setupHit(216, 460), 'start')
    assert.equal(setupHit(20, 300), null) // x<30 은 비움(시스템 뒤로 가장자리)
    assert.equal(setupHit(NaN, 3), null)
    assert.equal(zoneTarget('focusNumDown'), 'focus')
    assert.equal(zoneTarget('restBar'), 'break')
    assert.equal(zoneTarget('start'), null)
    assert.equal(numTapDir('restNumUp'), 1)
    assert.equal(numTapDir('focusNumDown'), -1)
  })
})

describe('설정 화면(THERMO) 막대 끌기 칸 매핑', () => {
  it('집중 막대: 칸마다 26px, 5·k 분, 칸 경계는 bands(틈 가운데)', () => {
    assert.equal(barLevel('focus', 385.9), 1)
    assert.equal(barLevel('focus', 360), 1)
    assert.equal(barLevel('focus', 359.9), 2)
    assert.equal(barLevel('focus', 256), 5)
    assert.equal(barLevel('focus', 255.9), 6)
    assert.equal(barLevel('focus', 74), 12)
    assert.equal(barSetting(defaultSettings(), 'focus', 270).focusMs, 25 * MIN)
    assert.equal(barSetting(defaultSettings(), 'focus', 270).breakMs, 5 * MIN)
  })
  it('휴식 막대: 칸마다 10px, k 분', () => {
    assert.equal(barLevel('break', 384.9), 1)
    assert.equal(barLevel('break', 375), 1)
    assert.equal(barLevel('break', 374.9), 2)
    assert.equal(barLevel('break', 270), 12)
    assert.equal(barLevel('break', 85), 30)
    assert.equal(barSetting(S(40, 5, false), 'break', 300).breakMs, 9 * MIN)
    assert.equal(barSetting(S(40, 5, false), 'break', 300).focusMs, 40 * MIN)
    assert.equal(barSetting(S(40, 5, false), 'break', 300).repeat, false)
  })
  it('범위 끝 고정: 막대 위/아래 밖으로 끌어도 5~60, 1~30 에서 멈춘다', () => {
    for (const y of [-500, 0, 56, 73]) assert.equal(barLevel('focus', y), 12, 'focus ' + y)
    for (const y of [386, 404, 514, 2000]) assert.equal(barLevel('focus', y), 1, 'focus ' + y)
    for (const y of [-500, 0, 56, 84]) assert.equal(barLevel('break', y), 30, 'break ' + y)
    for (const y of [385, 404, 514]) assert.equal(barLevel('break', y), 1, 'break ' + y)
    const up = gesture(defaultSettings(), [[FOCUS_BAR_X, 300], [FOCUS_BAR_X, 200], [FOCUS_BAR_X, 40], [FOCUS_BAR_X, 10]])
    assert.equal(up.settings.focusMs, 60 * MIN)
    const down = gesture(defaultSettings(), [[REST_BAR_X, 300], [REST_BAR_X, 450], [REST_BAR_X, 510]])
    assert.equal(down.settings.breakMs, 1 * MIN)
  })
  it('막대를 짚으면 바로 스냅, 끄는 동안 칸마다 따라간다', () => {
    let g = setupTouchStart(defaultSettings(), FOCUS_BAR_X, 100)
    assert.equal(g.settings.focusMs, 55 * MIN) // 닿는 순간 스냅
    const seen = []
    for (let y = 100; y <= 380; y += 4) {
      g = setupTouchMove(g, FOCUS_BAR_X, y)
      seen.push(g.settings.focusMs / MIN)
    }
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i] <= seen[i - 1]) // 아래로 갈수록 줄어듦
    assert.deepEqual([...new Set(seen)], [55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5])
    const r = setupTouchEnd(g, FOCUS_BAR_X, 380)
    assert.equal(r.settings.focusMs, 5 * MIN)
    assert.equal(r.changed, true)
    assert.equal(r.action, null)
    // 휴식 막대 탭 = 그 칸 값
    const tap = gesture(defaultSettings(), [[REST_BAR_X, 190], [REST_BAR_X, 190]])
    assert.equal(tap.settings.breakMs, 20 * MIN)
    assert.equal(tap.settings.focusMs, 25 * MIN)
  })
})

describe('설정 화면(THERMO) 숫자 칸 탭·쓸기', () => {
  it('윗절반 탭 = +1단계, 아랫절반 탭 = -1단계(집중 ±5, 휴식 ±1)', () => {
    assert.equal(gesture(defaultSettings(), [[120, 90], [122, 92]]).settings.focusMs, 30 * MIN)
    assert.equal(gesture(defaultSettings(), [[120, 180], [120, 180]]).settings.focusMs, 20 * MIN)
    assert.equal(gesture(defaultSettings(), [[120, 240], [120, 240]]).settings.breakMs, 6 * MIN)
    const dn = gesture(defaultSettings(), [[120, 320], [125, 330]])
    assert.equal(dn.settings.breakMs, 4 * MIN)
    assert.equal(dn.flash, 'rDn')
    assert.equal(gesture(defaultSettings(), [[120, 90], [120, 90]]).flash, 'fUp')
  })
  it('탭은 끝값에서 멈춘다(되돌아가지 않음)', () => {
    const hi = gesture(S(60, 30, true), [[120, 90], [120, 90]])
    assert.equal(hi.settings.focusMs, 60 * MIN)
    assert.equal(hi.changed, false)
    assert.equal(gesture(S(60, 30, true), [[120, 240], [120, 240]]).settings.breakMs, 30 * MIN)
    assert.equal(gesture(S(5, 1, true), [[120, 180], [120, 180]]).settings.focusMs, 5 * MIN)
    assert.equal(gesture(S(5, 1, true), [[120, 330], [120, 330]]).settings.breakMs, 1 * MIN)
  })
  it('숫자 칸 세로 쓸기: 36px 마다 1단계, 위로 = +, 쓸기는 탭으로 치지 않는다', () => {
    assert.equal(NUM_SWIPE_PX, 36)
    assert.equal(numSwipeSteps(0), 0)
    assert.equal(numSwipeSteps(-35), 0)
    assert.equal(numSwipeSteps(-36), 1)
    assert.equal(numSwipeSteps(-110), 3)
    assert.equal(numSwipeSteps(72), -2)
    const up = gesture(defaultSettings(), [[120, 200], [120, 180], [120, 120], [120, 120]])
    assert.equal(up.settings.focusMs, 35 * MIN) // 80px 위로 = +2단계, 탭 +1 은 더하지 않음
    assert.equal(up.flash, null)
    const many = gesture(S(25, 28, true), [[120, 340], [120, 300], [120, 60]])
    assert.equal(many.settings.breakMs, 30 * MIN)
  })
  it('이동이 TAP_MAX_MOVE 를 넘으면 탭이 아니다', () => {
    assert.equal(TAP_MAX_MOVE, 40)
    const r = gesture(defaultSettings(), [[120, 90], [120, 112], [120, 92]]) // 22px 내려갔다 돌아옴 = 탭
    assert.equal(r.settings.focusMs, 30 * MIN)
    const far = gesture(defaultSettings(), [[120, 90], [120, 140], [120, 92]]) // 50px 왕복 = 쓸기(0단계)
    assert.equal(far.settings.focusMs, 25 * MIN)
  })
})

describe('설정 화면(THERMO) 방향 잠금 · 좌우 이동 무시', () => {
  it('12px 를 넘는 순간 |dy| > |dx| 면 세로, 아니면 가로', () => {
    assert.equal(DIR_LOCK_PX, 12)
    assert.equal(dirLock(5, 5), null)
    assert.equal(dirLock(0, 12), null)
    assert.equal(dirLock(0, 13), 'v')
    assert.equal(dirLock(13, 0), 'h')
    assert.equal(dirLock(10, 10), 'h') // 같으면 세로가 아님
    assert.equal(dirLock(-9, 11), 'v')
  })
  it('가로로 먼저 움직이면 값을 바꾸지 않는다(막대 스냅도 되돌림)', () => {
    const bar = gesture(defaultSettings(), [[REST_BAR_X, 200], [REST_BAR_X + 20, 202], [REST_BAR_X + 60, 120]])
    assert.deepEqual(bar.settings, defaultSettings())
    assert.equal(bar.changed, false)
    const num = gesture(defaultSettings(), [[60, 100], [90, 100], [200, 30]])
    assert.deepEqual(num.settings, defaultSettings())
    const numShort = gesture(defaultSettings(), [[60, 100], [85, 103]]) // 25px 가로 = 탭도 아님
    assert.deepEqual(numShort.settings, defaultSettings())
    assert.equal(gesture(defaultSettings(), [[100, 380], [160, 380]]).settings.repeat, true)
    assert.equal(gesture(defaultSettings(), [[216, 460], [300, 460]]).action, null)
  })
  it('세로로 잠긴 뒤에는 가로로 크게 비껴도 값만 바뀐다(y 만 따라감)', () => {
    let g = setupTouchStart(defaultSettings(), FOCUS_BAR_X, 300)
    g = setupTouchMove(g, FOCUS_BAR_X + 2, 280)
    assert.equal(g.lock, 'v')
    g = setupTouchMove(g, FOCUS_BAR_X + 140, 150) // 오른쪽으로 140px 비낌
    assert.equal(g.settings.focusMs, 50 * MIN)
    const r = setupTouchEnd(g, 420, 150)
    assert.equal(r.settings.focusMs, 50 * MIN)
    const num = gesture(defaultSettings(), [[100, 200], [102, 180], [230, 128], [300, 128]])
    assert.equal(num.settings.focusMs, 35 * MIN)
  })
  it('터치 중 강조: 바꾸는 줄 밑줄, 숫자 칸 ▲▼ 눌림, START 눌림', () => {
    assert.deepEqual(setupGestureUi(null), { fHot: false, rHot: false, fUpOn: false, fDnOn: false, rUpOn: false, rDnOn: false, startOn: false })
    let g = setupTouchStart(defaultSettings(), FOCUS_BAR_X, 200)
    assert.equal(setupGestureUi(g).fHot, true)
    assert.equal(setupGestureUi(g).rHot, false)
    g = setupTouchStart(defaultSettings(), 120, 300)
    assert.equal(setupGestureUi(g).rDnOn, true)
    assert.equal(setupGestureUi(g).rHot, true)
    g = setupTouchMove(g, 120, 260)
    assert.equal(setupGestureUi(g).rDnOn, false) // 쓸기로 잠기면 눌림 끔
    g = setupTouchStart(defaultSettings(), REST_BAR_X, 200)
    g = setupTouchMove(g, REST_BAR_X + 30, 200)
    assert.equal(setupGestureUi(g).rHot, false) // 가로 = 무시
    g = setupTouchStart(defaultSettings(), 216, 460)
    assert.equal(setupGestureUi(g).startOn, true)
  })
  it('REPEAT 탭 = 토글, START 탭 = 시작', () => {
    const r = gesture(defaultSettings(), [[100, 380], [104, 384]])
    assert.equal(r.settings.repeat, false)
    assert.equal(r.changed, true)
    const st = gesture(defaultSettings(), [[216, 460], [216, 462]])
    assert.equal(st.action, 'start')
    assert.equal(st.changed, false)
    assert.equal(gesture(defaultSettings(), [[20, 460], [20, 460]]).action, null)
  })
  it('시스템 뒤로: 설정 컨트롤 터치 중·직후(BACK_GUARD_MS)만 삼킨다', () => {
    const now = 5000
    assert.equal(shouldSwallowBack('setup', true, 'focusBar', 0, now), true)
    assert.equal(shouldSwallowBack('setup', false, 'restBar', now - BACK_GUARD_MS + 1, now), true)
    assert.equal(shouldSwallowBack('setup', false, 'restBar', now - BACK_GUARD_MS, now), false)
    assert.equal(shouldSwallowBack('setup', true, null, 0, now), false) // 가장자리(x<30) 스와이프는 뒤로
    assert.equal(shouldSwallowBack('timer', true, 'focusBar', now, now), false)
  })
})

describe('설정 화면 viewModel', () => {
  it('큰 숫자, 막대 묶음, 끝값 패치, 토글 이미지', () => {
    const v = setupViewModel(defaultSettings())
    assert.equal(v.focusText, '25')
    assert.equal(v.breakText, '05')
    assert.equal(v.f1Src, '/common/setup/f2.png')
    assert.equal(v.f2Src, '/common/setup/f5.png')
    assert.equal(v.r1Src, '/common/setup/r0.png')
    assert.equal(v.r2Src, '/common/setup/r5.png')
    assert.equal(v.fBar0Show, true)
    assert.equal(v.fBar0Src, '/common/setup/fg05m.png')
    assert.equal(v.fBar1Show, false)
    assert.equal(v.rBar0Src, '/common/setup/rg05m.png')
    assert.equal(v.rBar1Show, false)
    assert.equal(v.rBar2Show, false)
    assert.equal(v.fUpOffShow || v.fDnOffShow || v.rUpOffShow || v.rDnOffShow, false)
    assert.equal(v.toggleSrc, '/common/setup/tog-on.png')
    const lo = setupViewModel(S(5, 1, false))
    assert.equal(lo.fBar0Src, '/common/setup/fg01m.png')
    assert.equal(lo.rBar0Src, '/common/setup/rg01m.png')
    assert.equal(lo.fDnOffShow, true)
    assert.equal(lo.rDnOffShow, true)
    assert.equal(lo.fUpOffShow, false)
    assert.equal(lo.toggleSrc, '/common/setup/tog-off.png')
    const hi = setupViewModel(S(60, 30, true))
    assert.equal(hi.fBar0Src, '/common/setup/fg06.png')
    assert.equal(hi.fBar1Src, '/common/setup/fg06m.png')
    assert.equal(hi.rBar2Src, '/common/setup/rg10m.png')
    assert.equal(hi.fUpOffShow && hi.rUpOffShow, true)
    const mid = setupViewModel(S(35, 12, true))
    assert.deepEqual([mid.fBar0Src, mid.fBar1Show, mid.fBar1Src], ['/common/setup/fg06.png', true, '/common/setup/fg01m.png'])
    assert.deepEqual([mid.rBar0Src, mid.rBar1Src, mid.rBar2Show], ['/common/setup/rg10.png', '/common/setup/rg02m.png', false])
  })
  it('barNodes: 묶음 규칙(k≤0 숨김, 1≤k≤n 눈금, k>n 꽉 참)', () => {
    for (let L = 1; L <= 30; L++) {
      const nodes = barNodes('break', L)
      const lit = nodes.reduce((a, n) => a + (!n.show ? 0 : n.src.endsWith('rg10.png') ? 10 : Number(n.src.match(/rg(\d\d)m/)[1])), 0)
      assert.equal(lit, L, 'level ' + L)
      assert.equal(nodes.filter((n) => n.show && /m\.png$/.test(n.src)).length, 1) // 노란 눈금은 하나
    }
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
