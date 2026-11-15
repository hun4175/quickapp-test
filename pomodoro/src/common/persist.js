/**
 * system.storage 래퍼. 타이머 상태만 로컬에 저장한다.
 */
import storage from '@system.storage'
import {
  STORAGE_KEY,
  serializeState,
  deserializeState,
  initialState
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

export const loadState = () =>
  new Promise((resolve) => {
    storageGet(STORAGE_KEY).then((data) => {
      resolve(data ? deserializeState(data) : initialState())
    })
  })

export const saveState = (state) =>
  new Promise((resolve) => {
    try {
      storage.set({
        key: STORAGE_KEY,
        value: serializeState(state),
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } catch (e) {
      resolve(false)
    }
  })
