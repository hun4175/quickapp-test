/**
 * system.storage 래퍼.
 * - 설정(집중·휴식·반복·테마): SETTINGS_KEY
 * - 0.1.10: 타이머 화면 세션(일시정지 상태로 보존): SESSION_KEY. 앱이 백그라운드로 가거나 끝날 때 저장하고,
 *   프로세스가 새로 뜨면 일시정지 상태로 복원한다. 길게 눌러 설정으로 가거나 세션이 끝나면 '' 로 지운다.
 */
import storage from '@system.storage'
import {
  SETTINGS_KEY,
  LEGACY_STATE_KEY,
  SESSION_KEY,
  serializeSettings,
  deserializeSettings,
  serializeSession,
  deserializeSession
} from './timer.js'

const storageGet = (key) =>
  new Promise((resolve) => {
    try {
      storage.get({
        key: key,
        default: '',
        success: (data) => resolve(typeof data === 'string' ? data : ''),
        fail: () => resolve('')
      })
    } catch (e) {
      resolve('')
    }
  })

export const loadSettings = () =>
  storageGet(SETTINGS_KEY).then((raw) => {
    if (raw) return deserializeSettings(raw, '')
    return storageGet(LEGACY_STATE_KEY).then((legacy) => deserializeSettings('', legacy))
  })

const storageSet = (key, value) =>
  new Promise((resolve) => {
    try {
      storage.set({
        key: key,
        value: value,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } catch (e) {
      resolve(false)
    }
  })

export const saveSettings = (settings) => storageSet(SETTINGS_KEY, serializeSettings(settings))

/** @returns Promise<{ state, theme } | null> 항상 일시정지 상태. */
export const loadSession = () => storageGet(SESSION_KEY).then((raw) => deserializeSession(raw, Date.now()))

/** state 가 없거나 끝났으면 '' 로 지운다. */
export const saveSession = (state, theme) => storageSet(SESSION_KEY, serializeSession(state, theme))
