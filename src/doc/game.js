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

/** 活动状态：notstart | online | expire */
export const resolveActivityStatus = (activity = {}) => {
  const status = activity.status || activity.activity_status
  if (status === 'notstart' || status === 'online' || status === 'expire') {
    return status
  }
  const now = Math.floor(Date.now() / 1000)
  const begin = Number(activity.begin_time) || 0
  const end = Number(activity.end_time) || 0
  if (begin && begin > now) return 'notstart'
  if (end && end <= now) return 'expire'
  return 'online'
}

// 游戏配置映射 - 扁平化activityConfig，但保留gameConfig
export const GAME_CONFIG = {
  gameType: 'gameType',
  backgroundImage: 'backgroundImage',
  backgroundColor: 'backgroundColor',
  gameMarginTop: 'gameMarginTop',
  recordFormConfig: ({ gameConfig }) => {
    if (!gameConfig?.recordFormConfig) return {}
    return gameConfig?.recordFormConfig
  },
  ruleFormConfig: ({ gameConfig }) => {
    if (!gameConfig?.ruleFormConfig) return {}
    return gameConfig?.ruleFormConfig
  },
  gameConfig: ({ gameConfig }) => {
    if (!gameConfig) return {}

    const newGameConfig = { ...gameConfig }

    // 处理prizes中的fonts
    if (newGameConfig.prizes && Array.isArray(newGameConfig.prizes)) {
      newGameConfig.prizes = newGameConfig.prizes?.map((prize) => {
        const newPrize = { ...prize }
        if (
          newPrize.fonts &&
          typeof newPrize.fonts === 'object' &&
          !Array.isArray(newPrize.fonts)
        ) {
          newPrize.fonts = [newPrize.fonts]
        }
        return newPrize
      })
    }

    // 处理buttons中的fonts
    if (newGameConfig.buttons && Array.isArray(newGameConfig.buttons)) {
      newGameConfig.buttons = newGameConfig.buttons?.map((button) => {
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
    console.log('newGameConfig----', newGameConfig)
    return newGameConfig
  }
}
