/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useEffect } from 'react'
import { useImmer } from 'use-immer'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import api from '@/api'
import { classNames, getDistributorId, VERSION_IN_PURCHASE } from '@/utils'
import { SpPage } from '@/components'
import {
  updateValidIdentity,
  updateEnterpriseId,
  updateCurEnterpriseName,
  updateCurDistributorId
} from '@/store/slices/purchase'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation, $t } from '@/i18n'
import './select-identity.scss'

const initialState = {
  identity: [],
  invalidIdentity: [],
  loading: true
}

function SelectIdentity(props) {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)

  const { identity, invalidIdentity, loading } = state
  const { curEnterpriseId, curDistributorId } = useSelector((_state) => _state.purchase)
  const dispatch = useDispatch()

  const { params } = useRouter()
  let { activity_id = '', is_redirt } = params

  useEffect(() => {
    getUserEnterprises()
  }, [])

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('5f46773c.f0c92e') })
  }, [i18n.language])

  const getUserEnterprises = async () => {
    const data = await api.purchase.getUserEnterprises({
      activity_id,
      distributor_id: curDistributorId ?? getDistributorId()
    })
    const _identity = data.filter((item) => item.disabled == 0)
    // 内购入口且无可用企业：提示后返回上一页
    if (_identity.length == 0 && (is_redirt || VERSION_IN_PURCHASE)) {
      setState((draft) => {
        draft.loading = false
      })
      const { confirm } = await Taro.showModal({
        content: $t('c2581d4c.d7c2a1'),
        showCancel: false,
        confirmText: $t('20b64b82.fe0337')
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
        url: `/pages/purchase/index?activity_id=${activity_id}&is_redirt=1`
      })
      return
    }

    //多个则用户去选择
    //多个企业展示身份切换tab
    // dispatch(updateValidIdentity(true))

    setState((draft) => {
      draft.loading = false
      draft.identity = _identity
      draft.invalidIdentity = data.filter((item) => item.disabled == 1)
    })
  }

  // const onAddIdentityChange = () => {
  //   Taro.navigateTo({
  //     url: '/pages/purchase/auth?type=addIdentity'
  //   })
  // }

  const handleItemClick = ({ enterprise_id, name }) => {
    dispatch(updateEnterpriseId(enterprise_id))
    dispatch(updateCurEnterpriseName(name))
    Taro.navigateTo({
      url: `/pages/purchase/index?activity_id=${activity_id}&is_redirt=1`
    })
  }

  return (
    <SpPage
      className='select-identity'
      loading={loading}
    >
      <ScrollView className='identity-content' scrollY scrollWithAnimation>
        {/* <View className='identity-item' onClick={onAddIdentityChange}>
          <View className='identity-item-avatar'>
            <Text className='iconfont icon-tianjia1 add-icon avatar'></Text>
          </View>
          <View className='add-identity'>{$t('3d3fcde1.8f40f8')}</View>
        </View> */}
        <View className='content'>
          <View className='identity'>
            {identity.map((item, index) => {
              return (
                <View key={index} className='identity-item' onClick={() => handleItemClick(item)}>
                  <View className='identity-item-avatar'>
                    <Image src={item?.logo} className='avatar' />
                  </View>
                  <View className='identity-item-content'>
                    <View className='content-top'>
                      <View className='company'>{item.name}</View>
                    </View>
                    <View className='content-bottom'>
                      <View className={classNames('role', item.is_relative == 1 ? 'friend' : '')}>
                        {(item.is_employee == 1 && $t('2ed39222.055f8a')) ||
                          (item.is_relative == 1 && $t('4eca5be6.983d16'))}
                      </View>
                      <View className='account'>{item.login_account}</View>
                    </View>
                  </View>
                  {curEnterpriseId == item.enterprise_id && (
                    <View className='identity-item-right'>{$t('bf94700b.43c6f8')}</View>
                  )}
                </View>
              )
            })}
          </View>
          {/* {invalidIdentity?.length > 0 && (
          <View className='invalid-identity'>
            <View className='title'>已失效身份</View>
            {state.invalidIdentity?.map((item, index) => (
              <View key={index} className='identity-item'>
                <View className='identity-item-avatar'>
                  <Image src={item?.avatar} className='avatar' />
                </View>
                <View className='identity-item-content'>
                  <View className='content-top'>
                    <View className='company'>{item.name}</View>
                  </View>
                  <View className='content-bottom'>
                    <View className={classNames('role', item.is_relative == 1 ? 'friend' : '')}>
                      {(item.is_employee == 1 && '员工') || (item.is_relative == 1 && '亲友')}
                    </View>
                    <View className='account'>{item.login_account}</View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )} */}
        </View>
      </ScrollView>
    </SpPage>
  )
}

SelectIdentity.options = {
  addGlobalClass: true
}

export default SelectIdentity
