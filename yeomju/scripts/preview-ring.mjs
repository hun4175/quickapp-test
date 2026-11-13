/**
 * 2.2.0 미리보기: 0/25/50/75/100% + 버퍼 슬롯 화면 밖 수치 로그.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_RING,
  SLOT_COUNT,
  CHAIN_ANIM_MS,
  pathProgressAtTime,
  layoutChainSlots,
  bufferSlotIndices,
  onScreenSlotIndices,
  isSlotFullyOffScreen,
  createChainBeads,
  MAX_RENDER_NODES
} from '../src/common/ring.js'
import { layoutRing } from '../src/common/ring-kf.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const W = 432
const H = 514
const PAD = 28
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
  const stride = width * 4
  let i = 0
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const filter = inflated[i++]
    const row = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) row[x] = inflated[i++]
    const recon = Buffer.alloc(stride)
    const paeth = (a, b, c) => {
      const p = a + b - c
      const pa = Math.abs(p - a)
      const pb = Math.abs(p - b)
      const pc = Math.abs(p - c)
      if (pa <= pb && pa <= pc) return a
      if (pb <= pc) return b
      return c
    }
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? recon[x - 4] : 0
      const up = prev[x]
      const upLeft = x >= 4 ? prev[x - 4] : 0
      let v = row[x]
      if (filter === 1) v = (v + left) & 255
      else if (filter === 2) v = (v + up) & 255
      else if (filter === 3) v = (v + ((left + up) >> 1)) & 255
      else if (filter === 4) v = (v + paeth(left, up, upLeft)) & 255
      else if (filter !== 0) throw new Error('png filter ' + filter)
      recon[x] = v
    }
    recon.copy(pixels, y * stride)
    prev = recon
  }
  return { width, height, pixels }
}

const loadAsset = (name) =>
  decodePng(fs.readFileSync(path.join(__dirname, '../src/common', name)))

const blitAlpha = (dst, dw, dh, src, dx, dy, size) => {
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
      const a = src.pixels[si + 3] / 255
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
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '%': [0x19, 0x1a, 0x04, 0x08, 0x13, 0x03, 0x00]
}

const drawText = (dst, dw, dh, text, x0, y0, scale, r, g, b) => {
  let x = x0
  for (const ch of text) {
    const rows = FONT[ch] || FONT[' ']
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

const wood = loadAsset('bead-wood-v3.png')

const renderWatch = (shiftProgress) => {
  const rgba = Buffer.alloc(W * H * 4, 0)
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = 12
    rgba[i * 4 + 1] = 10
    rgba[i * 4 + 2] = 8
    rgba[i * 4 + 3] = 255
  }
  // 시간축 t → pathProgressAtTime (CSS linear + ease 베이크와 동일)
  const beads = layoutRing({
    ...DEFAULT_RING,
    shiftProgress: pathProgressAtTime(shiftProgress),
    chainDir: 1,
    bakeEase: false
  })
  for (const b of beads) blitAlpha(rgba, W, H, wood, b.left, b.top, b.size)
  return { rgba, beads }
}

fs.mkdirSync(docsDir, { recursive: true })

const percents = [0, 0.25, 0.5, 0.75, 1]
const parts = []
for (const p of percents) {
  const { rgba, beads } = renderWatch(p)
  const tag = Math.round(p * 100) + 'pct'
  const file =
    p === 0
      ? 'preview-swipe-before.png'
      : p === 1
        ? 'preview-swipe-after.png'
        : p === 0.5
          ? 'preview-swipe-mid.png'
          : null
  if (file) writePng(path.join(docsDir, file), W, H, rgba)
  parts.push({ tag, rgba, count: beads.length, p })
  console.log(tag, 'beads', beads.length)
}

const stripW = W * percents.length
const stripH = H + PAD
const strip = Buffer.alloc(stripW * stripH * 4, 0)
for (let i = 0; i < strip.length; i += 4) {
  strip[i] = 20
  strip[i + 1] = 16
  strip[i + 2] = 12
  strip[i + 3] = 255
}
for (let i = 0; i < parts.length; i++) {
  for (let y = 0; y < H; y++) {
    parts[i].rgba.copy(strip, (y + PAD) * stripW * 4 + i * W * 4, y * W * 4, (y + 1) * W * 4)
  }
  drawText(strip, stripW, stripH, Math.round(parts[i].p * 100) + '%', i * W + 8, 6, 2, 200, 180, 140)
}
writePng(path.join(docsDir, 'preview-2.2.0.png'), stripW, stripH, strip)
writePng(path.join(docsDir, 'preview-432x514.png'), W, H, parts[0].rgba)

const slots = layoutChainSlots()
const buffers = bufferSlotIndices().map((i) => {
  const s = slots[i]
  return {
    index: i,
    left: s.left,
    top: s.top,
    size: s.size,
    right: s.left + s.size,
    bottom: s.top + s.size,
    fullyOffScreen: isSlotFullyOffScreen(s)
  }
})
console.log(
  JSON.stringify(
    {
      version: '2.2.0',
      slots: SLOT_COUNT,
      nodes: createChainBeads().length,
      maxNodes: MAX_RENDER_NODES,
      ms: CHAIN_ANIM_MS,
      onScreen: onScreenSlotIndices(),
      buffers
    },
    null,
    2
  )
)
