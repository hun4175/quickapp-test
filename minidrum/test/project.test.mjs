import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PADS } from '../src/common/drum.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'src')
const ux = readFileSync(path.join(SRC, 'pages/index/index.ux'), 'utf8')
const manifest = JSON.parse(readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))

/** 16bit PCM 모노 WAV 파싱 (RIFF 청크 순회) */
function readWav(p) {
  const b = readFileSync(p)
  assert.equal(b.toString('latin1', 0, 4), 'RIFF')
  assert.equal(b.toString('latin1', 8, 12), 'WAVE')
  let off = 12
  let fmt = null
  let data = null
  while (off + 8 <= b.length) {
    const id = b.toString('latin1', off, off + 4)
    const size = b.readUInt32LE(off + 4)
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(off + 8), ch: b.readUInt16LE(off + 10), sr: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) }
    if (id === 'data') data = b.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size & 1)
  }
  return { fmt, data, size: b.length }
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.minidrum')
    assert.equal(manifest.versionName, '0.1.0')
    assert.equal(manifest.versionCode, 1)
    assert.deepEqual(manifest.features.map((f) => f.name).sort(), ['system.audio', 'system.vibrator'])
  })
  it('index.ux: 4개 패드가 touchstart 로 hitN 호출, click 미사용', () => {
    PADS.forEach((p, i) => {
      assert.ok(ux.includes(`ontouchstart="hit${i}"`), 'pad ' + i)
      assert.ok(ux.includes(`hit${i}() {\n    this.hit(${i})`), 'method ' + i)
      assert.ok(ux.includes(`{{bg${i}}}`), 'bg ' + i)
      assert.ok(ux.includes(`>${p.label}</text>`), 'label ' + i)
    })
    assert.ok(!/class="pad[^"]*"[^>]*onclick=/.test(ux), '패드에 onclick 없음')
    assert.ok(!/@keyframes|animation-name/.test(ux), '애니메이션 없음')
  })
  it('index.ux: import 한 모듈은 manifest 에 선언됨', () => {
    for (const m of ux.matchAll(/from '@(system\.\w+)'/g)) {
      assert.ok(manifest.features.some((f) => f.name === m[1]), m[1])
    }
  })
  it('사운드: 16kHz 모노 16bit PCM, 길이 목표, 앞부분 무음 없음, 작음', () => {
    const want = { kick: 0.25, snare: 0.2, hihat: 0.08, crash: 0.6 }
    for (const p of PADS) {
      const w = readWav(path.join(SRC, p.src))
      assert.deepEqual(w.fmt, { format: 1, ch: 1, sr: 16000, bits: 16 }, p.id)
      const n = w.data.length / 2
      assert.ok(Math.abs(n / 16000 - want[p.id]) < 0.005, p.id + ' 길이 ' + n / 16000)
      // 첫 1ms(16샘플) 안에 -20dBFS 이상 신호
      let peak = 0
      for (let k = 0; k < 16; k++) peak = Math.max(peak, Math.abs(w.data.readInt16LE(k * 2)))
      assert.ok(peak > 3276, p.id + ' 앞부분 무음 ' + peak)
      assert.ok(w.size < 32 * 1024, p.id + ' size ' + w.size)
    }
  })
  it('dist rpk(있으면): manifest·사운드 포함, 원본과 바이트 동일', () => {
    const dist = path.join(ROOT, 'dist')
    const rpks = existsSync(dist) ? readdirSync(dist).filter((f) => f.endsWith('.rpk')) : []
    if (!rpks.length) return
    for (const r of rpks) {
      const rp = path.join(dist, r)
      const list = execFileSync('unzip', ['-Z1', rp], { encoding: 'utf8' }).split('\n')
      assert.ok(list.includes('manifest.json'), r)
      const mf = JSON.parse(execFileSync('unzip', ['-p', rp, 'manifest.json'], { encoding: 'utf8' }))
      assert.equal(mf.package, 'com.hun4175.minidrum')
      for (const p of PADS) {
        const inner = p.src.slice(1)
        assert.ok(list.includes(inner), r + ' ' + inner)
        const got = execFileSync('unzip', ['-p', rp, inner], { maxBuffer: 1 << 20 })
        assert.ok(got.equals(readFileSync(path.join(SRC, p.src))), inner + ' 바이트 동일')
      }
    }
  })
})
