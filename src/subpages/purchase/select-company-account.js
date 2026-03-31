/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { getCurrentInstance, useRouter } from '@tarojs/taro'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import { View, Text, ScrollView, Image, Input, Picker } from '@tarojs/components'
import { AtButton } from 'taro-ui'
import api from '@/api'
import { useLogin, useModal } from '@/hooks'
import { classNames, showToast, VERSION_IN_PURCHASE, getDistributorId, isWeb } from '@/utils'
import qs from 'qs'
import { SpForm, SpFormItem, SpPage, SpInput as AtInput, SpPrivacyModal } from '@/components'
import { updateEnterpriseId, updateCurDistributorId } from '@/store/slices/purchase'
import { useTranslation, $t } from '@/i18n'
import CompBottomTip from './comps/comp-bottomTip'
import CompSelectCompany from './comps/comp-select-company'
import './select-company-account.scss'

function PurchaseAuthAccount() {
  const { i18n } = useTranslation()
  const { isNewUser, login } = useLogin({
    autoLogin: true,
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    }
  })
  const [policyModal, setPolicyModal] = useState(false)
  const [state, setState] = useImmer({
    form: {
      account: '',
      auth_code: ''
    },
    isOpened: false,
    companyList: [],
    curActiveIndex: undefined
  })
  const formRef = useRef()
  const { form, isOpened, companyList, curActiveIndex } = state
  const rules = useMemo(
    () => ({
      account: [{ required: true, message: $t('91841acd.b1a5e1') }],
      auth_code: [{ required: true, message: $t('74b954b7.209f2b') }]
    }),
    [i18n.language]
  )
  const { params } = useRouter()
  const { enterprise_id, enterprise_name, enterprise_sn, activity_id, is_activity = '' } = params
  const { showModal } = useModal()
  const dispatch = useDispatch()

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('899687f0.35a9ee') })
  }, [i18n.language])

  const onInputChange = (key, value) => {
    setState((draft) => {
      draft.form[key] = value
    })
  }

  const onFormSubmit = async () => {
    await formRef.current.onSubmitAsync()
    const { account, auth_code } = form
    // // 无商城逻辑（需要调整一个页面去授权手机号）
    // if (isNewUser) {
    //   Taro.navigateTo({
    //     url: `/subpages/purchase/select-company-phone?${qs.stringify({
    //       enterprise_sn,
    //       enterprise_name,
    //       enterprise_id,
    //       account,
    //       auth_code
    //     })}`
    //   })
    //   return
    // }
    const _params = {
      enterprise_id,
      account,
      auth_code,
      auth_type: 'account'
    }

    const checkParams = { ..._params }
    if (activity_id) {
      checkParams.activity_id = activity_id
    }

    if (!enterprise_id) {
      //不是扫码进来，check接口要传当前店铺ID
      checkParams.distributor_id = getDistributorId()
    }
    const { list } = await api.purchase.employeeCheck(checkParams)
    if (list.length > 1) {
      //选择企业
      setState((draft) => {
        draft.isOpened = true
        draft.companyList = list
      })
      return
    }
    _params.enterprise_id = list[0]?.enterprise_id
    _params.employee_id = list[0]?.id
    _params.enterprise_name = list[0]?.enterprise_name

    employeeAuth(_params)
  }

  const handleSelctCompany = async () => {
    const { account, auth_code } = form
    const {
      enterprise_id: _enterprise_id,
      id: employee_id,
      enterprise_name: _enterprise_name
    } = companyList[curActiveIndex] || {}
    const _params = {
      enterprise_id: _enterprise_id,
      employee_id,
      account,
      auth_code,
      auth_type: 'account',
      enterprise_name: _enterprise_name
    }
    employeeAuth(_params)
  }

  const employeeAuth = (_params) => {
    if (isNewUser && !isWeb) {
      //新用户需要跳到授权手机号页面
      Taro.navigateTo({
        url: `/subpages/purchase/select-company-phone?${qs.stringify({
          ..._params
        })}`
      })
    } else {
      employeeAuthFetch(_params)
    }
  }

  const employeeAuthFetch = async (_params) => {
    try {
      await api.purchase.setEmployeeAuth({ ..._params, showError: false })
      await getQrCodeDtid()
      showToast($t('ace75665.45001d'))
      dispatch(updateEnterpriseId(_params.enterprise_id))
      if (isOpened) {
        setState((draft) => {
          draft.isOpened = false
        })
      }
      setTimeout(() => {
        Taro.reLaunch({
          url: `/pages/purchase/index?is_redirt=1${
            is_activity && activity_id ? `&activity_id=${activity_id}` : ''
          }`
        })
      }, 700)
    } catch (e) {
      if (e.message.indexOf('重复绑定') > -1) {
        dispatch(updateEnterpriseId(_params.enterprise_id))
        await getQrCodeDtid()
        await showModal({
          title: $t('e441b11e.e8c3ea'),
          content: e.message,
          showCancel: false,
          confirmText: $t('20b64b82.fe0337'),
          contentAlign: 'center'
        })
        Taro.reLaunch({
          url: `/pages/purchase/index?is_redirt=1${
            is_activity && activity_id ? `&activity_id=${activity_id}` : ''
          }`
        })
      } else {
        showToast(e.message)
      }
    }
  }

  const getQrCodeDtid = async () => {
    if (!enterprise_id) return
    // 如果扫码进来存在企业ID则需要绑定拿到店铺ID
    const { distributor_id } = await api.purchase.getPurchaseDistributor({ enterprise_id })
    //后续身份切换需要用
    dispatch(updateCurDistributorId(distributor_id))
  }

  // 同意隐私协议
  const onResolvePolicy = async () => {
    setPolicyModal(false)
    if (!isNewUser) {
      await login()
    }
  }

  const onRejectPolicy = () => {
    Taro.exitMiniProgram()
  }

  return (
    <SpPage className='page-purchase-auth-account select-component'>
      <View className='select-component-title'>{$t('efae7764.acb450')}</View>
      <View className='select-component-prompt'>{$t('5fff4865.0426fb')}</View>
      <View className='selecte-box'>
        <SpForm ref={formRef} className='login-form' formData={form} rules={rules}>
          <SpFormItem prop='account'>
            <AtInput
              placeholder={$t('a12c1366.a6790e')}
              value={form.account}
              onChange={onInputChange.bind(this, 'account')}
              clear
              name='account'
              focus
            />
          </SpFormItem>
          <SpFormItem prop='auth_code'>
            <AtInput
              placeholder={$t('74b954b7.209f2b')}
              value={form.auth_code}
              onChange={onInputChange.bind(this, 'auth_code')}
              name='auth_code'
              clear
              focus
            />
          </SpFormItem>
        </SpForm>
      </View>
      <View className='info'>
        <Text className='iconfont icon-info icon'></Text>
        <Text>{$t('0e27f608.cb9ff5')}</Text>
      </View>

      <AtButton
        circle
        className='btns-staff'
        disabled={!(form.account || form.auth_code)}
        onClick={onFormSubmit}
      >
        {$t('cd8992b6.44e6c1')}
      </AtButton>
      <CompBottomTip />

      <CompSelectCompany
        isOpened={isOpened}
        list={companyList}
        curIndex={curActiveIndex}
        handleItemClick={(idx) => {
          setState((draft) => {
            draft.curActiveIndex = idx
          })
        }}
        onClose={() => {
          setState((draft) => {
            draft.isOpened = false
          })
        }}
        onConfirm={handleSelctCompany}
      />

      {/* 隐私协议 */}
      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />
    </SpPage>
  )
}

PurchaseAuthAccount.options = {
  addGlobalClass: true
}

export default PurchaseAuthAccount

// 账号登录
