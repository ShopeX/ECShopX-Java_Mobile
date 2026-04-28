/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import { View, Text, Button } from '@tarojs/components'
import api from '@/api'
import { SpPage, SpPrivacyModal, SpImage, SpPurchaseEnterpriseBar } from '@/components'
import { useLogin, useModal } from '@/hooks'
import { classNames, showToast, getDistributorId, isWeb } from '@/utils'
import { updateEnterpriseId, updateCurDistributorId } from '@/store/slices/purchase'
import './select-company-phone.scss'

const initialState = {
  wxCode: ''
}

function PurchaseAuthPhone(props) {
  const { isNewUser, login } = useLogin({
    autoLogin: true,
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    }
  })
  const dispatch = useDispatch()
  const [state, setState] = useImmer(initialState)
  const [policyModal, setPolicyModal] = useState(false)
  const [enterpriseName, setEnterpriseName] = useState('')
  const { curEnterpriseLogo } = useSelector((state) => state.purchase)
  const { params } = useRouter()
  let {
    auth_type = 'mobile',
    enterprise_id,
    is_verify,
    activity_id,
    is_activity = ''
  } = params
  const { showModal } = useModal()

  useEffect(() => {
    getLoginCode()
    // getQrcodeEid()
  }, [])

  const onRejectPolicy = () => {
    Taro.exitMiniProgram()
  }

  // 同意隐私协议
  const onResolvePolicy = async () => {
    setPolicyModal(false)
    if (!isNewUser) {
      await login()
    }
  }

  const getLoginCode = async () => {
    const { code } = await Taro.login()
    setState((draft) => {
      draft.wxCode = code
    })
  }

  const handleBindPhone = async (e) => {
    try {
      validatePhone({
        auth_type,
        enterprise_id,
        mobile: 'member_mobile'
      })
    } catch (e) {
      getLoginCode()
    }
  }

  const validatePhone = async (para) => {
    const checkParams = { ...para }
    if (activity_id) {
      checkParams.activity_id = activity_id
    }
    if (!enterprise_id) {
      //不是扫码进来，check接口要传当前店铺ID
      checkParams.distributor_id = getDistributorId()
    }
    const { list } = await api.purchase.employeeCheck(checkParams)
    const matched = list[0]
    if (matched) {
      _params.enterprise_id = matched.enterprise_id
      _params.enterprise_name = matched.enterprise_name
      _params.employee_id = matched?.id
    }
    employeeAuthFetch(_params)
  }

  const employeeAuthFetch = async (_params) => {
    try {
      await api.purchase.setEmployeeAuth({ ..._params, showError: false })
      await getQrCodeDtid(_params.enterprise_id)
      dispatch(updateEnterpriseId(_params.enterprise_id))
      showToast('验证成功')
      setTimeout(() => {
        Taro.reLaunch({
          url: `/subpages/purchase/index?is_redirt=1${is_activity && activity_id ? `&activity_id=${activity_id}` : ''
            }`
        })
      }, 2000)
    } catch (e) {
      console.log('🚀🚀🚀 ~ file: select-company-phone.js:102 ~ validatePhone ~ e:', e)
      if (e.message.indexOf('重复绑定') > -1) {
        dispatch(updateEnterpriseId(_params.enterprise_id))
        await getQrCodeDtid(_params.enterprise_id)
      }
      await showModal({
        title: '验证失败',
        content: e.message,
        showCancel: false,
        confirmText: '我知道了',
        contentAlign: 'center'
      })
      Taro.reLaunch({
        url: `/subpages/purchase/index?is_redirt=1${is_activity && activity_id ? `&activity_id=${activity_id}` : ''
          }`
      })
      getLoginCode()
    }
  }

  const getQrCodeDtid = async (eid) => {
    const id = eid ?? enterprise_id ?? params?.enterprise_id
    if (!id) return
    const { distributor_id } = await api.purchase.getPurchaseDistributor({ enterprise_id: id })
    dispatch(updateCurDistributorId(distributor_id))
  }

  return (
    <SpPage className='purchase-phone-auth'>
      <SpImage src={curEnterpriseLogo} className='purchase-phone-auth__cover-img' mode='aspectFill' />
      <SpPurchaseEnterpriseBar showMore={false} showSearch={false} />

      <View className='purchase-phone-auth__form-wrap'>
        <View className='purchase-phone-auth__form-card'>
          <Text className='purchase-phone-auth__form-title'>请完成身份校验</Text>
          <View className='purchase-phone-auth__field'>
            <Text className='purchase-phone-auth__hint'>
              请授权手机号以继续
            </Text>
          </View>
          <View className='purchase-phone-auth__footer'>
            <Button
              className='purchase-phone-auth__confirm'
              onClick={handleBindPhone}
            >
              <Text className='purchase-phone-auth__confirm-text'>授权手机号</Text>
            </Button>
          </View>
        </View>
      </View>

      {/* 隐私协议 */}
      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />
    </SpPage>
  )
}

PurchaseAuthPhone.options = {
  addGlobalClass: true
}

export default PurchaseAuthPhone

// 有商城和无商城 手机号授权登录
