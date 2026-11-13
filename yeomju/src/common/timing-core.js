/**
 * 2.4.4: 진단 타이밍 순수 헬퍼 (Node 테스트 가능).
 */

export const TIMING_AVG_N = 5

/** @param {any} raw @returns {object[]} */
export const normalizeTimingList = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({
      inSet: Math.floor(Number(x.inSet) || -1),
      setStart: Math.floor(Number(x.setStart) || -1),
      animLen: Math.floor(Number(x.animLen) || -1),
      n: Math.floor(Number(x.n) || 10),
      e1: x.e1 !== false,
      e2: x.e2 === true,
      e3: x.e3 !== false,
      e4: x.e4 === true,
      e5: x.e5 === true,
      e6: x.e6 === true,
      e5Status: typeof x.e5Status === 'string' ? x.e5Status : '',
      at: Math.floor(Number(x.at) || 0)
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
    count: h.length
  }
}

/** 설정 화면용 한 줄 요약 */
export const formatSampleLine = (s, idx) => {
  const ms = (v) => (v >= 0 ? v + 'ms' : '-')
  return (
    '#' +
    (idx + 1) +
    ' ' +
    ms(s.inSet) +
    '/' +
    ms(s.setStart) +
    '/' +
    ms(s.animLen) +
    ' n' +
    s.n +
    ' E' +
    (s.e1 ? '1' : '') +
    (s.e2 ? '2' : '') +
    (s.e3 ? '3' : '') +
    (s.e4 ? '4' : '') +
    (s.e5 ? '5' : '') +
    (s.e6 ? '6' : '')
  )
}

/** 진단 패널 기하 (원형 내접 하단 안전영역) */
export const DIAG_PANEL = Object.freeze({
  left: 56,
  top: 330,
  width: 320,
  height: 70,
  fontSize: 28
})
