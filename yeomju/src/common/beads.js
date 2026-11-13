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

/** 2.4.3: 표시 구슬 수 */
export const VISIBLE_BEAD_COUNTS = Object.freeze([1, 3, 6, 10])

/** 2.4.2+ 실험 토글 기본값 */
export const EXP_DEFAULTS = Object.freeze({
  e1Minimize: true,
  e2NoScale: false,
  e3SplitSrc: true,
  e4SkipBack: false,
  e5DirectDom: false,
  e6Solid: false
})

export const EXP_LABELS = Object.freeze({
  e1Minimize: 'E1 애니 최소화',
  e2NoScale: 'E2 scale 제거',
  e3SplitSrc: 'E3 뒷열 저해상',
  e4SkipBack: 'E4 뒷열 스냅',
  e5DirectDom: 'E5 $element 클래스',
  e6Solid: 'E6 단색 원'
})

export const EXP_HINTS = Object.freeze({
  e1Minimize: '버퍼↔버퍼 애니 생략 (기본 켜짐)',
  e2NoScale: 'translate만 · 열별 동일 크기 (형상 변경, 기본 끔)',
  e3SplitSrc: '앞255/뒤160 원본=표시 (기본 켜짐)',
  e4SkipBack: '뒷열 애니 생략·종료 스냅 (형상 변경, 기본 끔)',
  e5DirectDom: 'data 바인딩 대신 $element 직접 클래스 (API 없으면 불가)',
  e6Solid: '이미지 대신 단색 원 (디코드 분리, 기본 끔)'
})

export const DEFAULT_STATE = Object.freeze({
  bead: 0,
  rounds: 0,
  beadsPerRound: 108,
  vibrateOnBead: true,
  todayDate: '',
  todayTotal: 0,
  inputMode: 'slide',
  diagnoseLatency: false,
  /** @deprecated 2.4.3: visibleBeadCount=1 로 대체 */
  singleBeadTest: false,
  visibleBeadCount: 10,
  e1Minimize: true,
  e2NoScale: false,
  e3SplitSrc: true,
  e4SkipBack: false,
  e5DirectDom: false,
  e6Solid: false,
  stateSchema: 7
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

const normalizeVisibleCount = (raw, singleBeadTest) => {
  const n = Math.floor(Number(raw))
  if (VISIBLE_BEAD_COUNTS.includes(n)) return n
  if (singleBeadTest === true) return 1
  return DEFAULT_STATE.visibleBeadCount
}

/**
 * 저장값/부분 객체를 안전한 상태로 정규화
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

  const singleBeadTest = src.singleBeadTest === true
  const hasExp = Object.prototype.hasOwnProperty.call(src, 'e1Minimize')
  const visibleBeadCount = normalizeVisibleCount(src.visibleBeadCount, singleBeadTest)

  return {
    bead: beadNum % beadsPerRound,
    rounds,
    beadsPerRound,
    vibrateOnBead: src.vibrateOnBead !== false,
    todayDate: typeof src.todayDate === 'string' ? src.todayDate : '',
    todayTotal,
    inputMode,
    diagnoseLatency: src.diagnoseLatency === true,
    singleBeadTest: visibleBeadCount === 1,
    visibleBeadCount,
    e1Minimize: hasExp ? src.e1Minimize !== false : DEFAULT_STATE.e1Minimize,
    e2NoScale: src.e2NoScale === true,
    e3SplitSrc: Object.prototype.hasOwnProperty.call(src, 'e3SplitSrc')
      ? src.e3SplitSrc !== false
      : DEFAULT_STATE.e3SplitSrc,
    e4SkipBack: src.e4SkipBack === true,
    e5DirectDom: src.e5DirectDom === true,
    e6Solid: src.e6Solid === true,
    stateSchema
  }
}

/**
 * 2.4.3: schema≥7. 표시 구슬 수·E5/E6 기본값.
 * @param {object} state
 * @returns {{ state: object, migrated: boolean }}
 */
export const migrateAnimModeForStability = (state) => {
  const s = normalizeState(state)
  if (s.stateSchema >= 7) {
    return { state: s, migrated: false }
  }
  const fromSingle = s.singleBeadTest === true ? 1 : s.visibleBeadCount || 10
  return {
    state: {
      ...s,
      stateSchema: 7,
      inputMode: INPUT_MODES.includes(s.inputMode) ? s.inputMode : 'slide',
      diagnoseLatency: s.diagnoseLatency === true,
      singleBeadTest: fromSingle === 1,
      visibleBeadCount: normalizeVisibleCount(fromSingle, false),
      e1Minimize: s.e1Minimize !== false,
      e2NoScale: !!s.e2NoScale,
      e3SplitSrc: s.e3SplitSrc !== false,
      e4SkipBack: !!s.e4SkipBack,
      e5DirectDom: false,
      e6Solid: false
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
    state: {
      ...s,
      todayDate: today,
      todayTotal: 0
    },
    rolled: true
  }
}

export const SWIPE_COUNT_MODE = 'plus_both'

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

export const setDiagnoseLatency = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, diagnoseLatency: !!enabled }
}

export const setSingleBeadTest = (state, enabled) => {
  const s = normalizeState(state)
  const on = !!enabled
  return {
    ...s,
    singleBeadTest: on,
    visibleBeadCount: on ? 1 : s.visibleBeadCount === 1 ? 10 : s.visibleBeadCount
  }
}

export const setVisibleBeadCount = (state, count) => {
  const s = normalizeState(state)
  const visibleBeadCount = normalizeVisibleCount(count, false)
  return {
    ...s,
    visibleBeadCount,
    singleBeadTest: visibleBeadCount === 1
  }
}

export const setExpFlag = (state, key, enabled) => {
  const s = normalizeState(state)
  if (!Object.prototype.hasOwnProperty.call(EXP_DEFAULTS, key)) return s
  return { ...s, [key]: !!enabled }
}

export const setE1Minimize = (state, enabled) => setExpFlag(state, 'e1Minimize', enabled)
export const setE2NoScale = (state, enabled) => setExpFlag(state, 'e2NoScale', enabled)
export const setE3SplitSrc = (state, enabled) => setExpFlag(state, 'e3SplitSrc', enabled)
export const setE4SkipBack = (state, enabled) => setExpFlag(state, 'e4SkipBack', enabled)
export const setE5DirectDom = (state, enabled) => setExpFlag(state, 'e5DirectDom', enabled)
export const setE6Solid = (state, enabled) => setExpFlag(state, 'e6Solid', enabled)

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
