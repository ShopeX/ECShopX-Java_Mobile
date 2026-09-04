/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect } from 'react'
import { View, Image } from '@tarojs/components'
import { AtCurtain, AtButton } from 'taro-ui'
import useModal from '@/hooks/useModal'
import Taro from '@tarojs/taro'
import { useTranslation, $t, ti } from '@/i18n'
import './index.scss'

const COUPON_REWARD_PATH = '/subpages/marketing/coupon'

// 抽奖结果幕帘组件
const SpDrawResult = ({
  visible,
  prizeInfo = {},
  onClose,
  id,
  insufficientPoints = false,
  insufficientFV = false,
  requiredPoints = 0,
  requiredFV = 0,
  currentPoints = 0,
  currentFV = 0
}) => {
  useTranslation()
  const resData = prizeInfo?.data || {}
  const prizeType = resData.prizeType || resData.prize_type
  const prizeTitle = resData.prizeTitle || resData.prize_title
  const prizeValue = resData.prizeValue ?? resData.prize_value
  const isEmptyPrize =
    resData.isWin === false || prizeType === 'thanks' || (!prizeType && !prizeTitle)
  const pointsInsufficient = insufficientPoints || insufficientFV
  const needPoints = requiredPoints || requiredFV || 0
  const havePoints = currentPoints || currentFV || 0
  const { showModal } = useModal()

  useEffect(() => {
    if (!visible) return
    if (isEmptyPrize && !pointsInsufficient) {
      showModal({
        title: $t('f326b92a.1229c3'),
        content: $t('f326b92a.23300f'),
        showCancel: false,
        confirmText: $t('f326b92a.fe0337'),
        contentAlign: 'center'
      }).finally(() => {
        onClose()
      })
    } else if (pointsInsufficient) {
      showModal({
        title: $t('f326b92a.96551d'),
        content: ti('f326b92a.cfd2f6', [havePoints, needPoints]),
        showCancel: false,
        confirmText: $t('f326b92a.fe0337'),
        contentAlign: 'center'
      }).finally(() => {
        onClose()
      })
    }
  }, [visible, isEmptyPrize, pointsInsufficient, havePoints, needPoints, onClose])

  const isCouponPrize = prizeType === 'coupon' || prizeType === 'coupons'
  const isPointsPrize = prizeType === 'points'

  const renderContent = () => {
    if (pointsInsufficient || isEmptyPrize) return null
    return (
      <View className='sp-draw-result__prize'>
        <View className='sp-draw-result__title'>{$t('f326b92a.84c17c')}</View>
        {resData?.prizeImage && (
          <Image className='sp-draw-result__image' src={resData?.prizeImage} mode='aspectFit' />
        )}
        {!isPointsPrize && (
          <View className='sp-draw-result__prize-name'>{prizeTitle}</View>
        )}
        {isPointsPrize && prizeValue !== undefined && prizeValue !== null && (
          <View className='sp-draw-result__prize-amount'>
            {ti('f326b92a.511b20', [prizeValue])}
          </View>
        )}
        <View className='sp-draw-result__message'>
          {resData?.message || $t('f326b92a.7ba17f')}
        </View>
        <View className='sp-draw-result-btn__wrap'>
          <AtButton className='sp-draw-result__btn sp-draw-result__btn_left' onClick={onClose}>
            {$t('f326b92a.5f4112')}
          </AtButton>
          {isCouponPrize && (
            <AtButton
              className='sp-draw-result__btn sp-draw-result__btn_right'
              onClick={() => {
                Taro.navigateTo({ url: COUPON_REWARD_PATH })
              }}
            >
              {$t('f326b92a.7c271c')}
            </AtButton>
          )}
        </View>
      </View>
    )
  }

  return (
    <>
      {isEmptyPrize || pointsInsufficient ? (
        <></>
      ) : (
        <AtCurtain isOpened={visible} onClose={onClose}>
          <View className='sp-draw-result'>{renderContent()}</View>
        </AtCurtain>
      )}
    </>
  )
}

export default SpDrawResult
