/**
 * 432×514 레이아웃 시뮬레이션 PNG (실기기 스크린샷 아님).
 * 동일 layoutRing 좌표로 Node 에서 그린다.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { DEFAULT_RING, VISIBLE_BEADS, layoutRing, layoutFocusMarker } from '../src/common/ring.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const W = 432
const H = 514
const outDir = path.join(__dirname, '../docs')
const outPath = path.join(outDir, 'preview-432x514.png')

const decodePng = (buf) => {
  // 최소 PNG 디코더 (8bit RGBA only, 우리 에셋용)
  if (buf[0] !== 0x89) throw new Error('not png')
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
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    offset += 12 + len
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(width * height * 4)
  let i = 0
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[i++]
    if (filter !== 0) throw new Error('unsupported png filter ' + filter)
    for (let x = 0; x < width; x++) {
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
      pixels[p++] = inflated[i++]
    }
  }
  return { width, height, pixels }
}

const loadAsset = (name) => {
  const p = path.join(__dirname, '../src/common', name)
  return decodePng(fs.readFileSync(p))
}

const blit = (dst, dw, dh, src, dx, dy, size) => {
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
      // opacity 별도 적용은 호출측에서 알파 변조
      dst[di] = Math.round(src.pixels[si] * a + dst[di] * inv)
      dst[di + 1] = Math.round(src.pixels[si + 1] * a + dst[di + 1] * inv)
      dst[di + 2] = Math.round(src.pixels[si + 2] * a + dst[di + 2] * inv)
      dst[di + 3] = 255
    }
  }
}

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

const writePng = (file, width, height, rgba) => {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0
    rgba.copy(raw, o, y * width * 4, (y + 1) * width * 4)
    o += width * 4
  }
  const compressed = zlib.deflateSync(raw, { level: 9 })
  const crc = (type, data) => {
    const c = Buffer.concat([Buffer.from(type), data])
    let crcVal = zlib.crc32 ? zlib.crc32(c) : (() => {
      // node < has crc32 on zlib in recent versions; fallback
      let crcTable
      const make = () => {
        crcTable = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
          let c = n
          for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
          crcTable[n] = c
        }
      }
      make()
      let crc = 0xffffffff
      for (let i = 0; i < c.length; i++) crc = crcTable[(crc ^ c[i]) & 0xff] ^ (crc >>> 8)
      return (crc ^ 0xffffffff) >>> 0
    })()
    return crcVal >>> 0
  }
  // Use crypto-free CRC
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
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
  fs.writeFileSync(file, png)
}

const wood = loadAsset('bead-wood.png')
const gem = loadAsset('bead-gem.png')
const arc = loadAsset('focus-arc.png')

const rgba = Buffer.alloc(W * H * 4, 0)
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = 12
  rgba[i * 4 + 1] = 10
  rgba[i * 4 + 2] = 8
  rgba[i * 4 + 3] = 255
}

const beads = layoutRing({ ...DEFAULT_RING, visible: VISIBLE_BEADS, phaseIndex: 0 })
for (const b of beads) {
  const src = b.focused ? gem : wood
  blitAlpha(rgba, W, H, src, b.left, b.top, b.size, b.opacity)
}
const marker = layoutFocusMarker(DEFAULT_RING)
blit(rgba, W, H, arc, marker.left, marker.top, marker.size)

// HUD chips (sim)
const fillRect = (x, y, w, h, r, g, b, a) => {
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= H) continue
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= W) continue
      const i = (yy * W + xx) * 4
      const aa = a / 255
      rgba[i] = Math.round(r * aa + rgba[i] * (1 - aa))
      rgba[i + 1] = Math.round(g * aa + rgba[i + 1] * (1 - aa))
      rgba[i + 2] = Math.round(b * aa + rgba[i + 2] * (1 - aa))
    }
  }
}
fillRect(156, 18, 120, 36, 26, 20, 16, 220)
fillRect(76, 430, 280, 56, 26, 20, 16, 230)

fs.mkdirSync(outDir, { recursive: true })
writePng(outPath, W, H, rgba)
console.log('wrote', outPath)
console.log('NOTE: simulation preview, NOT a device screenshot')
console.log(
  JSON.stringify(
    {
      maxSize: DEFAULT_RING.maxSize,
      minSize: DEFAULT_RING.minSize,
      rx: DEFAULT_RING.rx,
      ry: DEFAULT_RING.ry,
      cx: DEFAULT_RING.cx,
      cy: DEFAULT_RING.cy,
      visible: VISIBLE_BEADS,
      frontRatio: +(DEFAULT_RING.maxSize / W).toFixed(3)
    },
    null,
    2
  )
)
