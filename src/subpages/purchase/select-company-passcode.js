/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useMemo, useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { View, Text, Input, Button } from '@tarojs/components'
import api from '@/api'
import { reportEmployeepurchaseBehavior } from '@/api/purchase'
import { SpPage } from '@/components'
import { useLogin } from '@/hooks'
import { classNames, showToast } from '@/utils'
import { updateEnterpriseId } from '@/store/slices/purchase'
import { INVITE_ACTIVITY_ID } from '@/consts'
import S from '@/spx'
import './select-company-passcode.scss'

function PurchasePasscodeAuth() {
  useLogin({
    autoLogin: true
  })
  const [passSheetVisible, setPassSheetVisible] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [activityBg, setActivityBg] = useState('')
  const { params } = useRouter()
  const dispatch = useDispatch()

  const activity_id = params?.activity_id
  const enterprise_id = params?.enterprise_id
  const company_id = params?.company_id || enterprise_id
  const inviteFromRoute = params?.code || ''
 

  const disabled = useMemo(() => !inviteCode.trim(), [inviteCode])

  useEffect(() => {
    const raw = String(inviteFromRoute || '').trim()
    if (!raw) {
      setInviteCode('')
      return
    }
    try {
      setInviteCode(decodeURIComponent(raw))
    } catch (e) {
      setInviteCode(raw)
    }
    setPassSheetVisible(true)
  }, [inviteFromRoute])



  useEffect(() => {
    fetchActivityBg()
    dispatch(updateEnterpriseId(enterprise_id))
  }, [activity_id, enterprise_id])

  const fetchActivityBg = async () => {
    if (!activity_id) {
      return
    }
    try {
      const data = await api.purchase.getActivitydata({
        activity_id,
      })
      const candidate = data?.pic ||''
      if (candidate) {
        setActivityBg(candidate)
      }
    } catch (e) {
      // ignore
    }
  }

  const handleStart = () => {
    setPassSheetVisible(true)
  }

  const handleSheetClose = () => {
    setPassSheetVisible(false)
  }

  const handleSubmit = async () => {
    const next = inviteCode.trim()
    if (!next) {
      showToast('请输入活动口令码')
      return
    }

    if (!activity_id || !enterprise_id ) {
      showToast('活动信息缺失，请重新进入')
      return
    }

    const payload = {
      behavior_type: 'passphrase_verify',
      company_id,
      activity_id,
      enterprise_id,
      passphrase_code: next,
      visitor_key:''
    }

    try {
     const {verified} =await reportEmployeepurchaseBehavior(payload)
     if(!verified){
      showToast('口令码验证失败，请重试')
      return
     }
    } catch (e) {
      console.error('口令码验证失败', e)
      showToast(e?.message || '口令码验证失败，请重试')
      return
    }

    if (activity_id) {
      S?.set(INVITE_ACTIVITY_ID, activity_id, true)
    }

    let url = '/subpages/purchase/index?is_redirt=1'
    if (activity_id) url += `&activity_id=${activity_id}`
    if (enterprise_id) url += `&enterprise_id=${enterprise_id}`
    Taro.navigateTo({ url })
  }

  return (
    <SpPage className='passcode-login-page'>
      <View
        className='passcode-login-page__poster'
        style={activityBg ? { backgroundImage: `url(${activityBg})` } : undefined}
      />

      <View className='passcode-login-page__landing'>
        <View className='passcode-login-page__start-wrap'>
          <Button
            className='passcode-login-page__start-btn passcode-login-page__start-btn--reset'
            onClick={handleStart}
          >
            <Text className='passcode-login-page__start-btn-text'>开始选购</Text>
          </Button>
        </View>
      </View>

      {passSheetVisible && (
        <>
          <View className='purchase-passcode__sheet-mask' onClick={handleSheetClose} />
          <View className='purchase-passcode__sheet' catchMove>
            <View className='purchase-passcode__sheet-inner' catchMove>
              <View className='purchase-passcode__sheet-handle' />

              <View className='purchase-passcode__sheet-head'>
                <Text className='purchase-passcode__sheet-title'>请输入口令码</Text>
                <View className='purchase-passcode__sheet-close' onClick={handleSheetClose}>
                  <Text className='purchase-passcode__sheet-close-icon'>×</Text>
                </View>
              </View>

              <Text className='purchase-passcode__sheet-sub'>请输入活动口令码以继续</Text>

              <Input
                className='purchase-passcode__sheet-input'
                placeholder='请输入口令码'
                placeholderClass='purchase-passcode__sheet-input-ph'
                value={inviteCode}
                onInput={(e) => setInviteCode(e.detail.value)}
              />

              <View
                className={classNames('purchase-passcode__sheet-confirm', {
                  'purchase-passcode__sheet-confirm--disabled': disabled
                })}
                onClick={handleSubmit}
              >
                <Text className='purchase-passcode__sheet-confirm-text'>确认</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </SpPage>
  )
}

PurchasePasscodeAuth.options = {
  addGlobalClass: true
}

export default PurchasePasscodeAuth
