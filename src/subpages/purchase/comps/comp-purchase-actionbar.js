/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 内购底部操作栏：购物车 · 分享亲友 · 活动剩余额度（purchase 分包）
 */
import React from 'react'
import { View, Text } from '@tarojs/components'
import { SpImage } from '@/components'
import { classNames } from '@/utils'
import './comp-purchase-actionbar.scss'

function CompPurchaseActionbar(props) {
  const {
    className,
    remainingLabel = '活动剩余额度',
    remainingAmount = '¥1800',
    cartCount = 0,
    onCart = () => {},
    onShare = () => {},
    onQuota = () => {}
  } = props

  return (
    <View className={classNames('comp-purchase-actionbar', className)}>
      <View className='comp-purchase-actionbar__row'>
        <View className='comp-purchase-actionbar__square' onClick={onCart}>
          <View className='comp-purchase-actionbar__icon-wrap'>
            <SpImage src='purchasecar.png' className='comp-purchase-actionbar__icon' mode='aspectFill' />
            {cartCount > 0 && (
              <Text className='comp-purchase-actionbar__badge'>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            )}
          </View>
          <Text className='comp-purchase-actionbar__label'>购物车</Text>
        </View>

        <View className='comp-purchase-actionbar__square' onClick={onShare}>
          <View className='comp-purchase-actionbar__share-icon'>
            <SpImage src='purcharefriend.png' className='comp-purchase-actionbar__icon' mode='aspectFill' />
          </View>
          <Text className='comp-purchase-actionbar__label'>分享亲友</Text>
        </View>

        <View className='comp-purchase-actionbar__quota' onClick={onQuota}>
          <View className='comp-purchase-actionbar__quota-text'>
            <Text className='comp-purchase-actionbar__quota-hint'>{remainingLabel}</Text>
            <Text className='comp-purchase-actionbar__quota-amount'>{remainingAmount}</Text>
          </View>
          <SpImage src='purchase_right.png' className='comp-purchase-actionbar__chevron' mode='aspectFill' />
        </View>
      </View>
    </View>
  )
}

CompPurchaseActionbar.options = {
  addGlobalClass: true
}

export default CompPurchaseActionbar
