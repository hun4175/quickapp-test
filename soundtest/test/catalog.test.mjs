import { describe as group, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  TESTS,
  SOUNDS,
  MAX_LOG_LINES,
  elapsedMs,
  formatEvent,
  pushLog,
  describe,
  clampVolume,
  volumePercent
} from '../src/common/catalog.js'

group('catalog 로직', () => {
  it('elapsedMs: 터치 시각 없으면 null, 음수는 0', () => {
    assert.equal(elapsedMs(0, 100), null)
    assert.equal(elapsedMs(undefined, 100), null)
    assert.equal(elapsedMs(1000, 1123.4), 123)
    assert.equal(elapsedMs(1000, 900), 0)
  })
  it('formatEvent', () => {
    assert.equal(formatEvent('play', 12), 'play +12ms')
    assert.equal(formatEvent('error', 5, 'code=1001'), 'error +5ms code=1001')
    assert.equal(formatEvent('ended', null), 'ended')
  })
  it('pushLog: 최근 MAX_LOG_LINES 줄만 유지', () => {
    let l = []
    for (let i = 0; i < MAX_LOG_LINES + 3; i++) l = pushLog(l, 'x' + i)
    assert.equal(l.length, MAX_LOG_LINES)
    assert.equal(l[l.length - 1], 'x' + (MAX_LOG_LINES + 2))
    assert.equal(l[0], 'x3')
  })
  it('describe: 코드·객체·긴 문자열', () => {
    assert.equal(describe('bad', 202), 'code=202 bad')
    assert.equal(describe({ a: 1 }), '{"a":1}')
    assert.equal(describe(undefined, undefined), '')
    assert.ok(describe('y'.repeat(200)).endsWith('…'))
  })
  it('clampVolume / volumePercent', () => {
    assert.equal(clampVolume(0.95 + 0.1), 1)
    assert.equal(clampVolume(0.05 - 0.1), 0)
    assert.equal(clampVolume(0.3 + 0.1), 0.4)
    assert.equal(clampVolume('x'), 0)
    assert.equal(volumePercent(0.4), '40%')
    assert.equal(volumePercent(undefined), '?')
  })
  it('TESTS id 중복 없음 · 재생 항목은 SOUNDS 경로 사용', () => {
    const ids = TESTS.map((t) => t.id)
    assert.equal(new Set(ids).size, ids.length)
    const paths = Object.values(SOUNDS)
    for (const t of TESTS) if (t.src) assert.ok(paths.includes(t.src), t.id)
  })
})
