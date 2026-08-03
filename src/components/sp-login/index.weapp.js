/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro from '@tarojs/taro'
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react'
import { View, Text, Button } from '@tarojs/components'
import { AtButton, AtCurtain } from 'taro-ui'
import { useImmer } from 'use-immer'
import S from '@/spx'
import api from '@/api'
import { isWeixin, isAlipay, classNames, showToast, entryLaunch } from '@/utils'
import { SG_SHARER_UID, SG_TRACK_PARAMS, SG_ROUTER_PARAMS, SG_GUIDE_PARAMS } from '@/consts'
import { Tracker } from '@/service'
import { SpPrivacyModal, SpImage, SpCheckbox } from '@/components'
import { useSelector, useDispatch } from 'react-redux'
import { updateIsNewUser } from '@/store/slices/user'
import { useLogin, useLocation } from '@/hooks'
import './index.scss'

const initialState = {
  logo: '',
  registerName: '',
  privacyName: '',
  agreeMentChecked: false
}

const SpLogin = forwardRef((props, ref) => {
  const { children, className, visible, onPolicyClose, onChange, onClose } = props
  const dispatch = useDispatch()
  const { updateAddress } = useLocation()
  const { shopInfo } = useSelector((state) => state.shop)
  const { isNewUser } = useSelector((state) => state.user)
  const { isLogin, login, setToken, checkPolicyChange } = useLogin({
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    },
    loginSuccess: () => {
      // TODO 需要优化
      !visible && updateAddress && updateAddress()
    }
  })
  const [policyModal, setPolicyModal] = useState(false)
  const [loginModal, setLoginModal] = useState(false)
  const [state, setState] = useImmer(initialState)
  const { logo, registerName, privacyName, agreeMentChecked } = state
  const codeRef = useRef()

  /** 打开注册弹窗前清空旧 code，弹窗内重新 Taro.login，避免复用探测时已消耗的 code */
  const openRegisterModal = useCallback(() => {
    codeRef.current = null
    dispatch(updateIsNewUser(true))
    setTimeout(() => setLoginModal(true), 0)
  }, [dispatch])

  /**
   * 已注册会员 code 登录。
   * 新用户时 useLogin.login() 会抛错，此处 catch 后必须再抛出，
   * 否则外层 .catch() 不会打开注册弹窗。
   * @param {{ skipPolicyCheck?: boolean }} [options]
   */
  const handleUserLogin = async (options = {}) => {
    try {
      await login(undefined, options)
      setLoginModal(false)
      onChange && onChange()
    } catch (e) {
      console.log('[sp-login] handleUserLogin error:', e)
      throw e
    }
  }

  /**
   * 先静默 code 登录；失败则走注册弹窗（手机号授权）。
   * 已标记新用户时跳过探测，少打一次必失败的 /login，也少耗一次 code。
   * 若仍是未同意隐私，回到隐私弹窗，不要误开注册弹窗。
   */
  const trySilentLoginOrShowRegister = useCallback(() => {
    if (isNewUser) {
      codeRef.current = null
      setLoginModal(true)
      return
    }
    handleUserLogin()
      .then(() => {})
      .catch((e) => {
        if (e && String(e.message).includes('POLICY_NOT_AGREE')) {
          setPolicyModal(true)
          return
        }
        openRegisterModal()
      })
  }, [isNewUser, openRegisterModal])

  useEffect(() => {
    if (visible) {
      trySilentLoginOrShowRegister()
    }
    // 仅跟随 visible 打开；避免 isNewUser 变化后重复探测
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    if (loginModal) {
      fetchPrivacyData()
      // 注册用 code：每次打开弹窗重新获取，不复用静默登录探测过的 code
      codeRef.current = null
      Taro.login({
        success: ({ code }) => {
          codeRef.current = code
        },
        fail: (e) => {
          console.error('[sp-login] taro login fail:', e)
        }
      })
    }
  }, [loginModal])

  const fetchPrivacyData = async () => {
    const { logo, protocol } = await api.shop.getStoreBaseInfo()
    const { member_register, privacy } = protocol
    setState((draft) => {
      draft.logo = logo
      draft.registerName = member_register
      draft.privacyName = privacy
    })
  }

  const handleBindPhone = async (e) => {
    const { encryptedData, iv, cloudID } = e.detail
    if (encryptedData && iv) {
      Taro.showLoading({ title: '' })
      // 手机号注册前再取一次 code，确保不复用探测 / 弹窗缓存的过期 code
      let code = codeRef.current
      try {
        const loginRes = await Taro.login()
        code = loginRes.code
        codeRef.current = code
      } catch (err) {
        Taro.hideLoading()
        console.error('[sp-login] refresh code before newlogin fail:', err)
        showToast('登录凭证获取失败，请重试')
        return
      }

      let params = {
        code,
        encryptedData,
        iv,
        cloudID,
        user_type: 'wechat',
        auth_type: 'wxapp'
      }

      // const { uid } = entryLaunch.getLaunchParams()
      const { uid, dtid } = Taro.getStorageSync(SG_ROUTER_PARAMS)
      const { gu_user_id, gu } = Taro.getStorageSync(SG_GUIDE_PARAMS)
      const { source_id, monitor_id, latest_source_id, latest_monitor_id } =
        Taro.getStorageSync('sourceInfo') // 千人千码参数
      if (uid) {
        // 分销绑定
        params['uid'] = uid
      }

      if (shopInfo.distributor_id) {
        params['distributor_id'] = shopInfo.distributor_id
      }
      if (dtid && dtid !== 'undefined') {
        params['distributor_id'] = dtid
      }
      let work_userid = ''
      if (gu_user_id) {
        work_userid = gu_user_id
      }
      if (gu) {
        work_userid = gu.split('_')[0]
      }
      // gu_user_id: 欢迎语上带过来的员工编号, 同work_user_id
      if (work_userid) {
        params['channel'] = 1
        params['work_userid'] = work_userid
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
        const { token, is_new } = await api.wx.newlogin(params)
        if (token) {
          setToken(token)
          Taro.hideLoading()
          setLoginModal(false)
          showToast('恭喜您，注册成功')
          onChange && onChange()
        } else {
          showToast('注册失败')
        }
      } catch (error) {
        Taro.hideLoading()
      }
    }
  }

  const handleCloseModal = useCallback(() => {
    setPolicyModal(false)
    onPolicyClose && onPolicyClose()
  }, [])

  /**
   * 用户点击「同意」隐私协议后：
   * 1. 先关闭隐私弹窗，不先打开登录弹窗（避免弹窗先出再闪变）
   * 2. skipPolicyCheck 静默登录：老用户成功则直接登进；新用户失败后打开注册弹窗
   *    （同意后若再 checkPolicyChange，可能再次 POLICY_NOT_AGREE / 弹回隐私，导致注册弹窗出不来）
   */
  const handleConfirmModal = () => {
    setPolicyModal(false)
    login(undefined, { skipPolicyCheck: true })
      .then(() => {
        setLoginModal(false)
        onChange && onChange()
      })
      .catch(() => {
        openRegisterModal()
      })
  }

  // 登录
  const handleClickLogin = async (e) => {
    e.stopPropagation()
    const { scene } = Taro.getLaunchOptionsSync()
    // 微信朋友圈打开场景
    if (scene == 1154) {
      return showToast('请前往小程序使用完整服务')
    }
    const checkRes = await checkPolicyChange()
    if (!checkRes) {
      setPolicyModal(true)
      return
    }
    if (isLogin) {
      onChange && onChange()
    } else {
      trySilentLoginOrShowRegister()
    }
  }

  useImperativeHandle(ref, () => ({
    _setPolicyModal: () => {
      setPolicyModal(true)
    },
    handleToLogin: () => {
      trySilentLoginOrShowRegister()
    }
  }))

  const handleClickPrivacy = (type) => {
    Taro.navigateTo({
      url: `/subpages/auth/reg-rule?type=${type}`
    })
  }

  const onChangePayment = (e) => {
    setState((draft) => {
      draft.agreeMentChecked = e
    })
  }

  // eslint-disable-next-line no-undef
  const { icon, nickname } = __wxConfig.accountInfo

  return (
    <View className={classNames('sp-login', className)}>
      <View onClick={handleClickLogin}>{children}</View>

      {/* 隐私协议 */}
      <SpPrivacyModal
        open={policyModal}
        onCancel={handleCloseModal}
        onConfirm={handleConfirmModal}
      />

      {/* 授权登录 / 新用户注册 */}
      <AtCurtain
        isOpened={loginModal}
        onClose={() => {
          onClose()
          setLoginModal(false)
        }}
      >
        <View className='login-modal'>
          <View className='login-modal__hd'>
            <SpImage circle src={icon.replace(/^http:/, 'https:')} width={120} height={120} />
            <View className='nick-name'>{nickname}</View>
          </View>
          <View className='login-modal__bd'>登录手机号，查看全部订单和优惠券</View>
          <View className='agreement-content'>
            <SpCheckbox checked={agreeMentChecked} onChange={onChangePayment} />
            <View className='agreement-list'>
              <Text
                className='agreement-name'
                onClick={handleClickPrivacy.bind(this, 'member_register')}
              >
                《{registerName}》
              </Text>
              和
              <Text className='agreement-name' onClick={handleClickPrivacy.bind(this, 'privacy')}>
                《{privacyName}》
              </Text>
            </View>
          </View>
          <View className='login-modal__ft'>
            {isNewUser && (
              <AtButton
                type='primary'
                disabled={!agreeMentChecked}
                openType='getPhoneNumber'
                onGetPhoneNumber={handleBindPhone}
              >
                登录
              </AtButton>
            )}
            {!isNewUser && (
              <AtButton
                type='primary'
                disabled={!agreeMentChecked}
                onClick={() => {
                  handleUserLogin().catch(() => {
                    // 弹窗已打开时仅切换为注册态，并重新取 code
                    codeRef.current = null
                    dispatch(updateIsNewUser(true))
                    Taro.login({
                      success: ({ code }) => {
                        codeRef.current = code
                      }
                    })
                  })
                }}
              >
                登录
              </AtButton>
            )}
          </View>
        </View>
      </AtCurtain>
    </View>
  )
})

SpLogin.defaultProps = {
  visible: false,
  onChange: () => {},
  onClose: () => {}
}

SpLogin.options = {
  addGlobalClass: true
}

export default SpLogin
