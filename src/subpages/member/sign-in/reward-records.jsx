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
import { useTranslation, $t, ti } from '@/i18n'
import { getSignRewardRecords } from '@/api/sign'
import './reward-records.scss'

const initialState = {
  loading: true,
  list: []
}

function SignRewardRecords() {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  const { loading, list } = state

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('b15d8784.a3985b') })
  }, [i18n.language])

  useEffect(() => {
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
        showToast($t('b15d8784.866b79'))
      }
    })()
  }, [setState])

  return (
    <SpPage className='sign-reward-records' title={$t('b15d8784.a3985b')}>
      {loading ? (
        <SpLoading />
      ) : list.length === 0 ? (
        <SpNote title={$t('b15d8784.58c56e')} />
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
                        ? ti('b15d8784.0123c2', [reward.amount])
                        : reward.name}
                    </Text>
                    <SpImage
                      className='sign-reward-records__icon'
                      src='member_sign_in.svg'
                      width={6}
                      height={12}
                    />
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
