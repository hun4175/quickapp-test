/**
 * 2.5.1 스프라이트 메타 (gen-sprite-frames.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = 150
export const SPRITE_FRAME_COUNT = 4
export const SPRITE_CROP = Object.freeze({"left": 85, "top": 0, "width": 347, "height": 514})
export const SPRITE_IDLE = "/common/sprite/idle.png"
export const SPRITE_NEXT = Object.freeze(["/common/sprite/idle.png", "/common/sprite/next-1.png", "/common/sprite/next-2.png", "/common/sprite/idle.png"])
export const SPRITE_PREV = Object.freeze(["/common/sprite/idle.png", "/common/sprite/prev-1.png", "/common/sprite/prev-2.png", "/common/sprite/idle.png"])
export const SPRITE_FILES_SUM_BYTES = 831197

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({ src }))
