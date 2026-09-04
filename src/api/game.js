/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { $t } from '@/i18n'
import { normalizeLuckyDrawData } from '@/doc/game'
import req from './req'

const ERROR_CODE_I18N = {
  LUCKY_DRAW_ACTIVITY_NOT_FOUND: '7b1e93f4.2c4cd7',
  LUCKY_DRAW_NOT_STARTED: '7b1e93f4.7527b8',
  LUCKY_DRAW_ENDED: '7b1e93f4.cdae1c',
  LUCKY_DRAW_TOTAL_LIMIT: '7b1e93f4.a5298f',
  LUCKY_DRAW_DAILY_LIMIT: '7b1e93f4.b40a4a',
  LUCKY_DRAW_POINT_NOT_ENOUGH: '7b1e93f4.997086',
  LUCKY_DRAW_REQUEST_ID_INVALID: '7b1e93f4.892115',
  LUCKY_DRAW_GRANT_FAILED: '7b1e93f4.692153',
  LUCKY_DRAW_COST_FAILED: '7b1e93f4.614d84',
  LUCKY_DRAW_CONFIG_VERSION_CONFLICT: '7b1e93f4.a4590f'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function createDrawRequestId() {
  return `01J${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function pickLuckyDrawCode(...candidates) {
  for (const value of candidates) {
    if (value === undefined || value === null || value === '') continue
    const text = String(value)
    if (ERROR_CODE_I18N[text]) return text
    const matched = text.match(/LUCKY_DRAW_[A-Z0-9_]+/)
    if (matched && ERROR_CODE_I18N[matched[0]]) return matched[0]
  }
  return ''
}

function pickErrorCode(payload = {}) {
  return pickLuckyDrawCode(
    payload.code,
    payload.error_code,
    payload.errorCode,
    payload?.data?.code,
    payload?.data?.error_code,
    payload.message,
    payload.msg,
    payload?.data?.message
  )
}

function pickErrorMessage(payload = {}) {
  return payload.message || payload.msg || payload?.data?.message || ''
}

export function mapDrawErrorMessage(errorOrPayload) {
  const payload =
    errorOrPayload?.res?.data?.data ||
    errorOrPayload?.res?.data ||
    errorOrPayload?.data ||
    errorOrPayload ||
    {}
  const code = pickLuckyDrawCode(
    pickErrorCode(payload),
    errorOrPayload?.code,
    errorOrPayload?.message,
    pickErrorMessage(payload)
  )
  if (code && ERROR_CODE_I18N[code]) {
    return $t(ERROR_CODE_I18N[code])
  }
  const msg = pickErrorMessage(payload) || errorOrPayload?.message
  if (msg) return msg
  return $t('7b1e93f4.15509f')
}

export function normalizeDrawResult(raw = {}) {
  const prizeType = raw.prizeType || raw.prize_type || ''
  const prizeTitle = raw.prizeTitle || raw.prize_title || ''
  let prizeValue = raw.prizeValue ?? raw.prize_value
  // 接口可能只回 prizeTitle（如「10积分」），补齐 prizeValue 供结果弹窗展示
  if ((prizeValue === undefined || prizeValue === null || prizeValue === '') && prizeType === 'points') {
    const matched = String(prizeTitle).match(/(\d+)/)
    if (matched) prizeValue = matched[1]
  }
  const isWin =
    typeof raw.isWin === 'boolean'
      ? raw.isWin
      : prizeType
      ? prizeType !== 'thanks'
      : !!prizeTitle && prizeTitle.indexOf('谢谢') === -1

  return {
    activityId: raw.activityId ?? raw.activity_id,
    recordId: raw.recordId ?? raw.record_id,
    requestId: raw.requestId || raw.request_id,
    status: raw.status || 'SUCCESS',
    prizeId: raw.prizeId || raw.prize_id || '',
    sectorIndex:
      raw.sectorIndex !== undefined && raw.sectorIndex !== null
        ? Number(raw.sectorIndex)
        : raw.sector_index !== undefined && raw.sector_index !== null
        ? Number(raw.sector_index)
        : -1,
    prizeType,
    prizeTitle,
    prizeValue,
    prizeImage: raw.prizeImage || raw.prize_image || '',
    costPoints: raw.costPoints ?? raw.cost_points ?? raw.costPoints,
    remainPoints: raw.remainPoints ?? raw.remain_points,
    isWin,
    // 兼容旧结果弹窗读取结构
    prize_type: prizeType,
    prize_title: prizeTitle,
    prize_value: prizeValue
  }
}

async function pollDrawResult({ requestId, recordId }, { maxTimes = 8, intervalMs = 500 } = {}) {
  for (let i = 0; i < maxTimes; i++) {
    await sleep(intervalMs)
    const res = await getDrawResult({ requestId, recordId, showError: false })
    const normalized = normalizeDrawResult(res || {})
    if (normalized.status && normalized.status !== 'PROCESSING') {
      return normalized
    }
  }
  const err = new Error($t('7b1e93f4.15509f'))
  err.code = 'LUCKY_DRAW_PROCESSING_TIMEOUT'
  throw err
}

/** 抽奖：POST + requestId；PROCESSING 时轮询 result */
export const drawPrize = async (activityId, options = {}) => {
  const requestId = options.requestId || createDrawRequestId()
  try {
    const res = await req.post('/promotion/turntable', {
      activity_id: activityId,
      requestId,
      showError: false
    })

    let normalized = normalizeDrawResult(res || {})
    if (normalized.status === 'PROCESSING') {
      normalized = await pollDrawResult({
        requestId: normalized.requestId || requestId,
        recordId: normalized.recordId
      })
    }

    if (normalized.status === 'GRANT_FAILED') {
      return {
        code: 'LUCKY_DRAW_GRANT_FAILED',
        message: $t('7b1e93f4.692153'),
        data: normalized
      }
    }

    return {
      code: 0,
      data: normalized,
      message: 'success'
    }
  } catch (error) {
    const message = mapDrawErrorMessage(error)
    const payload = error?.res?.data?.data || error?.res?.data || {}
    const code =
      pickLuckyDrawCode(
        pickErrorCode(payload),
        error?.code,
        error?.message,
        pickErrorMessage(payload)
      ) ||
      String(payload.code || payload.error_code || error?.code || 1)
    return {
      code,
      message,
      data: null
    }
  }
}

export const getDrawResult = (params = {}) => {
  const { requestId, recordId, showError = false } = params
  return req.get('/promotion/turntable/result', {
    requestId,
    recordId,
    showError
  })
}

// 获取游戏活动配置
export const getGameConfig = async (params = {}) => {
  const res = await req.get('/promotion/getLuckyDrawData', params)
  return normalizeLuckyDrawData(res || {})
}

// 获取抽奖记录
export const getDrawRecords = (id) => {
  return req.get('/promotion/getLuckyDrawLog', {
    id
  })
}
