/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { SpPage, SpCheckbox, SpInput as AtInput } from '@/components'
import { SpTimer } from '@/subpages/components'
import { classNames, validate, showToast } from '@/utils'
import { useSelector } from 'react-redux'
import { AtForm, AtButton } from 'taro-ui'
import api from '@/api'
import { useImmer } from 'use-immer'
import { useLogin } from '@/hooks'
import { useTranslation, $t, ti } from '@/i18n'
import { CompPasswordInput } from './comps'
import { setTokenAndRedirect } from './util'
import './reg.scss'

const initialValue = {
  mobile: '',
  yzm: '',
  vcode: '',
  password: '',
  imgInfo: null,
  checked: false,
  member_register: '',
  privacy: ''
}

const CODE_SYMBOL = 'sign'

const Reg = () => {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialValue)

  const { mobile, yzm, vcode, password, imgInfo, checked, member_register, privacy } = state

  const { colorPrimary } = useSelector((state) => state.sys)

  const { getUserInfo } = useLogin()

  const handleInputChange = (name) => (val) => {
    setState((state) => {
      state[name] = val
    })
  }

  const getImageVcode = async () => {
    const img_res = await api.user.regImg({ type: CODE_SYMBOL })
    setState((state) => {
      state.imgInfo = img_res
    })
  }

  const handleTimerStart = async (resolve) => {
    if (!validate.isMobileNum(mobile)) {
      showToast($t('4e9d53b5.a32ab5'))
      return
    }
    if (!validate.isRequired(yzm)) {
      showToast($t('4e9d53b5.e70066'))
      return
    }
    try {
      await api.user.regSmsCode({
        type: CODE_SYMBOL,
        mobile: mobile,
        yzm: yzm,
        token: imgInfo.imageToken
      })
      showToast($t('4e9d53b5.4d7fb5'))
      resolve()
    } catch (e) {
      getImageVcode()
    }
  }

  const handleSubmit = async () => {
    if (!checked) {
      const res = await Taro.showModal({
        title: $t('4e9d53b5.02d981'),
        content: ti('4e9d53b5.0ce185', [member_register, privacy]),
        showCancel: true,
        cancelText: $t('4e9d53b5.7173f8'),
        confirmText: $t('4e9d53b5.e61f2c'),
        confirmColor: colorPrimary
      })
      if (!res.confirm) return
    }

    if (!validate.isMobileNum(mobile)) {
      showToast($t('4e9d53b5.a32ab5'))
      return
    }
    if (!validate.isRequired(vcode)) {
      showToast($t('4e9d53b5.d0c06a'))
      return
    }
    if (!validate.isRequired(password)) {
      showToast($t('4e9d53b5.e39ffe'))
      return
    }
    if (!validate.isPassword(password)) {
      return showToast($t('4e9d53b5.eac67a'))
    }
    try {
      //从登陆页跳转过来
      const { token } = await api.user.reg({
        auth_type: 'local',
        check_type: CODE_SYMBOL,
        mobile,
        password,
        vcode,
        sex: 0,
        user_type: 'local'
      })
      showToast($t('4e9d53b5.6506a9'), async () => {
        await setTokenAndRedirect(token, async () => {
          await getUserInfo()
        })
      })
    } catch (e) {
      console.log(e)
    }
  }

  const handleSelect = () => {
    setState((_state) => {
      _state.checked = !checked
    })
  }

  const fetchPrivacyData = async () => {
    const {
      protocol: { member_register, privacy }
    } = await api.shop.getStoreBaseInfo()

    setState((v) => {
      v.member_register = member_register
      v.privacy = privacy
    })
  }

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('461de497.fe0e8b') })
    const onLang = () => Taro.setNavigationBarTitle({ title: $t('461de497.fe0e8b') })
    i18n.on('languageChanged', onLang)
    return () => i18n.off('languageChanged', onLang)
  }, [i18n])

  useEffect(() => {
    getImageVcode()
    fetchPrivacyData()
  }, [])

  //全填写完
  const isFull = mobile && yzm && vcode && password

  return (
    <SpPage
      className={classNames('page-auth-reg', {
        'is-full': isFull
      })}
    >
      <View className='auth-hd'>
        <View className='title'>{$t('4e9d53b5.8c4312')}</View>
      </View>
      <View className='auth-bd'>
        <AtForm className='form'>
          <View className='form-field'>
            <AtInput
              clear
              name='mobile'
              maxLength={11}
              type='tel'
              value={state.mobile}
              placeholder={$t('4e9d53b5.787a47')}
              onChange={handleInputChange('mobile')}
            />
          </View>

          {/* 验证码登录，验证码超过1次，显示图形验证码 */}
          <View className='form-field'>
            <View className='input-field'>
              <AtInput
                clear
                name='yzm'
                value={state.yzm}
                placeholder={$t('4e9d53b5.e70066')}
                onChange={handleInputChange('yzm')}
              />
            </View>
            <View className='btn-field'>
              {imgInfo && (
                <Image className='image-vcode' src={imgInfo.imageData} onClick={getImageVcode} />
              )}
            </View>
          </View>

          <View className='form-field'>
            <View className='input-field'>
              <AtInput
                clear
                name='vcode'
                value={state.vcode}
                placeholder={$t('4e9d53b5.d0c06a')}
                onChange={handleInputChange('vcode')}
              />
            </View>
            <View className='btn-field'>
              <SpTimer onStart={handleTimerStart} />
            </View>
          </View>

          <View className='form-field'>
            <View className='input-field'>
              <CompPasswordInput onChange={handleInputChange('password')} value={state.password} />
            </View>
          </View>

          {/* <View className='form-tip'>{PASSWORD_TIP()}</View> */}

          <View className='form-submit'>
            <AtButton
              disabled={!isFull}
              circle
              type='primary'
              className='login-button'
              onClick={handleSubmit}
            >
              {$t('4e9d53b5.3179ba')}
            </AtButton>
          </View>

          <View className='form-text'>
            <SpCheckbox checked={checked} onChange={handleSelect} />
            <View>
              {$t('4e9d53b5.b840cb')}
              <Text
                className='primary-color'
                onClick={() =>
                  Taro.navigateTo({
                    url: '/subpages/auth/reg-rule?type=member_register'
                  })
                }
              >
                《{member_register}》
              </Text>
              、
              <Text
                className='primary-color'
                onClick={() =>
                  Taro.navigateTo({
                    url: '/subpages/auth/reg-rule?type=privacy'
                  })
                }
              >
                《{privacy}》
              </Text>
            </View>
          </View>
        </AtForm>
      </View>
    </SpPage>
  )
}

export default Reg
