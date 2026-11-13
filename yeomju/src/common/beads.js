/**
 * 염주 카운트 순수 로직 (워치 런타임 / Node 테스트 공용).
 * 2.7.0: 기본·금박나무·옥·연핑크옥 (한자 테마 폐기).
 */

/** 한 바퀴 알 개수 선택지 (염주/묵주 관례) — 기본 108, UI 노출 없음 */
export const BEAD_OPTIONS = [108, 54, 27, 21]

/** 입력 방식: 슬라이드(기본) / 터치(탭=한 칸 앞) */
export const INPUT_MODES = Object.freeze(['slide', 'touch'])

export const INPUT_MODE_LABELS = Object.freeze({
  slide: '슬라이드',
  touch: '터치'
})

export const INPUT_MODE_HINTS = Object.freeze({
  slide: '위·아래 스와이프로 굴리기',
  touch: '탭 1회 = 한 칸 앞으로'
})

/** 염주 테마 (한자 ommani/namu 는 폐기 → default 폴백) */
export const BEAD_THEMES = Object.freeze([
  'default',
  'goldwood',
  'jade',
  'pinkjade'
])

export const BEAD_THEME_LABELS = Object.freeze({
  default: '기본',
  goldwood: '금박 나무',
  jade: '옥',
  pinkjade: '연핑크 옥'
})

export const BEAD_THEME_HINTS = Object.freeze({
  default: '나무 구슬',
  goldwood: '금박 나뭇결',
  jade: '옥구슬',
  pinkjade: '연핑크 옥구슬'
})

export const DEFAULT_STATE = Object.freeze({
  bead: 0,
  rounds: 0,
  beadsPerRound: 108,
  vibrateOnBead: true,
  todayDate: '',
  todayTotal: 0,
  inputMode: 'slide',
  beadTheme: 'default',
  stateSchema: 13
})

/**
 * YYYY-MM-DD (로컬 시각)
 * @param {Date} [date]
 * @returns {string}
 */
export const formatDate = (date = new Date()) => {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return y + '-' + pad(m) + '-' + pad(d)
}

const resolveTheme = (raw) => {
  const t = String(raw || '')
  if (BEAD_THEMES.includes(t)) return t
  // 폐기된 한자 테마 등 → 기본
  return 'default'
}

/**
 * 저장값/부분 객체를 안전한 상태로 정규화.
 * @param {object} [raw]
 * @returns {object}
 */
export const normalizeState = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {}
  const beadsPerRound = BEAD_OPTIONS.includes(Number(src.beadsPerRound))
    ? Number(src.beadsPerRound)
    : DEFAULT_STATE.beadsPerRound

  const beadNum = Math.max(0, Math.floor(Number(src.bead) || 0))
  const rounds = Math.max(0, Math.floor(Number(src.rounds) || 0))
  const todayTotal = Math.max(0, Math.floor(Number(src.todayTotal) || 0))

  const inputMode = INPUT_MODES.includes(String(src.inputMode))
    ? String(src.inputMode)
    : DEFAULT_STATE.inputMode

  const beadTheme = resolveTheme(src.beadTheme)

  const schemaRaw = Math.floor(Number(src.stateSchema) || 0)
  const stateSchema = schemaRaw > 0 ? schemaRaw : 1

  return {
    bead: beadNum % beadsPerRound,
    rounds,
    beadsPerRound,
    vibrateOnBead: src.vibrateOnBead !== false,
    todayDate: typeof src.todayDate === 'string' ? src.todayDate : '',
    todayTotal,
    inputMode,
    beadTheme,
    stateSchema
  }
}

/**
 * 2.7.0: schema≥13. 한자 테마 폐기.
 * @param {object} state
 * @returns {{ state: object, migrated: boolean }}
 */
export const migrateAnimModeForStability = (state) => {
  const s = normalizeState(state)
  if (s.stateSchema >= 13) {
    return { state: s, migrated: false }
  }
  return {
    state: {
      ...s,
      stateSchema: 13,
      inputMode: INPUT_MODES.includes(s.inputMode) ? s.inputMode : 'slide',
      beadTheme: resolveTheme(s.beadTheme)
    },
    migrated: true
  }
}

export const ensureToday = (state, today) => {
  const s = normalizeState(state)
  if (s.todayDate === today) {
    return { state: s, rolled: false }
  }
  return {
    state: { ...s, todayDate: today, todayTotal: 0 },
    rolled: true
  }
}

export const advanceBead = (state) => {
  const s = normalizeState(state)
  const next = s.bead + 1
  if (next >= s.beadsPerRound) {
    return {
      state: {
        ...s,
        bead: 0,
        rounds: s.rounds + 1,
        todayTotal: s.todayTotal + 1
      },
      completedRound: true
    }
  }
  return {
    state: { ...s, bead: next, todayTotal: s.todayTotal + 1 },
    completedRound: false
  }
}

export const retreatBead = (state) => {
  const s = normalizeState(state)
  if (s.bead <= 0) {
    if (s.rounds <= 0) {
      return { state: s, completedRound: false }
    }
    return {
      state: {
        ...s,
        bead: s.beadsPerRound - 1,
        rounds: s.rounds - 1,
        todayTotal: Math.max(0, s.todayTotal - 1)
      },
      completedRound: false
    }
  }
  return {
    state: {
      ...s,
      bead: s.bead - 1,
      todayTotal: Math.max(0, s.todayTotal - 1)
    },
    completedRound: false
  }
}

/** 양방향 모두 +1 (제품 기본) */
export const SWIPE_COUNT_MODE = 'plus_both'

export const applySwipeCount = (state, dir) => {
  void dir
  return advanceBead(state)
}

export const setBeadsPerRound = (state, n) => {
  const s = normalizeState(state)
  const beadsPerRound = BEAD_OPTIONS.includes(Number(n))
    ? Number(n)
    : s.beadsPerRound
  return {
    ...s,
    beadsPerRound,
    bead: s.bead % beadsPerRound
  }
}

export const setVibrateOnBead = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, vibrateOnBead: !!enabled }
}

export const setInputMode = (state, mode) => {
  const s = normalizeState(state)
  const inputMode = INPUT_MODES.includes(String(mode)) ? String(mode) : 'slide'
  return { ...s, inputMode }
}

export const setBeadTheme = (state, theme) => {
  const s = normalizeState(state)
  return { ...s, beadTheme: resolveTheme(theme) }
}

export const resetSession = (state) => {
  const s = normalizeState(state)
  return { ...s, bead: 0, rounds: 0 }
}

export const resetAll = (state, today = formatDate()) => {
  const s = normalizeState(state)
  return {
    ...s,
    bead: 0,
    rounds: 0,
    todayDate: today,
    todayTotal: 0
  }
}

export const progressRatio = (state) => {
  const s = normalizeState(state)
  if (s.beadsPerRound <= 0) return 0
  return s.bead / s.beadsPerRound
}

export const serializeState = (state) => JSON.stringify(normalizeState(state))

export const deserializeState = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return normalizeState({ todayDate: formatDate() })
  }
  try {
    return normalizeState(JSON.parse(raw))
  } catch (e) {
    return normalizeState({ todayDate: formatDate() })
  }
}
