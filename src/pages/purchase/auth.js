/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { SpPrivacyModal, SpPage } from '@/components'
import { showToast, classNames, VERSION_IN_PURCHASE, getDistributorId } from '@/utils'
import { useLogin, useSyncCallback } from '@/hooks'
import S from '@/spx'
import entryLaunch from '@/utils/entryLaunch'
import api from '@/api'
import { INVITE_ACTIVITY_ID } from '@/consts'
import { useImmer } from 'use-immer'
import { useDispatch } from 'react-redux'
import {
  updateInviteCode,
  updateEnterpriseId,
  updateCurDistributorId,
  updateCurEnterpriseName
} from '@/store/slices/purchase'

import './auth.scss'
import './passcode.scss'

const initialState = {
  invite_code: '', // 邀请码
  activity_id: '', // 活动ID
  enterprise_id: '', // 企业ID
  authType: '', // 认证方式
}

function PurchaseAuth() {
  const { isLogin, checkPolicyChange, isNewUser, getUserInfo, setToken, login } = useLogin({
    autoLogin: false
  })

  const [policyModal, setPolicyModal] = useState(false)
  const [checked, setChecked] = useState(false)
  const dispatch = useDispatch()
  const codeRef = useRef()
  const [state, setState] = useImmer(initialState)
  const [activityBg, setActivityBg] = useState('')

  const { invite_code, activity_id, enterprise_id, authType } = state

  const shouldUsePhoneAuth = !isLogin && checked

  useEffect(() => {
    if (!S.getAuthToken()) {
      Taro.login({
        success: ({ code }) => {
          codeRef.current = code
        },
        fail: (e) => {
          console.error('[sp-login] taro login fail:', e)
        }
      })
    }
  }, [])

  useEffect(() => {
    init()
  }, [])


  useEffect(() => {
    fetchActivityConfig()
  }, [activity_id])

  useEffect(() => {
    fetchEnterpriseInfo()
  }, [enterprise_id, authType])



  useEffect(() => {
    if (invite_code && activity_id) {
      dispatch(updateInviteCode(invite_code))
      S?.set(INVITE_ACTIVITY_ID, activity_id, true)
      if (S.getAuthToken()) {
        getUserInfo(true)
      }
    }
  }, [invite_code])

  const init = async () => {
    //获取扫码参数
    await getQrcodeEid()
    //检查隐私协议
    checkPolicyChangeFunc()
  }
  /**
   * 获取活动配置
   */
  const fetchActivityConfig = async () => {
    if (!activity_id) {
      setActivityBg('')
      return
    }
    try {
      const data = await api.purchase.getActivitydata({
        activity_id: activity_id,
      })
      const candidate = data?.pic || ''
      setActivityBg(candidate)
    } catch (e) {
      setActivityBg('')
    }
  }
  // 获取企业信息
  const fetchEnterpriseInfo = async () => {
    if (!enterprise_id) {
      return
    }
    try {
      const { list } = await api.purchase.getEnterprisesList({
        enterprise_id: enterprise_id
      })
      dispatch(updateEnterpriseId(list[0].id))
      dispatch(updateCurEnterpriseName(list[0].name))
      dispatch(updateCurDistributorId(list[0].distributor_id))
      if(!authType){
        setState((draft) => {
          draft.authType = list[0].auth_type || ''
        })
      }
     
    } catch (e) {
      console.error('获取企业信息失败', e)
    }
  }


  const checkPolicyChangeFunc = useSyncCallback(async () => {
    const res = await checkPolicyChange()
    setChecked(res)
    //如果是亲友分享且没有同意隐私协议，则弹
    if (!res && (invite_code || VERSION_IN_PURCHASE)) {
      setPolicyModal(true)
    }
  })

  // 企业二维码扫码登录
  const getQrcodeEid = async () => {
    try {
      const { id, enterprise_id, code, ppe } = await entryLaunch.getRouteParams()
      //亲友扫码
      setState((draft) => {
        draft.authType = ppe == 1 ? 'code' : '' //口令码认证
        draft.invite_code = code || ''
        draft.activity_id = id || ''
        draft.enterprise_id = enterprise_id || ''
      })
    } catch (error) {

    }
  }

  const onRejectPolicy = () => {
    Taro.exitMiniProgram()
  }

  // 同意隐私协议
  const onResolvePolicy = async () => {
    setPolicyModal(false)
    setChecked(true)
    if (!isNewUser) {
      await login()
      if (VERSION_IN_PURCHASE) {
        // 纯内购如果有企业则进入选身份页面
        const data = await api.purchase.getUserEnterprises({
          disabled: 0,
          distributor_id: getDistributorId()
        })
        const validIdentityLen = data.filter((item) => item.disabled == 0).length
        if (validIdentityLen) {
          Taro.reLaunch({
            url: '/subpages/purchase/select-identity?is_redirt=1'
          })
        }
      }
    }
  }


  const handleBindPhone = async (e) => {
    const { encryptedData, iv, cloudID } = e.detail
    if (encryptedData && iv) {
      const code = codeRef.current
      const sparams = {
        code,
        encryptedData,
        iv,
        cloudID,
        user_type: 'wechat',
        auth_type: 'wxapp',
        invite_code
      }
      const { token } = await api.wx.newlogin(sparams)
      setToken(token)
      showToast('验证成功')
      setTimeout(() => {
        Taro.reLaunch({ url: `/pages/purchase/index?is_redirt=1` })
      }, 700)
    }
  }


  const handlePasscodeLandingStart = () => {
    if (!checked) {
      setPolicyModal(true)
      return
    }
    let redirectUrl
    if (authType == 'account') {
      redirectUrl = '/subpages/purchase/select-company-account'
    } else if (authType == 'email') {
      redirectUrl = '/subpages/purchase/select-company-email'
    } else if (authType == 'mobile' || authType == 'qr_code') {
      redirectUrl = '/subpages/purchase/select-company-phone'
    }else if(authType == 'code'){
      redirectUrl = '/subpages/purchase/select-company-passcode'
    }
    if (activity_id) {
      redirectUrl = `${redirectUrl}?activity_id=${activity_id}&enterprise_id=${enterprise_id}`
    }
    Taro.navigateTo({ url: redirectUrl })
  }


  return (
    <SpPage className='purchase-auth purchase-auth--passcode-landing' showpoweredBy={false}>
      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />

      <View
        className={classNames('purchase-passcode__landing', 'purchase-passcode__landing--plain', {
          'purchase-passcode__landing--with-bg': Boolean(activityBg)
        })}
        style={activityBg ? { backgroundImage: `url(${activityBg})` } : undefined}
      >
        <View className='purchase-passcode__start-btn-wrap'>
          <Button
            className='purchase-passcode__start-btn purchase-passcode__start-btn--button'
            openType={shouldUsePhoneAuth ? 'getPhoneNumber' : undefined}
            onGetPhoneNumber={handleBindPhone}
            onClick={handlePasscodeLandingStart}
          >
            <Text className='purchase-passcode__start-btn-text'>开始选购</Text>
          </Button>
        </View>
      </View>
    </SpPage>
  )
}

PurchaseAuth.options = {
  addGlobalClass: true
}

export default PurchaseAuth
