/**
 * 2.4.4: 진단 타이밍 최근 N회 저장 (상태와 분리).
 */
import storage from '@system.storage'
import {
  TIMING_AVG_N,
  normalizeTimingList,
  timingAverages,
  formatSampleLine,
  DIAG_PANEL
} from './timing-core.js'

export {
  TIMING_AVG_N,
  normalizeTimingList,
  timingAverages,
  formatSampleLine,
  DIAG_PANEL
}

export const TIMING_STORAGE_KEY = 'yeomju.timing.v1'

/** @returns {Promise<object[]>} */
export const loadTimingSamples = () =>
  new Promise((resolve) => {
    storage.get({
      key: TIMING_STORAGE_KEY,
      default: '[]',
      success: (data) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data || '[]') : []
          resolve(normalizeTimingList(parsed))
        } catch (e) {
          resolve([])
        }
      },
      fail: () => resolve([])
    })
  })

/**
 * @param {object[]} list
 * @returns {Promise<boolean>}
 */
export const saveTimingSamples = (list) =>
  new Promise((resolve) => {
    storage.set({
      key: TIMING_STORAGE_KEY,
      value: JSON.stringify(normalizeTimingList(list)),
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })

/**
 * @param {object} sample
 * @returns {Promise<object[]>}
 */
export const pushTimingSample = async (sample) => {
  const prev = await loadTimingSamples()
  const next = normalizeTimingList([...prev, sample])
  await saveTimingSamples(next)
  return next
}
