/**
 * BOOST(뽀모도로) 순수 로직(0.1.8).
 * - 설정(settings): 집중 시간, 휴식 시간, 반복 여부. 마지막 값만 저장한다.
 * - 세션(state): 진행 중 타이머. 저장하지 않는다(앱을 다시 열거나 백그라운드에서 돌아오면 설정부터).
 * 남은 시간은 끝시각(endAt)에서 매번 계산한다. 누적 감산은 쓰지 않는다.
 */

const MIN = 60 * 1000

export const FOCUS_MS = 25 * MIN
export const BREAK_MS = 5 * MIN
export const FOCUS_MIN_MS = 5 * MIN
export const FOCUS_MAX_MS = 60 * MIN
export const FOCUS_STEP_MS = 5 * MIN
export const BREAK_MIN_MS = 1 * MIN
export const BREAK_MAX_MS = 30 * MIN
export const BREAK_STEP_MS = 1 * MIN
export const REPEAT_DEFAULT = true
export const TICK_MS = 1000
export const LONGPRESS_MS = 560
export const VIBRATE_OFFSETS_MS = [0, 500, 1000]
export const SETTINGS_KEY = 'pomodoro.settings.v1'
/** 0.1.5 이하가 쓰던 상태 키. 집중 시간만 한 번 이어받는다. */
export const LEGACY_STATE_KEY = 'pomodoro.state.v1'
export const SCREEN_W = 432
export const SCREEN_H = 514
/** 탭으로 인정하는 최대 이동(px). 이보다 크면 길게 누르기를 취소한다. */
export const TAP_MAX_MOVE = 40
/** 설정 화면(THERMO) 방향 잠금: 움직임이 이 거리(px)를 넘는 순간 세로/가로를 정한다. */
export const DIR_LOCK_PX = 12
/** 설정 화면 큰 숫자 칸 세로 쓸기: 이 거리(px)마다 한 단계(위로 = +). */
export const NUM_SWIPE_PX = 36
/** 미세 조정 ▲▼ 눌림 표시를 손 뗀 뒤 이 시간(ms) 더 보여 준다. */
export const PRESS_FLASH_MS = 150
/** 시작 애니메이션: 게이지 0칸 → 36칸을 이 시간(ms)에 채운다. */
export const INTRO_MS = 900
export const INTRO_FRAME_MS = 50

const MAX_CATCHUP = 10000

export function pad2(n) {
  const s = String(Math.max(0, Math.floor(Number(n) || 0)))
  return s.length < 2 ? '0' + s : s
}

function clampStep(ms, lo, hi, step, dflt) {
  const raw = Number(ms)
  if (ms === null || ms === undefined || ms === '' || !isFinite(raw)) return dflt
  const snapped = Math.round(raw / step) * step
  if (snapped < lo) return lo
  if (snapped > hi) return hi
  return snapped
}

/** 5분 단위, 5~60분. 비정상이면 기본 25분. */
export function clampFocusMs(ms) {
  return clampStep(ms, FOCUS_MIN_MS, FOCUS_MAX_MS, FOCUS_STEP_MS, FOCUS_MS)
}

/** 1분 단위, 1~30분. 비정상이면 기본 5분. */
export function clampBreakMs(ms) {
  return clampStep(ms, BREAK_MIN_MS, BREAK_MAX_MS, BREAK_STEP_MS, BREAK_MS)
}

/* ---------------- 설정 ---------------- */

export function defaultSettings() {
  return { focusMs: FOCUS_MS, breakMs: BREAK_MS, repeat: REPEAT_DEFAULT }
}

export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  return {
    focusMs: clampFocusMs(s.focusMs),
    breakMs: clampBreakMs(s.breakMs),
    repeat: s.repeat === false ? false : s.repeat === true ? true : REPEAT_DEFAULT
  }
}

export function serializeSettings(settings) {
  return JSON.stringify(normalizeSettings(settings))
}

/**
 * 저장 문자열 → 설정. 새 키가 없으면 옛 상태(0.1.5 이하)의 focusMs 만 이어받는다.
 * 옛 상태의 진행 중 타이머(running/endAt)는 버린다.
 */
export function deserializeSettings(raw, legacyRaw) {
  const parse = (str) => {
    if (!str || typeof str !== 'string') return null
    try {
      const p = JSON.parse(str)
      return p && typeof p === 'object' ? p : null
    } catch (e) {
      return null
    }
  }
  const cur = parse(raw)
  if (cur) return normalizeSettings(cur)
  const old = parse(legacyRaw)
  if (old && old.focusMs != null) return normalizeSettings({ focusMs: old.focusMs })
  return defaultSettings()
}

/** which: 'focus' | 'break', dir: +1 늘림 / -1 줄임. 끝에서는 그대로. */
export function stepSetting(settings, which, dir) {
  const s = normalizeSettings(settings)
  const d = Number(dir) > 0 ? 1 : Number(dir) < 0 ? -1 : 0
  if (!d) return s
  if (which === 'break') {
    return { focusMs: s.focusMs, breakMs: clampBreakMs(s.breakMs + d * BREAK_STEP_MS), repeat: s.repeat }
  }
  return { focusMs: clampFocusMs(s.focusMs + d * FOCUS_STEP_MS), breakMs: s.breakMs, repeat: s.repeat }
}

export function toggleRepeat(settings) {
  const s = normalizeSettings(settings)
  return { focusMs: s.focusMs, breakMs: s.breakMs, repeat: !s.repeat }
}

/* ---------------- 설정 화면(THERMO) 터치 ---------------- */

/**
 * 터치 영역 [x0, y0, x1, y1) (x1/y1 미포함). docs/booster-design/setup-final-thermo/touch-zones.json
 * (= scripts/setup-touch-zones.json) 과 같다(test/project.test.mjs 가 확인).
 * focusNum/restNum 은 숫자 칸 전체(세로 쓸기)이고, 윗절반 Up / 아랫절반 Down 으로 나뉜다.
 */
export const SETUP_ZONES = {
  focusNum: [40, 60, 216, 210],
  focusNumUp: [40, 60, 216, 135],
  focusNumDown: [40, 135, 216, 210],
  restNum: [40, 220, 216, 350],
  restNumUp: [40, 220, 216, 285],
  restNumDown: [40, 285, 216, 350],
  focusBar: [226, 56, 306, 404],
  restBar: [322, 56, 402, 404],
  repeat: [40, 358, 216, 414],
  start: [112, 424, 320, 496]
}
/** 손가락이 처음 닿은 곳으로 고르는 영역(부모 focusNum/restNum 은 Up/Down 이 빈틈없이 덮는다). */
const HIT_ORDER = ['focusNumUp', 'focusNumDown', 'restNumUp', 'restNumDown', 'focusBar', 'restBar', 'repeat', 'start']

/**
 * 막대: 아래 끝 칸 경계 y=384 에서 위로 칸 간격(집중 26px = 칸 22 + 틈 4, x 12칸 / 휴식 10px = 칸 8 + 틈 2, x 30칸).
 * 칸별 y 범위는 touch-zones.json barMapping.focusBands/restBands 를 그대로 따른다: 칸 사이 틈의 가운데가 경계라서
 * 맨 아래 칸 범위가 [384 - pitch + gap/2, 384 + gap/2) 이다(edge = 384 + gap/2).
 * README 식 ceil((384 - y) / pitch) 와는 경계가 gap/2(집중 2px, 휴식 1px) 다르고, 그림 기준인 bands 쪽을 쓴다.
 */
export const BAR_BOTTOM = 384
export const SETUP_BARS = {
  focus: { pitch: 26, gap: 4, edge: 386, levels: 12, group: 6, prefix: 'fg', nodes: 2 },
  break: { pitch: 10, gap: 2, edge: 385, levels: 30, group: 10, prefix: 'rg', nodes: 3 }
}

function inZone(z, x, y) {
  return x >= z[0] && x < z[2] && y >= z[1] && y < z[3]
}

/** (x, y) → 영역 이름(focusNumUp … start) 또는 null. */
export function setupHit(x, y) {
  const xx = Number(x)
  const yy = Number(y)
  if (!isFinite(xx) || !isFinite(yy)) return null
  for (let i = 0; i < HIT_ORDER.length; i++) {
    if (inZone(SETUP_ZONES[HIT_ORDER[i]], xx, yy)) return HIT_ORDER[i]
  }
  return null
}

/** 영역이 바꾸는 값: 'focus' | 'break' | null */
export function zoneTarget(zone) {
  if (zone === 'focusNumUp' || zone === 'focusNumDown' || zone === 'focusBar') return 'focus'
  if (zone === 'restNumUp' || zone === 'restNumDown' || zone === 'restBar') return 'break'
  return null
}

export function isBarZone(zone) {
  return zone === 'focusBar' || zone === 'restBar'
}

export function isNumZone(zone) {
  return zone === 'focusNumUp' || zone === 'focusNumDown' || zone === 'restNumUp' || zone === 'restNumDown'
}

/** 숫자 칸 탭 단계: 윗절반 +1, 아랫절반 -1 */
export function numTapDir(zone) {
  if (zone === 'focusNumUp' || zone === 'restNumUp') return 1
  if (zone === 'focusNumDown' || zone === 'restNumDown') return -1
  return 0
}

/**
 * 막대 높이 y → 레벨 k. 집중 k = clamp(ceil((386 - y) / 26), 1, 12), 휴식 k = clamp(ceil((385 - y) / 10), 1, 30)
 * (= touch-zones.json bands). 막대 밖(위/아래)으로 끌어도 끝값으로 고정한다.
 */
export function barLevel(which, y) {
  const b = which === 'break' ? SETUP_BARS.break : SETUP_BARS.focus
  const yy = Number(y)
  if (!isFinite(yy)) return 1
  const k = Math.ceil((b.edge - yy) / b.pitch)
  return k < 1 ? 1 : k > b.levels ? b.levels : k
}

/** 막대 높이 y 로 값을 정한 새 설정(집중 5·k 분, 휴식 k 분). 다른 값은 그대로. */
export function barSetting(settings, which, y) {
  const s = normalizeSettings(settings)
  const k = barLevel(which, y)
  if (which === 'break') return { focusMs: s.focusMs, breakMs: k * BREAK_STEP_MS, repeat: s.repeat }
  return { focusMs: k * FOCUS_STEP_MS, breakMs: s.breakMs, repeat: s.repeat }
}

/**
 * 방향 잠금. 움직임(dx, dy)이 DIR_LOCK_PX 이하이면 null(아직 모름),
 * 넘으면 |dy| > |dx| 일 때만 'v', 아니면 'h'(그 터치는 값 변경에 쓰지 않는다).
 */
export function dirLock(dx, dy) {
  const x = Math.abs(Number(dx) || 0)
  const y = Math.abs(Number(dy) || 0)
  if (x * x + y * y <= DIR_LOCK_PX * DIR_LOCK_PX) return null
  return y > x ? 'v' : 'h'
}

/** 숫자 칸 세로 쓸기 누적 dy(px) → 단계 수. 위로(dy<0) = +, NUM_SWIPE_PX 마다 1. */
export function numSwipeSteps(dy) {
  const v = -(Number(dy) || 0) / NUM_SWIPE_PX
  const n = v >= 0 ? Math.floor(v) : -Math.floor(-v)
  return n === 0 ? 0 : n
}

/** 탭 판정: 이동 ≤ TAP_MAX_MOVE */
export function isTapMove(dx, dy) {
  const x = Number(dx) || 0
  const y = Number(dy) || 0
  return x * x + y * y <= TAP_MAX_MOVE * TAP_MAX_MOVE
}

/** 끌기·탭 직후 이 시간(ms) 안의 시스템 뒤로 이벤트는 삼킨다. */
export const BACK_GUARD_MS = 400

function copyGesture(g) {
  return {
    zone: g.zone,
    target: g.target,
    x0: g.x0,
    y0: g.y0,
    base: g.base,
    settings: g.settings,
    lock: g.lock,
    steps: g.steps,
    maxMove2: g.maxMove2
  }
}

function sameSettings(a, b) {
  return a.focusMs === b.focusMs && a.breakMs === b.breakMs && a.repeat === b.repeat
}

/**
 * 설정 화면 터치 한 번(손 댐 → 이동 → 손 뗌)을 순수 함수로 처리한다. index.ux 는 결과만 화면에 반영한다.
 * - 막대: 닿는 즉시 그 높이 값으로 스냅, 끌면 칸마다 따라감(막대 밖은 끝값 고정).
 * - 숫자 칸: 탭 = 윗절반 +1 / 아랫절반 -1 단계, 세로 쓸기 = 36px 마다 1단계(위로 = +).
 * - 방향 잠금: 12px 를 넘는 순간 |dy| > |dx| 가 아니면('h') 그 터치는 값을 바꾸지 않는다(막대 스냅도 되돌림).
 *   세로로 잠긴 뒤에는 가로로 얼마나 움직여도 값만 바뀐다.
 * - 탭 = 이동(최대) ≤ TAP_MAX_MOVE. REPEAT 탭 = 토글, START 탭 = 시작.
 */
export function setupTouchStart(settings, x, y) {
  const base = normalizeSettings(settings)
  const zone = setupHit(x, y)
  const target = zoneTarget(zone)
  const g = {
    zone: zone,
    target: target,
    x0: Number(x) || 0,
    y0: Number(y) || 0,
    base: base,
    settings: base,
    lock: null,
    steps: 0,
    maxMove2: 0
  }
  if (isBarZone(zone)) g.settings = barSetting(base, target, y)
  return g
}

function stepN(s, which, n) {
  let out = s
  const d = n > 0 ? 1 : -1
  for (let i = 0; i !== n; i += d) out = stepSetting(out, which, d)
  return out
}

export function setupTouchMove(gesture, x, y) {
  const g = copyGesture(gesture)
  const xx = Number(x)
  const yy = Number(y)
  if (!isFinite(xx) || !isFinite(yy)) return g
  const dx = xx - g.x0
  const dy = yy - g.y0
  const m2 = dx * dx + dy * dy
  if (m2 > g.maxMove2) g.maxMove2 = m2
  if (g.lock === null) g.lock = dirLock(dx, dy)
  if (!g.target) return g
  if (g.lock === 'h') {
    g.settings = g.base
    g.steps = 0
    return g
  }
  if (isBarZone(g.zone)) {
    g.settings = barSetting(g.base, g.target, yy)
  } else if (g.lock === 'v') {
    g.steps = numSwipeSteps(dy)
    g.settings = stepN(g.base, g.target, g.steps)
  }
  return g
}

/**
 * @returns {{ gesture: object, settings: object, changed: boolean, action: 'start'|null, flash: string|null }}
 * flash: 숫자 칸 탭으로 한 단계 바꿨을 때 잠깐 켤 ▲▼ 눌림 노드('fUp'|'fDn'|'rUp'|'rDn').
 */
export function setupTouchEnd(gesture, x, y) {
  const g = x == null || y == null ? copyGesture(gesture) : setupTouchMove(gesture, x, y)
  const tap = g.maxMove2 <= TAP_MAX_MOVE * TAP_MAX_MOVE
  let action = null
  let flash = null
  if (isNumZone(g.zone) && g.lock !== 'h' && g.steps === 0 && tap) {
    const dir = numTapDir(g.zone)
    g.settings = stepSetting(g.base, g.target, dir)
    flash = (g.target === 'break' ? 'r' : 'f') + (dir > 0 ? 'Up' : 'Dn')
  } else if (g.zone === 'repeat' && tap) {
    g.settings = toggleRepeat(g.base)
  } else if (g.zone === 'start' && tap) {
    action = 'start'
  }
  return { gesture: g, settings: g.settings, changed: !sameSettings(g.settings, g.base), action: action, flash: flash }
}

/** 터치 중 강조 표시: 바꾸는 줄 밑줄(fHot/rHot), 숫자 칸 ▲▼ 눌림, START 눌림. */
export function setupGestureUi(gesture) {
  const ui = { fHot: false, rHot: false, fUpOn: false, fDnOn: false, rUpOn: false, rDnOn: false, startOn: false }
  if (!gesture) return ui
  const g = gesture
  const tap = g.maxMove2 <= TAP_MAX_MOVE * TAP_MAX_MOVE
  if (g.target && g.lock !== 'h') {
    if (g.target === 'focus') ui.fHot = true
    else ui.rHot = true
  }
  if (isNumZone(g.zone) && g.lock === null) {
    const k = (g.target === 'break' ? 'r' : 'f') + (numTapDir(g.zone) > 0 ? 'UpOn' : 'DnOn')
    ui[k] = true
  }
  if (g.zone === 'start' && tap) ui.startOn = true
  return ui
}

/**
 * 시스템 뒤로(오른쪽 스와이프)를 삼킬지. 설정 화면에서 컨트롤 영역에서 시작한 터치가 진행 중이거나
 * 끝난 지 BACK_GUARD_MS 안이면 삼킨다(값을 끄는 손가락이 오른쪽으로 비껴도 앱이 닫히지 않게).
 * 컨트롤이 없는 곳(왼쪽 가장자리 x<30 등)에서 시작한 스와이프는 그대로 뒤로가기.
 */
export function shouldSwallowBack(view, touchActive, touchZone, lastTouchEndAt, now) {
  if (view !== 'setup' || !touchZone) return false
  if (touchActive) return true
  const t = Number(now) - Number(lastTouchEndAt)
  return isFinite(t) && t >= 0 && t < BACK_GUARD_MS
}

export const SETUP_DIR = '/common/setup/'

function digitSrcs(prefix, minutes) {
  const t = pad2(minutes)
  return [SETUP_DIR + prefix + t.charAt(0) + '.png', SETUP_DIR + prefix + t.charAt(1) + '.png']
}

/**
 * 막대 묶음 노드별 src. 레벨 L, 묶음 g 에서 k = L - g·n:
 * k ≤ 0 숨김, 1 ≤ k ≤ n → {p}g{k:02d}m.png(맨 위 노란 눈금), k > n → {p}g{n:02d}.png(꽉 참).
 * @returns {{show: boolean, src: string}[]}
 */
export function barNodes(which, level) {
  const b = which === 'break' ? SETUP_BARS.break : SETUP_BARS.focus
  const full = SETUP_DIR + b.prefix + pad2(b.group) + '.png'
  const out = []
  for (let g = 0; g < b.nodes; g++) {
    const k = level - g * b.group
    if (k <= 0) out.push({ show: false, src: full })
    else if (k <= b.group) out.push({ show: true, src: SETUP_DIR + b.prefix + pad2(k) + 'm.png' })
    else out.push({ show: true, src: full })
  }
  return out
}

export function setupViewModel(settings) {
  const s = normalizeSettings(settings)
  const fm = Math.round(s.focusMs / MIN)
  const bm = Math.round(s.breakMs / MIN)
  const f = digitSrcs('f', fm)
  const b = digitSrcs('r', bm)
  const fb = barNodes('focus', fm / (FOCUS_STEP_MS / MIN))
  const rb = barNodes('break', bm)
  return {
    focusText: pad2(fm),
    breakText: pad2(bm),
    f1Src: f[0],
    f2Src: f[1],
    r1Src: b[0],
    r2Src: b[1],
    fBar0Show: fb[0].show,
    fBar0Src: fb[0].src,
    fBar1Show: fb[1].show,
    fBar1Src: fb[1].src,
    rBar0Show: rb[0].show,
    rBar0Src: rb[0].src,
    rBar1Show: rb[1].show,
    rBar1Src: rb[1].src,
    rBar2Show: rb[2].show,
    rBar2Src: rb[2].src,
    fUpOffShow: s.focusMs >= FOCUS_MAX_MS,
    fDnOffShow: s.focusMs <= FOCUS_MIN_MS,
    rUpOffShow: s.breakMs >= BREAK_MAX_MS,
    rDnOffShow: s.breakMs <= BREAK_MIN_MS,
    repeat: s.repeat,
    toggleSrc: SETUP_DIR + (s.repeat ? 'tog-on.png' : 'tog-off.png')
  }
}

/* ---------------- 세션(타이머) ---------------- */

export function durationOf(phase, settings) {
  const s = normalizeSettings(settings)
  return phase === 'break' ? s.breakMs : s.focusMs
}

/** 설정 완료 직후, 시작 애니메이션 동안의 상태: 집중 가득, 아직 시간은 흐르지 않음. */
export function armedState(settings) {
  const s = normalizeSettings(settings)
  return {
    phase: 'focus',
    running: false,
    endAt: null,
    remainMs: s.focusMs,
    focusMs: s.focusMs,
    breakMs: s.breakMs,
    repeat: s.repeat,
    done: false
  }
}

export function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const st = normalizeSettings(src)
  const phase = src.phase === 'break' ? 'break' : 'focus'
  const dur = durationOf(phase, st)
  const endAtNum = Number(src.endAt)
  const endAt = src.running && isFinite(endAtNum) && endAtNum > 0 ? endAtNum : null
  let remainMs = Number(src.remainMs)
  if (!isFinite(remainMs) || remainMs < 0) remainMs = dur
  if (remainMs > dur) remainMs = dur
  const running = !!src.running && endAt !== null
  return {
    phase: phase,
    running: running,
    endAt: running ? endAt : null,
    remainMs: remainMs,
    focusMs: st.focusMs,
    breakMs: st.breakMs,
    repeat: st.repeat,
    done: !!src.done && !running
  }
}

function withTime(s, fields) {
  return {
    phase: fields.phase != null ? fields.phase : s.phase,
    running: fields.running != null ? fields.running : s.running,
    endAt: fields.endAt !== undefined ? fields.endAt : s.endAt,
    remainMs: fields.remainMs != null ? fields.remainMs : s.remainMs,
    focusMs: s.focusMs,
    breakMs: s.breakMs,
    repeat: s.repeat,
    done: fields.done != null ? fields.done : s.done
  }
}

export function start(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!isFinite(t) || s.running || s.done) return s
  const remain = s.remainMs > 0 ? s.remainMs : durationOf(s.phase, s)
  return withTime(s, { running: true, endAt: t + remain, remainMs: remain })
}

export function pause(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!s.running) return s
  const remain = Math.max(0, (isFinite(t) ? s.endAt - t : s.remainMs))
  return withTime(s, { running: false, endAt: null, remainMs: remain })
}

export function toggle(state, now) {
  return normalizeState(state).running ? pause(state, now) : start(state, now)
}

/**
 * 실행 중이면 now 기준으로 구간을 진행시킨다.
 * 반복 켬: 집중→휴식→집중… 반복 끔: 집중→휴식 한 번 후 done(정지).
 * @returns {{ state: object, crossed: number, finished: boolean }}
 */
export function advance(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!s.running || s.endAt === null || !isFinite(t)) {
    return { state: s, crossed: 0, finished: false }
  }
  let phase = s.phase
  let endAt = s.endAt
  let crossed = 0
  while (t >= endAt && crossed < MAX_CATCHUP) {
    crossed = crossed + 1
    if (phase === 'break' && !s.repeat) {
      return {
        state: withTime(s, { phase: 'break', running: false, endAt: null, remainMs: 0, done: true }),
        crossed: crossed,
        finished: true
      }
    }
    phase = phase === 'focus' ? 'break' : 'focus'
    endAt = endAt + durationOf(phase, s)
  }
  return {
    state: withTime(s, { phase: phase, running: true, endAt: endAt, remainMs: Math.max(0, endAt - t) }),
    crossed: crossed,
    finished: false
  }
}

/** 남은 ms → MM:SS. 초는 올림이라 25:00에서 바로 24:59로 떨어지지 않는다. */
export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000) || 0)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return pad2(m) + ':' + pad2(sec)
}

/** 남은 비율 0..1. */
export function remainRatio(remainMs, durationMs) {
  const dur = Number(durationMs)
  const rem = Math.max(0, Number(remainMs) || 0)
  if (!dur || dur <= 0) return 0
  if (rem >= dur) return 1
  return rem / dur
}

/** 부스터 게이지 칸 수. 집중 30칸 + 휴식 6칸 = 36칸. */
export const GAUGE_FOCUS_CELLS = 30
export const GAUGE_BREAK_CELLS = 6
export const GAUGE_CELLS = GAUGE_FOCUS_CELLS + GAUGE_BREAK_CELLS
export const GAUGE_DIR = '/common/booster/'

/**
 * 켜진 칸 수(0~36). 집중: 휴식 6칸 + ceil(남은 비율 x 30), 휴식: ceil(남은 비율 x 6).
 * 3시 방향 칸부터 시계 반대 방향으로 꺼진다.
 */
export function litCells(phase, remainMs, durationMs) {
  const r = remainRatio(remainMs, durationMs)
  if (phase === 'break') return Math.ceil(r * GAUGE_BREAK_CELLS)
  return GAUGE_BREAK_CELLS + Math.ceil(r * GAUGE_FOCUS_CELLS)
}

/**
 * 시작 애니메이션: 경과 ms → 켜진 칸 수. 0ms=0칸, INTRO_MS 이상=36칸.
 * 프레임 타이머가 밀려도 경과 시간 기준이라 끝나는 시점은 같다(칸을 건너뛸 수는 있음).
 */
export function introLit(elapsedMs, introMs) {
  const total = Number(introMs) > 0 ? Number(introMs) : INTRO_MS
  const e = Number(elapsedMs)
  if (!isFinite(e) || e <= 0) return 0
  if (e >= total) return GAUGE_CELLS
  return Math.min(GAUGE_CELLS, Math.ceil((e / total) * GAUGE_CELLS))
}

export function gaugeSrc(lit) {
  const n = Math.max(0, Math.min(GAUGE_CELLS, Math.floor(Number(lit) || 0)))
  return GAUGE_DIR + 'g' + pad2(n) + '.png'
}

/** 타이머 화면. litOverride 가 있으면(시작 애니메이션) 게이지만 그 칸 수로. */
export function viewModel(state, litOverride) {
  const s = normalizeState(state)
  const dur = durationOf(s.phase, s)
  const t = formatTime(s.remainMs)
  const lit = litOverride != null ? litOverride : litCells(s.phase, s.remainMs, dur)
  return {
    timeText: t,
    gaugeSrc: gaugeSrc(lit),
    labelSrc: GAUGE_DIR + (s.phase === 'break' ? 'rest' : 'focus') + '.png',
    m1Src: GAUGE_DIR + 'm' + t.charAt(0) + '.png',
    m2Src: GAUGE_DIR + 'm' + t.charAt(1) + '.png',
    s1Src: GAUGE_DIR + 's' + t.charAt(3) + '.png',
    s2Src: GAUGE_DIR + 's' + t.charAt(4) + '.png',
    paused: !s.running && !s.done && litOverride == null
  }
}
