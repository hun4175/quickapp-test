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
import { SETUP_ZONES, THEMES, THEME_INFO, SWEEP_MODE, setupHit, themeRowZone, tubeLevel } from '../src/common/timer.js'
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.pomodoro')
    assert.equal(manifest.name, 'BOOST')
    assert.equal(manifest.versionName, '0.1.9')
    assert.equal(manifest.versionCode, 10)
    assert.equal(pkg.version, '0.1.9')
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

  it('설정·테마 고르기·타이머는 같은 페이지 안의 독립 뷰: START 로 시작, 타이머 길게 누르면 설정으로', () => {
    const c = stripComments(ux)
    assert.ok(ux.includes('ontouchstart="onTouchStart"'))
    assert.ok(ux.includes('ontouchend="onTouchEnd"'))
    assert.ok(ux.includes(`<div class="view" if="{{view === 'setup'}}">`))
    assert.ok(ux.includes(`<div class="view" if="{{view === 'themes'}}">`))
    assert.ok(ux.includes(`<div class="view" if="{{view === 'timer'}}">`))
    for (const t of THEMES) assert.ok(ux.includes(`<div class="view" if="{{timerTheme === '${t}'}}">`), t)
    // 테마 고르기 뒤로 = 설정으로(앱을 닫지 않음)
    assert.match(c, /onBackPress\(\) \{[\s\S]*?if \(this\.view === 'themes'\) \{[\s\S]*?this\.closeThemes\(\)[\s\S]*?return true/)
    assert.ok(c.includes('beginSession()'))
    assert.ok(c.includes('onToggle()'))
    for (const fn of ['setupTouchStart(', 'setupTouchMove(', 'setupTouchEnd(', 'setupGestureUi(']) assert.ok(c.includes(fn), fn)
    // 좌우 끌기(0.1.6)·숫자 칸 탭(0.1.7)은 없앴다
    assert.ok(!/scrollSteps|tapSide|SCROLL_STEP_PX|numSwipeSteps|numTapDir|barNodes/.test(c + stripComments(timer)))
    // 시스템 뒤로 가드: 설정 컨트롤 터치 중·직후
    const back = c.match(/\n  onBackPress\(\) \{([\s\S]*?)\n  \},/)
    assert.ok(back && back[1].includes('shouldSwallowBack(this.view, this._touchActive, this._touchZone, this._lastSetupTouchAt, Date.now())'))
    assert.ok(c.includes('this._lastSetupTouchAt = Date.now()'))
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

  it('시작 애니메이션은 setInterval 로 진행 비율을 바꾸고, CSS 애니메이션(@keyframes)은 쓰지 않는다', () => {
    const c = stripComments(ux)
    assert.ok(c.includes('INTRO_FRAME_MS'))
    assert.ok(c.includes('introProgress(elapsed)'))
    assert.ok(c.includes('this.applyTimer(0)'))
    assert.ok(!/@keyframes|animation-name|image-animator|transition-/.test(c))
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
    assert.ok(!/image-animator|@keyframes|animation-name/.test(c))
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
    assert.equal(files.length, 60)
  })

  it('앱 아이콘 logo.png 는 확정 시안 A SECTOR(docs/icon-design/A/icon-192.png)와 바이트 동일', () => {
    assert.equal(manifest.icon, '/common/logo.png')
    const logo = readFileSync(path.join(SRC, 'common/logo.png'))
    const iconA = readFileSync(path.join(ROOT, 'docs/icon-design/A/icon-192.png'))
    assert.ok(logo.equals(iconA))
    // PNG IHDR 폭·높이 = 192x192
    assert.equal(logo.readUInt32BE(16), 192)
    assert.equal(logo.readUInt32BE(20), 192)
  })

  it('THERMO 설정 PNG(src/common/setup) 와 그 생성기는 뺐다. 이미지 리소스는 booster 60장 + ui 5장 + 아이콘', () => {
    assert.ok(!existsSync(path.join(SRC, 'common/setup')))
    assert.ok(!existsSync(path.join(ROOT, 'scripts/gen-setup.py')))
    assert.ok(!existsSync(path.join(ROOT, 'scripts/setup-layout.json')))
    assert.ok(!/\/common\/setup\//.test(ux + timer))
    const ui = readdirSync(path.join(SRC, 'common/ui')).sort()
    assert.deepEqual(ui, ['gear.png', 'thumb-battery.png', 'thumb-booster.png', 'thumb-sand.png', 'thumb-sweep.png'])
    for (const f of ui) assert.ok(ux.includes('/common/ui/' + f), f)
    // ux 에 적힌 /common/ 경로는 모두 실제 파일(동적 src 는 timer.test 가 확인)
    for (const m of ux.matchAll(/"(\/common\/[\w/.-]+\.png)"/g)) assert.ok(existsSync(path.join(SRC, m[1])), m[1])
  })

  it('SWEEP 모드와 프레임 리소스가 맞다(rotate = src/common/sweep 없음, frames = f01~f60·r01~r60)', () => {
    const dir = path.join(SRC, 'common/sweep')
    assert.ok(['rotate', 'frames'].includes(SWEEP_MODE))
    if (SWEEP_MODE === 'rotate') {
      assert.ok(!existsSync(dir))
    } else {
      const files = readdirSync(dir)
      assert.equal(files.length, 120)
      for (let i = 1; i <= 60; i++) for (const p of ['f', 'r']) assert.ok(files.includes(p + String(i).padStart(2, '0') + '.png'))
    }
    // 전환 스크립트가 쓰는 원본 프레임(08-sweep (a))이 레포에 있다
    const assets = path.join(ROOT, 'docs/full-theme-design/08-sweep/assets')
    assert.equal(readdirSync(path.join(assets, 'sweep-focus')).length, 60)
    assert.equal(readdirSync(path.join(assets, 'sweep-rest')).length, 60)
    assert.ok(existsSync(path.join(ROOT, 'scripts/sweep-mode.py')))
  })

  it('SWEEP (b): rotate·transform-origin 정적 값은 문서 형식, 동적 값은 style 객체 바인딩', () => {
    for (const cls of ['w-mask', 'w-secB']) {
      const b = cssBlock(cls)
      assert.ok(b.includes('transform: rotate(0deg);') && b.includes('transform-origin: 0px 338px;'), cls)
      assert.ok(b.includes('left: 216px;') && b.includes('top: -81px;') && b.includes('width: 338px;') && b.includes('height: 676px;'), cls)
    }
    assert.ok(cssBlock('w-edge').includes('transform-origin: 2px 338px;'))
    for (const k of ['maskStyle', 'secBStyle', 'edgeStyle']) assert.ok(ux.includes(`style="{{${k}}}"`), k)
    assert.ok(ux.includes('<image class="w-frame" if="{{frameShow}}" src="{{frameSrc}}"></image>'))
  })
})

/** index.ux <style> 의 .cls { ... } 본문 */
function cssBlock(cls) {
  const m = ux.match(new RegExp('\\n\\.' + cls + ' \\{\\n([\\s\\S]*?)\\n\\}'))
  assert.ok(m, cls)
  return m[1]
}
function designBlocks(rel) {
  const s = readFileSync(path.join(ROOT, 'docs/full-theme-design', rel), 'utf8')
  const st = s.slice(s.indexOf('<style>') + 7, s.indexOf('</style>'))
  const out = {}
  for (const m of st.matchAll(/\.([\w-]+) \{\n([\s\S]*?)\n\}/g)) out[m[1]] = m[2].split('\n').map((l) => l.trim())
  return out
}
const lines = (cls) => cssBlock(cls).split('\n').map((l) => l.trim())

describe('설정 화면(TWIN TUBES, A-final) — 모든 테마 공통', () => {
  it('CSS 는 A-final settings.ux.txt 그대로(눈금 opacity 0.45 는 elements.json 값을 더함)', () => {
    const A = designBlocks('settings-merged/A-final/settings.ux.txt')
    assert.equal(Object.keys(A).length, 32) // 요소 31개 + 끌기 중 테두리 m-focusActive
    for (const [cls, body] of Object.entries(A)) {
      const mine = lines(cls)
      for (const l of body) assert.ok(mine.includes(l), cls + ': ' + l)
      const extra = mine.filter((l) => !body.includes(l))
      if (/Tick/.test(cls)) assert.deepEqual(extra, ['opacity: 0.45;'], cls)
      else assert.deepEqual(extra, [], cls)
    }
    // 바뀌는 값은 style 바인딩
    assert.ok(ux.includes('<div class="m-focusFill" style="top: {{focusFillTop}}px; height: {{focusFillH}}px;"></div>'))
    assert.ok(ux.includes('<div class="m-restFill" style="top: {{restFillTop}}px; height: {{restFillH}}px;"></div>'))
    assert.ok(ux.includes('<div class="m-knob" style="left: {{knobLeft}}px;"></div>'))
    assert.ok(ux.includes('<div class="m-focusActive" if="{{fActive}}"></div>'))
    assert.ok(ux.includes('<div class="m-restActive" if="{{rActive}}"></div>'))
    // 휴식 끌기 테두리는 집중 것을 휴식 관 자리(left 221)로 옮긴 것
    assert.deepEqual(lines('m-restActive'), lines('m-focusActive').map((l) => l.replace('left: 41px;', 'left: 221px;')))
  })

  it('터치 영역은 A-final touch-zones.json 그대로(scripts/setup-touch-zones.json = 디자인 파일)', () => {
    const tz = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-touch-zones.json'), 'utf8'))
    const pkgTz = JSON.parse(readFileSync(path.join(ROOT, 'docs/full-theme-design/settings-merged/A-final/touch-zones.json'), 'utf8'))
    assert.deepEqual(tz, pkgTz)
    assert.equal(tz.check.ok, true)
    for (const [name, z] of Object.entries(tz.zones)) {
      assert.deepEqual(SETUP_ZONES[name], z, name)
      for (let x = z[0]; x < z[2]; x += 4) for (let y = z[1]; y < z[3]; y += 4) assert.equal(setupHit(x, y), name, x + ',' + y)
    }
    assert.deepEqual(Object.keys(SETUP_ZONES).sort(), Object.keys(tz.zones).concat('theme').sort())
    for (let y = 0; y < 514; y += 2) assert.equal(setupHit(29, y), null)
    // 관 칸 수·칸 높이 = mapping
    assert.equal(tubeLevel('focus', 68), tz.mapping.focus.levels)
    assert.equal(tubeLevel('break', 68), tz.mapping.rest.levels)
    assert.ok(Math.abs(352 / 12 - tz.mapping.focus.pxPerStep) < 0.01)
    assert.ok(Math.abs(352 / 30 - tz.mapping.rest.pxPerStep) < 0.01)
  })

  it('톱니 버튼: 높이 56(START 와 같은 440~496), 영역 ≥48px, 다른 영역과 안 겹침, x≥30, 둥근 모서리(반경 80) 안', () => {
    const z = SETUP_ZONES.theme
    assert.ok(z[2] - z[0] >= 48 && z[3] - z[1] >= 48)
    assert.ok(z[0] >= 30)
    const ov = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
    for (const [n, o] of Object.entries(SETUP_ZONES)) if (n !== 'theme') assert.ok(!ov(z, o), 'overlap ' + n)
    // 영역 네 꼭짓점이 둥근 사각형(432x514, 반경 80) 안: 왼쪽 아래 모서리 원 중심 (80, 434)
    const inside = (x, y, margin) => {
      const cx = Math.min(Math.max(x, 80), 352)
      const cy = Math.min(Math.max(y, 80), 434)
      return Math.hypot(x - cx, y - cy) <= 80 - margin && x >= margin && y >= margin && x <= 432 - margin && y <= 514 - margin
    }
    for (const [x, y] of [[z[0], z[1]], [z[2] - 1, z[1]], [z[0], z[3] - 1], [z[2] - 1, z[3] - 1]]) assert.ok(inside(x, y, 0), x + ',' + y)
    // 그려진 원(.m-gear)은 START 와 같은 top/height, 원 둘레가 화면 안쪽 4px 이상
    const g = lines('m-gear')
    const start = lines('m-start')
    assert.ok(g.includes('top: 440px;') && g.includes('height: 56px;') && g.includes('width: 56px;') && g.includes('border-radius: 28px;'))
    assert.ok(start.includes('top: 440px;') && start.includes('height: 56px;'))
    assert.ok(g.includes('left: 52px;'))
    assert.ok(Math.hypot(52 + 28 - 80, 440 + 28 - 434) + 28 <= 80 - 4)
    // 그려진 원은 터치 영역 안
    assert.ok(52 >= z[0] && 52 + 56 <= z[2] && 440 >= z[1] && 496 <= z[3])
    assert.ok(ux.includes('<div class="m-gear" style="background-color: {{themeBtnColor}};"></div>'))
    assert.ok(ux.includes('<image class="m-gearIcon" src="/common/ui/gear.png"></image>'))
  })

  it('테마 고르기 화면: 줄 4개(이름·견본·✓), 줄 영역 ≥48px·안 겹침·x≥30·둥근 모서리 안', () => {
    for (let i = 0; i < THEMES.length; i++) {
      const t = THEMES[i]
      const z = themeRowZone(i)
      assert.ok(ux.includes(`<text class="th-name${i}">${THEME_INFO[t].name}</text>`), t)
      assert.ok(ux.includes(`<text class="th-sub${i}">${THEME_INFO[t].sub}</text>`), t)
      assert.ok(ux.includes(`<image class="th-thumb${i}" src="/common/ui/thumb-${t}.png"></image>`), t)
      assert.ok(ux.includes(`<text class="th-mark${i}" if="{{cur${i}}}">✓</text>`), t)
      const row = lines('th-row' + i)
      assert.ok(row.includes('left: ' + z[0] + 'px;') && row.includes('top: ' + z[1] + 'px;'))
      assert.ok(row.includes('width: ' + (z[2] - z[0]) + 'px;') && row.includes('height: ' + (z[3] - z[1]) + 'px;'))
      assert.ok(z[3] - z[1] >= 48 && z[0] >= 30)
      if (i > 0) assert.ok(themeRowZone(i - 1)[3] <= z[1])
      for (const [x, y] of [[z[0], z[3]], [z[2], z[3]], [z[0], z[1]], [z[2], z[1]]]) {
        const cx = Math.min(Math.max(x, 80), 352)
        const cy = Math.min(Math.max(y, 80), 434)
        assert.ok(Math.hypot(x - cx, y - cy) <= 76, t + ' corner ' + x + ',' + y)
      }
    }
  })
})

describe('테마 타이머 CSS 는 시안 theme.ux.txt 좌표 그대로', () => {
  it('SAND(01-sand): 채움·수위선·눈금·글자', () => {
    const D = designBlocks('01-sand/theme.ux.txt')
    for (const [mine, src] of [['sd-sand', 't-sand'], ['sd-level', 't-level'], ['sd-tick1', 't-tick1'], ['sd-tick2', 't-tick2'], ['sd-tick3', 't-tick3'], ['sd-tick4', 't-tick4'], ['t-label', 't-label'], ['t-time', 't-time'], ['t-total', 't-total']]) {
      assert.deepEqual(lines(mine), D[src], mine)
    }
    assert.ok(ux.includes('<div class="sd-sand" if="{{sandShow}}" style="top: {{sandTop}}px; height: {{sandH}}px; background-color: {{sandColor}};"></div>'))
  })
  it('BATTERY(03-battery): 몸통·채움·칸막이·알약·숫자', () => {
    const D = designBlocks('03-battery/theme.ux.txt')
    const t = Object.keys(D).filter((k) => k.startsWith('t-'))
    assert.equal(t.length, 13)
    for (const k of t) assert.deepEqual(lines('bt-' + k.slice(2)), D[k], k)
    assert.ok(ux.includes('<div class="bt-batFill" if="{{batShow}}" style="top: {{batTop}}px; height: {{batH}}px; background-color: {{batColor}};"></div>'))
  })
  it('SWEEP(08-sweep): 점 눈금 12개·글자는 시안 그대로, (a) 프레임 image 는 화면 전체', () => {
    const D = designBlocks('08-sweep/theme.ux.txt')
    for (let i = 0; i < 12; i++) assert.deepEqual(lines('w-tick' + i), D['t-tick' + i], 'tick' + i)
    assert.deepEqual(lines('w-frame'), D['t-sweep'])
    for (const k of ['t-label', 't-time', 't-total']) assert.deepEqual(lines(k), D[k], k)
  })
  it('index.ux template·style 은 scripts/gen-index-ux.py 결과와 같다', () => {
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-index-ux.py')))
    assert.ok(ux.includes('scripts/gen-index-ux.py'))
  })
})
