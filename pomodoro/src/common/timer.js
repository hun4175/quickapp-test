/**
 * 뽀모도로 순수 로직(0.1.6).
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
/** 설정 화면 가로 끌기: 이 거리(px)마다 한 칸씩 값이 바뀐다. */
export const SCROLL_STEP_PX = 44
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

/**
 * 가로 끌기 누적 이동 dx(px) → 지금까지 적용할 칸 수.
 * 왼쪽으로 끌면(dx<0) 오른쪽의 더 큰 값이 가운데로 온다 → 늘림(+).
 */
export function scrollSteps(dx, stepPx) {
  const px = Number(stepPx) > 0 ? Number(stepPx) : SCROLL_STEP_PX
  const v = -(Number(dx) || 0) / px
  const n = v >= 0 ? Math.floor(v) : -Math.floor(-v)
  return n === 0 ? 0 : n
}

/** 설정 화면 터치 영역(y 구간). scripts/gen-setup.py 배치와 맞춘다(test/project.test.mjs 가 확인). */
export const SETUP_ROWS = {
  focus: [0, 196],
  break: [196, 352],
  repeat: [352, 416],
  start: [416, SCREEN_H]
}
export const SETUP_START_X = [96, 336]
/** 값 줄에서 이 x보다 왼쪽 탭은 -1, 오른쪽 탭은 +1(가로 끌기가 시스템 제스처에 먹힐 때의 보조). */
export const SETUP_TAP_SIDE = [144, 288]

export function setupHit(x, y) {
  const yy = Number(y) || 0
  const xx = Number(x) || 0
  if (yy < SETUP_ROWS.focus[1]) return 'focus'
  if (yy < SETUP_ROWS.break[1]) return 'break'
  if (yy < SETUP_ROWS.repeat[1]) return 'repeat'
  if (xx >= SETUP_START_X[0] && xx <= SETUP_START_X[1]) return 'start'
  return null
}

/** 값 줄 탭 위치 → -1 / 0 / +1 */
export function tapSide(x) {
  const xx = Number(x) || 0
  if (xx < SETUP_TAP_SIDE[0]) return -1
  if (xx > SETUP_TAP_SIDE[1]) return 1
  return 0
}

export const SETUP_DIR = '/common/setup/'

function digitSrcs(prefix, minutes) {
  const t = pad2(minutes)
  return [SETUP_DIR + prefix + t.charAt(0) + '.png', SETUP_DIR + prefix + t.charAt(1) + '.png']
}

export function setupViewModel(settings) {
  const s = normalizeSettings(settings)
  const fm = Math.round(s.focusMs / MIN)
  const bm = Math.round(s.breakMs / MIN)
  const f = digitSrcs('f', fm)
  const b = digitSrcs('r', bm)
  const fPrev = s.focusMs > FOCUS_MIN_MS ? digitSrcs('n', fm - FOCUS_STEP_MS / MIN) : null
  const fNext = s.focusMs < FOCUS_MAX_MS ? digitSrcs('n', fm + FOCUS_STEP_MS / MIN) : null
  const bPrev = s.breakMs > BREAK_MIN_MS ? digitSrcs('n', bm - 1) : null
  const bNext = s.breakMs < BREAK_MAX_MS ? digitSrcs('n', bm + 1) : null
  const blank = SETUP_DIR + 'n0.png'
  return {
    focusText: pad2(fm),
    breakText: pad2(bm),
    f1Src: f[0],
    f2Src: f[1],
    r1Src: b[0],
    r2Src: b[1],
    fPrevShow: !!fPrev,
    fPrev1Src: fPrev ? fPrev[0] : blank,
    fPrev2Src: fPrev ? fPrev[1] : blank,
    fNextShow: !!fNext,
    fNext1Src: fNext ? fNext[0] : blank,
    fNext2Src: fNext ? fNext[1] : blank,
    rPrevShow: !!bPrev,
    rPrev1Src: bPrev ? bPrev[0] : blank,
    rPrev2Src: bPrev ? bPrev[1] : blank,
    rNextShow: !!bNext,
    rNext1Src: bNext ? bNext[0] : blank,
    rNext2Src: bNext ? bNext[1] : blank,
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
