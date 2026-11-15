/**
 * 뽀모도로 타이머 순수 로직.
 * 남은 시간은 끝시각(endAt)에서 매번 계산한다. 누적 감산은 쓰지 않는다.
 */

export const FOCUS_MS = 25 * 60 * 1000
export const BREAK_MS = 5 * 60 * 1000
export const FRAMES = 60
export const TICK_MS = 250
export const LONGPRESS_MS = 560
export const VIBRATE_OFFSETS_MS = [0, 500, 1000]
export const STORAGE_KEY = 'pomodoro.state.v1'

export const COLOR_FOCUS = '#FF4B4B'
export const COLOR_BREAK = '#3DDC84'
export const COLOR_FOCUS_DIM = '#8A3A3A'
export const COLOR_BREAK_DIM = '#2A6B4A'

const MAX_CATCHUP = 10000

export function pad2(n) {
  const s = String(Math.max(0, Math.floor(Number(n) || 0)))
  return s.length < 2 ? '0' + s : s
}

export function durationOf(phase) {
  return phase === 'break' ? BREAK_MS : FOCUS_MS
}

export function initialState() {
  return {
    phase: 'focus',
    running: false,
    endAt: null,
    remainMs: FOCUS_MS
  }
}

export function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const phase = src.phase === 'break' ? 'break' : 'focus'
  const running = !!src.running
  const endAtNum = Number(src.endAt)
  const endAt = running && isFinite(endAtNum) && endAtNum > 0 ? endAtNum : null
  let remainMs = Number(src.remainMs)
  if (!isFinite(remainMs) || remainMs < 0) {
    remainMs = durationOf(phase)
  }
  if (remainMs > durationOf(phase)) {
    remainMs = durationOf(phase)
  }
  if (running && endAt === null) {
    return {
      phase: phase,
      running: false,
      endAt: null,
      remainMs: remainMs
    }
  }
  return {
    phase: phase,
    running: running,
    endAt: running ? endAt : null,
    remainMs: remainMs
  }
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
  const s = normalizeState(state)
  return !s.running && s.phase === 'focus' && s.remainMs === FOCUS_MS
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
    remain = durationOf(phase)
  }
  return {
    phase: phase,
    running: true,
    endAt: t + remain,
    remainMs: remain
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
    remainMs: remain
  }
}

export function toggle(state, now) {
  return normalizeState(state).running ? pause(state, now) : start(state, now)
}

export function reset() {
  return initialState()
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
    endAt = endAt + durationOf(phase)
    crossed = crossed + 1
  }
  return {
    state: {
      phase: phase,
      running: true,
      endAt: endAt,
      remainMs: Math.max(0, endAt - t)
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

/**
 * 남은 비율에 해당하는 프레임. 0 = 가득(시작), frames-1 = 거의 비움(끝).
 */
export function frameIndex(remainMs, durationMs, frames) {
  const n = frames || FRAMES
  const dur = Number(durationMs)
  const rem = Math.max(0, Number(remainMs) || 0)
  const t = !dur || dur <= 0 ? 0 : Math.min(1, rem / dur)
  const i = Math.round((1 - t) * (n - 1))
  if (i < 0) return 0
  if (i > n - 1) return n - 1
  return i
}

export function ringSrc(phase, remainMs) {
  const i = frameIndex(remainMs, durationOf(phase), FRAMES)
  const kind = phase === 'break' ? 'break' : 'focus'
  return '/common/rings/' + kind + '-' + pad2(i) + '.png'
}

export function viewModel(state) {
  const s = normalizeState(state)
  const idle = isIdle(s)
  const running = s.running
  const paused = !running && !idle
  const focus = s.phase !== 'break'
  const dim = !running
  return {
    timeText: formatTime(s.remainMs),
    ringSrc: ringSrc(s.phase, s.remainMs),
    timeColor: focus
      ? dim
        ? COLOR_FOCUS_DIM
        : COLOR_FOCUS
      : dim
        ? COLOR_BREAK_DIM
        : COLOR_BREAK,
    ringOpacity: running ? 1 : 0.45,
    paused: paused,
    idle: idle
  }
}
