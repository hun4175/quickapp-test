/**
 * 염주 카운트 순수 로직 (워치 런타임 / Node 테스트 공용).
 * @system.* 의존 없음 — 단위 테스트로 검증한다.
 */

/** 한 바퀴 알 개수 선택지 (염주/묵주 관례) */
export const BEAD_OPTIONS = [108, 54, 27, 21]

/** 2.4.0: 애니 모드 제거. 구버전 저장값 정리용 심볼만 유지 */
export const LEGACY_ANIM_MODES = Object.freeze(['A', 'B', 'C', 'D', 'E'])
export const UNSAFE_ANIM_MODES = Object.freeze(['D', 'E'])

/** 입력 방식: 슬라이드(기본) / 터치(탭=한 칸 앞) */
export const INPUT_MODES = Object.freeze(['slide', 'touch'])

export const INPUT_MODE_LABELS = Object.freeze({
  slide: '슬라이드',
  touch: '터치'
})

export const INPUT_MODE_HINTS = Object.freeze({
  slide: '위·아래 스와이프로 굴리기',
  touch: '탭 1회 = 한 칸 앞으로 (슬라이드 무시)'
})

export const DEFAULT_STATE = Object.freeze({
  bead: 0,
  rounds: 0,
  beadsPerRound: 108,
  vibrateOnBead: true,
  todayDate: '',
  todayTotal: 0,
  inputMode: 'slide',
  stateSchema: 4
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

/**
 * 저장값/부분 객체를 안전한 상태로 정규화 (animMode/debug 제거)
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
    stateSchema
  }
}

/**
 * 2.4.0: schema≥4, 레거시 animMode/debug 제거·inputMode 확보.
 * @param {object} state
 * @returns {{ state: object, migrated: boolean }}
 */
export const migrateAnimModeForStability = (state) => {
  const s = normalizeState(state)
  if (s.stateSchema >= 4) {
    return { state: s, migrated: false }
  }
  return {
    state: {
      ...s,
      stateSchema: 4,
      inputMode: INPUT_MODES.includes(s.inputMode) ? s.inputMode : 'slide'
    },
    migrated: true
  }
}

/**
 * 날짜가 바뀌면 오늘 합계만 리셋 (바퀴/현재 알은 유지)
 * @param {object} state
 * @param {string} today
 * @returns {{ state: object, rolled: boolean }}
 */
export const ensureToday = (state, today) => {
  const s = normalizeState(state)
  if (s.todayDate === today) {
    return { state: s, rolled: false }
  }
  return {
    state: {
      ...s,
      todayDate: today,
      todayTotal: 0
    },
    rolled: true
  }
}

/**
 * 스와이프 카운트 모드.
 * - 'plus_both' : 위·아래 모두 +1 (기본)
 * - 'down_undo' : 위=+1, 아래=-1(되돌리기)
 */
export const SWIPE_COUNT_MODE = 'plus_both'

/**
 * 염주알 하나 전진.
 * @param {object} state
 * @param {string} [today]
 * @returns {{ state: object, completedRound: boolean }}
 */
export const advanceBead = (state, today = formatDate()) => {
  const ensured = ensureToday(state, today).state
  const nextBead = ensured.bead + 1
  const completedRound = nextBead >= ensured.beadsPerRound

  if (completedRound) {
    return {
      state: {
        ...ensured,
        bead: 0,
        rounds: ensured.rounds + 1,
        todayTotal: ensured.todayTotal + 1
      },
      completedRound: true
    }
  }

  return {
    state: {
      ...ensured,
      bead: nextBead,
      todayTotal: ensured.todayTotal + 1
    },
    completedRound: false
  }
}

/**
 * 염주알 하나 되돌리기(아래 스와이프 undo 모드용).
 * @param {object} state
 * @param {string} [today]
 * @returns {{ state: object, completedRound: boolean, retreated: boolean }}
 */
export const retreatBead = (state, today = formatDate()) => {
  const ensured = ensureToday(state, today).state
  if (ensured.bead > 0) {
    return {
      state: {
        ...ensured,
        bead: ensured.bead - 1,
        todayTotal: Math.max(0, ensured.todayTotal - 1)
      },
      completedRound: false,
      retreated: true
    }
  }
  if (ensured.rounds > 0) {
    return {
      state: {
        ...ensured,
        bead: ensured.beadsPerRound - 1,
        rounds: ensured.rounds - 1,
        todayTotal: Math.max(0, ensured.todayTotal - 1)
      },
      completedRound: false,
      retreated: true
    }
  }
  return { state: ensured, completedRound: false, retreated: false }
}

/**
 * 스와이프/탭 한 칸에 대한 카운트 반영.
 * 터치 모드 탭은 swipeDir=+1 로 호출 (plus_both·down_undo 동일 규칙).
 * @param {object} state
 * @param {number} swipeDir 1=앞, -1=아래
 * @param {string} [today]
 * @returns {{ state: object, completedRound: boolean }}
 */
export const applySwipeCount = (state, swipeDir, today = formatDate()) => {
  if (SWIPE_COUNT_MODE === 'down_undo' && Number(swipeDir) < 0) {
    const r = retreatBead(state, today)
    return { state: r.state, completedRound: false }
  }
  return advanceBead(state, today)
}

export const setBeadsPerRound = (state, beadsPerRound) => {
  const s = normalizeState(state)
  if (!BEAD_OPTIONS.includes(Number(beadsPerRound))) {
    return s
  }
  const n = Number(beadsPerRound)
  return {
    ...s,
    beadsPerRound: n,
    bead: s.bead % n
  }
}

export const setVibrateOnBead = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, vibrateOnBead: !!enabled }
}

export const setInputMode = (state, mode) => {
  const s = normalizeState(state)
  const inputMode = INPUT_MODES.includes(mode) ? mode : DEFAULT_STATE.inputMode
  return { ...s, inputMode }
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
