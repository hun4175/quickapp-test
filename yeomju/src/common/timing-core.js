/**
 * 2.5.1: 진단 타이밍 순수 헬퍼 · 사각형 패널 기하.
 */

export const TIMING_AVG_N = 5

/** 화면 432×514 · 둥근 사각형(모서리만) */
export const SCREEN = Object.freeze({
  width: 432,
  height: 514,
  cornerRadius: 48
})

/**
 * 하단 진단 패널. 줄마다 절대 top (font 24 × 1.4 ≈ 34).
 */
export const DIAG_PANEL = Object.freeze({
  left: 24,
  top: 290,
  width: 384,
  height: 214,
  fontSize: 24,
  lineH: 34,
  padTop: 6,
  lineTops: Object.freeze([6, 40, 74, 108, 142, 176])
})

const num = (v, d = -1) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? n : d
}

/** @param {any} raw @returns {object[]} */
export const normalizeTimingList = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      inSet: num(x.inSet),
      setStart: num(x.setStart),
      animLen: num(x.animLen),
      t0Kind: typeof x.t0Kind === 'string' ? x.t0Kind : 'judge',
      evtDelay: num(x.evtDelay),
      startToMove: num(x.startToMove),
      moveToJudge: num(x.moveToJudge),
      startToEnd: num(x.startToEnd),
      endToSet: num(x.endToSet),
      judgeToHandler: num(x.judgeToHandler),
      handlerToSet: num(x.handlerToSet),
      inputMode: typeof x.inputMode === 'string' ? x.inputMode : 'slide',
      at: num(x.at, 0)
    }))
    .slice(-TIMING_AVG_N)
}

/** @param {object[]} list */
export const timingAverages = (list) => {
  const h = normalizeTimingList(list)
  const avg = (key) => {
    const vals = h.map((x) => x[key]).filter((v) => v >= 0)
    if (!vals.length) return -1
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  return {
    inSet: avg('inSet'),
    setStart: avg('setStart'),
    animLen: avg('animLen'),
    evtDelay: avg('evtDelay'),
    startToEnd: avg('startToEnd'),
    endToSet: avg('endToSet'),
    moveToJudge: avg('moveToJudge'),
    handlerToSet: avg('handlerToSet'),
    count: h.length
  }
}

const ms = (v) => (v >= 0 ? v + 'ms' : '-')

export const formatSampleLine = (s, idx) =>
  '#' +
  (idx + 1) +
  ' in' +
  ms(s.inSet) +
  ' ss' +
  ms(s.setStart) +
  ' an' +
  ms(s.animLen) +
  ' t0=' +
  (s.t0Kind || '?')

export const formatSampleDetailLines = (s) => [
  't0=' + (s.t0Kind || '?') + ' mode=' + (s.inputMode || '-'),
  'evtDelay ' + ms(s.evtDelay) + ' start→move ' + ms(s.startToMove),
  'move→judge ' + ms(s.moveToJudge) + ' start→end ' + ms(s.startToEnd),
  'end→set ' + ms(s.endToSet) + ' judge→h ' + ms(s.judgeToHandler),
  'h→set ' + ms(s.handlerToSet),
  'in→set ' +
    ms(s.inSet) +
    ' set→start ' +
    ms(s.setStart) +
    ' anim ' +
    ms(s.animLen)
]

export const eventDeliveryDelay = (e, now = Date.now()) => {
  if (!e || typeof e !== 'object') return { evtMs: -1, delay: -1 }
  const raw =
    e.timeStamp != null
      ? Number(e.timeStamp)
      : e.timestamp != null
        ? Number(e.timestamp)
        : NaN
  if (!Number.isFinite(raw) || raw <= 0) return { evtMs: -1, delay: -1 }
  if (raw > 1e12) {
    return { evtMs: Math.floor(raw), delay: Math.max(0, Math.floor(now - raw)) }
  }
  return { evtMs: Math.floor(raw), delay: -1 }
}

export const deltaMs = (later, earlier) => {
  const a = Number(later) || 0
  const b = Number(earlier) || 0
  if (a <= 0 || b <= 0) return -1
  return Math.max(0, Math.floor(a - b))
}
