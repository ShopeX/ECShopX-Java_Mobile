/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useRef, useMemo } from 'react'
import { View } from '@tarojs/components'
import { LuckyWheel } from '@lucky-canvas/taro/react'
import { TURNTABLE_OUTER_SIZE } from '../helper'
import './index.scss'

const SpWheel = ({
  config,
  onDrawPrize,
  onGameEnd,
  isDrawing,
  canDraw = true,
  onBlocked,
  style
}) => {
  const wheelRef = useRef(null)
  const resultRef = useRef(null)

  const wheelConfig = useMemo(
    () => ({
      width: config?.width || `${TURNTABLE_OUTER_SIZE}px`,
      height: config?.height || `${TURNTABLE_OUTER_SIZE}px`,
      blocks: config?.blocks || [],
      prizes: config?.prizes || [],
      buttons: config?.buttons || [],
      defaultConfig: {
        gutter: 0,
        speed: 20,
        accelerationTime: 2500,
        decelerationTime: 2500,
        ...(config?.defaultConfig || {})
      },
      defaultStyle: config?.defaultStyle || {}
    }),
    [config]
  )

  const resolveStopIndex = (result) => {
    const data = result?.data || {}
    if (typeof data.sectorIndex === 'number' && data.sectorIndex >= 0) {
      return data.sectorIndex
    }
    const prizeType = data.prizeType || data.prize_type
    const prizeValue = data.prizeValue ?? data.prize_value
    const prizeId = data.prizeId || data.prize_id
    const prizes = config?.prizes || []
    const byId = prizes.findIndex((el) => el.prizeId === prizeId || el.prize_id === prizeId)
    if (byId >= 0) return byId
    return prizes.findIndex((el) => {
      if (prizeType === 'thanks') {
        return el.prize_type === 'thanks' || el.prizeType === 'thanks' || el.type === 'thanks'
      }
      const type = el.prize_type || el.prizeType || el.type
      const value = el.prize_value ?? el.prizeValue ?? el.value
      return type === prizeType && String(value) === String(prizeValue)
    })
  }

  const handleStart = async () => {
    if (isDrawing || !wheelRef.current) return
    if (!canDraw) {
      onBlocked && onBlocked()
      return
    }
    try {
      const result = await onDrawPrize()
      resultRef.current = result
      if (result?.code === 0) {
        wheelRef.current.play()
        setTimeout(() => {
          const idx = resolveStopIndex(result)
          wheelRef.current.stop(idx >= 0 ? idx : 0)
        }, 2000)
      }
    } catch (err) {
      console.error('抽奖出错:', err)
    }
  }

  const handleEnd = () => {
    onGameEnd && onGameEnd(resultRef.current)
  }

  return (
    <View className='sp-wheel-container' style={style}>
      <LuckyWheel ref={wheelRef} {...wheelConfig} onStart={handleStart} onEnd={handleEnd} />
    </View>
  )
}

export default SpWheel
