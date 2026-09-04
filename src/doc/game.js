/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { pickBy } from '@/utils'

// 游戏字体配置映射
export const GAME_FONTS = {
  text: 'text',
  top: 'top',
  fontSize: 'fontSize'
}

// 游戏奖品配置映射
export const GAME_PRIZE = {
  background: 'background',
  fonts: ({ fonts }) => {
    // 将单个font对象转换为数组格式
    if (fonts && typeof fonts === 'object' && !Array.isArray(fonts)) {
      return [fonts]
    }
    return fonts || []
  },
  x: 'x', // 九宫格特有属性
  y: 'y' // 九宫格特有属性
}

// 游戏按钮配置映射
export const GAME_BUTTON = {
  radius: 'radius',
  background: 'background',
  pointer: 'pointer',
  shadow: 'shadow',
  x: 'x', // 九宫格特有属性
  y: 'y', // 九宫格特有属性
  fonts: ({ fonts }) => {
    // 将单个font对象转换为数组格式
    if (fonts && typeof fonts === 'object' && !Array.isArray(fonts)) {
      return [fonts]
    }
    return fonts || []
  }
}

/** 活动状态：notstart | online | expire（含已终止等结束态） */
const STATUS_NOT_START = new Set(['notstart', 'not_start', 'pending', 'wait'])
const STATUS_ONLINE = new Set(['online', 'processing', 'active', 'ongoing'])
const STATUS_ENDED = new Set([
  'expire',
  'expired',
  'terminate',
  'terminated',
  'closed',
  'offline',
  'end',
  'ended',
  'stop',
  'stopped'
])

export const resolveActivityStatus = (activity = {}) => {
  const raw = activity.status || activity.activity_status || ''
  const status = String(raw).toLowerCase()

  if (STATUS_ENDED.has(status) || activity.is_terminate || activity.is_end) {
    return 'expire'
  }
  if (STATUS_NOT_START.has(status)) {
    return 'notstart'
  }
  if (STATUS_ONLINE.has(status)) {
    return 'online'
  }

  const now = Math.floor(Date.now() / 1000)
  const begin = Number(activity.begin_time) || 0
  const end = Number(activity.end_time) || 0
  if (begin && begin > now) return 'notstart'
  if (end && end <= now) return 'expire'
  return 'online'
}

/** 解析后台可能返回的 JSON 字符串字段 */
export const parseJsonField = (value, fallback = {}) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return fallback
    }
  }
  return fallback
}

/** "150px" / 150 → number */
export const parseSizeNumber = (val, fallback = 150) => {
  if (val === undefined || val === null || val === '') return fallback
  if (typeof val === 'number' && Number.isFinite(val)) return val
  const n = parseInt(String(val), 10)
  return Number.isFinite(n) ? n : fallback
}

const pickPrizeImage = (p = {}) =>
  p.image ||
  p.img ||
  p.prize_image ||
  p.prizeImage ||
  (typeof p.imgs === 'string' ? p.imgs : '') ||
  p.imgs?.[0]?.src ||
  p.imgs?.[0]?.url ||
  (typeof p.imgs?.[0] === 'string' ? p.imgs[0] : '') ||
  ''

/** 统一奖项字段：兼容 admin(name/type/backgroundColor/image) 与 LuckyCanvas */
export const normalizePrizeItem = (p = {}) => {
  const text =
    p.name || p.prize_title || p.prizeTitle || p.fonts?.[0]?.text || p.text || ''
  const background = p.backgroundColor || p.background || '#f9e3bb'
  const image = pickPrizeImage(p)
  const prize_type = p.prize_type || p.prizeType || p.type || ''
  const prize_value = p.prize_value ?? p.prizeValue ?? p.value
  const prize_id = p.prize_id || p.prizeId || ''
  const fonts =
    Array.isArray(p.fonts) && p.fonts.length
      ? p.fonts
      : [{ text, top: '10%', fontSize: '14px', fontColor: '#666666' }]

  return {
    ...p,
    text,
    name: text,
    background,
    backgroundColor: background,
    img: image,
    image,
    imgs: image ? [{ src: image }] : Array.isArray(p.imgs) ? p.imgs : [],
    fonts,
    prize_id,
    prizeId: prize_id,
    prize_type,
    prizeType: prize_type,
    type: prize_type,
    prize_value,
    prizeValue: prize_value,
    value: prize_value,
    sort: p.sort ?? p.sector_index ?? p.sectorIndex ?? 0
  }
}

/**
 * 归一化 getLuckyDrawData：
 * - activity_template_config 可能是 JSON 字符串
 * - 优先用顶层 prize_data 作为扇区数据
 */
export const normalizeLuckyDrawData = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return raw

  const template = parseJsonField(raw.activity_template_config, {})
  const fromPrizeData = Array.isArray(raw.prize_data) ? raw.prize_data : []
  const fromConfigPrizes = Array.isArray(template?.gameConfig?.prizes)
    ? template.gameConfig.prizes
    : []
  const prizeSource = fromPrizeData.length ? fromPrizeData : fromConfigPrizes
  const prizes = prizeSource
    .map(normalizePrizeItem)
    .sort((a, b) => Number(a.sort) - Number(b.sort))

  const gameConfig = {
    ...(template.gameConfig || {}),
    prizes,
    prizeData: prizes
  }

  const activity_template_config = {
    ...template,
    gameType: template.gameType || raw.activity_type || 'wheel',
    backgroundImage: template.backgroundImage || '',
    backgroundColor: template.backgroundColor || '#f5f5f5',
    gameMarginTop: parseSizeNumber(template.gameMarginTop, 150),
    gameConfig,
    recordFormConfig: gameConfig.recordFormConfig || template.recordFormConfig || {},
    ruleFormConfig: gameConfig.ruleFormConfig || template.ruleFormConfig || {}
  }

  return {
    ...raw,
    activity_template_config
  }
}

// 游戏配置映射 - 扁平化activityConfig，但保留gameConfig
export const GAME_CONFIG = {
  gameType: 'gameType',
  backgroundImage: 'backgroundImage',
  backgroundColor: 'backgroundColor',
  // PRD F-004：抽奖区顶部高度默认 150
  gameMarginTop: ({ gameMarginTop }) => parseSizeNumber(gameMarginTop, 150),
  recordFormConfig: (item) => {
    const fromRoot = item?.recordFormConfig
    const fromGame = item?.gameConfig?.recordFormConfig
    return fromRoot || fromGame || {}
  },
  ruleFormConfig: (item) => {
    const fromRoot = item?.ruleFormConfig
    const fromGame = item?.gameConfig?.ruleFormConfig
    return fromRoot || fromGame || {}
  },
  gameConfig: ({ gameConfig }) => {
    if (!gameConfig) return {}

    const newGameConfig = { ...gameConfig }

    if (newGameConfig.prizes && Array.isArray(newGameConfig.prizes)) {
      newGameConfig.prizes = newGameConfig.prizes.map(normalizePrizeItem)
    }
    if (newGameConfig.prizeData && Array.isArray(newGameConfig.prizeData)) {
      newGameConfig.prizeData = newGameConfig.prizeData.map(normalizePrizeItem)
    } else if (newGameConfig.prizes) {
      newGameConfig.prizeData = newGameConfig.prizes
    }

    if (newGameConfig.buttons && Array.isArray(newGameConfig.buttons)) {
      newGameConfig.buttons = newGameConfig.buttons.map((button) => {
        const newButton = { ...button }
        if (
          newButton.fonts &&
          typeof newButton.fonts === 'object' &&
          !Array.isArray(newButton.fonts)
        ) {
          newButton.fonts = [newButton.fonts]
        }
        return newButton
      })
    }
    return newGameConfig
  }
}
