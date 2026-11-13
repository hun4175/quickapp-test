/**
 * 목표 달성 진동 타이밍 (실기기 보정: 0·300·600ms × 3)
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GOAL_VIBRATE_STEP_MS,
  goalVibrateOffsets
} from '../src/common/vibrate.js'

describe('goal vibrate', () => {
  it('오프셋 [0, 300, 600] · 3회', () => {
    assert.equal(GOAL_VIBRATE_STEP_MS, 300)
    assert.deepEqual(goalVibrateOffsets(), [0, 300, 600])
    assert.equal(goalVibrateOffsets().length, 3)
  })
})
