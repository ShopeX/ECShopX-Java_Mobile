/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import Taro, { getCurrentInstance, useDidShow } from '@tarojs/taro'
import { AtButton } from 'taro-ui'
import { View, Text } from '@tarojs/components'
import { SpPage, SpButton, SpLoading } from '@/components'
import { usePayment } from '@/hooks'
import { isArray } from '@/utils'
import api from '@/api'
import { updateCount } from '@/store/slices/cart'
import { useTranslation, $t } from '@/i18n'
import './cashier-result.scss'

const initialState = {
  tradeInfo: '',
  orderId: '',
  czOrder: false
}

function CashierResult(props) {
  const { i18n } = useTranslation()
  const $instance = getCurrentInstance() || {}

  const { cashierPayment } = usePayment()
  const [state, setState] = useImmer(initialState)
  const { tradeInfo, orderId, czOrder } = state
  const dispatch = useDispatch()
  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('8b3a17e4.e5dcb3') })
    const onLang = () => Taro.setNavigationBarTitle({ title: $t('8b3a17e4.e5dcb3') })
    i18n.on('languageChanged', onLang)
    return () => i18n.off('languageChanged', onLang)
  }, [i18n])

  useEffect(() => {
    const { order_id } = $instance?.router?.params
    if (order_id) {
      fetch()
    }
  }, [])

  // useDidShow(() => {
  //   fetch()
  // })

  const fetch = async () => {
    const { order_id, code } = $instance?.router?.params
    if (!order_id) {
      return
    }
    const { orderInfo, tradeInfo } = await api.cashier.getOrderDetail(order_id)

    setState((draft) => {
      draft.tradeInfo =
        isArray(tradeInfo) && tradeInfo.length == 0 ? { tradeState: 'NOTPAY' } : tradeInfo
      draft.orderId = order_id
      draft.czOrder = order_id.indexOf('CZ') > -1
    })
    // 获取openid, 微信客户端支付方式
    // if (code && orderInfo.pay_type == 'wxpay') {
    //   cashierPayment({
    //     ...orderInfo,
    //     pay_type: 'wxpayjs'
    //   })
    // }

    if (tradeInfo?.tradeState != 'SUCCESS') {
      setTimeout(() => {
        fetch()
      }, 3000)
    } else if (tradeInfo.tradeState == 'SUCCESS') {
      // 更新购物车
      await dispatch(
        updateCount({
          shop_type: 'distributor'
        })
      )
    }
  }

  return (
    <SpPage className='page-cashier-result'>
      <View className='trade-result'>
        {tradeInfo.tradeState == 'NOTPAY' && <SpLoading />}
        {tradeInfo.tradeState == 'SUCCESS' && (
          <Text className='iconfont icon-roundcheckfill'></Text>
        )}

        <Text className='trade-txt'>
          {tradeInfo?.tradeState === 'NOTPAY'
            ? $t('45ab5834.5e6031')
            : tradeInfo?.tradeState === 'SUCCESS'
            ? $t('45ab5834.eb5dc9')
            : ''}
        </Text>
      </View>
      {tradeInfo && (
        <View className='trade-info'>
          <View>
            {$t('45ab5834.148237')}
            <Text className='trade-info-value'>{orderId}</Text>
          </View>
          <View>
            {$t('45ab5834.296b0f')}
            <Text className='trade-info-value'>{tradeInfo.tradeId}</Text>
          </View>
          {/* <View>{`创建时间：${tradeInfo.orderId}`}</View> */}
          <View>
            {$t('45ab5834.ca25d2')}
            <Text className='trade-info-value'>{tradeInfo.payDate}</Text>
          </View>
        </View>
      )}
      <View className='btn-block'>
        {/* 普通订单, 秒杀订单 */}
        {(tradeInfo?.tradeSourceType == 'normal' ||
          tradeInfo?.tradeSourceType == 'normal_seckill' ||
          tradeInfo?.tradeSourceType == 'normal_groups') && (
          <View className='btn-wrap'>
            <SpButton
              resetText={$t('45ab5834.db1c89')}
              confirmText={$t('45ab5834.8054f7')}
              onReset={() => {
                Taro.redirectTo({ url: '/pages/index' })
              }}
              onConfirm={() => {
                Taro.redirectTo({ url: `/subpages/trade/detail?order_id=${orderId}` })
              }}
            ></SpButton>
          </View>
        )}

        {/* 积分订单 */}
        {(tradeInfo?.tradeSourceType == 'normal_pointsmall' ||
          tradeInfo?.tradeSourceType == 'normal_pointsmall_pointsmall') && (
          <View className='btn-wrap'>
            <SpButton
              resetText={$t('45ab5834.db1c89')}
              confirmText={$t('45ab5834.8054f7')}
              onReset={() => {
                Taro.redirectTo({ url: '/pages/index' })
              }}
              onConfirm={() => {
                Taro.redirectTo({
                  url: `/subpages/trade/detail?order_id=${orderId}&type=pointitem`
                })
              }}
            ></SpButton>
          </View>
        )}

        {/* 社区拼团订单 */}
        {tradeInfo?.tradeSourceType == 'normal_community' && (
          <View className='btn-wrap'>
            <AtButton
              circle
              type='plain'
              onClick={() => {
                Taro.redirectTo({ url: '/subpages/community/order' })
              }}
            >
              {$t('45ab5834.07166e')}
            </AtButton>
          </View>
        )}

        {/* 充值订单 */}
        {czOrder && (
          <View className='btn-wrap cz-order'>
            <AtButton
              circle
              type='plain'
              onClick={() => {
                Taro.redirectTo({ url: '/pages/index' })
              }}
            >
              {$t('45ab5834.db1c89')}
            </AtButton>
          </View>
        )}
      </View>
    </SpPage>
  )
}

CashierResult.options = {
  addGlobalClass: true
}

export default CashierResult
