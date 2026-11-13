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
  SPRITE_PNG32_SUM_BYTES,
  spriteFramesForDir,
  spriteImageFrames
} from '../src/common/sprite-meta.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('sprite meta', () => {
  it('4프레임 · JPG · idle 공유 · first/last 동일 경로', () => {
    assert.equal(SPRITE_DURATION_MS, 150)
    assert.equal(SPRITE_FRAME_COUNT, 4)
    assert.equal(SPRITE_NEXT.length, 4)
    assert.equal(SPRITE_PREV.length, 4)
    assert.ok(SPRITE_IDLE.endsWith('.jpg'))
    assert.equal(SPRITE_NEXT[0], SPRITE_IDLE)
    assert.equal(SPRITE_NEXT[SPRITE_NEXT.length - 1], SPRITE_IDLE)
    assert.equal(SPRITE_PREV[0], SPRITE_IDLE)
    assert.equal(SPRITE_PREV[SPRITE_PREV.length - 1], SPRITE_IDLE)
    assert.ok(SPRITE_CROP.width > 0 && SPRITE_CROP.height > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES > 0)
    assert.ok(SPRITE_FILES_SUM_BYTES < 500_000)
    assert.ok(SPRITE_PNG32_SUM_BYTES > SPRITE_FILES_SUM_BYTES)
  })

  it('방향 헬퍼 · 파일 존재', () => {
    assert.deepEqual(spriteFramesForDir(1), [...SPRITE_NEXT])
    assert.deepEqual(spriteFramesForDir(-1), [...SPRITE_PREV])
    assert.equal(spriteImageFrames(1)[0].src, SPRITE_IDLE)
    const unique = new Set([...SPRITE_NEXT, ...SPRITE_PREV])
    for (const src of unique) {
      const file = path.join(root, 'src', src.slice(1))
      assert.ok(fs.existsSync(file), 'missing ' + file)
    }
  })
})
