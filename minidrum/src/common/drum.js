/**
 * 미니드럼 패드 정의와 재생 전략 (순수 함수 · 단위 테스트 대상).
 *
 * 출처
 *  - audio : https://iot.mi.com/vela/quickapp/zh/features/other/audio.html
 *            (단일 모듈 객체 · src/currentTime/muted 속성 · play/ended 이벤트)
 *  - 이벤트: https://iot.mi.com/vela/quickapp/zh/components/general/events.html
 *            (touchstart = "手指刚触摸组件时触发". click 은 손을 뗀 뒤 판정될 것으로 추정)
 *  - vibrator: https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html
 *
 * 주의(실기기 사실, 0.1.0): 시작 시 audio.muted=true 예열 후 시스템 미디어 볼륨이 0이 됐다.
 * 그래서 0.1.1부터 muted·volume 쓰기, system.volume 사용을 하지 않는다.
 */

export const SOUND_DIR = '/common/sounds/'

/** 2x2 배치 순서: 0 좌상, 1 우상, 2 좌하, 3 우하 */
export const PADS = [
  { id: 'kick', label: '킥', src: SOUND_DIR + 'kick.wav', color: '#7a2a1c', hit: '#ff7a52' },
  { id: 'snare', label: '스네어', src: SOUND_DIR + 'snare.wav', color: '#1c4a7a', hit: '#5cb8ff' },
  { id: 'hihat', label: '하이햇', src: SOUND_DIR + 'hihat.wav', color: '#5e5a14', hit: '#f2e44a' },
  { id: 'crash', label: '크래시', src: SOUND_DIR + 'crash.wav', color: '#4a1c6e', hit: '#d58cff' }
]

/** 눌림 색 유지 시간(ms). 빠른 탭도 보이도록 touchend 와 무관하게 이 시간 뒤 복귀 */
export const FLASH_MS = 110

/** 지연 통계에 쓰는 최근 샘플 수 */
export const STATS_WINDOW = 10

/** 측정을 버리는 상한(ms). 이보다 늦은 play 이벤트는 이전 터치와 무관하다고 봄 */
export const MAX_VALID_LATENCY_MS = 3000

/**
 * 단일 플레이어 전략.
 *  - 'rewind': 지금 플레이어의 src 와 같은 소리 → src 재지정 없이 currentTime=0 후 play()
 *  - 'switch': 다른 소리 → src 교체 후 play()
 * soundtest 0.1.0 실측: 재사용(되감기) ~200~215ms, 매번 stop→src→play WAV ~554ms.
 */
export function planPlay(currentSrc, src) {
  return currentSrc && currentSrc === src ? 'rewind' : 'switch'
}

/** 터치 시각 → play 이벤트 시각 지연. 유효하지 않으면 null */
export function latencyMs(t0, now) {
  if (typeof t0 !== 'number' || t0 <= 0 || typeof now !== 'number') return null
  const ms = Math.round(now - t0)
  if (ms < 0 || ms > MAX_VALID_LATENCY_MS) return null
  return ms
}

/** 최근 STATS_WINDOW 개만 유지 */
export function pushSample(samples, ms, max = STATS_WINDOW) {
  if (ms === null || ms === undefined) return samples || []
  const next = (samples || []).concat([ms])
  return next.length > max ? next.slice(next.length - max) : next
}

export function stats(samples) {
  const s = samples || []
  if (!s.length) return { n: 0, last: null, min: null, avg: null, max: null }
  let min = s[0]
  let max = s[0]
  let sum = 0
  for (const v of s) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { n: s.length, last: s[s.length - 1], min, avg: Math.round(sum / s.length), max }
}

/** 상단 디버그 한 줄: "213ms · 평균 220 (8)" */
export function formatLatency(samples) {
  const st = stats(samples)
  if (!st.n) return '-- ms'
  return st.last + 'ms · 평균 ' + st.avg + ' (' + st.n + ')'
}

export function padIndexOf(id) {
  for (let i = 0; i < PADS.length; i++) if (PADS[i].id === id) return i
  return -1
}

/** getPlayState 의 volume(0~1)을 "vol 0.8" 형태로. 읽기 표시 전용 */
export function formatVol(v) {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !isFinite(n)) return 'vol ?'
  return 'vol ' + Math.round(n * 100) / 100
}
