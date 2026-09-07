/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useRef } from 'react'
import { View } from '@tarojs/components'
import { SlotMachine } from '@lucky-canvas/taro/react'
import './index.scss'

const SpSlot = ({ config, onDrawPrize, onGameEnd, isDrawing, canDraw = true, onBlocked, style }) => {
  const slotRef = useRef(null)

  // 开始抽奖
  const handleStart = async () => {
    if (isDrawing || !slotRef.current) return
    if (!canDraw) {
      onBlocked && onBlocked()
      return
    }

    try {
      // 调用父组件的抽奖接口获取结果
      const result = await onDrawPrize()

      if (result?.code === 0) {
        slotRef.current.play()
        const idx =
          typeof result?.data?.sectorIndex === 'number' && result.data.sectorIndex >= 0
            ? result.data.sectorIndex
            : result?.prizeIndex || 0
        setTimeout(() => {
          slotRef.current.stop(idx)
        }, 500)
      }
    } catch (err) {
      console.error('抽奖出错:', err)
    }
  }

  // 抽奖结束
  const handleEnd = (prize) => {
    onGameEnd && onGameEnd()
  }

  return (
    <View className='sp-slot' style={style} onClick={handleStart}>
      <SlotMachine
        ref={slotRef}
        width={config.width || '300px'}
        height={config.height || '240px'}
        blocks={config.blocks || []}
        prizes={config.prizes || []}
        slots={config.slots || []}
        defaultConfig={config.defaultConfig || {}}
        defaultStyle={config.defaultStyle || {}}
        onStart={handleStart}
        onEnd={handleEnd}
      />
    </View>
  )
}

export default SpSlot
