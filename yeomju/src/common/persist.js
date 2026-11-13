/**
 * system.storage 래퍼.
 * 2.0.1: STORAGE_KEY v2 + v1 마이그레이션(E/D→A).
 */
import storage from '@system.storage'
import {
  normalizeState,
  formatDate,
  ensureToday,
  serializeState,
  deserializeState,
  migrateAnimModeForStability
} from './beads.js'

export const STORAGE_KEY = 'yeomju.state.v2'
export const STORAGE_KEY_LEGACY = 'yeomju.state.v1'
export { serializeState, deserializeState }

const storageGet = (key) =>
  new Promise((resolve) => {
    storage.get({
      key,
      default: '',
      success: (data) => resolve(typeof data === 'string' ? data : ''),
      fail: () => resolve('')
    })
  })

/**
 * @returns {Promise<object>}
 */
export const loadState = () =>
  new Promise((resolve) => {
    const finish = (raw) => {
      const parsed = deserializeState(raw)
      const { state: todayState } = ensureToday(parsed, formatDate())
      const { state, migrated } = migrateAnimModeForStability(todayState)
      if (migrated || !raw) {
        saveState(state).then(() => resolve(state))
        return
      }
      resolve(state)
    }

    storageGet(STORAGE_KEY).then((data) => {
      if (data) {
        finish(data)
        return
      }
      // v1 → v2 이전
      storageGet(STORAGE_KEY_LEGACY).then((legacy) => {
        finish(legacy || '')
      })
    })
  })

/**
 * @param {object} state
 * @returns {Promise<boolean>}
 */
export const saveState = (state) =>
  new Promise((resolve) => {
    storage.set({
      key: STORAGE_KEY,
      value: serializeState(normalizeState(state)),
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
