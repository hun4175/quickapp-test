/**
 * 432×514 레이아웃 시뮬레이션 PNG (실기기 스크린샷 아님).
 * 스와이프(위) 전 / 중간(0.5) / 후 프레임을 docs/ 에 기록.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_RING,
  VIRTUAL_BEADS,
  CHAIN_DIR,
  CHAIN_ANIM_MS,
  layoutRing,
  layoutFocusMarker,
  chainStepY
} from '../src/common/ring.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const W = 432
const H = 514
const docsDir = path.join(__dirname, '../docs')

const decodePng = (buf) => {
  let offset = 8
  let width = 0
  let height = 0
  const idat = []
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    offset += 12 + len
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(width * height * 4)
  let i = 0
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[i++]
    if (filter !== 0) throw new Error('png filter ' + filter)
    for (let x = 0; x < width; x++) {
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
    }
  }
  return { width, height, pixels }
}

const loadAsset = (name) =>
  decodePng(fs.readFileSync(path.join(__dirname, '../src/common', name)))

const blitAlpha = (dst, dw, dh, src, dx, dy, size, opacity) => {
  const sw = src.width
  const sh = src.height
  for (let y = 0; y < size; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / size))
    const dy2 = dy + y
    if (dy2 < 0 || dy2 >= dh) continue
    for (let x = 0; x < size; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / size))
      const dx2 = dx + x
      if (dx2 < 0 || dx2 >= dw) continue
      const si = (sy * sw + sx) * 4
      const a = (src.pixels[si + 3] / 255) * opacity
      if (a <= 0) continue
      const di = (dy2 * dw + dx2) * 4
      const inv = 1 - a
      dst[di] = Math.round(src.pixels[si] * a + dst[di] * inv)
      dst[di + 1] = Math.round(src.pixels[si + 1] * a + dst[di + 1] * inv)
      dst[di + 2] = Math.round(src.pixels[si + 2] * a + dst[di + 2] * inv)
      dst[di + 3] = 255
    }
  }
}

const crc32 = (buf) => {
  let table = crc32.table
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
    crc32.table = table
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const writePng = (file, width, height, rgba) => {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0
    rgba.copy(raw, o, y * width * 4, (y + 1) * width * 4)
    o += width * 4
  }
  const compressed = zlib.deflateSync(raw, { level: 9 })
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeBuf = Buffer.from(type)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
    return Buffer.concat([len, typeBuf, data, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', compressed),
      chunk('IEND', Buffer.alloc(0))
    ])
  )
}

const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  3: [0x0e, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  '/': [0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  o: [0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e, 0x00],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x0f, 0x00],
  a: [0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f, 0x00],
  y: [0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e, 0x00],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  p: [0x00, 0x1e, 0x11, 0x1e, 0x10, 0x10, 0x00],
  s: [0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e, 0x00],
  e: [0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e, 0x00],
  t: [0x08, 0x08, 0x1c, 0x08, 0x08, 0x08, 0x06],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  n: [0x00, 0x1e, 0x11, 0x11, 0x11, 0x11, 0x00],
  g: [0x00, 0x0f, 0x11, 0x0f, 0x01, 0x0e, 0x00],
  m: [0x00, 0x1b, 0x15, 0x15, 0x15, 0x15, 0x00],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e]
}

const glyph = (ch) => FONT[ch] || FONT[' ']

const drawText = (dst, dw, dh, text, x0, y0, scale, r, g, b) => {
  let x = x0
  for (const ch of text) {
    const rows = glyph(ch)
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if ((rows[row] >> (4 - col)) & 1) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const xx = x + col * scale + sx
              const yy = y0 + row * scale + sy
              if (xx < 0 || yy < 0 || xx >= dw || yy >= dh) continue
              const i = (yy * dw + xx) * 4
              dst[i] = r
              dst[i + 1] = g
              dst[i + 2] = b
              dst[i + 3] = 255
            }
          }
        }
      }
    }
    x += 6 * scale
  }
}

const fillRect = (dst, dw, dh, x, y, w, h, r, g, b, a) => {
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= dh) continue
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= dw) continue
      const i = (yy * dw + xx) * 4
      const aa = a / 255
      dst[i] = Math.round(r * aa + dst[i] * (1 - aa))
      dst[i + 1] = Math.round(g * aa + dst[i + 1] * (1 - aa))
      dst[i + 2] = Math.round(b * aa + dst[i + 2] * (1 - aa))
      dst[i + 3] = 255
    }
  }
}

const wood = loadAsset('bead-wood.png')
const gem = loadAsset('bead-gem.png')
const arc = loadAsset('focus-arc.png')

const renderFrame = (label, phaseIndex, shiftProgress, beadCount) => {
  const rgba = Buffer.alloc(W * H * 4, 0)
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = 12
    rgba[i * 4 + 1] = 10
    rgba[i * 4 + 2] = 8
    rgba[i * 4 + 3] = 255
  }

  const beads = layoutRing({
    ...DEFAULT_RING,
    virtual: VIRTUAL_BEADS,
    phaseIndex,
    shiftProgress,
    animExtra: shiftProgress > 0 && shiftProgress < 1
  })
  for (const b of beads) {
    blitAlpha(rgba, W, H, b.focused ? gem : wood, b.left, b.top, b.size, b.opacity)
  }
  const marker = layoutFocusMarker(DEFAULT_RING)
  blitAlpha(rgba, W, H, arc, marker.left, marker.top, marker.size, 1)

  fillRect(rgba, W, H, 156, 14, 120, 36, 26, 20, 16, 224)
  drawText(rgba, W, H, 'Today 0', 168, 22, 2, 232, 196, 138)

  fillRect(rgba, W, H, 86, 430, 260, 54, 26, 20, 16, 230)
  drawText(rgba, W, H, `${beadCount} / 108`, 150, 438, 3, 243, 226, 196)
  drawText(rgba, W, H, 'Lap 0', 180, 462, 2, 184, 148, 98)

  fillRect(rgba, W, H, 146, 488, 140, 22, 42, 28, 18, 242)
  drawText(rgba, W, H, 'settings', 160, 492, 2, 232, 196, 138)

  // 프레임 라벨
  fillRect(rgba, W, H, 8, 60, 160, 22, 40, 28, 18, 200)
  drawText(rgba, W, H, label, 14, 64, 2, 245, 217, 168)

  return { rgba, beads }
}

fs.mkdirSync(docsDir, { recursive: true })

const frames = [
  { file: 'preview-swipe-before.png', label: 'BEFORE', phase: 0, shift: 0, bead: 0 },
  { file: 'preview-swipe-mid.png', label: 'MID UP', phase: 0, shift: 0.5, bead: 1 },
  { file: 'preview-swipe-after.png', label: 'AFTER', phase: 1, shift: 0, bead: 1 }
]

const meta = {
  chainDir: CHAIN_DIR,
  chainAnimMs: CHAIN_ANIM_MS,
  stepY: chainStepY(DEFAULT_RING.ry, VIRTUAL_BEADS),
  note: 'simulation preview, NOT a device screenshot',
  frames: []
}

for (const f of frames) {
  const { rgba, beads } = renderFrame(f.label, f.phase, f.shift, f.bead)
  const outPath = path.join(docsDir, f.file)
  writePng(outPath, W, H, rgba)
  const focused = beads.find((b) => b.focused)
  meta.frames.push({
    file: `yeomju/docs/${f.file}`,
    label: f.label,
    phase: f.phase,
    shiftProgress: f.shift,
    focusCenter: focused
      ? [focused.left + focused.size / 2, focused.top + focused.size / 2]
      : null,
    renderCount: beads.length
  })
  console.log('wrote', outPath)
}

// 기존 단일 미리보기도 after 와 동일 스냅으로 유지
const after = renderFrame('AFTER', 1, 0, 1)
writePng(path.join(docsDir, 'preview-432x514.png'), W, H, after.rgba)
console.log('wrote', path.join(docsDir, 'preview-432x514.png'))
console.log(JSON.stringify(meta, null, 2))
