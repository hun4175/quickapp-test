/**
 * 뽀모도로 타이머 순수 로직.
 * 남은 시간은 끝시각(endAt)에서 매번 계산한다. 누적 감산은 쓰지 않는다.
 */

export const FOCUS_MS = 25 * 60 * 1000
export const BREAK_MS = 5 * 60 * 1000
export const FOCUS_MIN_MS = 5 * 60 * 1000
export const FOCUS_MAX_MS = 60 * 60 * 1000
export const FOCUS_STEP_MS = 5 * 60 * 1000
export const TICK_MS = 1000
export const LONGPRESS_MS = 560
export const VIBRATE_OFFSETS_MS = [0, 500, 1000]
export const STORAGE_KEY = 'pomodoro.state.v1'
export const SCREEN_W = 432
export const SCREEN_H = 514
/** 탭으로 인정하는 최대 이동(px). 이보다 크면 길게 누르기를 취소한다. */
export const TAP_MAX_MOVE = 40
/** 대기 중 집중 시간 조절로 인정하는 최소 세로 이동(px). */
export const SWIPE_MIN_DY = 48
export const SWIPE_VERTICAL_RATIO = 1.2

export const COLOR_FOCUS = '#FF4B4B'
export const COLOR_BREAK = '#3DDC84'
export const COLOR_FOCUS_DIM = '#8A3A3A'
export const COLOR_BREAK_DIM = '#2A6B4A'
export const COLOR_EMPTY = '#000000'

const MAX_CATCHUP = 10000

export function pad2(n) {
  const s = String(Math.max(0, Math.floor(Number(n) || 0)))
  return s.length < 2 ? '0' + s : s
}

/** 5분 단위로 맞추고 5~60분 범위로 자른다. 비정상이면 기본 25분. */
export function clampFocusMs(ms) {
  const raw = Number(ms)
  if (!isFinite(raw)) return FOCUS_MS
  const snapped = Math.round(raw / FOCUS_STEP_MS) * FOCUS_STEP_MS
  if (snapped < FOCUS_MIN_MS) return FOCUS_MIN_MS
  if (snapped > FOCUS_MAX_MS) return FOCUS_MAX_MS
  return snapped
}

export function durationOf(phase, focusMs) {
  return phase === 'break' ? BREAK_MS : clampFocusMs(focusMs)
}

export function initialState() {
  return {
    phase: 'focus',
    running: false,
    endAt: null,
    remainMs: FOCUS_MS,
    focusMs: FOCUS_MS,
    idle: true
  }
}

export function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const phase = src.phase === 'break' ? 'break' : 'focus'
  const running = !!src.running
  const focusMs = clampFocusMs(src.focusMs == null ? FOCUS_MS : src.focusMs)
  const endAtNum = Number(src.endAt)
  const endAt = running && isFinite(endAtNum) && endAtNum > 0 ? endAtNum : null
  let remainMs = Number(src.remainMs)
  if (!isFinite(remainMs) || remainMs < 0) {
    remainMs = durationOf(phase, focusMs)
  }
  const maxRemain = durationOf(phase, focusMs)
  if (remainMs > maxRemain) {
    remainMs = maxRemain
  }
  if (running && endAt === null) {
    return {
      phase: phase,
      running: false,
      endAt: null,
      remainMs: remainMs,
      focusMs: focusMs,
      idle: inferIdle(false, phase, remainMs, focusMs, src.idle)
    }
  }
  return {
    phase: phase,
    running: running,
    endAt: running ? endAt : null,
    remainMs: remainMs,
    focusMs: focusMs,
    idle: inferIdle(running, phase, remainMs, focusMs, src.idle)
  }
}

function inferIdle(running, phase, remainMs, focusMs, rawIdle) {
  if (running) return false
  if (rawIdle === true || rawIdle === false) return rawIdle
  return phase === 'focus' && remainMs === focusMs
}

export function serializeState(state) {
  return JSON.stringify(normalizeState(state))
}

export function deserializeState(raw) {
  if (!raw || typeof raw !== 'string') return initialState()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return initialState()
    return normalizeState(parsed)
  } catch (e) {
    return initialState()
  }
}

export function isIdle(state) {
  return normalizeState(state).idle
}

export function start(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!isFinite(t)) return s
  if (s.running) return s
  let phase = s.phase
  let remain = s.remainMs
  if (remain <= 0) {
    phase = phase === 'focus' ? 'break' : 'focus'
    remain = durationOf(phase, s.focusMs)
  }
  return {
    phase: phase,
    running: true,
    endAt: t + remain,
    remainMs: remain,
    focusMs: s.focusMs,
    idle: false
  }
}

export function pause(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!s.running) return s
  const endAt = s.endAt === null ? t : s.endAt
  const remain = Math.max(0, endAt - t)
  return {
    phase: s.phase,
    running: false,
    endAt: null,
    remainMs: remain,
    focusMs: s.focusMs,
    idle: false
  }
}

export function toggle(state, now) {
  return normalizeState(state).running ? pause(state, now) : start(state, now)
}

/** 확인 없이 집중 대기로. 저장해 둔 집중 시간은 유지한다. */
export function reset(state) {
  const focusMs = clampFocusMs(state && state.focusMs)
  return {
    phase: 'focus',
    running: false,
    endAt: null,
    remainMs: focusMs,
    focusMs: focusMs,
    idle: true
  }
}

/**
 * 대기 중에만 집중 시간을 5분 단위로 바꾼다.
 * dir: 'up' | 1 늘림, 'down' | -1 줄임. 실행/일시정지면 그대로 둔다.
 */
export function adjustFocus(state, dir) {
  const s = normalizeState(state)
  if (!s.idle) return s
  const step = dir === 'up' || dir === 1 ? FOCUS_STEP_MS : -FOCUS_STEP_MS
  const next = clampFocusMs(s.focusMs + step)
  if (next === s.focusMs) return s
  return {
    phase: 'focus',
    running: false,
    endAt: null,
    remainMs: next,
    focusMs: next,
    idle: true
  }
}

/**
 * 세로 스와이프 판정. 위로 쓸면 'up', 아래로 쓸면 'down', 아니면 null.
 * 탭·가로 이동과 구분하기 위해 최소 거리와 세로 비율을 본다.
 */
export function classifySwipe(dx, dy, opts) {
  const o = opts && typeof opts === 'object' ? opts : {}
  const minDy = Number(o.minDy != null ? o.minDy : SWIPE_MIN_DY)
  const ratio = Number(o.ratio != null ? o.ratio : SWIPE_VERTICAL_RATIO)
  const adx = Math.abs(Number(dx) || 0)
  const ady = Math.abs(Number(dy) || 0)
  if (ady < minDy) return null
  if (ady < adx * ratio) return null
  return Number(dy) < 0 ? 'up' : 'down'
}

/**
 * 실행 중이면 now 기준으로 구간을 진행시킨다.
 * 앱 밖에 있는 동안 여러 구간이 지났으면 crossed 만큼 넘어간다.
 * @returns {{ state: object, crossed: number }}
 */
export function advance(state, now) {
  const s = normalizeState(state)
  const t = Number(now)
  if (!s.running || s.endAt === null || !isFinite(t)) {
    return { state: s, crossed: 0 }
  }
  let phase = s.phase
  let endAt = s.endAt
  let crossed = 0
  while (t >= endAt && crossed < MAX_CATCHUP) {
    phase = phase === 'focus' ? 'break' : 'focus'
    endAt = endAt + durationOf(phase, s.focusMs)
    crossed = crossed + 1
  }
  return {
    state: {
      phase: phase,
      running: true,
      endAt: endAt,
      remainMs: Math.max(0, endAt - t),
      focusMs: s.focusMs,
      idle: false
    },
    crossed: crossed
  }
}

/** 남은 ms → MM:SS. 초는 올림이라 25:00에서 바로 24:59로 떨어지지 않는다. */
export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000) || 0)
  const m = Math.floor(total / 60)
  const sec = total % 60
  return pad2(m) + ':' + pad2(sec)
}

/** 남은 비율 0..1. 1이면 화면이 가득, 0이면 비움. */
export function remainRatio(remainMs, durationMs) {
  const dur = Number(durationMs)
  const rem = Math.max(0, Number(remainMs) || 0)
  if (!dur || dur <= 0) return 0
  if (rem >= dur) return 1
  return rem / dur
}

/** 아래쪽에 남는 색 영역의 높이(px). */
export function fillHeight(remainMs, durationMs, screenH) {
  const h = screenH || SCREEN_H
  return Math.round(remainRatio(remainMs, durationMs) * h)
}

export const ARROW_OPACITY_ON = 1
export const ARROW_OPACITY_DIM = 0.3

export function nextPhaseOf(phase) {
  return phase === 'break' ? 'focus' : 'break'
}

export function phaseColor(phase, dim) {
  if (phase === 'break') return dim ? COLOR_BREAK_DIM : COLOR_BREAK
  return dim ? COLOR_FOCUS_DIM : COLOR_FOCUS
}

export function viewModel(state) {
  const s = normalizeState(state)
  const running = s.running
  const paused = !running && !s.idle
  const dim = !running
  const dur = durationOf(s.phase, s.focusMs)
  return {
    timeText: formatTime(s.remainMs),
    fillHeight: fillHeight(s.remainMs, dur, SCREEN_H),
    fillColor: phaseColor(s.phase, dim),
    // 집중이 줄면 위쪽은 다음 휴식 초록, 휴식이 줄면 위쪽은 검정.
    backColor: s.phase === 'break' ? COLOR_EMPTY : phaseColor('break', dim),
    paused: paused,
    idle: s.idle,
    upOpacity: s.focusMs >= FOCUS_MAX_MS ? ARROW_OPACITY_DIM : ARROW_OPACITY_ON,
    downOpacity: s.focusMs <= FOCUS_MIN_MS ? ARROW_OPACITY_DIM : ARROW_OPACITY_ON
  }
}
