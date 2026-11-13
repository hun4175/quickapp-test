import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SPRITE_DURATION_MS,
  SPRITE_FRAME_COUNT,
  SPRITE_CROP,
  SPRITE_IDLE,
  SPRITE_NEXT,
  SPRITE_PREV,
  SPRITE_FILES_SUM_BYTES,
  SPRITE_PHASES,
  SPRITE_THEMES,
  themePhase,
  spriteIdleFor,
  spriteFramesFor,
  spriteFramesForDir
} from '../src/common/sprite-meta.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('sprite meta', () => {
  it('기본 테마 · 4프레임 · JPG', () => {
    assert.equal(SPRITE_DURATION_MS, 150)
    assert.equal(SPRITE_FRAME_COUNT, 4)
    assert.equal(SPRITE_PHASES, 6)
    assert.ok(SPRITE_IDLE.endsWith('.jpg'))
    assert.equal(SPRITE_NEXT[0], SPRITE_IDLE)
    assert.equal(SPRITE_NEXT[SPRITE_NEXT.length - 1], SPRITE_IDLE)
    assert.equal(SPRITE_PREV[0], SPRITE_IDLE)
    assert.ok(SPRITE_CROP.width > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES < 5_000_000)
  })

  it('한자 테마 6위상 · 파일 존재', () => {
    assert.equal(themePhase(0), 0)
    assert.equal(themePhase(7), 1)
    for (const theme of ['ommani', 'namu']) {
      const t = SPRITE_THEMES[theme]
      assert.equal(t.phases, 6)
      assert.equal(t.idle.length, 6)
      assert.equal(t.nextByPhase.length, 6)
      assert.equal(t.prevByPhase.length, 6)
      for (let p = 0; p < 6; p++) {
        const idle = spriteIdleFor(theme, p)
        assert.equal(idle, t.idle[p])
        const next = spriteFramesFor(theme, 1, p)
        assert.equal(next[0], t.idle[p])
        assert.equal(next[next.length - 1], t.idle[(p + 1) % 6])
        const prev = spriteFramesFor(theme, -1, p)
        assert.equal(prev[0], t.idle[p])
        assert.equal(prev[prev.length - 1], t.idle[(p + 1) % 6])
      }
    }
    const unique = new Set()
    for (const theme of ['default', 'ommani', 'namu']) {
      const t = SPRITE_THEMES[theme]
      for (const src of t.idle) unique.add(src)
      for (const list of t.nextByPhase) for (const src of list) unique.add(src)
      for (const list of t.prevByPhase) for (const src of list) unique.add(src)
    }
    for (const src of unique) {
      const file = path.join(root, 'src', src.slice(1))
      assert.ok(fs.existsSync(file), 'missing ' + file)
    }
    assert.deepEqual(spriteFramesForDir(1), [...SPRITE_NEXT])
  })
})
