/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useEffect } from 'react'
import { useImmer } from 'use-immer'
import { View, Text } from '@tarojs/components'
import api from '@/api'
import { classNames, getDistributorId, VERSION_IN_PURCHASE } from '@/utils'
import { SpPage } from '@/components'
import { updateEnterpriseId, updateCurEnterpriseName } from '@/store/slices/purchase'
import CompPurchaseNav from '@/pages/purchase/comps/comp-purchase-nav'
import { useDispatch, useSelector } from 'react-redux'
import './select-identity.scss'

const initialState = {
  identity: [],
  invalidIdentity: [],
  loading: true,
  selectedEnterpriseId: ''
}

function SelectIdentity(props) {
  const [state, setState] = useImmer(initialState)

  const { identity, loading, selectedEnterpriseId } = state
  const { curEnterpriseId, curDistributorId } = useSelector((_state) => _state.purchase)
  const dispatch = useDispatch()

  const { params } = useRouter()
  let { activity_id = '', is_redirt } = params

  useEffect(() => {
    getUserEnterprises()
  }, [])

  const getUserEnterprises = async () => {
    const data = await api.purchase.getUserEnterprises({
      activity_id
      // distributor_id: curDistributorId ?? getDistributorId()
    })
    const _identity = data.filter((item) => item.disabled == 0)
    // 内购入口且无可用企业：提示后返回上一页
    if (_identity.length == 0 && (is_redirt || VERSION_IN_PURCHASE)) {
      setState((draft) => {
        draft.loading = false
      })
      const { confirm } = await Taro.showModal({
        content: '抱歉，您没有内购资格',
        showCancel: false,
        confirmText: '返回'
      })
      if (confirm) {
        Taro.navigateBack()
      }
      return
    }

    //一个选择这个跳活动列表
    if (_identity.length == 1 && is_redirt) {
      dispatch(updateEnterpriseId(_identity[0]?.enterprise_id))
      dispatch(updateCurEnterpriseName(_identity[0]?.name))
      Taro.redirectTo({
        url: `/subpages/purchase/activity-list?activity_id=${activity_id}&is_redirt=1`
      })
      return
    }

    setState((draft) => {
      draft.loading = false
      draft.identity = _identity
      draft.invalidIdentity = data.filter((item) => item.disabled == 1)
      const preferred = _identity.find((it) => it.enterprise_id == curEnterpriseId)
      draft.selectedEnterpriseId = preferred
        ? preferred.enterprise_id
        : _identity[0]?.enterprise_id ?? ''
    })
  }

  const onSelectCard = (enterprise_id) => {
    setState((draft) => {
      draft.selectedEnterpriseId = enterprise_id
    })
  }

  const onConfirm = () => {
    const item = identity.find((it) => it.enterprise_id == selectedEnterpriseId)
    if (!item) {
      return
    }
    dispatch(updateEnterpriseId(item.enterprise_id))
    dispatch(updateCurEnterpriseName(item.name))
    Taro.navigateTo({
      url: `/subpages/purchase/activity-list?activity_id=${activity_id}&is_redirt=1`
    })
  }

  return (
    <SpPage className='select-identity' loading={loading}
      title='企业购'
      pageConfig={{ navigateBackgroundColor: '#ffffff' }}
      renderNavigation={(navProps) => <CompPurchaseNav {...navProps} />}
    >
      <View className='select-identity__wrap'>
        <View className='select-identity__hd-bar'>
          <Text className='select-identity__hd-text'>选择企业</Text>
        </View>
        <View className='select-identity__inner'>
          <View className='select-identity__list'>
            {identity.map((item, index) => {
              const active = selectedEnterpriseId == item.enterprise_id
              return (
                <View
                  key={item.enterprise_id ?? index}
                  className={classNames('select-identity__card', {
                    'select-identity__card--active': active
                  })}
                  onClick={() => onSelectCard(item.enterprise_id)}
                >
                  <View className='select-identity__card-main'>
                    <Text className='select-identity__card-name'>{item.name}</Text>
                  </View>
                  {active ? (
                    <View className='select-identity__card-check'>
                      <Text className='select-identity__card-check-mark'>✓</Text>
                    </View>
                  ) : (
                    <View className='select-identity__card-check select-identity__card-check--placeholder' />
                  )}
                </View>
              )
            })}
          </View>
        </View>
        {!loading && identity.length > 0 ? (
          <View className='select-identity__footer'>
            <View className='select-identity__confirm' onClick={onConfirm}>
              确认
            </View>
          </View>
        ) : null}
      </View>
    </SpPage>
  )
}

SelectIdentity.options = {
  addGlobalClass: true
}

export default SelectIdentity
