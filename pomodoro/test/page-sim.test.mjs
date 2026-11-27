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
  const boot = async (stored) => {
    env = makeEnv(stored)
    page = loadPage(env)
    page.onInit()
    page.onShow()
    await flush()
  }
  beforeEach(async () => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 })
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true })
  })
  afterEach(() => mock.timers.reset())

  it('처음엔 설정 뷰, 25/05, 관 채움 5칸·5칸, 테마 값이 없으면 SAND', () => {
    assert.equal(page.view, 'setup')
    assert.deepEqual([page.focusNum, page.restNum], ['25', '05'])
    assert.deepEqual([page.focusFillTop, page.focusFillH, page.restFillTop, page.restFillH], [273, 147, 361, 59])
    assert.equal(page._settings.theme, 'sand')
  })

  it('집중 관을 위로 끌면 칸마다 숫자·채움이 따라오고, 저장은 손 뗄 때 한 번', () => {
    page.onTouchStart(ev(126, 300))
    assert.equal(page.focusNum, '25') // 짚자마자 그 칸
    assert.equal(page.fActive, true)
    const nums = []
    for (let y = 300; y >= 60; y -= 6) {
      page.onTouchMove(ev(128, y))
      nums.push(page.focusNum)
    }
    assert.equal(env.saved.length, 0)
    page.onTouchEnd(ev(128, 60))
    assert.equal(env.saved.length, 1)
    assert.equal(env.saved[0].focusMs, 60 * MIN)
    assert.equal(env.saved[0].theme, 'sand')
    assert.deepEqual([page.focusNum, page.focusFillTop, page.focusFillH], ['60', 68, 352])
    assert.equal(page.fActive, false)
    assert.equal(new Set(nums).size, 8) // 25..60
  })

  it('휴식 관을 끌다 오른쪽으로 크게 비껴도 값만 바뀌고 뒤로가기는 삼킨다', () => {
    page.onTouchStart(ev(306, 400))
    page.onTouchMove(ev(308, 380))
    page.onTouchMove(ev(420, 200)) // 오른쪽 위로 비스듬히
    assert.equal(page.onBackPress(), true) // 터치 중
    page.onTouchEnd(ev(430, 200))
    assert.equal(page.restNum, '19')
    assert.equal(page.onBackPress(), true) // 직후
    mock.timers.tick(timer.BACK_GUARD_MS + 1)
    assert.equal(page.onBackPress(), false)
    assert.equal(page.view, 'setup')
  })

  it('가로로 먼저 끌면 값이 그대로(스냅도 되돌림), 가장자리 스와이프는 뒤로가기 허용', () => {
    swipe(page, [[306, 120], [326, 122], [400, 130]])
    assert.equal(page.restNum, '05')
    assert.equal(page.restFillH, 59)
    assert.equal(env.saved.length, 0)
    page.onTouchStart(ev(10, 250))
    page.onTouchMove(ev(120, 252))
    assert.equal(page.onBackPress(), false)
  })

  it('톱니 → 테마 고르기(같은 페이지 view) → BATTERY 탭: 저장하고 설정으로', () => {
    page.onTouchStart(ev(80, 468))
    assert.equal(page.themeBtnColor, timer.THEME_BTN_PRESSED)
    page.onTouchEnd(ev(81, 469))
    assert.equal(page.view, 'themes')
    assert.equal(page.themeBtnColor, timer.THEME_BTN)
    assert.deepEqual([page.cur0, page.cur1, page.cur2, page.cur3], [true, false, false, false])
    assert.equal(page.rowBc0, '#FFFFFF')
    page.onTouchStart(ev(200, 300))
    assert.equal(page.rowBg2, '#333333') // 눌림
    page.onTouchEnd(ev(202, 302))
    assert.equal(page.view, 'setup')
    assert.equal(page._settings.theme, 'battery')
    assert.equal(env.saved.length, 1)
    assert.deepEqual(env.saved[0], { focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'battery' })
    // 다시 열면 현재 테마 표시
    swipe(page, [[80, 468], [80, 468]])
    assert.equal(page.view, 'themes')
    assert.deepEqual([page.cur0, page.cur2, page.rowBg2], [false, true, '#1A1A1A'])
  })

  it('테마 고르기에서 시스템 뒤로 = 설정으로(앱 안 닫힘), 끌기·틈 탭은 고르지 않음', () => {
    swipe(page, [[80, 468], [80, 468]])
    assert.equal(page.view, 'themes')
    swipe(page, [[200, 300], [200, 360]]) // 세로로 끎
    assert.equal(page.view, 'themes')
    swipe(page, [[200, 180], [200, 180]]) // 줄 사이 틈
    assert.equal(page.view, 'themes')
    page.onTouchStart(ev(40, 300))
    page.onTouchMove(ev(200, 300)) // 오른쪽 스와이프(뒤로)
    assert.equal(page.onBackPress(), true)
    assert.equal(page.view, 'setup')
    assert.equal(page._settings.theme, 'sand')
    assert.equal(env.saved.length, 0)
  })

  it('저장된 테마는 다시 켜도 유지된다(onShow 에서 불러옴)', async () => {
    await boot({ focusMs: 30 * MIN, breakMs: 7 * MIN, repeat: false, theme: 'sweep' })
    assert.equal(page.view, 'setup')
    assert.equal(page._settings.theme, 'sweep')
    assert.equal(page.focusNum, '30')
    swipe(page, [[216, 470], [216, 470]])
    assert.equal(page.view, 'timer')
    assert.equal(page.timerTheme, 'sweep')
  })

  it('REPEAT 탭 → 끔, START → 시작 애니메이션 → 카운트다운(BOOSTER), 탭=일시정지, 롱프레스=설정', async () => {
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'booster' })
    swipe(page, [[340, 470], [340, 470]])
    assert.equal(page.togColor, '#333333')
    assert.equal(page.knobLeft, 321)
    page.onTouchStart(ev(216, 470))
    assert.equal(page.startColor, timer.START_PRESSED)
    page.onTouchEnd(ev(216, 470))
    assert.equal(page.view, 'timer')
    assert.equal(page.timerTheme, 'booster')
    assert.equal(page.startColor, timer.START_COLOR)
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
    assert.equal(page.togColor, '#333333') // 설정값은 그대로
  })

  it('SAND·BATTERY·SWEEP: 시작 애니메이션 동안 0 → 가득, 이후 1초마다 줄어든다', async () => {
    for (const t of ['sand', 'battery', 'sweep']) {
      await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: t })
      swipe(page, [[216, 470], [216, 470]])
      assert.equal(page.timerTheme, t)
      const rot = timer.SWEEP_MODE === 'rotate'
      if (t === 'sand') assert.equal(page.sandH, 0)
      if (t === 'battery') assert.equal(page.batH, 0)
      if (t === 'sweep') assert.equal(rot ? page.secAShow : page.frameShow, false)
      mock.timers.tick(timer.INTRO_MS / 2)
      if (t === 'sand') assert.ok(page.sandH > 200 && page.sandH < 320)
      if (t === 'sweep') assert.ok(rot ? page.maskShow || page.secBShow : page.frameShow)
      mock.timers.tick(timer.INTRO_MS / 2 + 100)
      if (t === 'sand') assert.equal(page.sandH, 514)
      if (t === 'battery') assert.equal(page.batH, 342)
      if (t === 'sweep' && rot) assert.deepEqual([page.secAShow, page.secBShow, page.maskShow, page.edgeShow], [true, true, false, false])
      if (t === 'sweep' && !rot) assert.equal(page.frameSrc, '/common/sweep/f60.png')
      mock.timers.tick(12.5 * MIN)
      assert.equal(page.timeText, '12:30')
      if (t === 'sand') assert.equal(page.sandH, 257)
      if (t === 'battery') assert.deepEqual([page.batH, page.pctText], [171, '50% LEFT'])
      if (t === 'sweep' && rot) assert.equal(JSON.parse(page.maskStyle.transform).rotate, '180deg')
      if (t === 'sweep' && !rot) assert.equal(page.frameSrc, '/common/sweep/f30.png')
      page.onHide()
    }
  })

  it('반복 끔: 집중+휴식이 끝나면 진동하고 설정으로', () => {
    swipe(page, [[340, 470], [340, 470]]) // 반복 끔
    swipe(page, [[126, 410], [126, 410]]) // 집중 5분
    swipe(page, [[306, 415], [306, 415]]) // 휴식 1분
    assert.deepEqual([page.focusNum, page.restNum], ['05', '01'])
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS + 100)
    for (let i = 0; i < 6 * 60 + 5; i++) mock.timers.tick(1000)
    assert.equal(page.view, 'setup')
    assert.ok(env.vibes >= 3)
  })

  it('onHide/onShow 하면 진행 중 타이머·테마 고르기를 버리고 설정 뷰로', async () => {
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(2000)
    assert.equal(page.view, 'timer')
    page.onHide()
    assert.equal(page.view, 'setup')
    page.onShow()
    await flush()
    assert.equal(page.view, 'setup')
    assert.equal(page._state, null)
    swipe(page, [[80, 468], [80, 468]])
    assert.equal(page.view, 'themes')
    page.onHide()
    assert.equal(page.view, 'setup')
  })
})
