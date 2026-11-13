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
  SPRITE_THEMES,
  spriteIdleFor,
  spriteFramesFor,
  spriteFramesForDir
} from '../src/common/sprite-meta.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('sprite meta', () => {
  it('4테마 · 각 1주기 JPG', () => {
    assert.equal(SPRITE_DURATION_MS, 150)
    assert.equal(SPRITE_FRAME_COUNT, 4)
    assert.ok(SPRITE_IDLE.endsWith('.jpg'))
    assert.equal(SPRITE_NEXT[0], SPRITE_IDLE)
    assert.equal(SPRITE_NEXT[SPRITE_NEXT.length - 1], SPRITE_IDLE)
    assert.ok(SPRITE_CROP.width > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES < 1_500_000)
    assert.deepEqual(
      Object.keys(SPRITE_THEMES).sort(),
      ['default', 'goldwood', 'jade', 'pinkjade'].sort()
    )
    assert.equal(SPRITE_THEMES.ommani, undefined)
    assert.equal(SPRITE_THEMES.namu, undefined)
  })

  it('테마별 파일 존재 · 헬퍼', () => {
    const unique = new Set()
    for (const theme of Object.keys(SPRITE_THEMES)) {
      const t = SPRITE_THEMES[theme]
      assert.equal(t.phases, 1)
      assert.equal(t.idle.length, 1)
      assert.equal(spriteIdleFor(theme), t.idle[0])
      const next = spriteFramesFor(theme, 1)
      const prev = spriteFramesFor(theme, -1)
      assert.equal(next.length, 4)
      assert.equal(prev.length, 4)
      assert.equal(next[0], t.idle[0])
      assert.equal(next[3], t.idle[0])
      for (const src of [...t.idle, ...t.nextByPhase[0], ...t.prevByPhase[0]]) {
        unique.add(src)
      }
    }
    for (const src of unique) {
      const file = path.join(root, 'src', src.slice(1))
      assert.ok(fs.existsSync(file), 'missing ' + file)
    }
    assert.deepEqual(spriteFramesForDir(1), [...SPRITE_NEXT])
    assert.deepEqual(spriteFramesForDir(-1), [...SPRITE_PREV])
  })
})
