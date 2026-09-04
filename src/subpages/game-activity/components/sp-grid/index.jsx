/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useRef } from 'react'
import { View } from '@tarojs/components'
import { LuckyGrid } from '@lucky-canvas/taro/react'
import './index.scss'

const SpGrid = ({ config, onDrawPrize, isDrawing, onGameEnd, canDraw = true, onBlocked }) => {
  const luckyGridRef = useRef()

  // 开始抽奖
  const handleStart = async () => {
    if (isDrawing || !luckyGridRef.current) return
    if (!canDraw) {
      onBlocked && onBlocked()
      return
    }

    try {
      // 调用父组件的抽奖接口获取结果
      const result = await onDrawPrize()

      if (result?.code === 0) {
        luckyGridRef.current.play()
        const idx =
          typeof result?.data?.sectorIndex === 'number' && result.data.sectorIndex >= 0
            ? result.data.sectorIndex
            : result?.prizeIndex || 0
        setTimeout(() => {
          luckyGridRef.current.stop(idx)
        }, 500)
      }
    } catch (err) {
      console.error('抽奖出错:', err)
    }
  }

  // 抽奖结束
  const handleEnd = () => {
    onGameEnd && onGameEnd()
  }

  return (
    <View className='sp-grid'>
      <LuckyGrid
        ref={luckyGridRef}
        width={config.width || '300px'}
        height={config.height || '300px'}
        blocks={config.blocks || []}
        prizes={config.prizes || []}
        buttons={config.buttons || []}
        defaultConfig={config.defaultConfig || {}}
        defaultStyle={config.defaultStyle || {}}
        activeStyle={config.activeStyle || {}}
        onStart={handleStart}
        onEnd={handleEnd}
        rows={config.rows || 3}
        cols={config.cols || 3}
      />
    </View>
  )
}

export default SpGrid
