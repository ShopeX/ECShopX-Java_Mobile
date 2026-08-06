/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Button } from '@tarojs/components'
import S from '@/spx'
import api from '@/api'
import { showToast, classNames, navigateTo } from '@/utils'
import { useLogin, useLocation } from '@/hooks'
import qs from 'qs'
import './index.scss'

function normalizeLoginRedirectPath(path, params = {}) {
  // H5 browser 模式下访问根地址时 router.path 常为 `/`，Taro 不认该页
  const home = process.env.APP_HOME_PAGE || '/pages/index'
  const rawPath = typeof path === 'string' ? path.split('?')[0] : ''
  const safePath = !rawPath || rawPath === '/' ? home : rawPath
  const query = qs.stringify(params || {})
  return query ? `${safePath}?${query}` : safePath
}

function SpLogin(props) {
  const { className, children, size = 'normal', circle = false, onChange } = props
  const { updateAddress } = useLocation()
  const { isLogin, login, setToken } = useLogin({
    policyUpdateHook: (isUpdate) => {
      isUpdate && setPolicyModal(true)
    },
    loginSuccess: () => {
      updateAddress()
    }
  })
  /**
   *
   */
  const handleOAuthLogin = () => {}

  const handleOnChange = (e) => {
    e.stopPropagation()
    if (isLogin) {
      onChange && onChange(e)
    } else {
      // 点击时实时取 instance，避免 H5 首屏缓存的空 router
      const { path, params } = getCurrentInstance()?.router || {}
      const restParams = { ...(params || {}) }
      delete restParams.$taroTimestamp
      const _path = normalizeLoginRedirectPath(path, restParams)
      const url = `/subpages/auth/login?redirect=${encodeURIComponent(_path)}`

      Taro.navigateTo({
        url
      })
    }
  }

  return (
    <View className={classNames('sp-login', className)} onClick={handleOnChange}>
      {children}
    </View>
  )
}

export default SpLogin
