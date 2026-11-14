import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { TESTS, SOUNDS } from '../src/common/catalog.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'src')
const ux = readFileSync(path.join(SRC, 'pages/index/index.ux'), 'utf8')
const manifest = JSON.parse(readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·필요 feature', () => {
    assert.equal(manifest.package, 'com.hun4175.soundtest')
    assert.ok(!manifest.package.startsWith('com.yeomju.'))
    const feats = manifest.features.map((f) => f.name).sort()
    assert.deepEqual(feats, ['system.audio', 'system.file', 'system.vibrator', 'system.volume'])
  })
  it('index.ux: 모든 TESTS에 버튼과 핸들러가 있음', () => {
    for (const t of TESTS) {
      assert.ok(ux.includes(`onclick="tap_${t.id}"`), 'button ' + t.id)
      assert.ok(ux.includes(`tap_${t.id}() {\n    this.run('${t.id}')`), 'method ' + t.id)
      assert.ok(ux.includes(`>${t.label}</text>`), 'label ' + t.id)
    }
  })
  it('index.ux: import 한 모듈은 manifest 에 선언됨', () => {
    for (const m of ux.matchAll(/from '@(system\.\w+)'/g)) {
      assert.ok(manifest.features.some((f) => f.name === m[1]), m[1])
    }
  })
  it('사운드 파일 존재·작음·포맷 시그니처', () => {
    const magic = { wav: 'RIFF', opus: 'OggS' }
    for (const uri of Object.values(SOUNDS)) {
      const p = path.join(SRC, uri)
      assert.ok(existsSync(p), p)
      assert.ok(statSync(p).size < 100 * 1024, 'size ' + p)
      const head = readFileSync(p).subarray(0, 4)
      const ext = path.extname(p).slice(1)
      if (magic[ext]) assert.equal(head.toString('latin1'), magic[ext], p)
      if (ext === 'mp3') assert.ok(head[0] === 0xff && (head[1] & 0xe0) === 0xe0, 'mp3 frame sync ' + p)
    }
  })
  it('dist rpk(있으면): manifest·사운드 포함', () => {
    const dist = path.join(ROOT, 'dist')
    const rpks = existsSync(dist) ? readdirSync(dist).filter((f) => f.endsWith('.rpk')) : []
    if (!rpks.length) return
    for (const r of rpks) {
      const list = execFileSync('unzip', ['-Z1', path.join(dist, r)], { encoding: 'utf8' })
      assert.ok(list.includes('manifest.json'), r)
      for (const uri of Object.values(SOUNDS)) assert.ok(list.includes(uri.slice(1)), r + ' ' + uri)
    }
  })
})
