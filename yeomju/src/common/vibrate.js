/**
 * Vela/QuickApp vibrator 타이밍 헬퍼.
 *
 * 근거 (Quick App Alliance / Huawei 문서):
 * - mode "long" = 1000ms, "short" = 35ms
 *   https://developer.huawei.com/consumer/cn/doc/quickapp-api-vibrator
 *   https://miniapp-initiative.ow2.io/developers/services/vibration
 * Vela 공식 문서는 mode만 명시하고 ms는 미기재:
 *   https://iot.mi.com/vela/quickapp/zh/features/system/vibrator.html
 * REDMI Watch 6: vibrate 지원, start/stop 미지원 → long 연속 호출로 연장.
 */

/** Quick App 표준: long 1회 = 1000ms */
export const VIBRATE_LONG_MS = 1000

/** 목표 달성 진동 목표 길이 */
export const GOAL_VIBRATE_MS = 2000

/**
 * ~GOAL_VIBRATE_MS 동안 long 진동을 이어가기 위한 호출 오프셋(ms).
 * long=1000ms 가정 → [0, 1000] (2회, 총 ~2000ms).
 * @returns {number[]}
 */
export const goalVibrateOffsets = () => {
  const step = VIBRATE_LONG_MS
  const out = []
  for (let t = 0; t < GOAL_VIBRATE_MS; t += step) {
    out.push(t)
  }
  return out
}
