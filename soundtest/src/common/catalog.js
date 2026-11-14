/**
 * 소리 테스트 항목 목록과 결과 로그 포맷 (순수 함수 · 단위 테스트 대상).
 *
 * 출처
 *  - audio : https://iot.mi.com/vela/quickapp/zh/features/other/audio.html
 *  - volume: https://iot.mi.com/vela/quickapp/zh/features/system/volume.html
 *  - vibrator: https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html
 *  - file  : https://iot.mi.com/vela/quickapp/zh/features/data/file.html
 *  - URI   : https://iot.mi.com/vela/quickapp/zh/guide/framework/project-structure.html
 */

export const SOUND_DIR = '/common/sounds/'

export const SOUNDS = {
  click16k: SOUND_DIR + 'click16k.wav',
  beep16k: SOUND_DIR + 'beep16k.wav',
  beep44k: SOUND_DIR + 'beep44k.wav',
  clickMp3: SOUND_DIR + 'click.mp3',
  beepMp3: SOUND_DIR + 'beep.mp3',
  beepOpus: SOUND_DIR + 'beep.opus'
}

/** internal://files 복사 대상 (file.copy 후 재생 테스트) */
export const COPY_DST = 'internal://files/beep16k.wav'

/**
 * 버튼 목록. kind:
 *  - reuse  : 같은 src면 다시 지정하지 않고 play()만 (미리 로드 재사용)
 *  - fresh  : stop() → src 재지정 → play() (매번 새로)
 *  - auto   : autoplay=true 후 src 지정 (play() 호출 없음)
 *  - copy   : file.copy 로 internal://files 에 복사한 뒤 fresh 재생
 *  - stop / state / vol / volUp / volDown / vib / probe : 보조 동작
 */
export const TESTS = [
  { id: 'wavClickReuse', label: 'WAV 클릭 · 재사용', kind: 'reuse', src: SOUNDS.click16k },
  { id: 'wavClickFresh', label: 'WAV 클릭 · 매번', kind: 'fresh', src: SOUNDS.click16k },
  { id: 'mp3ClickReuse', label: 'MP3 클릭 · 재사용', kind: 'reuse', src: SOUNDS.clickMp3 },
  { id: 'mp3ClickFresh', label: 'MP3 클릭 · 매번', kind: 'fresh', src: SOUNDS.clickMp3 },
  { id: 'wavBeep', label: 'WAV 비프 1초 16k', kind: 'fresh', src: SOUNDS.beep16k },
  { id: 'wav44Beep', label: 'WAV 비프 1초 44.1k', kind: 'fresh', src: SOUNDS.beep44k },
  { id: 'mp3Beep', label: 'MP3 비프 1초', kind: 'fresh', src: SOUNDS.beepMp3 },
  { id: 'opusBeep', label: 'OPUS 비프 1초', kind: 'fresh', src: SOUNDS.beepOpus },
  { id: 'autoBeep', label: 'autoplay WAV 비프', kind: 'auto', src: SOUNDS.beep16k },
  { id: 'copyBeep', label: '복사본 WAV 비프', kind: 'copy', src: SOUNDS.beep16k },
  { id: 'stop', label: '■ 정지 stop()', kind: 'stop' },
  { id: 'state', label: '상태 getPlayState', kind: 'state' },
  { id: 'vol', label: '볼륨 조회', kind: 'vol' },
  { id: 'volUp', label: '볼륨 +10%', kind: 'volUp' },
  { id: 'volDown', label: '볼륨 -10%', kind: 'volDown' },
  { id: 'vib', label: '진동 short (비교)', kind: 'vib' },
  { id: 'probe', label: '파일 포함 확인', kind: 'probe' }
]

export const AUDIO_EVENTS = ['play', 'pause', 'stop', 'loadeddata', 'ended', 'durationchange', 'error']

export const MAX_LOG_LINES = 6

/** 터치 시각 기준 경과 ms. 터치 시각이 없으면 null */
export function elapsedMs(t0, now) {
  if (typeof t0 !== 'number' || t0 <= 0) return null
  return Math.max(0, Math.round(now - t0))
}

/** 로그 한 줄: "play +123ms" / "error +45ms code=..." */
export function formatEvent(name, ms, detail) {
  let s = name + (ms === null || ms === undefined ? '' : ' +' + ms + 'ms')
  if (detail !== undefined && detail !== null && detail !== '') s += ' ' + detail
  return s
}

/** 새 줄을 뒤에 붙이고 최근 MAX_LOG_LINES 줄만 유지 */
export function pushLog(lines, line, max = MAX_LOG_LINES) {
  const next = (lines || []).concat([line])
  return next.length > max ? next.slice(next.length - max) : next
}

/** 콜백 인자(fail(data, code) 등)를 짧은 문자열로 */
export function describe(data, code) {
  let s = ''
  if (code !== undefined && code !== null) s += 'code=' + code
  if (data !== undefined && data !== null && data !== '') {
    let d
    try {
      d = typeof data === 'string' ? data : JSON.stringify(data)
    } catch (e) {
      d = String(data)
    }
    if (d && d.length > 80) d = d.slice(0, 80) + '…'
    s += (s ? ' ' : '') + d
  }
  return s
}

/** 볼륨 0~1 범위로 자르고 소수 1자리 반올림 */
export function clampVolume(v) {
  const n = Number(v)
  if (!isFinite(n)) return 0
  return Math.round(Math.min(1, Math.max(0, n)) * 10) / 10
}

export function volumePercent(v) {
  const n = Number(v)
  return isFinite(n) ? Math.round(n * 100) + '%' : '?'
}
