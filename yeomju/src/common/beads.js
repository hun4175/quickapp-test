/**
 * 염주 카운트 순수 로직 (워치 런타임 / Node 테스트 공용).
 * 2.8.1: 현재/목표 표시 · 달성 시 0 리셋 · 1080 목표 해금.
 */

/** 한 바퀴 알 개수 선택지 (염주/묵주 관례) — 기본 108, UI 노출 없음 */
export const BEAD_OPTIONS = [108, 54, 27, 21]

/** 목표 횟수 (메인 카운트 기준) — 기본 21 */
export const GOAL_OPTIONS = Object.freeze([21, 54, 108, 1080])

/** 금박 나무 해금에 필요한 누적 카운트 */
export const GOLDWOOD_UNLOCK_AT = 1080

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

/** 염주 섹션 설명 (테마 공통) */
export const BEAD_THEME_SECTION_HINT = '구슬 재질'

export const BEAD_THEME_HINTS = Object.freeze({
  default: '구슬 재질',
  goldwood: '구슬 재질',
  jade: '구슬 재질',
  pinkjade: '구슬 재질'
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
  showCount: true,
  goalCount: 21,
  unlockGoldwood: false,
  stateSchema: 15
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
  return 'default'
}

const resolveGoal = (raw) => {
  const n = Math.floor(Number(raw) || 0)
  return GOAL_OPTIONS.includes(n) ? n : DEFAULT_STATE.goalCount
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

  let beadTheme = resolveTheme(src.beadTheme)
  const showCount = src.showCount !== false
  const goalCount = resolveGoal(src.goalCount)
  // 명시 true만 해금. 미해금인데 goldwood면 default로 폴백
  let unlockGoldwood = src.unlockGoldwood === true
  if (beadTheme === 'goldwood' && !unlockGoldwood) {
    beadTheme = 'default'
  }

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
    showCount,
    goalCount,
    unlockGoldwood,
    stateSchema
  }
}

/**
 * 2.8.0: schema≥15. goalCount·unlockGoldwood.
 * 기존 사용자: goalCount=21. 이미 goldwood 사용 중이면 해금 유지.
 * @param {object} state
 * @returns {{ state: object, migrated: boolean }}
 */
export const migrateAnimModeForStability = (state) => {
  const raw = state && typeof state === 'object' ? state : {}
  const s = normalizeState(raw)
  if (s.stateSchema >= 15) {
    return { state: s, migrated: false }
  }

  const hadGoldwood = resolveTheme(raw.beadTheme) === 'goldwood'
  const unlockGoldwood =
    raw.unlockGoldwood === true ||
    hadGoldwood ||
    s.todayTotal >= GOLDWOOD_UNLOCK_AT

  let beadTheme = resolveTheme(raw.beadTheme)
  if (beadTheme === 'goldwood' && !unlockGoldwood) {
    beadTheme = 'default'
  }

  return {
    state: {
      ...s,
      stateSchema: 15,
      inputMode: INPUT_MODES.includes(s.inputMode) ? s.inputMode : 'slide',
      beadTheme,
      showCount: s.showCount !== false,
      goalCount: resolveGoal(raw.goalCount),
      unlockGoldwood
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

/**
 * 카운트 증가 후 목표·해금 이벤트.
 * 목표 달성 시 todayTotal→0 리셋(다시 시작). 배수 재축하 없음.
 * 금박 해금: goalCount===1080 이고 방금 달성했을 때만.
 * @param {number} prevTotal
 * @param {object} state  advance 이후 상태
 * @returns {{ state: object, goalReached: boolean, unlockJustNow: boolean }}
 */
export const evaluateGoalEvents = (prevTotal, state) => {
  const s = normalizeState(state)
  const prev = Math.max(0, Math.floor(Number(prevTotal) || 0))
  const next = s.todayTotal
  const goal = s.goalCount > 0 ? s.goalCount : DEFAULT_STATE.goalCount
  // 방금 목표에 도달(또는 넘어감). 이미 리셋된 0에서는 발동하지 않음.
  const goalReached = next >= goal && prev < goal

  if (!goalReached) {
    return { state: s, goalReached: false, unlockJustNow: false }
  }

  let unlockJustNow = false
  let nextState = { ...s, todayTotal: 0 }
  if (!s.unlockGoldwood && goal === GOLDWOOD_UNLOCK_AT) {
    unlockJustNow = true
    nextState = {
      ...nextState,
      unlockGoldwood: true,
      beadTheme: 'goldwood'
    }
  }

  return {
    state: nextState,
    goalReached: true,
    unlockJustNow
  }
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
  const t = resolveTheme(theme)
  if (t === 'goldwood' && !s.unlockGoldwood) {
    return s
  }
  return { ...s, beadTheme: t }
}

export const setShowCount = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, showCount: !!enabled }
}

/**
 * 목표 변경 시 현재 카운트 0으로 리셋.
 * @param {object} state
 * @param {number} n
 * @returns {object}
 */
export const setGoalCount = (state, n) => {
  const s = normalizeState(state)
  const goalCount = resolveGoal(n)
  if (goalCount === s.goalCount) return s
  return { ...s, goalCount, todayTotal: 0 }
}

/**
 * 설정에 노출할 테마 목록 (금박 나무는 해금 후만).
 * @param {object} state
 * @returns {string[]}
 */
export const visibleBeadThemes = (state) => {
  const s = normalizeState(state)
  return BEAD_THEMES.filter((t) => t !== 'goldwood' || s.unlockGoldwood)
}

/**
 * 메인 카운트(todayTotal)만 0. bead/rounds·해금 유지.
 * @param {object} state
 * @returns {object}
 */
export const resetTodayCount = (state) => {
  const s = normalizeState(state)
  return { ...s, todayTotal: 0 }
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
