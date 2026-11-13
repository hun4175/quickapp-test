/**
 * 목표 달성 진동 타이밍 (long≈1000ms × 2 ≈ 2000ms)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  VIBRATE_LONG_MS,
  GOAL_VIBRATE_MS,
  goalVibrateOffsets
} from '../src/common/vibrate.js'

describe('goal vibrate', () => {
  it('long=1000ms · 목표 2초 → 오프셋 [0, 1000]', () => {
    assert.equal(VIBRATE_LONG_MS, 1000)
    assert.equal(GOAL_VIBRATE_MS, 2000)
    assert.deepEqual(goalVibrateOffsets(), [0, 1000])
    const span =
      goalVibrateOffsets()[goalVibrateOffsets().length - 1] + VIBRATE_LONG_MS
    assert.equal(span, GOAL_VIBRATE_MS)
  })
})
