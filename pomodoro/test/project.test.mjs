import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { FRAMES, pad2 } from '../src/common/timer.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'src')
const ux = readFileSync(path.join(SRC, 'pages/index/index.ux'), 'utf8')
const app = readFileSync(path.join(SRC, 'app.ux'), 'utf8')
const timer = readFileSync(path.join(SRC, 'common/timer.js'), 'utf8')
const persist = readFileSync(path.join(SRC, 'common/persist.js'), 'utf8')
const manifest = JSON.parse(readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.pomodoro')
    assert.equal(manifest.name, '뽀모도로')
    assert.equal(manifest.versionName, '0.1.0')
    assert.equal(manifest.versionCode, 1)
    assert.ok(manifest.deviceTypeList.includes('watch'))
    assert.deepEqual(
      manifest.features.map((f) => f.name).sort(),
      ['system.brightness', 'system.storage', 'system.vibrator']
    )
    assert.equal(manifest.router.entry, 'pages/index')
    assert.deepEqual(Object.keys(manifest.router.pages), ['pages/index'])
  })

  it('index.ux 가 import 한 system 모듈은 manifest 에 선언됨', () => {
    for (const m of ux.matchAll(/from '@(system\.\w+)'/g)) {
      assert.ok(
        manifest.features.some((f) => f.name === m[1]),
        'missing feature ' + m[1]
      )
    }
  })

  it('소리·audio·muted·볼륨·router 이동을 쓰지 않는다', () => {
    for (const [name, code] of [
      ['index.ux', ux],
      ['app.ux', app],
      ['timer.js', timer],
      ['persist.js', persist]
    ]) {
      const c = stripComments(code)
      assert.ok(!/@system\.audio|\baudio\b/.test(c), name + ': audio')
      assert.ok(!/\bmuted\b/.test(c), name + ': muted')
      assert.ok(!/\.volume\s*=/.test(c), name + ': volume 쓰기')
      assert.ok(!/system\.volume|setMediaValue|getMediaValue/.test(c), name + ': volume API')
      assert.ok(!/@system\.router|router\.push|router\.replace/.test(c), name + ': router')
    }
    assert.ok(!manifest.features.some((f) => f.name === 'system.audio'))
    assert.ok(!manifest.features.some((f) => f.name === 'system.volume'))
    assert.ok(!manifest.features.some((f) => f.name === 'system.router'))
  })

  it('조작은 탭 토글과 길게 눌러 리셋, 설정 화면이 없다', () => {
    assert.ok(ux.includes('ontouchstart="onTouchStart"'))
    assert.ok(ux.includes('ontouchend="onTouchEnd"'))
    assert.ok(ux.includes('onToggle()'))
    assert.ok(ux.includes('onReset()'))
    assert.ok(ux.includes('this._state = reset()'))
    assert.ok(!/pages\/settings/.test(ux))
    assert.ok(!existsSync(path.join(SRC, 'pages/settings')))
  })

  it('구간 종료 진동은 long 3회, keepScreenOn 은 try/catch', () => {
    const c = stripComments(ux)
    assert.ok(c.includes("vibrator.vibrate({ mode: 'long' })") || c.includes('vibrator.vibrate({ mode: "long" })'))
    assert.ok(/setKeepScreenOn/.test(c))
    assert.ok(/try\s*\{/.test(c))
    assert.ok(c.includes("require('@system.brightness')"))
    assert.ok(ux.includes('keepScreenOn: !!on') || ux.includes('keepScreenOn: true'))
  })

  it('링 프레임 60x2 가 있고 생성 스크립트가 있다', () => {
    const dir = path.join(SRC, 'common/rings')
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-rings.py')))
    for (const kind of ['focus', 'break']) {
      for (let i = 0; i < FRAMES; i++) {
        const p = path.join(dir, kind + '-' + pad2(i) + '.png')
        assert.ok(existsSync(p), p)
        assert.ok(statSync(p).size > 100, p + ' too small')
      }
    }
    const extras = readdirSync(dir).filter((n) => n.endsWith('.png'))
    assert.equal(extras.length, FRAMES * 2)
    assert.ok(existsSync(path.join(SRC, 'common/logo.png')))
  })

  it('시작 프레임이 끝 프레임보다 색 픽셀이 많다(가득 → 비움)', () => {
    const script = [
      'from PIL import Image',
      'from pathlib import Path',
      'import sys',
      'def count(p):',
      '    n=0',
      '    im=Image.open(p).convert("RGBA")',
      '    for pix in im.getdata():',
      '        if pix[3]>40 and pix[0]+pix[1]+pix[2]>200: n+=1',
      '    return n',
      'a=count(sys.argv[1]); b=count(sys.argv[2]); print(a, b);',
      'raise SystemExit(0 if a>b*2 else 1)'
    ].join('\n')
    const a = path.join(SRC, 'common/rings/focus-00.png')
    const b = path.join(SRC, 'common/rings/focus-59.png')
    const out = execFileSync('python3', ['-c', script, a, b], { encoding: 'utf8' })
    const parts = out.trim().split(/\s+/).map(Number)
    assert.ok(parts[0] > parts[1] * 2, 'focus-00 should have far more color pixels than focus-59: ' + out)
  })
})
