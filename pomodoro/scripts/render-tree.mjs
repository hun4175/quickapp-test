/**
 * 미리보기용: src/pages/index/index.ux 를 그대로 읽어 페이지 객체(script)를 돌리고, template 의 if·{{}}·class·style 을
 * 평가해 화면에 보이는 요소 목록(JSON)을 낸다. scripts/gen-preview-ui.py 가 이 목록을 PIL 로 그린다.
 * 사용: node scripts/render-tree.mjs <장면 이름>  (장면 목록은 SCENES)
 * 실기기 렌더링이 아니라 레이아웃 확인용 근사다(글꼴·텍스트 세로 정렬은 기기와 다를 수 있음).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as timer from '../src/common/timer.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ux = readFileSync(path.join(ROOT, 'src/pages/index/index.ux'), 'utf8')
const MIN = 60000

function loadPage() {
  const script = ux.slice(ux.indexOf('<script>') + 8, ux.indexOf('</script>'))
  const body = script
    .replace(/import vibrator from '@system\.vibrator'/, 'const vibrator = { vibrate() {} }')
    .replace(/import \{ loadSettings, saveSettings, loadSession, saveSession \} from '\.\.\/\.\.\/common\/persist\.js'/,
      'const loadSettings = () => Promise.resolve(__timer.defaultSettings()); const saveSettings = () => Promise.resolve(true); ' +
      'const loadSession = () => Promise.resolve(null); const saveSession = () => Promise.resolve(true)')
    .replace(/import \{([\s\S]*?)\} from '\.\.\/\.\.\/common\/timer\.js'/, 'const {$1} = __timer')
    .replace('export default {', 'return {')
  const def = new Function('__timer', 'require', body)(timer, () => null)
  const page = Object.assign({}, JSON.parse(JSON.stringify(def.private)))
  for (const [k, v] of Object.entries(def)) if (typeof v === 'function') page[k] = v
  return page
}

function parseCss() {
  const st = ux.slice(ux.indexOf('<style>') + 7, ux.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')
  const map = {}
  for (const m of st.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const o = {}
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':')
      if (i < 0) continue
      o[decl.slice(0, i).trim()] = decl.slice(i + 1).trim()
    }
    map[m[1]] = o
  }
  return map
}

function parseTemplate() {
  const t = ux.slice(ux.indexOf('<template>') + 10, ux.indexOf('</template>'))
  const root = { tag: 'root', attrs: {}, children: [], text: '' }
  const stack = [root]
  const re = /<(\/?)(\w+)((?:\s+[\w-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g
  for (const m of t.matchAll(re)) {
    if (m[5] != null) {
      const txt = m[5].trim()
      if (txt) stack[stack.length - 1].text += txt
      continue
    }
    if (m[1]) { stack.pop(); continue }
    const attrs = {}
    for (const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
    const node = { tag: m[2], attrs, children: [], text: '' }
    stack[stack.length - 1].children.push(node)
    if (!m[4]) stack.push(node)
  }
  return root
}

const evalExpr = (page, expr) => new Function('s', 'with (s) { return (' + expr + ') }')(page)
const interp = (page, str) => {
  const whole = str.match(/^\{\{([^}]+)\}\}$/)
  if (whole) return evalExpr(page, whole[1])
  return str.replace(/\{\{([^}]+)\}\}/g, (_, e) => String(evalExpr(page, e)))
}
const camelToKebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
const px = (v) => (v == null ? null : parseFloat(String(v)))

function collect(page, css, node, out) {
  if (node.attrs.if != null && !interp(page, node.attrs.if)) return
  if (node.tag !== 'root') {
    const p = {}
    for (const c of (node.attrs.class || '').split(/\s+/).filter(Boolean)) Object.assign(p, css[c] || {})
    if (node.attrs.style) {
      const sv = interp(page, node.attrs.style)
      if (typeof sv === 'object') {
        for (const [k, v] of Object.entries(sv)) p[camelToKebab(k)] = v
      } else {
        for (const decl of String(sv).split(';')) {
          const i = decl.indexOf(':')
          if (i >= 0) p[decl.slice(0, i).trim()] = decl.slice(i + 1).trim()
        }
      }
    }
    const cls = node.attrs.class || ''
    if (cls === 'pause') {
      // flex 정렬 대신 gen-booster.py 와 같은 좌표(중심 구멍 안 막대 8x26 두 개)
      out.push({ k: 'div', x: 204, y: 244, w: 8, h: 26, bg: '#fffcf4', r: 2, bw: 0, bc: null, op: 1, rot: 0, origin: null })
      out.push({ k: 'div', x: 220, y: 244, w: 8, h: 26, bg: '#fffcf4', r: 2, bw: 0, bc: null, op: 1, rot: 0, origin: null })
      return
    }
    if (p.position === 'absolute' && cls !== 'view') {
      let rot = 0
      let origin = null
      if (p.transform) {
        const t = p.transform.startsWith('{') ? JSON.parse(p.transform).rotate : (p.transform.match(/rotate\(([^)]+)\)/) || [])[1]
        rot = parseFloat(t || '0')
        origin = (p['transform-origin'] || '0px 0px').split(/\s+/).map(px)
      }
      const e = {
        k: node.tag === 'image' ? 'img' : node.tag,
        cls,
        x: px(p.left), y: px(p.top), w: px(p.width), h: px(p.height),
        bg: p['background-color'] || null,
        r: px(p['border-radius']) || 0,
        bw: px(p['border-width']) || 0,
        bc: p['border-color'] || null,
        op: p.opacity != null ? parseFloat(p.opacity) : 1,
        rot, origin
      }
      if (node.tag === 'image') e.src = interp(page, node.attrs.src)
      if (node.tag === 'text') {
        Object.assign(e, {
          s: interp(page, node.text),
          size: px(p['font-size']), color: p.color || '#FFFFFF',
          bold: p['font-weight'] === 'bold', align: p['text-align'] || 'left',
          outline: !!p['text-shadow']
        })
      }
      out.push(e)
    }
  }
  for (const c of node.children) collect(page, css, c, out)
}

function timerAt(page, theme, phase, remainMin, focusMin, breakMin, paused) {
  page._settings = timer.normalizeSettings({ focusMs: focusMin * MIN, breakMs: breakMin * MIN, repeat: true, theme })
  page.beginSession()
  page.stopAll(false)
  const remainMs = remainMin * MIN
  page._state = { phase, running: !paused, endAt: paused ? null : Date.now() + remainMs, remainMs, focusMs: focusMin * MIN, breakMs: breakMin * MIN, repeat: true, done: false }
  page.applyTimer()
}

const ev = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }], touches: [{ clientX: x, clientY: y }] })

const SCENES = {
  'setup': (p) => {},
  'setup-changing': (p) => { p.onTouchStart(ev(126, 300)); p.onTouchMove(ev(126, 250)); p.onTouchMove(ev(127, 190)) },
  'setup-repeat-off': (p) => {
    p._settings = timer.normalizeSettings({ focusMs: 60 * MIN, breakMs: 1 * MIN, repeat: false, theme: 'battery' })
    p.applySetup()
  },
  'themes': (p) => { p._settings = timer.normalizeSettings({ theme: 'sweep' }); p.openThemes() },
  'themes-pressed': (p) => { p._settings = timer.normalizeSettings({ theme: 'sweep' }); p.openThemes(); p.onTouchStart(ev(200, 140)) }
}
for (const th of timer.THEMES) {
  SCENES[th + '-focus'] = (p) => timerAt(p, th, 'focus', 12.5, 25, 5, false)
  SCENES[th + '-focus-late'] = (p) => timerAt(p, th, 'focus', 2, 25, 5, false)
  SCENES[th + '-rest'] = (p) => timerAt(p, th, 'break', 2.5, 25, 5, false)
  SCENES[th + '-paused'] = (p) => timerAt(p, th, 'focus', 12.5, 25, 5, true)
  SCENES[th + '-intro'] = (p) => { timerAt(p, th, 'focus', 25, 25, 5, true); p.applyTimer(0.5) }
}

const name = process.argv[2]
if (name === '--list') {
  console.log(JSON.stringify(Object.keys(SCENES)))
} else {
  if (!SCENES[name]) throw new Error('unknown scene ' + name)
  const page = loadPage()
  page.onInit()
  SCENES[name](page)
  const out = []
  collect(page, parseCss(), parseTemplate(), out)
  page.stopAll(false)
  console.log(JSON.stringify({ view: page.view, elements: out }))
}
