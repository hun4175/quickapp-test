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
    assert.equal(manifest.versionName, '0.1.3')
    assert.equal(manifest.versionCode, 4)
    assert.equal(pkg.version, '0.1.3')
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

  it('부스터 게이지는 단일 image src 교체이고, 프레임 g00~g36과 숫자·라벨 PNG가 있다', () => {
    const c = stripComments(ux)
    assert.ok(ux.includes('<image class="gauge" src="{{gaugeSrc}}"></image>'))
    assert.equal((ux.match(/src="\{\{gaugeSrc\}\}"/g) || []).length, 1)
    for (const k of ['labelSrc', 'm1Src', 'm2Src', 's1Src', 's2Src']) {
      assert.ok(ux.includes('src="{{' + k + '}}"'), k)
    }
    assert.ok(ux.includes('if="{{idle}}"'))
    assert.ok(ux.includes('opacity: {{upOpacity}}'))
    assert.ok(ux.includes('opacity: {{downOpacity}}'))
    assert.ok(!/class="sand"|image-animator|@keyframes|animation-name/.test(c))
    const dir = path.join(SRC, 'common/booster')
    const files = readdirSync(dir)
    for (let i = 0; i <= 36; i++) {
      assert.ok(files.includes('g' + String(i).padStart(2, '0') + '.png'), 'g' + i)
    }
    assert.equal(files.filter((f) => /^g\d\d\.png$/.test(f)).length, 37)
    for (const d of '0123456789') {
      assert.ok(files.includes('m' + d + '.png'))
      assert.ok(files.includes('s' + d + '.png'))
    }
    for (const f of ['colon', 'focus', 'rest', 'hint-up', 'hint-text', 'hint-down']) {
      assert.ok(files.includes(f + '.png'), f)
    }
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-booster.py')))
    assert.ok(existsSync(path.join(ROOT, 'docs/booster-design/v9/gen_v9.py')))
    assert.ok(existsSync(path.join(SRC, 'common/logo.png')))
  })
})
