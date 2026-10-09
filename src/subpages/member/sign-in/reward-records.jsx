/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useImmer } from 'use-immer'
import { SpPage, SpLoading, SpNote, SpImage } from '@/components'
import { showToast } from '@/utils'
import { getSignRewardRecords } from '@/api/sign'
import './reward-records.scss'

const initialState = {
  loading: true,
  list: []
}

function SignRewardRecords() {
  const [state, setState] = useImmer(initialState)
  const { loading, list } = state

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '领奖记录' })
    ;(async () => {
      try {
        const res = await getSignRewardRecords()
        setState((draft) => {
          draft.list = res.list || []
          draft.loading = false
        })
      } catch (e) {
        setState((draft) => {
          draft.loading = false
        })
        showToast('加载失败')
      }
    })()
  }, [setState])

  return (
    <SpPage className='sign-reward-records' title='领奖记录'>
      {loading ? (
        <SpLoading />
      ) : list.length === 0 ? (
        <SpNote title='暂无领奖记录' />
      ) : (
        <View className='sign-reward-records__list'>
          {list.map((item) => (
            <View key={item.id} className='sign-reward-records__card'>
              <View className='sign-reward-records__left'>
                <Text className='sign-reward-records__title'>{item.title}</Text>
                <Text className='sign-reward-records__time'>{item.createdAt}</Text>
              </View>
              <View className='sign-reward-records__right'>
                {(item.rewards || []).map((reward, idx) => (
                  <View key={idx} className='sign-reward-records__reward'>
                    <SpImage
                      className='sign-reward-records__icon'
                      src={reward.type === 'coupon' ? 'sign-coupon.png' : 'sign-jifen.png'}
                      width={30}
                      height={30}
                      mode='aspectFit'
                    />
                    <Text className='sign-reward-records__reward-text'>
                      {reward.type === 'point'
                        ? `积分+${reward.amount}`
                        : reward.name}
                    </Text>
                    <Text className='iconfont icon-arrowRight sign-reward-records__chevron' />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </SpPage>
  )
}

export default SignRewardRecords
