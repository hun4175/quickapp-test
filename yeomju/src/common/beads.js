/**
 * 염주 카운트 순수 로직 (워치 런타임 / Node 테스트 공용).
 * @system.* 의존 없음 — 단위 테스트로 검증한다.
 */

/** 한 바퀴 알 개수 선택지 (염주/묵주 관례) */
export const BEAD_OPTIONS = [108, 54, 27, 21]

/** 애니 모드. 2.0.1 기본 A. D/E는 실험(위험) */
export const ANIM_MODES = Object.freeze(['A', 'B', 'C', 'D', 'E'])
/** 2.0.0에서 크래시 보고된 모드 — 저장값 마이그레이션 대상 */
export const UNSAFE_ANIM_MODES = Object.freeze(['D', 'E'])

export const ANIM_MODE_LABELS = Object.freeze({
  A: 'A 구슬별 키프레임',
  B: 'B 애니 없음',
  C: 'C 통 컨테이너',
  D: 'D JS 레인(실험)',
  E: 'E 앞·뒤 레인(위험)'
})

export const ANIM_MODE_HINTS = Object.freeze({
  A: '1.8 구조+1.9 수정(기본·안정)',
  B: '즉시 스냅 — 입력 지연만',
  C: '전체 1노드 translateY',
  D: '실험: JS 레인 transform',
  E: '실험(위험): 앞·뒤 레인 키프레임'
})

export const DEFAULT_STATE = Object.freeze({
  bead: 0,
  rounds: 0,
  beadsPerRound: 108,
  vibrateOnBead: true,
  todayDate: '',
  todayTotal: 0,
  animMode: 'A',
  debugLatency: false,
  stateSchema: 2
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

  const animMode = ANIM_MODES.includes(String(src.animMode))
    ? String(src.animMode)
    : DEFAULT_STATE.animMode
  const schemaRaw = Math.floor(Number(src.stateSchema) || 0)
  const stateSchema = schemaRaw > 0 ? schemaRaw : 1

  return {
    bead: beadNum % beadsPerRound,
    rounds,
    beadsPerRound,
    vibrateOnBead: src.vibrateOnBead !== false,
    todayDate: typeof src.todayDate === 'string' ? src.todayDate : '',
    todayTotal,
    animMode,
    debugLatency: src.debugLatency === true,
    stateSchema
  }
}

/**
 * 2.0.1 최초(stateSchema < 2): E/D 저장값을 A로 내리고 schema=2.
 * 이후 사용자가 실험 모드를 고르면 유지.
 * @param {object} state
 * @returns {{ state: object, migrated: boolean }}
 */
export const migrateAnimModeForStability = (state) => {
  const s = normalizeState(state)
  if (s.stateSchema >= 2) {
    return { state: s, migrated: false }
  }
  const next = {
    ...s,
    stateSchema: 2,
    animMode: UNSAFE_ANIM_MODES.includes(s.animMode) ? 'A' : s.animMode
  }
  return { state: next, migrated: true }
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
 * - 'plus_both' : 위·아래 모두 +1 (기본 — 되돌리기 규칙이 정해지지 않음)
 * - 'down_undo' : 위=+1, 아래=-1(되돌리기)
 * 바꾸려면 이 상수만 수정.
 */
export const SWIPE_COUNT_MODE = 'plus_both'

/**
 * 염주알 하나 전진. 한 바퀴를 채우면 bead=0, rounds+1, completedRound=true
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
 * bead=0·rounds=0 이면 변화 없음.
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
 * 스와이프 한 칸에 대한 카운트 반영.
 * @param {object} state
 * @param {number} swipeDir 1=위(앞열↑), -1=아래(앞열↓)
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

/**
 * 바퀴당 알 개수 변경. 현재 알 인덱스는 새 주기로 맞춤.
 * @param {object} state
 * @param {number} beadsPerRound
 * @returns {object}
 */
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

/**
 * 진동(알마다) 토글
 * @param {object} state
 * @param {boolean} enabled
 * @returns {object}
 */
export const setVibrateOnBead = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, vibrateOnBead: !!enabled }
}

/**
 * 진단용 애니 모드
 * @param {object} state
 * @param {string} mode A|B|C|D
 * @returns {object}
 */
export const setAnimMode = (state, mode) => {
  const s = normalizeState(state)
  const animMode = ANIM_MODES.includes(mode) ? mode : DEFAULT_STATE.animMode
  return { ...s, animMode }
}

/**
 * 터치→애니 지연 디버그 표시
 * @param {object} state
 * @param {boolean} enabled
 * @returns {object}
 */
export const setDebugLatency = (state, enabled) => {
  const s = normalizeState(state)
  return { ...s, debugLatency: !!enabled }
}

/**
 * 현재 바퀴의 알·바퀴 수만 초기화 (오늘 합계 유지)
 * @param {object} state
 * @returns {object}
 */
export const resetSession = (state) => {
  const s = normalizeState(state)
  return { ...s, bead: 0, rounds: 0 }
}

/**
 * 오늘 합계 + 세션(알/바퀴) 초기화
 * @param {object} state
 * @param {string} [today]
 * @returns {object}
 */
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

/**
 * 진행률 0~1 (표시용)
 * @param {object} state
 * @returns {number}
 */
export const progressRatio = (state) => {
  const s = normalizeState(state)
  if (s.beadsPerRound <= 0) return 0
  return s.bead / s.beadsPerRound
}

/**
 * 저장용 직렬화
 * @param {object} state
 * @returns {string}
 */
export const serializeState = (state) => JSON.stringify(normalizeState(state))

/**
 * 저장값 파싱. 깨진 JSON 은 기본 상태로 복구.
 * @param {string} raw
 * @returns {object}
 */
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
