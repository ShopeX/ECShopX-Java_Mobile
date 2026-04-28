/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useMemo, useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { View, Text, Input, Button } from '@tarojs/components'
import api from '@/api'
import { SpPage, SpPrivacyModal } from '@/components'
import { useLogin } from '@/hooks'
import { classNames, showToast, getDistributorId } from '@/utils'
import { updateInviteCode } from '@/store/slices/purchase'
import { INVITE_ACTIVITY_ID } from '@/consts'
import S from '@/spx'
import './select-company-passcode.scss'

function PurchasePasscodeAuth() {
  const { login, isNewUser } = useLogin({
    autoLogin: true,
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    }
  })
  const [policyModal, setPolicyModal] = useState(false)
  const [passSheetVisible, setPassSheetVisible] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [activityBg, setActivityBg] = useState('')
  const { params } = useRouter()
  const dispatch = useDispatch()

  const activity_id = params?.activity_id
  const enterprise_id = params?.enterprise_id
  const is_activity = params?.is_activity
  const inviteFromRoute = params?.code || params?.invite_code || ''

  useEffect(() => {
    if (params?.activity_bg) {
      setActivityBg(params.activity_bg)
    }
  }, [params?.activity_bg])

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
    syncEnterpriseBg()
  }, [enterprise_id, activity_id])

  useEffect(() => {
    fetchActivityBg()
  }, [activity_id, enterprise_id])

  const syncEnterpriseBg = async () => {
    if (!enterprise_id) {
      return
    }
    try {
      const list = await api.purchase.getUserEnterprises({
        disabled: 0,
        distributor_id: getDistributorId()
      })
      const found = (list || []).find(
        (item) => String(item?.id ?? item?.enterprise_id) === String(enterprise_id)
      )
      if (!activity_id && found?.logo) {
        setActivityBg(found.logo)
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchActivityBg = async () => {
    if (!activity_id) {
      return
    }
    try {
      const data = await api.purchase.getEmployeeActivitydata({
        activity_id,
        enterprise_id: enterprise_id || params?.enterprise_id
      })
      const candidate =
        data?.auth_bg_pic ||
        data?.auth_bg_url ||
        data?.activity_bg_pic ||
        data?.activity_bg_url ||
        data?.bg_pic ||
        data?.bg_url ||
        data?.background_pic ||
        data?.background_url ||
        data?.landing_pic ||
        data?.landing_url ||
        data?.cover_pic ||
        data?.cover_url ||
        data?.share_pic ||
        ''
      if (candidate) {
        setActivityBg(candidate)
      }
    } catch (e) {
      // ignore
    }
  }

  const onRejectPolicy = () => {
    Taro.exitMiniProgram()
  }

  const onResolvePolicy = async () => {
    setPolicyModal(false)
    if (!isNewUser) {
      await login()
    }
  }

  const handleStart = () => {
    setPassSheetVisible(true)
  }

  const handleSheetClose = () => {
    setPassSheetVisible(false)
  }

  const handleSubmit = () => {
    const next = inviteCode.trim()
    if (!next) {
      showToast('请输入活动口令码')
      return
    }
    dispatch(updateInviteCode(next))
    if (activity_id) {
      S?.set(INVITE_ACTIVITY_ID, activity_id, true)
    }

    let url = '/pages/purchase/index?is_redirt=1'
    if (activity_id) url += `&activity_id=${activity_id}`
    if (enterprise_id) url += `&enterprise_id=${enterprise_id}`
    if (is_activity) url += '&is_activity=1'
    Taro.reLaunch({ url })
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

      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />
    </SpPage>
  )
}

PurchasePasscodeAuth.options = {
  addGlobalClass: true
}

export default PurchasePasscodeAuth
