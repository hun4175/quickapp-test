/**
 * system.storage 래퍼. 설정(집중·휴식·반복)만 저장한다.
 * 진행 중 타이머 상태는 저장하지 않는다: 앱을 다시 열거나 백그라운드에서 돌아오면 항상 설정부터.
 */
import storage from '@system.storage'
import {
  SETTINGS_KEY,
  LEGACY_STATE_KEY,
  serializeSettings,
  deserializeSettings
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

export const saveSettings = (settings) =>
  new Promise((resolve) => {
    try {
      storage.set({
        key: SETTINGS_KEY,
        value: serializeSettings(settings),
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } catch (e) {
      resolve(false)
    }
  })
