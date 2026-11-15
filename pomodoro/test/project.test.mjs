import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'src')
const ux = readFileSync(path.join(SRC, 'pages/index/index.ux'), 'utf8')
const app = readFileSync(path.join(SRC, 'app.ux'), 'utf8')
const timer = readFileSync(path.join(SRC, 'common/timer.js'), 'utf8')
const persist = readFileSync(path.join(SRC, 'common/persist.js'), 'utf8')
const manifest = JSON.parse(readFileSync(path.join(SRC, 'manifest.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.pomodoro')
    assert.equal(manifest.name, '뽀모도로')
    assert.equal(manifest.versionName, '0.1.1')
    assert.equal(manifest.versionCode, 2)
    assert.equal(pkg.version, '0.1.1')
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

  it('조작은 탭 토글, 길게 눌러 리셋, 대기 중 스와이프 설정. 설정 화면은 없다', () => {
    assert.ok(ux.includes('ontouchstart="onTouchStart"'))
    assert.ok(ux.includes('ontouchend="onTouchEnd"'))
    assert.ok(ux.includes('onToggle()'))
    assert.ok(ux.includes('onReset()'))
    assert.ok(ux.includes('reset(this._state)'))
    assert.ok(stripComments(ux).includes('classifySwipe'))
    assert.ok(stripComments(ux).includes('adjustFocus'))
    assert.ok(!/pages\/settings/.test(ux))
    assert.ok(!existsSync(path.join(SRC, 'pages/settings')))
  })

  it('구간 종료 진동은 long 3회, keepScreenOn 은 try/catch + require', () => {
    const c = stripComments(ux)
    assert.ok(c.includes("vibrator.vibrate({ mode: 'long' })") || c.includes('vibrator.vibrate({ mode: "long" })'))
    assert.ok(/setKeepScreenOn/.test(c))
    assert.ok(/try\s*\{/.test(c))
    assert.ok(c.includes("require('@system.brightness')"))
    assert.ok(ux.includes('keepScreenOn: !!on') || ux.includes('keepScreenOn: true'))
  })

  it('모래시계는 단일 div 높이 바인딩이고, 원형 링 에셋·생성 스크립트는 없다', () => {
    assert.ok(ux.includes('class="sand"'))
    assert.ok(ux.includes('height: {{fillHeight}}px'))
    assert.ok(ux.includes('background-color: {{fillColor}}'))
    assert.ok(!/ringSrc|common\/rings|image-animator|@keyframes/.test(stripComments(ux)))
    assert.ok(!existsSync(path.join(SRC, 'common/rings')))
    assert.ok(!existsSync(path.join(ROOT, 'scripts/gen-rings.py')))
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-preview.py')))
    assert.ok(existsSync(path.join(SRC, 'common/logo.png')))
    const commonFiles = readdirSync(path.join(SRC, 'common'))
    assert.ok(!commonFiles.includes('rings'))
  })
})
