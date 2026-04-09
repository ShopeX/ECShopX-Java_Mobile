/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { getCurrentInstance, useRouter } from '@tarojs/taro'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useImmer } from 'use-immer'
import { View, Text, ScrollView, Image, Input, Picker } from '@tarojs/components'
import { AtButton } from 'taro-ui'
import { useDispatch } from 'react-redux'
import { useLogin, useModal } from '@/hooks'
import api from '@/api'
import { classNames, showToast, VERSION_IN_PURCHASE, getDistributorId, isWeb } from '@/utils'
import qs from 'qs'
import { updateEnterpriseId, updateCurDistributorId } from '@/store/slices/purchase'
import { SpForm, SpFormItem, SpPage, SpPrivacyModal, SpInput as AtInput } from '@/components'
import { SpTimer } from '@/subpages/components'
import { useTranslation, $t } from '@/i18n'
import CompBottomTip from './comps/comp-bottomTip'
import './select-company-email.scss'

function PurchaseAuthEmail(props) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const { isNewUser, login } = useLogin({
    autoLogin: true,
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    }
  })
  const [policyModal, setPolicyModal] = useState(false)
  const { showModal } = useModal()
  const dispatch = useDispatch()

  const [state, setState] = useImmer({
    form: {
      email: '',
      vcode: ''
    }
  })
  const { form } = state
  const formRef = useRef()
  const rules = useMemo(
    () => ({
      email: [
        { required: true, message: $t('48f3a7dd.e5ae60') },
        { validate: 'email', message: $t('97e3aca2.09f253') },
        {
          validate: async (value) => {
            const { enterprise_id } = router?.params
            try {
              const params = {
                email: value
              }
              if (!enterprise_id) {
                params.distributor_id = getDistributorId()
              }
              const { status } = await api.purchase.getEmailCode(params)
              showToast(status ? $t('1d9cdff5.9db9a7') : $t('1d9cdff5.9ca6a3'))
            } catch (error) {
              return Promise.reject(error.message)
            }
          }
        }
      ],
      vcode: [{ required: true, message: $t('3ca883d0.d0c06a') }]
    }),
    [i18n.language, router?.params]
  )
  const {
    enterprise_id,
    enterprise_name,
    enterprise_sn,
    activity_id,
    is_activity = ''
  } = router?.params

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('899687f0.35a9ee') })
  }, [i18n.language])

  const onInputChange = (key, value) => {
    setState((draft) => {
      draft.form[key] = value
    })
  }

  const onFormSubmit = async () => {
    // 有商城校验白名单，账号绑定并登录，无商城检验白名单通过手机号授权
    const { email, vcode } = form
    await formRef.current.onSubmitAsync(['vcode'])
    // if (isNewUser) {
    //   // 无商城逻辑（需要调整一个页面去授权手机号）
    //   Taro.navigateTo({
    //     url: `/subpages/purchase/select-company-phone?${qs.stringify({
    //       enterprise_sn,
    //       enterprise_name,
    //       enterprise_id,
    //       email,
    //       vcode
    //     })}`
    //   })
    //   return
    // }

    const params = {
      enterprise_id,
      email,
      vcode,
      showError: false,
      auth_type: 'email'
    }

    try {
      const checkParams = { ...params }
      if (!enterprise_id) {
        //不是扫码进来，check接口要传当前店铺ID
        checkParams.distributor_id = getDistributorId()
      }
      if (activity_id) {
        checkParams.activity_id = activity_id
      }
      const { list } = await api.purchase.employeeCheck(checkParams)
      //一个邮箱后缀只有一个企业
      params.enterprise_id = list[0].enterprise_id

      if (isNewUser && !isWeb) {
        Taro.navigateTo({
          url: `/subpages/purchase/select-company-phone?${qs.stringify({
            ...params,
            enterprise_name: list[0].enterprise_name
          })}`
        })
        return
      }

      await api.purchase.setEmployeeAuth(params)
      await getQrCodeDtid()
      dispatch(updateEnterpriseId(params.enterprise_id))
      showToast($t('ace75665.45001d'))

      setTimeout(() => {
        Taro.reLaunch({
          url: `/pages/purchase/index?is_redirt=1${
            is_activity && activity_id ? `&activity_id=${activity_id}` : ''
          }`
        })
      }, 700)
    } catch (e) {
      if (e.message.indexOf('重复绑定') > -1) {
        dispatch(updateEnterpriseId(params.enterprise_id))
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
        formRef.current.setMessage({ prop: 'vcode', message: e.message })
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

  // 获取验证码
  const getSmsCode = async (resolve) => {
    try {
      await formRef.current.onSubmitAsync(['email'])
      resolve()
    } catch (error) {
      console.log(error)
    }
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
    <SpPage className='page-purchase-auth-email select-component'>
      <View className='select-component-title'>{$t('ef185019.2ebf62')}</View>
      <View className='select-component-prompt'>{$t('ba07f370.4fc005')}</View>
      <View className='selecte-box'>
        <SpForm ref={formRef} className='login-form' formData={form} rules={rules}>
          <SpFormItem prop='email'>
            <AtInput
              clear
              focus
              name='email'
              value={form.email}
              className='email-input'
              placeholder={$t('b3990996.4fbb66')}
              onChange={onInputChange.bind(this, 'email')}
            />
          </SpFormItem>

          <SpFormItem prop='vcode'>
            <View className='code-box'>
              <AtInput
                clear
                focus
                name='vcode'
                className='code-box-input'
                value={form.vcode}
                placeholder={$t('3ca883d0.d0c06a')}
                onChange={onInputChange.bind(this, 'vcode')}
              />
              <SpTimer
                className={classNames({ 'unuse': !form.email })}
                onStart={getSmsCode}
                onStop={() => {}}
                defaultMsg={$t('4e26899b.d369f4')}
                msg={$t('029ca60d.017c89')}
              ></SpTimer>
            </View>
          </SpFormItem>
        </SpForm>
      </View>

      <AtButton
        circle
        className='btns-staff'
        disabled={!(form.email && form.vcode)}
        onClick={onFormSubmit}
      >
        {$t('aa1b799d.402d19')}
      </AtButton>
      <CompBottomTip />

      {/* 隐私协议 */}
      <SpPrivacyModal open={policyModal} onCancel={onRejectPolicy} onConfirm={onResolvePolicy} />
    </SpPage>
  )
}

PurchaseAuthEmail.options = {
  addGlobalClass: true
}

export default PurchaseAuthEmail

// 邮箱登录
