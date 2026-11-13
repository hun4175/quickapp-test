/**
 * system.storage 래퍼.
 * 워치에서만 @system.storage 사용. 순수 직렬화는 beads.js 와 함께 테스트 가능.
 */
import storage from '@system.storage'
import {
  normalizeState,
  formatDate,
  ensureToday,
  serializeState,
  deserializeState
} from './beads.js'

export const STORAGE_KEY = 'yeomju.state.v1'
export { serializeState, deserializeState }

/**
 * @returns {Promise<object>}
 */
export const loadState = () =>
  new Promise((resolve) => {
    storage.get({
      key: STORAGE_KEY,
      default: '',
      success: (data) => {
        const parsed = deserializeState(data)
        const { state } = ensureToday(parsed, formatDate())
        resolve(state)
      },
      fail: () => {
        resolve(normalizeState({ todayDate: formatDate() }))
      }
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
      value: serializeState(state),
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
