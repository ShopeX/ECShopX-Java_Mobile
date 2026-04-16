/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { AtForm, AtButton } from 'taro-ui'
import { SpPage, SpInput as AtInput } from '@/components'
import { SpTimer } from '@/subpages/components'
import { updateUserInfo } from '@/store/slices/user'
import { connect } from 'react-redux'
import S from '@/spx'
import api from '@/api'
import { classNames, navigateTo, validate, showToast, tokenParseH5 } from '@/utils'
import { $t, i18n } from '@/i18n'
import { CompOtherLogin, CompPasswordInput, CompInputPhone } from './comps'
import { navigationToReg, setToken, setTokenAndRedirect, addListener } from './util'
import './login.scss'

/** 路由 query 可能是编码串或字面量 `%40`，统一解码为真实邮箱/手机号 */
function decodeLoginRouteQueryParam(val) {
  if (val == null || val === '') {
    return ''
  }
  const s = String(val).trim()
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

@connect(
  ({ colors }) => ({
    colors: colors.current
  }),
  (dispatch) => ({ dispatch })
)
export default class Login extends Component {
  $instance = getCurrentInstance() || {}
  constructor(props) {
    super(props)

    this.state = {
      info: {},
      isVisible: false,
      imgInfo: null,
      loginType: 1, // 1=密码; 2=验证码
      accountMode: 'mobile', // mobile | email
      logoShow: true,
      is_new: false
    }
    //定时器
    this.timer = null
    /** 避免多次 didShow 用 URL 覆盖用户已切换的「手机 / 邮箱」tab */
    this._loginRouteParamsApplied = false
  }

  componentDidMount() {
    this._onLanguageChanged = () => this.forceUpdate()
    i18n.on('languageChanged', this._onLanguageChanged)
    this.getImageVcode()
  }

  componentWillUnmount() {
    if (this._onLanguageChanged) {
      i18n.off('languageChanged', this._onLanguageChanged)
    }
    this._loginRouteParamsApplied = false
  }

  componentDidShow() {
    Taro.setNavigationBarTitle({ title: $t('aa1b799d.402d19') })
    this.applyLoginRouteParams()
    const { redirect } = this.$instance?.router?.params
    if (S.getAuthToken()) {
      const url = redirect ? decodeURIComponent(redirect) : '/subpages/member/index'
      window.location.href = url
    }
  }

  navigateTo = navigateTo

  handleTimerStart = async (resolve) => {
    const { imgInfo } = this.state
    const { mobile, yzm } = this.state.info
    if (!validate.isMobileNum(mobile)) {
      return showToast($t('3ca883d0.a32ab5'))
    }
    if (!validate.isRequired(yzm)) {
      return showToast($t('3ca883d0.e70066'))
    }
    if (!imgInfo?.imageToken) {
      showToast($t('4e9d53b5.c901aa'))
      this.getImageVcode()
      return
    }
    try {
      await api.user.regSmsCode({
        type: 'login',
        mobile: mobile,
        yzm: yzm,
        token: imgInfo.imageToken
      })
      showToast($t('3ca883d0.4d7fb5'))
      resolve()
    } catch (e) {
      this.getImageVcode()
    }
  }

  /** POST /member/email/code purpose=login */
  handleEmailLoginTimerStart = async (resolve) => {
    const { imgInfo } = this.state
    const { email, yzm } = this.state.info
    const emailTrim = (email || '').trim()
    if (!validate.isEmail(emailTrim)) {
      return showToast($t('4e9d53b5.c902bb'))
    }
    if (!validate.isRequired(yzm)) {
      return showToast($t('3ca883d0.e70066'))
    }
    if (!imgInfo?.imageToken) {
      showToast($t('4e9d53b5.c901aa'))
      this.getImageVcode()
      return
    }
    try {
      await api.user.memberEmailCode({
        email: emailTrim,
        purpose: 'login',
        token: imgInfo.imageToken,
        yzm
      })
      showToast($t('3ca883d0.4d7fb5'))
      this.setState((prev) => ({
        info: { ...prev.info, yzm: '' }
      }))
      await this.getImageVcode()
      resolve()
    } catch (e) {
      this.getImageVcode()
    }
  }

  handleTimerStop() {}

  handleInputChange(name, val, error) {
    const { info } = this.state
    info[name] = val
    if (name == 'mobile') {
      info.is_new = error
    }
    this.setState({
      info
    })
  }

  handleNavLeftItemClick = () => {
    try {
      Taro.navigateBack()
    } catch (e) {
      Taro.redirectTo({
        url: process.env.APP_HOME_PAGE
      })
    }
  }

  handleToggleLogin = () => {
    const { loginType } = this.state
    const next = loginType == 1 ? 2 : 1
    this.setState(
      {
        loginType: next
      },
      () => {
        if (next === 2) {
          this.getImageVcode()
        }
      }
    )
  }

  handleAccountModeChange = (accountMode) => {
    this.setState(
      (prev) => ({
        accountMode,
        info: {
          ...prev.info,
          yzm: '',
          vcode: '',
          password: ''
        }
      }),
      () => {
        if (accountMode === 'mobile' || this.state.loginType === 2) {
          this.getImageVcode()
        }
      }
    )
  }

  /** 注册成功跳转等场景：URL `account_mode=mobile|email`，可选 `mobile` / `email` 预填 */
  applyLoginRouteParams = () => {
    if (this._loginRouteParamsApplied) {
      return
    }
    const p = this.$instance?.router?.params || {}
    const mode = p.account_mode
    if (mode !== 'mobile' && mode !== 'email') {
      return
    }
    this._loginRouteParamsApplied = true
    const mobilePrefill = decodeLoginRouteQueryParam(p.mobile)
    const emailPrefill = decodeLoginRouteQueryParam(p.email)
    this.setState(
      (prev) => ({
        accountMode: mode,
        info: {
          ...prev.info,
          ...(mode === 'mobile' && mobilePrefill ? { mobile: mobilePrefill } : {}),
          ...(mode === 'email' && emailPrefill ? { email: emailPrefill } : {})
        }
      }),
      () => {
        if (this.state.accountMode === 'mobile' || this.state.loginType === 2) {
          this.getImageVcode()
        }
      }
    )
  }

  getImageVcode = async () => {
    const img_res = await api.user.regImg({ type: 'login' })
    this.setState({
      imgInfo: img_res
    })
  }

  async handleSubmit() {
    const { source_id, monitor_id, latest_source_id, latest_monitor_id } =
      Taro.getStorageSync('sourceInfo') // 千人千码参数
    const { redirect } = this.$instance?.router?.params
    const { loginType, accountMode } = this.state
    const { mobile, email, password, vcode } = this.state.info
    let params = {}

    if (accountMode === 'email') {
      const emailTrim = (email || '').trim()
      if (!validate.isEmail(emailTrim)) {
        showToast($t('4e9d53b5.c902bb'))
        return
      }
      if (loginType == 1) {
        if (!validate.isRequired(password)) {
          showToast($t('3ca883d0.e39ffe'))
          return
        }
        if (!validate.isEmailChannelPassword(password)) {
          return showToast($t('4e9d53b5.c903cc'))
        }
        params = {
          username: emailTrim,
          password,
          check_type: 'password',
          silent: 1,
          auto_register: 0,
          auth_type: 'local'
        }
      } else {
        if (!validate.isRequired(vcode)) {
          showToast($t('3ca883d0.d0c06a'))
          return
        }
        params = {
          username: emailTrim,
          vcode,
          check_type: 'email_otp',
          auto_register: 1,
          auth_type: 'local'
        }
      }
    } else {
      params = {
        username: mobile
      }
      if (!validate.isMobileNum(mobile)) {
        showToast($t('3ca883d0.a32ab5'))
        return
      }

      if (loginType == 1) {
        if (!validate.isRequired(password)) {
          showToast($t('3ca883d0.e39ffe'))
          return
        }
        if (!validate.isPassword(password)) {
          return showToast($t('3ca883d0.eac67a'))
        }
        params['password'] = password
        params['check_type'] = 'password'
        params['silent'] = 1
        params['auto_register'] = 0
      } else {
        if (!validate.isRequired(vcode)) {
          showToast($t('3ca883d0.d0c06a'))
          return
        }
        params['vcode'] = vcode
        params['check_type'] = 'mobile'
        params['auto_register'] = 1
      }

      params['auth_type'] = 'local'
    }

    if (source_id) {
      params['source_id'] = source_id
    }
    if (monitor_id) {
      params['monitor_id'] = monitor_id
    }
    if (latest_source_id) {
      params['latest_source_id'] = latest_source_id
    }
    if (latest_monitor_id) {
      params['latest_monitor_id'] = latest_monitor_id
    }

    try {
      const { token, error_message } = await api.wx.newloginh5(params)

      const { is_new } = tokenParseH5(token)

      if (is_new === 1) {
        if (accountMode === 'email') {
          if (loginType === 1) {
            return showToast($t('3ca883d0.c904dd'))
          }
          setToken(token)
          const emailTrim = (this.state.info.email || '').trim()
          Taro.navigateTo({
            url: `/subpages/auth/edit-password?phone=${encodeURIComponent(
              emailTrim
            )}&redi_url=${encodeURIComponent(redirect || '')}`
          })
          return
        }
        if (loginType === 1) {
          return showToast($t('3ca883d0.3bfe03'))
        }
        setToken(token)
        Taro.navigateTo({
          url: `/subpages/auth/edit-password?phone=${mobile}&redi_url=${encodeURIComponent(
            redirect || ''
          )}`
        })
        return
      } else {
        if (error_message) {
          return showToast(error_message)
        }
        /** 邮箱登录成功后固定进会员中心；手机号登录仍尊重 redirect / redi_url */
        const redirectOpts =
          accountMode === 'email' ? { forceMemberCenter: true } : undefined
        await setTokenAndRedirect.call(
          this,
          token,
          async () => {
            await this.handleUpdateUserInfo()
          },
          redirectOpts
        )
      }
    } catch (e) {
      console.log(e)
    }
  }

  handleUpdateUserInfo = async () => {
    const { dispatch } = this.props
    const _userInfo = await api.member.memberInfo()
    // 兼容老版本 后续优化
    const { username, avatar, user_id, mobile, open_id } = _userInfo.memberInfo
    Taro.setStorageSync('userinfo', {
      username: username,
      avatar: avatar,
      userId: user_id,
      isPromoter: _userInfo.is_promoter,
      mobile: mobile,
      openid: open_id,
      vip: _userInfo.vipgrade ? _userInfo.vipgrade.vip_type : ''
    })
    dispatch(updateUserInfo(_userInfo))
  }

  handleNavigateReg = async () => {
    const { redirect } = this.$instance?.router?.params
    navigationToReg(redirect)
  }

  handleForgotPsd = async () => {
    const { redirect } = this.$instance?.router?.params
    const { accountMode } = this.state
    const { mobile, email } = this.state.info

    if (accountMode === 'email') {
      const parts = []
      if (redirect) {
        parts.push(`redi_url=${encodeURIComponent(redirect)}`)
      }
      if (email) {
        parts.push(`email=${encodeURIComponent(email.trim())}`)
      }
      const url =
        parts.length > 0
          ? `/subpages/auth/forgotpwd-email?${parts.join('&')}`
          : '/subpages/auth/forgotpwd-email'
      Taro.navigateTo({ url })
      return
    }

    const parts = []
    if (redirect) {
      parts.push(`redi_url=${encodeURIComponent(redirect)}`)
    }
    if (mobile) {
      parts.push(`phone=${mobile}`)
    }
    const url =
      parts.length > 0 ? `/subpages/auth/forgotpwd?${parts.join('&')}` : '/subpages/auth/forgotpwd'
    Taro.navigateTo({ url })
  }

  getDevice() {
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
    return ios
  }

  // 键盘挡输入框
  getElementOffsetTop(el) {
    let top = el.offsetTop
    let cur = el.offsetParent
    while (cur != null) {
      top += cur.offsetTop
      cur = cur.offsetParent
    }
    return top
  }

  handleRemarkFocus = (value, event) => {
    const ios = this.getDevice()
    const dom = event.target
    setTimeout(() => {
      if (ios) {
        document.body.scrollTop = document.body.scrollHeight
      } else {
        // dom.scrollIntoView(false) 微信x5内核不支持
        const body = document.getElementsByTagName('body')[0]
        const clientHeight = body.clientHeight // 可见高
        const fixHeight = clientHeight / 3 // 自定义位置
        const offsetTop = this.getElementOffsetTop(dom)
        body.scrollTop = offsetTop - fixHeight
      }
    }, 300)
  }

  handleRemarkBlur = () => {
    const ios = this.getDevice()
    if (!ios) {
      const body = document.getElementsByTagName('body')[0]
      body.scrollTop = 0
    }
  }

  logoShow = (show) => () => {
    if (!show) {
      this.setState({
        logoShow: false
      })
    } else {
      setTimeout(() => {
        this.setState({
          logoShow: true
        })
      }, 100)
    }
  }

  render() {
    const { info, loginType, imgInfo, logoShow, accountMode } = this.state

    const passwordLogin = loginType == 1

    const codeLogin = loginType == 2

    const emailTrim = (info.email || '').trim()
    const isFullMobile =
      accountMode === 'mobile' &&
      ((codeLogin && info.mobile && info.yzm && info.vcode) ||
        (passwordLogin &&
          info.mobile &&
          info.password &&
          info.password.length >= 6 &&
          !info.is_new)) &&
      info.mobile &&
      info.mobile.length === 11

    const isFullEmailPassword =
      accountMode === 'email' &&
      passwordLogin &&
      validate.isEmail(emailTrim) &&
      info.password &&
      validate.isEmailChannelPassword(info.password)

    const isFullEmailOtp =
      accountMode === 'email' &&
      codeLogin &&
      validate.isEmail(emailTrim) &&
      info.yzm &&
      info.vcode

    const isFull = isFullMobile || isFullEmailPassword || isFullEmailOtp

    const inputProp = {
      onFocus: this.logoShow(false),
      onBlur: this.logoShow(true)
    }

    return (
      <SpPage
        className={classNames('page-auth-login', {
          'is-code-login': codeLogin,
          'is-full': isFull
        })}
        onClickLeftIcon={this.handleNavLeftItemClick}
      >
        <View style={{ padding: '0 32px' }}>
          <View className='auth-hd'>
            <View className='title'>{$t('3ca883d0.04b015')}</View>
            {/* <View className='desc'>使用已注册的手机号登录</View> */}
          </View>
          <View className='auth-bd'>
            <View className='login-type-tabs'>
              <View
                className={classNames('login-type-tab', {
                  'login-type-tab--active': accountMode === 'mobile'
                })}
                onClick={() => this.handleAccountModeChange('mobile')}
              >
                {$t('3ca883d0.c906ff')}
              </View>
              <View
                className={classNames('login-type-tab', {
                  'login-type-tab--active': accountMode === 'email'
                })}
                onClick={() => this.handleAccountModeChange('email')}
              >
                {$t('3ca883d0.c90700')}
              </View>
            </View>
            <AtForm className='form'>
              {accountMode === 'mobile' ? (
                <>
                  <View className='form-field noborder'>
                    <CompInputPhone
                      placeholder={$t('3ca883d0.d787a2')}
                      onChange={this.handleInputChange.bind(this, 'mobile')}
                      value={info.mobile}
                      needValidate={passwordLogin}
                    />
                  </View>
                  {/* 密码登录 */}
                  {passwordLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <CompPasswordInput
                          onChange={this.handleInputChange.bind(this, 'password')}
                          {...inputProp}
                          value={info.password}
                        />
                      </View>
                    </View>
                  )}
                  {/* 验证码登录，验证码超过1次，显示图形验证码 */}
                  {codeLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <AtInput
                          clear
                          name='yzm'
                          value={info.yzm}
                          placeholder={$t('3ca883d0.e70066')}
                          onChange={this.handleInputChange.bind(this, 'yzm')}
                          placeholderClass='input-placeholder'
                          {...inputProp}
                        />
                      </View>
                      <View className='btn-field'>
                        {imgInfo && (
                          <Image
                            className='image-vcode'
                            src={imgInfo.imageData}
                            onClick={this.getImageVcode.bind(this)}
                          />
                        )}
                      </View>
                    </View>
                  )}
                  {codeLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <AtInput
                          clear
                          name='vcode'
                          value={info.vcode}
                          placeholder={$t('3ca883d0.d0c06a')}
                          onChange={this.handleInputChange.bind(this, 'vcode')}
                          placeholderClass='input-placeholder'
                          {...inputProp}
                        />
                      </View>
                      <View className='btn-field'>
                        <SpTimer
                          onStart={this.handleTimerStart.bind(this)}
                          onStop={this.handleTimerStop}
                        />
                      </View>
                    </View>
                  )}
                  <View className='btn-text-group'>
                    <Text className='btn-text' onClick={this.handleToggleLogin.bind(this)}>
                      {passwordLogin ? $t('3ca883d0.4bc8be') : $t('3ca883d0.0d9631')}
                    </Text>
                    {passwordLogin && (
                      <Text className='btn-text forgot-password' onClick={this.handleForgotPsd}>
                        {$t('3ca883d0.804890')}
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View className='form-field'>
                    <AtInput
                      clear
                      name='email'
                      type='text'
                      value={info.email}
                      placeholder={$t('3ca883d0.c90811')}
                      onChange={this.handleInputChange.bind(this, 'email')}
                      placeholderClass='input-placeholder'
                      {...inputProp}
                    />
                  </View>
                  {passwordLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <CompPasswordInput
                          placeholder={$t('4e9d53b5.c903cc')}
                          onChange={this.handleInputChange.bind(this, 'password')}
                          {...inputProp}
                          value={info.password}
                        />
                      </View>
                    </View>
                  )}
                  {codeLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <AtInput
                          clear
                          name='email-yzm'
                          value={info.yzm}
                          placeholder={$t('3ca883d0.e70066')}
                          onChange={this.handleInputChange.bind(this, 'yzm')}
                          placeholderClass='input-placeholder'
                          {...inputProp}
                        />
                      </View>
                      <View className='btn-field'>
                        {imgInfo && (
                          <Image
                            className='image-vcode'
                            src={imgInfo.imageData}
                            onClick={this.getImageVcode.bind(this)}
                          />
                        )}
                      </View>
                    </View>
                  )}
                  {codeLogin && (
                    <View className='form-field'>
                      <View className='input-field'>
                        <AtInput
                          clear
                          name='email-vcode'
                          value={info.vcode}
                          placeholder={$t('3ca883d0.c905ee')}
                          onChange={this.handleInputChange.bind(this, 'vcode')}
                          placeholderClass='input-placeholder'
                          {...inputProp}
                        />
                      </View>
                      <View className='btn-field'>
                        <SpTimer
                          key='login-email-timer'
                          onStart={this.handleEmailLoginTimerStart.bind(this)}
                          onStop={this.handleTimerStop}
                        />
                      </View>
                    </View>
                  )}
                  <View className='btn-text-group'>
                    <Text className='btn-text' onClick={this.handleToggleLogin.bind(this)}>
                      {passwordLogin ? $t('3ca883d0.4bc8be') : $t('3ca883d0.0d9631')}
                    </Text>
                    {passwordLogin && (
                      <Text className='btn-text forgot-password' onClick={this.handleForgotPsd}>
                        {$t('3ca883d0.804890')}
                      </Text>
                    )}
                  </View>
                </>
              )}
              <View className='form-submit'>
                <AtButton
                  disabled={!isFull}
                  circle
                  type='primary'
                  className='login-button'
                  onClick={this.handleSubmit.bind(this)}
                >
                  {$t('3ca883d0.e43613')}
                </AtButton>
                <AtButton
                  circle
                  type='primary'
                  className='reg-button'
                  onClick={this.handleNavigateReg}
                >
                  {$t('3ca883d0.495d84')}
                </AtButton>
              </View>
            </AtForm>
          </View>
          <View className='other-login'>
            <CompOtherLogin />
          </View>
        </View>
      </SpPage>
    )
  }
}
