/**
 * 2.7.0 스프라이트 메타 (gen-theme-sprites.py 생성 · 수동 수정 금지)
 */
export const SPRITE_DURATION_MS = 150
export const SPRITE_FRAME_COUNT = 4
export const SPRITE_CROP = Object.freeze({"left": 86, "top": 0, "width": 346, "height": 514})
export const SPRITE_PHASES = 1

export const SPRITE_THEMES = Object.freeze({"default": {"phases": 1, "idle": ["/common/sprite/idle.jpg"], "nextByPhase": [["/common/sprite/idle.jpg", "/common/sprite/next-1.jpg", "/common/sprite/next-2.jpg", "/common/sprite/idle.jpg"]], "prevByPhase": [["/common/sprite/idle.jpg", "/common/sprite/prev-1.jpg", "/common/sprite/prev-2.jpg", "/common/sprite/idle.jpg"]]}, "goldwood": {"phases": 1, "idle": ["/common/sprite/goldwood/idle.jpg"], "nextByPhase": [["/common/sprite/goldwood/idle.jpg", "/common/sprite/goldwood/next-1.jpg", "/common/sprite/goldwood/next-2.jpg", "/common/sprite/goldwood/idle.jpg"]], "prevByPhase": [["/common/sprite/goldwood/idle.jpg", "/common/sprite/goldwood/prev-1.jpg", "/common/sprite/goldwood/prev-2.jpg", "/common/sprite/goldwood/idle.jpg"]]}, "jade": {"phases": 1, "idle": ["/common/sprite/jade/idle.jpg"], "nextByPhase": [["/common/sprite/jade/idle.jpg", "/common/sprite/jade/next-1.jpg", "/common/sprite/jade/next-2.jpg", "/common/sprite/jade/idle.jpg"]], "prevByPhase": [["/common/sprite/jade/idle.jpg", "/common/sprite/jade/prev-1.jpg", "/common/sprite/jade/prev-2.jpg", "/common/sprite/jade/idle.jpg"]]}, "pinkjade": {"phases": 1, "idle": ["/common/sprite/pinkjade/idle.jpg"], "nextByPhase": [["/common/sprite/pinkjade/idle.jpg", "/common/sprite/pinkjade/next-1.jpg", "/common/sprite/pinkjade/next-2.jpg", "/common/sprite/pinkjade/idle.jpg"]], "prevByPhase": [["/common/sprite/pinkjade/idle.jpg", "/common/sprite/pinkjade/prev-1.jpg", "/common/sprite/pinkjade/prev-2.jpg", "/common/sprite/pinkjade/idle.jpg"]]}})

export const SPRITE_IDLE = SPRITE_THEMES.default.idle[0]
export const SPRITE_NEXT = Object.freeze(SPRITE_THEMES.default.nextByPhase[0])
export const SPRITE_PREV = Object.freeze(SPRITE_THEMES.default.prevByPhase[0])
export const SPRITE_FILES_SUM_BYTES = 888504

export const themePhase = (todayTotal) => 0

export const spriteIdleFor = (theme, phase = 0) => {
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  return t.idle[0]
}

export const spriteFramesFor = (theme, dir, phase = 0) => {
  const t = SPRITE_THEMES[theme] || SPRITE_THEMES.default
  const list = Number(dir) < 0 ? t.prevByPhase[0] : t.nextByPhase[0]
  return [...list]
}

export const spriteFramesForDir = (dir) =>
  Number(dir) < 0 ? [...SPRITE_PREV] : [...SPRITE_NEXT]

export const spriteImageFrames = (dir) =>
  spriteFramesForDir(dir).map((src) => ({ src }))
