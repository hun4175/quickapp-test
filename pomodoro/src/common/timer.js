/**
 * BOOST(뽀모도로) 순수 로직(0.1.9).
 * - 설정(settings): 집중 시간, 휴식 시간, 반복 여부, 테마. 마지막 값만 저장한다.
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
/** 설정 화면 방향 잠금: 움직임이 이 거리(px)를 넘는 순간 세로/가로를 정한다. */
export const DIR_LOCK_PX = 12
/** 시작 애니메이션: 게이지(테마마다 칸·높이·각도)를 0 → 가득으로 이 시간(ms)에 채운다. */
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


/* ---------------- 테마 ---------------- */

/** 테마 id(저장값). 목록 순서 = 테마 고르기 화면 순서. */
export const THEMES = ['sand', 'booster', 'battery', 'sweep']
export const THEME_DEFAULT = 'sand'
/** 테마 고르기 화면 표시용 이름·한 줄 설명(시스템 글꼴에 없을 수 있는 기호는 쓰지 않는다). */
export const THEME_INFO = {
  sand: { name: 'SAND', sub: 'FULL SCREEN FILL' },
  booster: { name: 'BOOSTER', sub: 'NEON 36-CELL GAUGE' },
  battery: { name: 'BATTERY', sub: 'DRAIN / CHARGE' },
  sweep: { name: 'SWEEP', sub: 'CLOCKWISE SWEEP' }
}

/** 알 수 없는 값·빈 값이면 기본 SAND. */
export function normalizeTheme(theme) {
  return THEMES.indexOf(theme) >= 0 ? theme : THEME_DEFAULT
}

/* ---------------- 설정 ---------------- */

export function defaultSettings() {
  return { focusMs: FOCUS_MS, breakMs: BREAK_MS, repeat: REPEAT_DEFAULT, theme: THEME_DEFAULT }
}

export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  return {
    focusMs: clampFocusMs(s.focusMs),
    breakMs: clampBreakMs(s.breakMs),
    repeat: s.repeat === false ? false : s.repeat === true ? true : REPEAT_DEFAULT,
    theme: normalizeTheme(s.theme)
  }
}

export function serializeSettings(settings) {
  return JSON.stringify(normalizeSettings(settings))
}

/**
 * 저장 문자열 → 설정. 새 키가 없으면 옛 상태(0.1.5 이하)의 focusMs 만 이어받는다.
 * 옛 상태의 진행 중 타이머(running/endAt)는 버린다. theme 이 없는 0.1.8 이하 저장값은 SAND.
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

function withSetting(s, fields) {
  return {
    focusMs: fields.focusMs != null ? fields.focusMs : s.focusMs,
    breakMs: fields.breakMs != null ? fields.breakMs : s.breakMs,
    repeat: fields.repeat != null ? fields.repeat : s.repeat,
    theme: fields.theme != null ? fields.theme : s.theme
  }
}

/** which: 'focus' | 'break', dir: +1 늘림 / -1 줄임. 끝에서는 그대로. */
export function stepSetting(settings, which, dir) {
  const s = normalizeSettings(settings)
  const d = Number(dir) > 0 ? 1 : Number(dir) < 0 ? -1 : 0
  if (!d) return s
  if (which === 'break') return withSetting(s, { breakMs: clampBreakMs(s.breakMs + d * BREAK_STEP_MS) })
  return withSetting(s, { focusMs: clampFocusMs(s.focusMs + d * FOCUS_STEP_MS) })
}

export function toggleRepeat(settings) {
  const s = normalizeSettings(settings)
  return withSetting(s, { repeat: !s.repeat })
}

export function setTheme(settings, theme) {
  return withSetting(normalizeSettings(settings), { theme: normalizeTheme(theme) })
}

export function sameSettings(a, b) {
  return a.focusMs === b.focusMs && a.breakMs === b.breakMs && a.repeat === b.repeat && a.theme === b.theme
}

/* ---------------- 설정 화면(TWIN TUBES, 모든 테마 공통) 터치 ---------------- */

/**
 * 터치 영역 [x0, y0, x1, y1) (x1/y1 미포함).
 * focusGauge·restGauge·repeat·start 는 docs/full-theme-design/settings-merged/A-final/touch-zones.json 그대로
 * (= scripts/setup-touch-zones.json, test/project.test.mjs 가 확인).
 * theme(왼쪽 아래 톱니 버튼)은 0.1.9 에서 더한 영역: REPEAT [304,432,384,500] 을 좌우로 뒤집은 자리에서
 * START(x≥124)와 겹치지 않게 x1=120 으로 줄였다. 80×68, 둥근 모서리(반경 80) 안.
 */
export const SETUP_ZONES = {
  focusGauge: [40, 64, 212, 428],
  restGauge: [220, 64, 392, 428],
  repeat: [304, 432, 384, 500],
  start: [124, 432, 300, 506],
  theme: [40, 432, 120, 500]
}
const HIT_ORDER = ['focusGauge', 'restGauge', 'repeat', 'start', 'theme']

/**
 * 관(게이지) 안쪽 y 68~420(352px). 값 k = clamp(ceil((420 - y) / (352 / 칸 수)), 1, 칸 수)
 * (touch-zones.json mapping: 집중 29.33px/칸 12칸 → 5k 분, 휴식 11.73px/칸 30칸 → k 분).
 * 채움 높이 = k / 칸 수 × 352, top = 420 - 높이.
 */
export const TUBE_TOP = 68
export const TUBE_BOTTOM = 420
export const TUBE_H = TUBE_BOTTOM - TUBE_TOP
export const TUBE_LEVELS = { focus: 12, break: 30 }

function inZone(z, x, y) {
  return x >= z[0] && x < z[2] && y >= z[1] && y < z[3]
}

/** (x, y) → 영역 이름 또는 null. x<30 등 영역 밖은 null. */
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
  if (zone === 'focusGauge') return 'focus'
  if (zone === 'restGauge') return 'break'
  return null
}

/** 관 높이 y → 칸 k. 관 밖(위/아래)으로 끌어도 끝값으로 고정한다. */
export function tubeLevel(which, y) {
  const n = which === 'break' ? TUBE_LEVELS.break : TUBE_LEVELS.focus
  const yy = Number(y)
  if (!isFinite(yy)) return 1
  const k = Math.ceil(((TUBE_BOTTOM - yy) * n) / TUBE_H)
  return k < 1 ? 1 : k > n ? n : k
}

/** 관 높이 y 로 값을 정한 새 설정(집중 5·k 분, 휴식 k 분). 다른 값은 그대로. */
export function tubeSetting(settings, which, y) {
  const s = normalizeSettings(settings)
  const k = tubeLevel(which, y)
  if (which === 'break') return withSetting(s, { breakMs: k * BREAK_STEP_MS })
  return withSetting(s, { focusMs: k * FOCUS_STEP_MS })
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
    maxMove2: g.maxMove2
  }
}

/**
 * 설정 화면 터치 한 번(손 댐 → 이동 → 손 뗌)을 순수 함수로 처리한다. index.ux 는 결과만 화면에 반영한다.
 * - 관: 닿는 즉시 그 높이 칸으로 스냅, 끌면 칸마다 따라감(관 밖은 끝값 고정).
 * - 방향 잠금: 12px 를 넘는 순간 |dy| > |dx| 가 아니면('h') 그 터치는 값을 바꾸지 않는다(스냅도 되돌림).
 *   세로로 잠긴 뒤에는 가로로 얼마나 움직여도 y 만 따라간다.
 * - 탭 = 이동(최대) ≤ TAP_MAX_MOVE. REPEAT 탭 = 토글, START 탭 = 시작, 톱니 탭 = 테마 고르기.
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
    maxMove2: 0
  }
  if (target) g.settings = tubeSetting(base, target, y)
  return g
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
    return g
  }
  g.settings = tubeSetting(g.base, g.target, yy)
  return g
}

/**
 * @returns {{ gesture: object, settings: object, changed: boolean, action: 'start'|'themes'|null }}
 */
export function setupTouchEnd(gesture, x, y) {
  const g = x == null || y == null ? copyGesture(gesture) : setupTouchMove(gesture, x, y)
  const tap = g.maxMove2 <= TAP_MAX_MOVE * TAP_MAX_MOVE && g.lock !== 'h'
  let action = null
  if (g.zone === 'repeat' && tap) {
    g.settings = toggleRepeat(g.base)
  } else if (g.zone === 'start' && tap) {
    action = 'start'
  } else if (g.zone === 'theme' && tap) {
    action = 'themes'
  }
  return { gesture: g, settings: g.settings, changed: !sameSettings(g.settings, g.base), action: action }
}

/** 터치 중 강조: 끄는 관 흰 테두리(fActive/rActive), START·톱니 눌림. */
export function setupGestureUi(gesture) {
  const ui = { fActive: false, rActive: false, startOn: false, themeOn: false }
  if (!gesture) {
    ui.startColor = START_COLOR
    ui.themeBtnColor = THEME_BTN
    return ui
  }
  const g = gesture
  const tap = g.maxMove2 <= TAP_MAX_MOVE * TAP_MAX_MOVE && g.lock !== 'h'
  if (g.target && g.lock !== 'h') {
    if (g.target === 'focus') ui.fActive = true
    else ui.rActive = true
  }
  if (g.zone === 'start' && tap) ui.startOn = true
  if (g.zone === 'theme' && tap) ui.themeOn = true
  ui.startColor = ui.startOn ? START_PRESSED : START_COLOR
  ui.themeBtnColor = ui.themeOn ? THEME_BTN_PRESSED : THEME_BTN
  return ui
}

/**
 * 시스템 뒤로(오른쪽 스와이프)를 삼킬지. 설정 화면에서 컨트롤 영역에서 시작한 터치가 진행 중이거나
 * 끝난 지 BACK_GUARD_MS 안이면 삼킨다(값을 끄는 손가락이 오른쪽으로 비껴도 앱이 닫히지 않게).
 * 컨트롤이 없는 곳(왼쪽 가장자리 x<30 등)에서 시작한 스와이프는 그대로 뒤로가기.
 * 테마 고르기 화면의 뒤로는 index.ux 가 따로 받아 설정 화면으로 돌아간다.
 */
export function shouldSwallowBack(view, touchActive, touchZone, lastTouchEndAt, now) {
  if (view !== 'setup' || !touchZone) return false
  if (touchActive) return true
  const t = Number(now) - Number(lastTouchEndAt)
  return isFinite(t) && t >= 0 && t < BACK_GUARD_MS
}

export const SETUP_ON = { tog: '#3DDC84', knobLeft: 343, label: '#FFFFFF' }
export const SETUP_OFF = { tog: '#333333', knobLeft: 321, label: '#8C8C8C' }
export const START_COLOR = '#FF4B4B'
export const START_PRESSED = '#B83636'
export const THEME_BTN = '#262626'
export const THEME_BTN_PRESSED = '#4A4A4A'

/** 관 채움 높이(px) = k / 칸 수 × 352 (반올림). top = 420 - 높이. */
export function tubeFillHeight(k, n) {
  return Math.round((k / n) * TUBE_H)
}

/** 설정 화면 바인딩 값. */
export function setupViewModel(settings) {
  const s = normalizeSettings(settings)
  const fm = Math.round(s.focusMs / MIN)
  const bm = Math.round(s.breakMs / MIN)
  const st = s.repeat ? SETUP_ON : SETUP_OFF
  const fh = tubeFillHeight(fm / (FOCUS_STEP_MS / MIN), TUBE_LEVELS.focus)
  const rh = tubeFillHeight(bm, TUBE_LEVELS.break)
  return {
    focusNum: pad2(fm),
    restNum: pad2(bm),
    focusFillH: fh,
    focusFillTop: TUBE_BOTTOM - fh,
    restFillH: rh,
    restFillTop: TUBE_BOTTOM - rh,
    repLabColor: st.label,
    togColor: st.tog,
    knobLeft: st.knobLeft
  }
}

/* ---------------- 테마 고르기 화면(view 'themes') ---------------- */

/** 줄 i 의 [x0, y0, x1, y1): x 40~392, y 96 + 88·i, 높이 80(줄 사이 8px 틈). */
export const THEME_ROW = { x0: 40, x1: 392, top: 96, h: 80, pitch: 88 }

export function themeRowZone(i) {
  const y0 = THEME_ROW.top + i * THEME_ROW.pitch
  return [THEME_ROW.x0, y0, THEME_ROW.x1, y0 + THEME_ROW.h]
}

/** (x, y) → 테마 id 또는 null(줄 사이 틈, x<40 등). */
export function themeHit(x, y) {
  const xx = Number(x)
  const yy = Number(y)
  if (!isFinite(xx) || !isFinite(yy)) return null
  for (let i = 0; i < THEMES.length; i++) {
    if (inZone(themeRowZone(i), xx, yy)) return THEMES[i]
  }
  return null
}

/**
 * 테마 고르기 화면 터치 끝: 손 댄 줄과 뗀 줄이 같고 탭(이동 ≤ TAP_MAX_MOVE)이면 그 테마.
 * @returns {string|null}
 */
export function themeTap(x0, y0, x1, y1) {
  const a = themeHit(x0, y0)
  if (!a) return null
  if (x1 == null || y1 == null) return null
  if (!isTapMove(Number(x1) - Number(x0), Number(y1) - Number(y0))) return null
  return a
}

export const THEME_ROW_COLORS = { bg: '#1A1A1A', pressed: '#333333', border: '#1A1A1A', current: '#FFFFFF' }

/** 줄별 현재 테마 표시(cur0~3, 흰 테두리 rowBc0~3 + ✓)와 눌림 바탕(rowBg0~3). */
export function themesViewModel(settings, pressed) {
  const s = normalizeSettings(settings)
  const v = {}
  for (let i = 0; i < THEMES.length; i++) {
    const cur = THEMES[i] === s.theme
    v['cur' + i] = cur
    v['rowBc' + i] = cur ? THEME_ROW_COLORS.current : THEME_ROW_COLORS.border
    v['rowBg' + i] = THEMES[i] === pressed ? THEME_ROW_COLORS.pressed : THEME_ROW_COLORS.bg
  }
  return v
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

/** 시작 애니메이션: 경과 ms → 채움 비율 0..1 (테마 공통). */
export function introProgress(elapsedMs, introMs) {
  const total = Number(introMs) > 0 ? Number(introMs) : INTRO_MS
  const e = Number(elapsedMs)
  if (!isFinite(e) || e <= 0) return 0
  if (e >= total) return 1
  return e / total
}

/* ---------------- 테마별 타이머 화면 ---------------- */

/** CSS 테마 공통 색(SAND 팔레트). 일시정지는 0.1.1 의 어두운 색. */
export const PHASE_COLORS = {
  focus: { fill: '#FF4B4B', edge: '#FFC9C0', dim: '#8A3A3A', dimEdge: '#B57A72' },
  break: { fill: '#3DDC84', edge: '#C4F7DA', dim: '#2A6B4A', dimEdge: '#6FA88A' }
}
export const BATTERY_COLORS = { focus: '#FF5A4A', break: '#3CE07E' }

/** SAND: 화면 높이 514 를 남은 비율만큼 바닥부터 채운다. 수위선은 채움 위 끝(가득·빈 때 숨김). */
export const SAND_H = 514
export function sandHeight(ratio) {
  const r = Math.max(0, Math.min(1, Number(ratio) || 0))
  return Math.round(r * SAND_H)
}

/**
 * BATTERY: 안쪽 y 107~449(342px). 집중은 남은 비율(닳음), 휴식은 지난 비율(충전).
 * @returns {{ ratio: number, height: number, top: number, pct: number }}
 */
export const BATTERY_INNER = { top: 107, bottom: 449, h: 342 }
export function batteryFill(phase, ratio) {
  const r = Math.max(0, Math.min(1, Number(ratio) || 0))
  const f = phase === 'break' ? 1 - r : r
  const h = Math.round(f * BATTERY_INNER.h)
  return { ratio: f, height: h, top: BATTERY_INNER.bottom - h, pct: Math.round(f * 100) }
}

/**
 * SWEEP: 화면 중앙(216,257)을 중심으로 12시에서 시계 방향 부채꼴. θ = 남은 비율 × 360°.
 * 'rotate'(기본, 0.1.9) = div 4개(secA 고정·mask·secB·edge)를 transform: rotate 로 돌린다.
 * 'frames' = 08-sweep (a) PNG 60프레임(구간당) image src 교체. 실기기에서 rotate 가 안 되면
 *            `python3 scripts/sweep-mode.py frames` 로 바꾼다(이 값과 src/common/sweep/ 프레임을 같이 바꿈).
 */
export const SWEEP_MODE = 'rotate'
export const SWEEP_FRAMES = 60
export const SWEEP_DIR = '/common/sweep/'
export const SWEEP_ORIGIN = '0px 338px'
export const SWEEP_EDGE_ORIGIN = '2px 338px'

export function sweepAngle(ratio) {
  const r = Math.max(0, Math.min(1, Number(ratio) || 0))
  return Math.round(r * 36000) / 100
}

/** (a) 프레임 번호 ceil(비율 × 60), 0 이면 숨김. */
export function sweepFrame(ratio) {
  const r = Math.max(0, Math.min(1, Number(ratio) || 0))
  const n = Math.ceil(r * SWEEP_FRAMES - 1e-9)
  return n > 0 ? n : 0
}

export function rotateStyle(deg, origin, color) {
  const o = { transform: JSON.stringify({ rotate: deg + 'deg' }), transformOrigin: origin }
  if (color) o.backgroundColor = color
  return o
}

/** SWEEP 바인딩 값(모드 포함). */
export function sweepParts(phase, ratio, paused, mode) {
  const m = mode || SWEEP_MODE
  const c = PHASE_COLORS[phase === 'break' ? 'break' : 'focus']
  const fill = paused ? c.dim : c.fill
  const edge = paused ? c.dimEdge : c.edge
  const th = sweepAngle(ratio)
  const out = {
    sweepTheta: th,
    secAShow: false,
    maskShow: false,
    secBShow: false,
    edgeShow: false,
    secAColor: fill,
    maskStyle: rotateStyle(th, SWEEP_ORIGIN),
    secBStyle: rotateStyle(Math.max(0, th - 180), SWEEP_ORIGIN, fill),
    edgeStyle: rotateStyle(th, SWEEP_EDGE_ORIGIN, edge),
    frameShow: false,
    frameSrc: SWEEP_DIR + 'f01.png'
  }
  if (m === 'frames') {
    const n = sweepFrame(ratio)
    out.frameShow = n > 0
    out.frameSrc = SWEEP_DIR + (phase === 'break' ? 'r' : 'f') + pad2(Math.max(1, n)) + '.png'
    return out
  }
  out.secAShow = th > 0
  out.maskShow = th > 0 && th <= 180
  out.secBShow = th > 180
  out.edgeShow = th > 0 && th < 360
  return out
}

/**
 * 타이머 화면 바인딩 값.
 * @param state 세션 상태
 * @param theme 'sand' | 'booster' | 'battery' | 'sweep'
 * @param intro 시작 애니메이션 진행 0..1(없으면 null): 게이지만 그 비율로, 시간 글자는 설정값 그대로.
 */
export function viewModel(state, theme, intro) {
  const s = normalizeState(state)
  const th = normalizeTheme(theme)
  const dur = durationOf(s.phase, s)
  const t = formatTime(s.remainMs)
  const isIntro = intro != null
  const ratio = isIntro ? Math.max(0, Math.min(1, Number(intro) || 0)) : remainRatio(s.remainMs, dur)
  const paused = !s.running && !s.done && !isIntro
  const brk = s.phase === 'break'
  const c = PHASE_COLORS[brk ? 'break' : 'focus']
  const fill = paused ? c.dim : c.fill
  const v = {
    theme: th,
    timeText: t,
    phaseLabel: brk ? 'REST' : 'FOCUS',
    totalText: Math.round(dur / MIN) + ' MIN',
    paused: paused
  }
  if (th === 'booster') {
    const lit = isIntro ? Math.ceil(ratio * GAUGE_CELLS - 1e-9) : litCells(s.phase, s.remainMs, dur)
    v.gaugeSrc = gaugeSrc(lit)
    v.labelSrc = GAUGE_DIR + (brk ? 'rest' : 'focus') + '.png'
    v.m1Src = GAUGE_DIR + 'm' + t.charAt(0) + '.png'
    v.m2Src = GAUGE_DIR + 'm' + t.charAt(1) + '.png'
    v.s1Src = GAUGE_DIR + 's' + t.charAt(3) + '.png'
    v.s2Src = GAUGE_DIR + 's' + t.charAt(4) + '.png'
  } else if (th === 'sand') {
    const h = sandHeight(ratio)
    v.sandShow = h > 0
    v.sandTop = SAND_H - h
    v.sandH = h
    v.sandColor = fill
    v.levelShow = h > 0 && h < SAND_H
    v.levelTop = SAND_H - h - 2
    v.levelColor = paused ? c.dimEdge : c.edge
  } else if (th === 'battery') {
    const b = batteryFill(s.phase, ratio)
    const bc = paused ? c.dim : BATTERY_COLORS[brk ? 'break' : 'focus']
    v.batShow = b.height > 0
    v.batTop = b.top
    v.batH = b.height
    v.batColor = bc
    v.mmText = t.slice(0, 2)
    v.ssText = ':' + t.slice(3, 5)
    v.pctText = brk ? 'CHARGING ' + b.pct + '%' : b.pct + '% LEFT'
  } else {
    const p = sweepParts(s.phase, ratio, paused)
    for (const k in p) v[k] = p[k]
  }
  return v
}

/** 테마별 index.ux 바인딩 키(applyTimer 가 바뀐 값만 넣는다). */
export const VIEW_KEYS = {
  common: ['theme', 'timeText', 'phaseLabel', 'totalText', 'paused'],
  booster: ['gaugeSrc', 'labelSrc', 'm1Src', 'm2Src', 's1Src', 's2Src'],
  sand: ['sandShow', 'sandTop', 'sandH', 'sandColor', 'levelShow', 'levelTop', 'levelColor'],
  battery: ['batShow', 'batTop', 'batH', 'batColor', 'mmText', 'ssText', 'pctText'],
  sweep: ['secAShow', 'maskShow', 'secBShow', 'edgeShow', 'secAColor', 'maskStyle', 'secBStyle', 'edgeStyle', 'frameShow', 'frameSrc']
}
