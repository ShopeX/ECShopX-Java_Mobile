/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 企业内购认证：仅保留四种方式
 * 1) 口令码 2) 手机验证码 3) 邮箱验证码 4) 手机授权登录
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useEffect, useRef, useState } from 'react'
import { SpPrivacyModal, SpPage } from '@/components'
import { showToast, VERSION_IN_PURCHASE, getDistributorId } from '@/utils'
import { useLogin, useSyncCallback } from '@/hooks'
import { INVITE_ACTIVITY_ID } from '@/consts'
import { useImmer } from 'use-immer'
import { useSelector, useDispatch } from 'react-redux'
import { updateInviteCode, updateEnterpriseId, updateCurDistributorId } from '@/store/slices/purchase'
import S from '@/spx'
import entryLaunch from '@/utils/entryLaunch'
import api from '@/api'
import PurchasePasscode from './passcode'
import PurchaseAccountPassword from './account-password'
import PurchaseEmailCode from './email-code'
import PurchasePhoneLogin from './phone-login'
import './auth.scss'

const initialState = {
  invite_code: '',
  activity_id: '',
  enterprise_id: '',
  is_activity: ''
}

const AUTH_TYPE_MAP = {
  passcode: 'passcode',
  '口令码': 'passcode',
  mobile: 'mobileCode',
  mobilecode: 'mobileCode',
  '手机号验证码': 'mobileCode',
  '手机密码': 'mobileCode',
  account: 'accountPassword',
  accountpassword: 'accountPassword',
  '账号密码': 'accountPassword',
  email: 'emailCode',
  emailcode: 'emailCode',
  '企业邮箱': 'emailCode',
  phoneauth: 'phoneAuthorize',
  wxphone: 'phoneAuthorize',
  authorize: 'phoneAuthorize',
  '手机号授权': 'phoneAuthorize',
  '手机授权登录': 'phoneAuthorize'
}

function resolveAuthType(params, inviteCode) {
  const rawType = String(params?.type || '').toLowerCase()
  if (AUTH_TYPE_MAP[rawType]) {
    return AUTH_TYPE_MAP[rawType]
  }
  if (params?.type && AUTH_TYPE_MAP[params.type]) {
    return AUTH_TYPE_MAP[params.type]
  }
  if (params?.code || params?.invite_code || params?.entry === 'passcode' || inviteCode) {
    return 'passcode'
  }
  return 'mobileCode'
}

function PurchaseAuth() {
  const { checkPolicyChange, isNewUser, getUserInfo, setToken, login } = useLogin({
    autoLogin: false
  })

  const { appName } = useSelector((state) => state.sys)
  const [policyModal, setPolicyModal] = useState(false)
  const [checked, setChecked] = useState(false)
  const { params } = useRouter()
  const dispatch = useDispatch()
  const codeRef = useRef()
  const [state, setState] = useImmer(initialState)
  const [activityBg, setActivityBg] = useState('')

  const { invite_code, activity_id, enterprise_id, is_activity } = state
  const authType = resolveAuthType(params, invite_code)

  const isPasscodeMode = authType === 'passcode'
  const isAccountPasswordMode = authType === 'accountPassword'
  const isEmailCodeMode = authType === 'emailCode'
  const isPhoneAuthorizeMode = authType === 'phoneAuthorize'

  useEffect(() => {
    if (!S.getAuthToken()) {
      Taro.login({
        success: ({ code }) => {
          codeRef.current = code
        },
        fail: (e) => {
          console.error('[purchase-auth] taro login fail:', e)
        }
      })
    }
  }, [])

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (invite_code && activity_id) {
      dispatch(updateInviteCode(invite_code))
      S?.set(INVITE_ACTIVITY_ID, activity_id, true)
      if (S.getAuthToken()) {
        getUserInfo(true)
      }
    }
  }, [invite_code])

  useEffect(() => {
    fetchActivityConfig()
  }, [activity_id, enterprise_id, params?.activity_id, params?.enterprise_id])

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: appName
    })
  }, [appName])

  const init = async () => {
    await getQrcodeEid()
    if (!params.scene) {
      setState((draft) => {
        draft.invite_code = params?.code || params?.invite_code || ''
        draft.activity_id = params?.activity_id
        draft.enterprise_id = params?.enterprise_id
        draft.is_activity = params?.is_activity
      })
    }
    checkPolicyChangeFunc()
  }

  const checkPolicyChangeFunc = useSyncCallback(async () => {
    const res = await checkPolicyChange()
    setChecked(res)
    if (!res && (invite_code || params?.code || params?.invite_code || VERSION_IN_PURCHASE)) {
      setPolicyModal(true)
    }
  })

  const fetchActivityConfig = async () => {
    const currentActivityId = activity_id || params?.activity_id
    if (!currentActivityId) {
      setActivityBg('')
      return
    }
    try {
      const data = await api.purchase.getEmployeeActivitydata({
        activity_id: currentActivityId,
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
      setActivityBg(candidate)
    } catch (e) {
      setActivityBg('')
    }
  }

  const getQrcodeEid = async () => {
    if (params.scene) {
      const { eid, t, c, aid, code } = await entryLaunch.getRouteParams()
      if (code && aid && eid) {
        setState((draft) => {
          draft.invite_code = code
          draft.activity_id = aid
          draft.enterprise_id = eid
        })
        return
      }

      if (authType === 'passcode' || authType === 'phoneAuthorize') {
        return
      }

      const tMap = {
        m: 'mobile',
        e: 'email',
        a: 'account',
        q: 'qr_code'
      }
      if (eid) {
        const sparams = {
          enterprise_id: eid,
          auth_type: tMap[t]
        }
        if (c) {
          sparams.is_verify = c
        }
        handleConfirmClick(tMap[t], sparams)
      }
    }
  }

  const onRejectPolicy = () => {
    Taro.exitMiniProgram()
  }

  const onResolvePolicy = async () => {
    setPolicyModal(false)
    setChecked(true)
    if (!isNewUser) {
      await login()
      if (VERSION_IN_PURCHASE) {
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

  const handleConfirmClick = async (rtype, rparmas) => {
    let redirectUrl
    if (rtype == 'account') {
      redirectUrl = '/subpages/purchase/select-company-account'
    } else if (rtype == 'email') {
      redirectUrl = '/subpages/purchase/select-company-email'
    } else if (rtype == 'mobile' || rtype == 'qr_code') {
      redirectUrl = '/subpages/purchase/select-company-phone'
    }

    if (!redirectUrl) return

    if (rparmas) {
      redirectUrl += Object.keys(rparmas)
        .reduce((pre, cur) => pre + `${cur}=${rparmas[cur]}&`, '?')
        .slice(0, -1)
      Taro.reLaunch({ url: redirectUrl })
      return
    }

    if (activity_id) {
      redirectUrl = `${redirectUrl}?activity_id=${activity_id}`
      if (is_activity) {
        redirectUrl += '&is_activity=1'
      }
    }
    Taro.navigateTo({ url: redirectUrl })
  }

  const handleBindPhone = async (e) => {
    const { encryptedData, iv, cloudID } = e.detail
    if (authType === 'passcode' && !invite_code) {
      showToast('缺少口令码')
      return
    }
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
      await getDtidToEnterid(enterprise_id)
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/purchase/index?is_redirt=1' })
      }, 700)
    }
  }

  const handlePasscodeSubmit = (nextInviteCode) => {
    setState((draft) => {
      draft.invite_code = nextInviteCode
    })
    dispatch(updateInviteCode(nextInviteCode))
    if (activity_id) {
      S?.set(INVITE_ACTIVITY_ID, activity_id, true)
    }

    let url = '/pages/purchase/index?is_redirt=1'
    if (activity_id) url += `&activity_id=${activity_id}`
    if (enterprise_id) url += `&enterprise_id=${enterprise_id}`
    if (is_activity) url += '&is_activity=1'
    Taro.reLaunch({ url })
  }

  const getDtidToEnterid = async (eid) => {
    const { distributor_id } = await api.purchase.getPurchaseDistributor({ enterprise_id: eid })
    dispatch(updateCurDistributorId(distributor_id))
    dispatch(updateEnterpriseId(eid))
  }

  const ensureAgreed = () => {
    if (!checked) {
      showToast('请先阅读并同意协议')
      return false
    }
    return true
  }

  const handleAccountConfirm = () => {
    if (!ensureAgreed()) return
    handleConfirmClick('account')
  }

  const handleMobileCodeConfirm = () => {
    if (!ensureAgreed()) return
    handleConfirmClick('mobile')
  }

  const handleEmailConfirm = () => {
    if (!ensureAgreed()) return
    handleConfirmClick('email')
  }

  return (
    <SpPage className='purchase-auth purchase-auth--passphrase'>
      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />
      {authType === 'passcode' && (
        <PurchasePasscode
          activityBg={activityBg}
          inviteCode={invite_code}
          onBindPhone={handleBindPhone}
          onRequirePolicy={() => setPolicyModal(true)}
          privacyAccepted={checked}
          isLoggedIn={Boolean(S.getAuthToken())}
          onSubmitInviteCode={handlePasscodeSubmit}
        />
      )}
      {authType === 'accountPassword' && (
        <PurchaseAccountPassword
          activityBg={activityBg}
          appName={appName}
          checked={checked}
          onConfirm={handleAccountConfirm}
        />
      )}
      {authType === 'emailCode' && (
        <PurchaseEmailCode
          activityBg={activityBg}
          appName={appName}
          enterpriseId={enterprise_id || params?.enterprise_id}
          onConfirm={handleEmailConfirm}
        />
      )}
      {authType === 'mobileCode' && (
        <PurchasePhoneLogin
          activityBg={activityBg}
          appName={appName}
          checked={checked}
          onRequirePolicy={() => setPolicyModal(true)}
          onConfirm={handleMobileCodeConfirm}
        />
      )}
    </SpPage>
  )
}

PurchaseAuth.options = {
  addGlobalClass: true
}

export default PurchaseAuth
