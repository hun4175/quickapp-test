/**
 * index.ux 의 <script> 를 그대로 꺼내 node 에서 페이지 객체로 돌려 보는 시뮬레이션.
 * system 모듈(@system.vibrator / storage / brightness)과 타이머는 가짜로 바꾸고,
 * 손가락 이벤트(touchstart/move/end)를 넣어 화면 데이터(src·if)와 저장·뒤로가기 결과를 확인한다.
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as timer from '../src/common/timer.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ux = readFileSync(path.join(ROOT, 'src/pages/index/index.ux'), 'utf8')
const script = ux.slice(ux.indexOf('<script>') + 8, ux.indexOf('</script>'))
const MIN = 60000

function loadPage(env) {
  let body = script
    .replace(/import vibrator from '@system\.vibrator'/, 'const vibrator = __vib')
    .replace(/import \{ loadSettings, saveSettings \} from '\.\.\/\.\.\/common\/persist\.js'/, 'const { loadSettings, saveSettings } = __persist')
    .replace(/import \{([\s\S]*?)\} from '\.\.\/\.\.\/common\/timer\.js'/, 'const {$1} = __timer')
    .replace('export default {', 'return {')
  assert.ok(!/^\s*import /m.test(body), 'import 가 남음')
  const def = new Function('__vib', '__persist', '__timer', 'require', body)(env.vib, env.persist, timer, env.require)
  const page = Object.assign({}, JSON.parse(JSON.stringify(def.private)))
  for (const [k, v] of Object.entries(def)) if (typeof v === 'function') page[k] = v
  return page
}

function makeEnv(stored) {
  const env = { saved: [], vibes: 0, keep: [] }
  env.vib = { vibrate: () => { env.vibes++ } }
  env.persist = {
    loadSettings: () => Promise.resolve(stored || timer.defaultSettings()),
    saveSettings: (s) => { env.saved.push(s); return Promise.resolve(true) }
  }
  env.require = (m) => (m === '@system.brightness' ? { setKeepScreenOn: (o) => env.keep.push(o.keepScreenOn) } : null)
  return env
}

const ev = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }], touches: [{ clientX: x, clientY: y }] })
function swipe(page, pts) {
  page.onTouchStart(ev(...pts[0]))
  for (let i = 1; i < pts.length; i++) page.onTouchMove(ev(...pts[i]))
  page.onTouchEnd(ev(...pts[pts.length - 1]))
}
const flush = () => new Promise((r) => setImmediate(r))

describe('페이지 시뮬레이션(index.ux script)', () => {
  let page, env
  beforeEach(async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 })
    env = makeEnv({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true })
    page = loadPage(env)
    page.onInit()
    page.onShow()
    await flush()
  })
  afterEach(() => mock.timers.reset())

  it('처음엔 설정 뷰, 25/5 와 막대 5칸·5칸', () => {
    assert.equal(page.view, 'setup')
    assert.deepEqual([page.f1Src, page.f2Src, page.r1Src, page.r2Src], ['/common/setup/f2.png', '/common/setup/f5.png', '/common/setup/r0.png', '/common/setup/r5.png'])
    assert.equal(page.fBar0Src, '/common/setup/fg05m.png')
    assert.equal(page.fBar1Show, false)
    assert.equal(page.rBar0Src, '/common/setup/rg05m.png')
  })

  it('집중 막대를 위로 끌면 칸마다 숫자·막대가 따라오고, 저장은 손 뗄 때 한 번', () => {
    page.onTouchStart(ev(266, 300))
    assert.equal(page.f1Src + page.f2Src, '/common/setup/f2.png/common/setup/f0.png') // 짚자마자 20
    assert.equal(page.fHot, true)
    const srcs = []
    for (let y = 300; y >= 60; y -= 6) {
      page.onTouchMove(ev(268, y))
      srcs.push(page.f1Src + page.f2Src)
    }
    assert.equal(env.saved.length, 0)
    page.onTouchEnd(ev(268, 60))
    assert.equal(env.saved.length, 1)
    assert.equal(env.saved[0].focusMs, 60 * MIN)
    assert.equal(page.f1Src + page.f2Src, '/common/setup/f6.png/common/setup/f0.png')
    assert.equal(page.fBar0Src, '/common/setup/fg06.png')
    assert.equal(page.fBar1Src, '/common/setup/fg06m.png')
    assert.equal(page.fUpOffShow, true)
    assert.equal(page.fHot, false)
    assert.equal(new Set(srcs).size, 9) // 20→60, 25..60 = 8 값 + 20
  })

  it('휴식 막대를 끌다 오른쪽으로 크게 비껴도 값만 바뀌고 뒤로가기는 삼킨다', () => {
    page.onTouchStart(ev(362, 300))
    page.onTouchMove(ev(364, 280))
    page.onTouchMove(ev(420, 200)) // 오른쪽 위로 비스듬히
    assert.equal(page.onBackPress(), true) // 터치 중
    page.onTouchEnd(ev(430, 200))
    assert.equal(page.r1Src + page.r2Src, '/common/setup/r1.png/common/setup/r9.png')
    assert.equal(page.onBackPress(), true) // 직후
    mock.timers.tick(timer.BACK_GUARD_MS + 1)
    assert.equal(page.onBackPress(), false)
    assert.equal(page.view, 'setup')
  })

  it('가로로 먼저 끌면 값이 그대로(막대 스냅도 되돌림), 가장자리 스와이프는 뒤로가기 허용', () => {
    swipe(page, [[330, 200], [350, 202], [420, 150]])
    assert.equal(page.r1Src + page.r2Src, '/common/setup/r0.png/common/setup/r5.png')
    assert.equal(page.rBar0Src, '/common/setup/rg05m.png')
    assert.equal(env.saved.length, 0)
    page.onTouchStart(ev(10, 250))
    page.onTouchMove(ev(120, 252))
    assert.equal(page.onBackPress(), false)
  })

  it('숫자 윗절반 탭 = +5, ▲ 눌림은 150ms 뒤 꺼짐, 아랫절반 = -1', () => {
    swipe(page, [[120, 90], [121, 91]])
    assert.equal(page.f1Src + page.f2Src, '/common/setup/f3.png/common/setup/f0.png')
    assert.equal(page.fUpOn, true)
    assert.equal(page.fHot, true)
    mock.timers.tick(timer.PRESS_FLASH_MS + 1)
    assert.equal(page.fUpOn, false)
    assert.equal(page.fHot, false)
    swipe(page, [[120, 330], [120, 330]])
    assert.equal(page.r2Src, '/common/setup/r4.png')
    assert.equal(env.saved.length, 2)
    for (let i = 0; i < 10; i++) swipe(page, [[120, 330], [120, 330]])
    assert.equal(page.r1Src + page.r2Src, '/common/setup/r0.png/common/setup/r1.png')
    assert.equal(page.rDnOffShow, true)
  })

  it('REPEAT 탭 → 끔, START → 시작 애니메이션 → 카운트다운, 탭=일시정지, 롱프레스=설정', () => {
    swipe(page, [[100, 380], [100, 380]])
    assert.equal(page.toggleSrc, '/common/setup/tog-off.png')
    page.onTouchStart(ev(216, 460))
    assert.equal(page.startOn, true)
    page.onTouchEnd(ev(216, 460))
    assert.equal(page.view, 'timer')
    assert.equal(page.startOn, false)
    assert.equal(page.gaugeSrc, '/common/booster/g00.png')
    mock.timers.tick(timer.INTRO_MS + 100)
    assert.equal(page.gaugeSrc, '/common/booster/g36.png')
    mock.timers.tick(1000)
    assert.equal(page.m1Src + page.m2Src, '/common/booster/m2.png/common/booster/m4.png')
    swipe(page, [[216, 257], [216, 257]])
    assert.equal(page.paused, true)
    page.onTouchStart(ev(216, 257))
    mock.timers.tick(timer.LONGPRESS_MS + 10)
    assert.equal(page.view, 'setup')
    page.onTouchEnd(ev(216, 257))
    assert.equal(page.toggleSrc, '/common/setup/tog-off.png') // 설정값은 그대로
  })

  it('반복 끔: 집중+휴식이 끝나면 진동하고 설정으로', () => {
    swipe(page, [[100, 380], [100, 380]]) // 반복 끔
    swipe(page, [[266, 380], [266, 380]]) // 집중 5분
    swipe(page, [[362, 380], [362, 380]]) // 휴식 1분
    swipe(page, [[216, 460], [216, 460]])
    mock.timers.tick(timer.INTRO_MS + 100)
    for (let i = 0; i < 6 * 60 + 5; i++) mock.timers.tick(1000)
    assert.equal(page.view, 'setup')
    assert.ok(env.vibes >= 3)
  })

  it('onHide/onShow 하면 진행 중 타이머를 버리고 설정 뷰로', async () => {
    swipe(page, [[216, 460], [216, 460]])
    mock.timers.tick(2000)
    assert.equal(page.view, 'timer')
    page.onHide()
    assert.equal(page.view, 'setup')
    page.onShow()
    await flush()
    assert.equal(page.view, 'setup')
    assert.equal(page._state, null)
  })
})
