/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Canvas, Image, Text } from '@tarojs/components'
import { isWeixin, styleNames, classNames } from '@/utils'
import { useImmer } from 'use-immer'
import { TURNTABLE_OUTER_SIZE } from '../helper'
import './index.scss'

const SpTurntable = (props) => {
  const [state, setState] = useImmer({
    tempFilePath: '',
    prizeIndex: 0
  })

  const [lock, setLock] = useState(false)
  const [startRotateDegree, setStartRotateDegree] = useState(0)
  const [rotateAngle, setRotateAngle] = useState(0)
  const [rotateTransition, setRotateTransition] = useState('')

  const turntableDomRef = useRef(null)
  const initKeyRef = useRef('')

  const prizeData = props.prizeData || []
  const prizeNum = prizeData.length
  // 仅扇区数量/配色/尺寸变化时重绘，避免父组件每次 render 都 init 导致错位
  const sectorKey = prizeData.map((p) => `${p.background || ''}`).join('|')
  const initKey = `${prizeNum}_${props.width}_${props.height}_${sectorKey}`

  const getRotateAngle = (index) => {
    const angle = (360 / prizeNum) * index + 180 / prizeNum
    return {
      transform: `rotate(${angle}deg)`
    }
  }

  const init = async () => {
    if (!prizeNum) return
    const canvas = await new Promise((resolve) => {
      Taro.createSelectorQuery()
        .select('#turntable-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res?.[0]?.node) {
            resolve(null)
            return
          }
          const node = res[0].node
          const ctx = node.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio || 1
          node.width = res[0].width * dpr
          node.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          resolve(node)
        })
    })

    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const canvasW = parseInt(props.width, 10)
    const canvasH = parseInt(props.height, 10)

    // 与佛罗伦萨一致：微信端坐标系旋转后再画扇区
    if (isWeixin) {
      ctx.translate(0, canvasH)
      ctx.rotate((-90 * Math.PI) / 180)
    }

    const baseAngle = (Math.PI * 2) / prizeNum

    for (let index = 0; index < prizeNum; index++) {
      const startAngle = index * baseAngle
      const endAngle = (index + 1) * baseAngle
      ctx.beginPath()
      if (isWeixin) {
        ctx.moveTo(canvasW / 2, canvasH / 2)
        ctx.arc(canvasW / 2, canvasH / 2, canvasH / 2, startAngle, endAngle, false)
      } else {
        ctx.moveTo(canvasW / 2, canvasH / 2)
        ctx.arc(canvasW / 2, canvasH / 2, canvasH / 2, startAngle, endAngle, false)
      }
      ctx.fillStyle = prizeData[index].background || 'transparent'
      ctx.fill()
    }

    let turntableBkg = ''
    try {
      const { tempFilePath } = await Taro.canvasToTempFilePath(
        {
          canvas,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          destWidth: canvas.width,
          destHeight: canvas.height,
          fileType: 'png',
          quality: 1
        },
        Taro.getCurrentInstance().page
      )
      // 小程序优先用本地临时路径；CSS backgroundImage + transform 容易脱层
      turntableBkg = tempFilePath
    } catch (e) {
      try {
        turntableBkg = canvas.toDataURL?.('image/png') || ''
      } catch (err) {
        console.error('转盘 canvas 导出失败', err)
      }
    }

    if (turntableBkg) {
      setState((draft) => {
        draft.tempFilePath = turntableBkg
      })
    }
  }

  const canBeRotated = () => !lock

  const resolvePrizeIndexFromResult = (result) => {
    const data = result?.data || {}
    if (!prizeNum) return -1

    const maybeIndex = Number(data.index ?? data.sectorIndex)
    if (Number.isInteger(maybeIndex) && maybeIndex >= 0 && maybeIndex < prizeNum) {
      return maybeIndex
    }

    const prizeId = data.prizeId || data.prize_id
    const prizeType = data.prizeType || data.prize_type
    const prizeValue = data.prizeValue ?? data.prize_value

    const byId = prizeData.findIndex((el) => el.prize_id === prizeId || el.prizeId === prizeId)
    if (byId >= 0) return byId

    return prizeData.findIndex((el) => {
      if (prizeType === 'thanks') {
        return el.prize_type === 'thanks' || el.prizeType === 'thanks'
      }
      const type = el.prize_type || el.prizeType
      const value = el.prize_value ?? el.prizeValue
      return type === prizeType && String(value) === String(prizeValue)
    })
  }

  const rotate = (index, isThanks = false) => {
    let targetAngle
    const anglePerPrize = 360 / prizeNum

    if (isThanks || index === -1) {
      targetAngle = anglePerPrize * 1
    } else {
      targetAngle = anglePerPrize / 2 + anglePerPrize * index
    }

    // 与佛罗伦萨同一套起步公式
    const rotateAngleValue =
      startRotateDegree +
      props.turnsNumber * 360 +
      360 -
      targetAngle -
      (startRotateDegree % 360)

    setStartRotateDegree(rotateAngleValue)
    setRotateTransition(`transform ${props.turnsTime}s cubic-bezier(0.250, 0.460, 0.455, 0.995)`)
    setRotateAngle(`rotate(${rotateAngleValue}deg)`)
    setTimeout(() => {
      // 动画结束后归一化，防止度数过大；先清 transition 避免回弹
      const normalized = ((rotateAngleValue % 360) + 360) % 360
      setRotateTransition('none')
      setRotateAngle(`rotate(${normalized}deg)`)
      setStartRotateDegree(normalized)
      props.onGameEnd?.()
      setLock(false)
    }, props.turnsTime * 1000 + 500)
  }

  const startTurns = async () => {
    try {
      if (!canBeRotated()) return false
      if (props.canDraw === false) {
        props.onBlocked?.()
        return false
      }
      setLock(true)
      await props.onGameStart?.()
      const result = await props.onDrawPrize()
      if (!result || result.code !== 0) {
        setLock(false)
        return false
      }
      const prizeIndex = resolvePrizeIndexFromResult(result)
      const shouldPointToBorder = prizeIndex === -1
      setState((draft) => {
        draft.prizeIndex = prizeIndex
      })
      rotate(prizeIndex, shouldPointToBorder)
    } catch (err) {
      setLock(false)
    }
  }

  useEffect(() => {
    if (!prizeNum || !props.width || !props.height) return
    if (initKeyRef.current === initKey) return
    initKeyRef.current = initKey
    init()
  }, [initKey, prizeNum, props.width, props.height])

  if (!props || !prizeNum) {
    return null
  }

  const outerBg = props?.blocks?.[0]?.imgs?.[0]?.src || ''
  const outerBgColor = props?.blocks?.[0]?.background || '#617df2'
  const hasPointerImg = !!props.pointerBackgroundImage

  return (
    <View className='sp-turntable-container' style={{ height: `${TURNTABLE_OUTER_SIZE}px` }}>
      {outerBg ? (
        <Image
          className='turntable-bg'
          style={{ width: `${TURNTABLE_OUTER_SIZE}px`, height: `${TURNTABLE_OUTER_SIZE}px` }}
          mode='widthFix'
          src={outerBg}
        />
      ) : (
        <View
          className='turntable-bg turntable-bg--fallback'
          style={{
            width: `${TURNTABLE_OUTER_SIZE}px`,
            height: `${TURNTABLE_OUTER_SIZE}px`,
            background: outerBgColor
          }}
        />
      )}
      <View
        className='sp-turntable'
        ref={turntableDomRef}
        style={styleNames({
          width: `${props.width}`,
          height: `${props.height}`,
          top: `${(TURNTABLE_OUTER_SIZE - parseInt(props.height, 10)) / 2}px`
        })}
      >
        <View
          className='turntable'
          style={{
            transform: rotateAngle || undefined,
            transition: rotateTransition || undefined,
            transformOrigin: 'center center'
          }}
        >
          {/* 扇区底图用 Image，避免 background-image + transform 在微信脱层 */}
          {!!state.tempFilePath && (
            <Image
              className='turntable__sectors'
              src={state.tempFilePath}
              mode='aspectFit'
            />
          )}
          <Canvas
            id='turntable-canvas'
            type='2d'
            style='width: 100%; height: 100%; transform: translate(-200%, -200%);position: absolute;left: 0;top: 0;'
          />

          <View className='prize'>
            {prizeData.map((item, index) => (
              <View key={index} className='item' style={getRotateAngle(index)}>
                <View className='drawtable-name'>{item.text}</View>
                {!!item.img && (
                  <View className='drawtable-img'>
                    <Image
                      src={item.img}
                      mode='aspectFit'
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
          <View className='dividers'>
            {prizeData.map((item, index) => {
              const dividerAngle = (360 / prizeNum) * index
              return (
                <View
                  key={`divider-${index}`}
                  className='divider'
                  style={{
                    transform: `rotate(${dividerAngle}deg)`
                  }}
                />
              )
            })}
          </View>
        </View>
      </View>
      <View
        className={classNames('pointer', { 'pointer--fallback': !hasPointerImg })}
        onClick={startTurns}
      >
        {hasPointerImg ? (
          <Image
            className='pointer__img'
            src={props.pointerBackgroundImage}
            mode='aspectFill'
          />
        ) : (
          <Text className='pointer__text'>
            {(props.pointerLabel || '开始\n抽奖').replace(/\\n/g, '\n')}
          </Text>
        )}
      </View>
    </View>
  )
}

SpTurntable.defaultProps = {
  width: `${TURNTABLE_OUTER_SIZE}px`,
  height: `${TURNTABLE_OUTER_SIZE}px`,
  prizeData: [],
  turnsNumber: 5,
  turnsTime: 5,
  pointerBackgroundImage: '',
  pointerLabel: '开始\n抽奖',
  canDraw: true,
  onDrawPrize: () => {},
  onGameStart: () => {},
  onGameEnd: () => {},
  onBlocked: () => {}
}

export default SpTurntable
