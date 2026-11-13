/**
 * Vela/QuickApp vibrator 타이밍 헬퍼.
 *
 * REDMI Watch 6 실기기에서 long이 문서(1000ms)보다 짧아
 * 0·300·600ms 간격으로 long 3회 호출.
 * Watch 6: vibrate만 지원 (start/stop 미지원).
 */

/** 문서상 long 공칭값(참고). 실기기 체감은 더 짧음. */
export const VIBRATE_LONG_MS = 1000

/** 목표 달성 진동 스케줄 끝 오프셋 */
export const GOAL_VIBRATE_MS = 600

/** long 연속 호출 간격(실기기 보정) */
export const GOAL_VIBRATE_STEP_MS = 300

/**
 * 달성 진동 호출 오프셋(ms): [0, 300, 600] — 총 3회.
 * @returns {number[]}
 */
export const goalVibrateOffsets = () => [0, 300, 600]
