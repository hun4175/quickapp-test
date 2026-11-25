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
import { SETUP_ROWS, SETUP_START_X, setupHit } from '../src/common/timer.js'
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.pomodoro')
    assert.equal(manifest.name, '뽀모도로')
    assert.equal(manifest.versionName, '0.1.6')
    assert.equal(manifest.versionCode, 7)
    assert.equal(pkg.version, '0.1.6')
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

  it('설정은 같은 페이지 안의 독립 뷰: START 로 시작, 타이머 길게 누르면 설정으로', () => {
    const c = stripComments(ux)
    assert.ok(ux.includes('ontouchstart="onTouchStart"'))
    assert.ok(ux.includes('ontouchend="onTouchEnd"'))
    assert.ok(ux.includes(`<div class="view" if="{{view === 'setup'}}">`))
    assert.ok(ux.includes(`<div class="view" if="{{view === 'timer'}}">`))
    assert.ok(c.includes('beginSession()'))
    assert.ok(c.includes('onToggle()'))
    assert.ok(c.includes('toggleRepeat('))
    assert.ok(c.includes('scrollSteps('))
    assert.ok(c.includes('stepSetting('))
    // 길게 누르기 → goSetup
    assert.match(c, /_lpTimer = setTimeout\(function \(\) \{[\s\S]*?self\.goSetup\(false\)[\s\S]*?\}, LONGPRESS_MS\)/)
    assert.ok(!/pages\/settings/.test(ux))
    assert.ok(!existsSync(path.join(SRC, 'pages/settings')))
  })

  it('초기화 정책: onInit·onShow·onHide 에서 설정 뷰로, 진행 상태는 저장하지 않는다', () => {
    const c = stripComments(ux)
    const body = (name) => {
      const m = c.match(new RegExp('\\n  ' + name + '\\(\\) \\{([\\s\\S]*?)\\n  \\},'))
      assert.ok(m, name)
      return m[1]
    }
    assert.ok(body('onInit').includes('this.goSetup(false)'))
    assert.ok(body('onShow').includes('this.goSetup(false)'))
    assert.ok(body('onHide').includes('this.goSetup(false)'))
    const g = c.match(/\n  goSetup\(keepVibe\) \{([\s\S]*?)\n  \},/)
    assert.ok(g && g[1].includes('this._state = null') && g[1].includes("this.view = 'setup'"))
    assert.ok(!/saveState|loadState/.test(c))
    const pc = stripComments(persist)
    assert.ok(pc.includes('SETTINGS_KEY'))
    assert.ok(!/serializeState|endAt|running/.test(pc))
  })

  it('시작 애니메이션은 게이지 src 교체(setInterval)이고 CSS 애니메이션은 쓰지 않는다', () => {
    const c = stripComments(ux)
    assert.ok(c.includes('INTRO_FRAME_MS'))
    assert.ok(c.includes('introLit(elapsed)'))
    assert.ok(c.includes('this.applyTimer(0)'))
    assert.ok(!/@keyframes|animation-name|image-animator/.test(c))
  })

  it('구간 종료 진동은 long 3회, keepScreenOn 은 try/catch + require', () => {
    const c = stripComments(ux)
    assert.ok(c.includes("vibrator.vibrate({ mode: 'long' })") || c.includes('vibrator.vibrate({ mode: "long" })'))
    assert.ok(/setKeepScreenOn/.test(c))
    assert.ok(/try\s*\{/.test(c))
    assert.ok(c.includes("require('@system.brightness')"))
    assert.ok(ux.includes('keepScreenOn: !!on') || ux.includes('keepScreenOn: true'))
  })

  it('오버레이 CSS 좌표는 scripts/booster-layout.json 과 같다', () => {
    const layout = JSON.parse(readFileSync(path.join(ROOT, 'scripts/booster-layout.json'), 'utf8'))
    const map = { '.label': 'label', '.dm1': 'm', '.dm2': 'm2', '.colon': 'colon', '.ds1': 's', '.ds2': 's2' }
    for (const [sel, key] of Object.entries(map)) {
      const v = layout[key]
      const block = sel + ' {\n  position: absolute;\n  left: ' + v.left + 'px;\n  top: ' + v.top + 'px;\n  width: ' + v.width + 'px;\n  height: ' + v.height + 'px;\n}'
      assert.ok(ux.includes(block), sel)
    }
  })

  it('부스터 게이지는 단일 image src 교체이고, 프레임 g00~g36과 숫자·라벨 PNG가 있다', () => {
    const c = stripComments(ux)
    assert.ok(ux.includes('<image class="gauge" src="{{gaugeSrc}}"></image>'))
    assert.equal((ux.match(/src="\{\{gaugeSrc\}\}"/g) || []).length, 1)
    for (const k of ['labelSrc', 'm1Src', 'm2Src', 's1Src', 's2Src']) {
      assert.ok(ux.includes('src="{{' + k + '}}"'), k)
    }
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
    for (const f of ['colon', 'focus', 'rest']) {
      assert.ok(files.includes(f + '.png'), f)
    }
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-booster.py')))
    assert.ok(existsSync(path.join(ROOT, 'docs/booster-design/v11/gen_v11.py')))
    assert.ok(existsSync(path.join(SRC, 'common/logo.png')))
    assert.ok(!files.some((f) => f.startsWith('hint-')))
  })

  it('설정 화면 리소스와 CSS 좌표는 scripts/setup-layout.json 과 같다', () => {
    const layout = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-layout.json'), 'utf8'))
    for (const [key, v] of Object.entries(layout)) {
      const block = '.st-' + key.toLowerCase() + ' {\n  position: absolute;\n  left: ' + v.left + 'px;\n  top: ' + v.top + 'px;\n  width: ' + v.width + 'px;\n  height: ' + v.height + 'px;\n}'
      assert.ok(ux.includes(block), key)
      assert.ok(ux.includes('class="st-' + key.toLowerCase() + '"'), key + ' 노드')
    }
    const files = readdirSync(path.join(SRC, 'common/setup'))
    for (const p of ['f', 'r', 'n']) {
      for (const d of '0123456789') assert.ok(files.includes(p + d + '.png'), p + d)
    }
    for (const f of ['bg', 'tog-on', 'tog-off']) assert.ok(files.includes(f + '.png'), f)
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-setup.py')))
  })

  it('설정 화면 터치 영역은 그려진 위치와 겹친다(숫자=값 줄, 토글=REPEAT 줄, 버튼=START)', () => {
    const L = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-layout.json'), 'utf8'))
    const mid = (v) => [v.left + v.width / 2, v.top + v.height / 2]
    for (const k of ['f1', 'f2', 'fPrev1', 'fNext2']) assert.equal(setupHit(...mid(L[k])), 'focus', k)
    for (const k of ['r1', 'r2', 'rPrev1', 'rNext2']) assert.equal(setupHit(...mid(L[k])), 'break', k)
    assert.equal(setupHit(...mid(L.tog)), 'repeat')
    const gen = readFileSync(path.join(ROOT, 'scripts/gen-setup.py'), 'utf8')
    const btn = gen.match(/^BTN = \((\d+), (\d+), (\d+), (\d+)\)/m).slice(1).map(Number)
    assert.ok(btn[1] >= SETUP_ROWS.start[0] && btn[0] >= SETUP_START_X[0] && btn[2] <= SETUP_START_X[1])
    assert.equal(setupHit((btn[0] + btn[2]) / 2, (btn[1] + btn[3]) / 2), 'start')
  })
})
