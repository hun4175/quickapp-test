/**
 * Vela/QuickApp vibrator 타이밍 헬퍼.
 *
 * Quick App 문서상 long=1000ms이나, REDMI Watch 6 실기기에서는
 * long이 훨씬 짧아 500ms 간격 3회(0·500·1000)로 ~1.5–2초 체감을 맞춤.
 * Watch 6: vibrate만 지원 (start/stop 미지원).
 */

/** 문서상 long 공칭값(참고). 실기기 체감은 더 짧음. */
export const VIBRATE_LONG_MS = 1000

/** 목표 달성 진동 스케줄 끝 오프셋 */
export const GOAL_VIBRATE_MS = 1000

/** long 연속 호출 간격(실기기 보정) */
export const GOAL_VIBRATE_STEP_MS = 500

/**
 * 달성 진동 호출 오프셋(ms): [0, 500, 1000] — 총 3회.
 * @returns {number[]}
 */
export const goalVibrateOffsets = () => [0, 500, 1000]
