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
import { SETUP_ZONES, SETUP_BARS, BAR_BOTTOM, setupHit, barLevel, setupViewModel } from '../src/common/timer.js'
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('프로젝트 구성', () => {
  it('manifest: 패키지명·버전·feature', () => {
    assert.equal(manifest.package, 'com.hun4175.pomodoro')
    assert.equal(manifest.name, 'BOOST')
    assert.equal(manifest.versionName, '0.1.8')
    assert.equal(manifest.versionCode, 9)
    assert.equal(pkg.version, '0.1.8')
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
    for (const fn of ['setupTouchStart(', 'setupTouchMove(', 'setupTouchEnd(', 'setupGestureUi(']) assert.ok(c.includes(fn), fn)
    // 좌우 끌기(0.1.6)는 없앴다
    assert.ok(!/scrollSteps|tapSide|SCROLL_STEP_PX/.test(c + stripComments(timer)))
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

  it('앱 아이콘 logo.png 는 확정 시안 A SECTOR(docs/icon-design/A/icon-192.png)와 바이트 동일', () => {
    assert.equal(manifest.icon, '/common/logo.png')
    const logo = readFileSync(path.join(SRC, 'common/logo.png'))
    const iconA = readFileSync(path.join(ROOT, 'docs/icon-design/A/icon-192.png'))
    assert.ok(logo.equals(iconA))
    // PNG IHDR 폭·높이 = 192x192
    assert.equal(logo.readUInt32BE(16), 192)
    assert.equal(logo.readUInt32BE(20), 192)
  })

  it('설정 화면 리소스와 CSS 좌표는 scripts/setup-layout.json(= 디자인 패키지 layout.json) 과 같다', () => {
    const layout = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-layout.json'), 'utf8'))
    const pkgLayout = JSON.parse(readFileSync(path.join(ROOT, 'docs/booster-design/setup-final-thermo/layout.json'), 'utf8'))
    assert.deepEqual(layout, pkgLayout)
    for (const [key, v] of Object.entries(layout)) {
      const block = '.st-' + key.toLowerCase() + ' {\n  position: absolute;\n  left: ' + v.left + 'px;\n  top: ' + v.top + 'px;\n  width: ' + v.width + 'px;\n  height: ' + v.height + 'px;\n}'
      assert.ok(ux.includes(block), key)
      assert.equal((ux.match(new RegExp('class="st-' + key.toLowerCase() + '"', 'g')) || []).length, 1, key + ' 노드')
    }
    // 리소스는 정확히 52장(0.1.6 의 이웃 값 n0~n9 등은 없음)
    const files = readdirSync(path.join(SRC, 'common/setup')).sort()
    const want = ['bg', 'tog-on', 'tog-off', 'start-on', 'fHot', 'rHot']
    for (const p of ['f', 'r']) {
      for (const d of '0123456789') want.push(p + d)
      for (const x of ['Up-on', 'Dn-on', 'Up-off', 'Dn-off']) want.push(p + x)
    }
    for (let k = 1; k <= 6; k++) want.push('fg0' + k + 'm')
    want.push('fg06')
    for (let k = 1; k <= 10; k++) want.push('rg' + String(k).padStart(2, '0') + 'm')
    want.push('rg10')
    assert.deepEqual(files, want.map((f) => f + '.png').sort())
    assert.equal(files.length, 52)
    // ux 에 적힌 /common/setup/ 경로와 viewModel 이 만드는 경로가 모두 실제 파일
    const refs = new Set([...ux.matchAll(/\/common\/setup\/([\w-]+\.png)/g)].map((m) => m[1]))
    for (const [f, b, r] of [[5, 1, true], [25, 5, false], [35, 12, true], [60, 30, true]]) {
      const v = setupViewModel({ focusMs: f * 60000, breakMs: b * 60000, repeat: r })
      for (const val of Object.values(v)) if (typeof val === 'string' && val.startsWith('/common/setup/')) refs.add(val.slice(14))
    }
    for (const f of refs) assert.ok(files.includes(f), f)
    // 막대 묶음 노드는 같은 파일을 쓰고 top 만 묶음 간격(집중 6x26, 휴식 10x10)만큼 다르다
    assert.equal(layout.fBar0.top - layout.fBar1.top, 6 * SETUP_BARS.focus.pitch)
    assert.equal(layout.rBar0.top - layout.rBar1.top, 10 * SETUP_BARS.break.pitch)
    assert.equal(layout.rBar1.top - layout.rBar2.top, 10 * SETUP_BARS.break.pitch)
    assert.ok(existsSync(path.join(ROOT, 'scripts/gen-setup.py')))
    const gen = readFileSync(path.join(ROOT, 'scripts/gen-setup.py'), 'utf8')
    assert.ok(gen.includes('import gen_setup_thermo as T'))
    // 디자인 패키지 생성기는 setup-v3(미커밋 시안)에 기대지 않는다
    const thermo = readFileSync(path.join(ROOT, 'docs/booster-design/setup-final-thermo/gen_setup_thermo.py'), 'utf8')
    assert.ok(!/import gen_setup_v3|"setup-v3"\)\)/.test(thermo))
    assert.ok(existsSync(path.join(ROOT, 'docs/booster-design/setup-final-thermo/thermo_draw.py')))
  })

  it('설정 화면 터치 영역·막대 칸 경계는 touch-zones.json 그대로', () => {
    const tz = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-touch-zones.json'), 'utf8'))
    const pkgTz = JSON.parse(readFileSync(path.join(ROOT, 'docs/booster-design/setup-final-thermo/touch-zones.json'), 'utf8'))
    assert.deepEqual(tz, pkgTz)
    assert.deepEqual(SETUP_ZONES, tz.zones)
    assert.equal(BAR_BOTTOM, tz.barMapping.barBottom)
    assert.equal(tz.check.ok, true)
    // 영역 안 모든 점(4px 격자)이 그 영역(부모는 자식)으로 판정된다
    for (const [name, z] of Object.entries(tz.zones)) {
      const kids = tz['parents(parent contains these tap sub-zones)'][name]
      for (let x = z[0]; x < z[2]; x += 4) {
        for (let y = z[1]; y < z[3]; y += 4) {
          const hit = setupHit(x, y)
          if (kids) assert.ok(kids.includes(hit), name + ' ' + x + ',' + y + ' → ' + hit)
          else assert.equal(hit, name, x + ',' + y)
        }
      }
    }
    // x<30 과 영역 밖은 null
    for (let y = 0; y < 514; y += 2) assert.equal(setupHit(29, y), null)
    // 칸별 y 범위(bands) 의 모든 0.5px 점이 그 칸 값으로
    const check = (which, bands, unit) => {
      assert.equal(bands.length, SETUP_BARS[which].levels)
      for (const b of bands) {
        for (let y = b.y0; y < b.y1; y += 0.5) assert.equal(barLevel(which, y) * unit, b.value, which + ' y=' + y)
      }
    }
    check('focus', tz.barMapping.focusBands, 5)
    check('break', tz.barMapping.restBands, 1)
  })

  it('설정 화면 터치 영역은 그려진 위치와 겹친다(숫자·막대·토글·START)', () => {
    const L = JSON.parse(readFileSync(path.join(ROOT, 'scripts/setup-layout.json'), 'utf8'))
    const ov = (v, z) => v.left < z[2] && z[0] < v.left + v.width && v.top < z[3] && z[1] < v.top + v.height
    const Z = SETUP_ZONES
    for (const k of ['f1', 'f2']) assert.ok(ov(L[k], Z.focusNum), k)
    for (const k of ['r1', 'r2']) assert.ok(ov(L[k], Z.restNum), k)
    for (const k of ['fBar0', 'fBar1']) assert.ok(ov(L[k], Z.focusBar), k)
    for (const k of ['rBar0', 'rBar1', 'rBar2']) assert.ok(ov(L[k], Z.restBar), k)
    assert.ok(ov(L.fUp, Z.focusNumUp) && ov(L.fDn, Z.focusNumDown))
    assert.ok(ov(L.rUp, Z.restNumUp) && ov(L.rDn, Z.restNumDown))
    assert.ok(ov(L.tog, Z.repeat))
    assert.ok(ov(L.start, Z.start))
  })
})
