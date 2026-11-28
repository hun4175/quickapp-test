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
    .replace(/import \{ loadSettings, saveSettings, loadSession, saveSession \} from '\.\.\/\.\.\/common\/persist\.js'/, 'const { loadSettings, saveSettings, loadSession, saveSession } = __persist')
    .replace(/import \{([\s\S]*?)\} from '\.\.\/\.\.\/common\/timer\.js'/, 'const {$1} = __timer')
    .replace('export default {', 'return {')
  assert.ok(!/^\s*import /m.test(body), 'import 가 남음')
  const def = new Function('__vib', '__persist', '__timer', 'require', body)(env.vib, env.persist, timer, env.require)
  const page = Object.assign({}, JSON.parse(JSON.stringify(def.private)))
  for (const [k, v] of Object.entries(def)) if (typeof v === 'function') page[k] = v
  return page
}

/** storedSession: SESSION_KEY 에 들어 있는 문자열(실제 persist.js 와 같은 serialize/deserialize 를 거친다). */
function makeEnv(stored, storedSession) {
  const env = { saved: [], vibes: 0, keep: [], session: storedSession || '', sessionWrites: 0 }
  env.vib = { vibrate: () => { env.vibes++ } }
  env.persist = {
    loadSettings: () => Promise.resolve(stored || timer.defaultSettings()),
    saveSettings: (s) => { env.saved.push(s); return Promise.resolve(true) },
    loadSession: () => Promise.resolve(timer.deserializeSession(env.session, Date.now())),
    saveSession: (st, th) => { env.session = timer.serializeSession(st, th); env.sessionWrites++; return Promise.resolve(true) }
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
  const boot = async (stored, storedSession) => {
    env = makeEnv(stored, storedSession)
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

  it('처음엔 설정 뷰, 25/05, 관 채움 5칸·5칸, 테마 값이 없으면 SWEEP(0.1.10 기본)', () => {
    assert.equal(page.view, 'setup')
    assert.deepEqual([page.focusNum, page.restNum], ['25', '05'])
    assert.deepEqual([page.focusFillTop, page.focusFillH, page.restFillTop, page.restFillH], [273, 147, 361, 59])
    assert.equal(page._settings.theme, 'sweep')
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
    assert.equal(env.saved[0].theme, 'sweep')
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
    assert.deepEqual([page.cur0, page.cur1, page.cur2, page.cur3], [true, false, false, false]) // 1번 줄 = SWEEP(기본)
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
    assert.equal(page._settings.theme, 'sweep')
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

  it('0.1.9 에 SAND 를 저장한 사용자는 SAND 그대로(이름으로 저장, 순서와 무관)', async () => {
    await boot(timer.deserializeSettings(JSON.stringify({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'sand' }), ''))
    assert.equal(page._settings.theme, 'sand')
    swipe(page, [[80, 468], [80, 468]])
    assert.deepEqual([page.cur0, page.cur1, page.cur2, page.cur3], [false, true, false, false]) // 2번 줄 = SAND
    swipe(page, [[216, 140], [216, 140]]) // 1번 줄 = SWEEP 을 고르면 그때 바뀐다
    assert.equal(page._settings.theme, 'sweep')
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'booster' })
    assert.equal(page._settings.theme, 'booster')
  })

  it('타이머 중 onHide: 그 순간 일시정지, 남은 시간·단계·화면 유지 → onShow: 같은 화면 일시정지, 탭해야 재개', async () => {
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true, theme: 'sand' })
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS + 100)
    mock.timers.tick(25 * MIN + 2 * MIN) // 휴식 2분째
    assert.equal(page.phaseLabel, 'REST')
    assert.equal(page.timeText, '03:00')
    page.onHide()
    assert.equal(page.view, 'timer')
    assert.equal(page.paused, true)
    assert.equal(page.resumeShow, true)
    assert.equal(page._state.running, false)
    assert.equal(page._state.phase, 'break')
    assert.equal(page._state.remainMs, 3 * MIN)
    assert.equal(page._state.repeat, true)
    assert.equal(env.keep[env.keep.length - 1], false) // 화면 켜짐 유지 해제
    const vib = env.vibes
    mock.timers.tick(10 * MIN) // 백그라운드 10분: 줄지 않는다
    page.onShow()
    await flush()
    assert.equal(page.view, 'timer')
    assert.equal(page.timerTheme, 'sand')
    assert.equal(page.paused, true)
    assert.equal(page.timeText, '03:00')
    assert.equal(page.phaseLabel, 'REST')
    mock.timers.tick(5000)
    assert.equal(page.timeText, '03:00') // 재개 전에는 그대로
    assert.equal(env.vibes, vib)
    swipe(page, [[216, 257], [216, 257]]) // 탭 = 재개
    assert.equal(page.paused, false)
    assert.equal(page.resumeShow, false)
    mock.timers.tick(1000)
    assert.equal(page.timeText, '02:59')
  })

  it('시작 애니메이션 중 onHide: 시작 전(가득) 일시정지로 멈추고, 복귀 후 탭하면 카운트다운', async () => {
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS / 3)
    page.onHide()
    mock.timers.tick(5000)
    page.onShow()
    await flush()
    assert.deepEqual([page.view, page.paused, page.timeText], ['timer', true, '25:00'])
    swipe(page, [[216, 257], [216, 257]])
    mock.timers.tick(1000)
    assert.equal(page.timeText, '24:59')
  })

  it('설정·테마 고르기 화면에서 onHide/onShow: 화면과 바꾼 값 그대로', async () => {
    swipe(page, [[126, 160], [126, 160]]) // 집중 값 변경
    const n = page.focusNum
    page.onHide()
    page.onShow()
    await flush()
    assert.deepEqual([page.view, page.focusNum], ['setup', n])
    swipe(page, [[80, 468], [80, 468]])
    page.onHide()
    page.onShow()
    await flush()
    assert.equal(page.view, 'themes')
    assert.equal(page.onBackPress(), true)
    assert.equal(page.view, 'setup')
  })

  it('프로세스 재시작: 저장된 세션을 일시정지 상태로 복원(같은 테마·단계·남은 시간)', async () => {
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: false, theme: 'battery' })
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS + 100)
    mock.timers.tick(10 * MIN)
    page.onHide()
    page.onDestroy()
    const saved = env.session
    assert.ok(saved.length > 0)
    mock.timers.tick(60 * MIN) // 꺼져 있던 시간은 세지 않는다
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: false, theme: 'battery' }, saved)
    assert.equal(page.view, 'timer')
    assert.equal(page.timerTheme, 'battery')
    assert.deepEqual([page.paused, page.resumeShow, page.timeText, page.phaseLabel], [true, true, '15:00', 'FOCUS'])
    assert.equal(page._state.repeat, false)
    assert.equal(page.resumeLeft, timer.RESUME_PILL.batteryLeft)
    swipe(page, [[216, 257], [216, 257]])
    mock.timers.tick(1000)
    assert.equal(page.timeText, '14:59')
  })

  it('실행 중 저장된 채 프로세스가 끝났으면(onHide 없음) 지난 시간만큼 진행한 뒤 일시정지로 복원', async () => {
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS + 100)
    const saved = env.session // 시작할 때 저장된 실행 중 세션
    assert.equal(JSON.parse(saved).running, true)
    mock.timers.tick(5 * MIN)
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true }, saved)
    assert.deepEqual([page.view, page.paused, page.timeText], ['timer', true, '20:00'])
  })

  it('길게 눌러 설정으로 가거나 반복 끔 세션이 끝나면 저장 세션을 지운다', async () => {
    swipe(page, [[216, 470], [216, 470]])
    mock.timers.tick(timer.INTRO_MS + 100)
    assert.ok(env.session.length > 0)
    page.onTouchStart(ev(216, 257))
    mock.timers.tick(timer.LONGPRESS_MS + 10)
    page.onTouchEnd(ev(216, 257))
    assert.equal(page.view, 'setup')
    assert.equal(env.session, '')
    await boot({ focusMs: 25 * MIN, breakMs: 5 * MIN, repeat: true }, env.session)
    assert.equal(page.view, 'setup')
  })
})
