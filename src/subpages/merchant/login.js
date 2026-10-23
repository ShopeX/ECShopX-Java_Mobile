/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { SpPage, SpLoading } from '@/components'
import * as merchantApi from '@/api/merchant'
import S from '@/spx'

const APPLY_PATH = '/subpages/merchant/apply'
const AUDIT_PATH = '/subpages/merchant/audit'
const MALL_LOGIN_PATH = '/subpages/member/index'

/**
 * 兼容旧入口：商家入驻不再独立登录，统一走商城会员 JWT。
 * 未登录 → 会员中心（带 redirect）；已登录 → 按 step 进 apply / audit
 */
const Login = () => {
  useEffect(() => {
    const bootstrap = async () => {
      if (!S?.getAuthToken()) {
        Taro.redirectTo({
          url: `${MALL_LOGIN_PATH}?redirect_url=${encodeURIComponent(APPLY_PATH)}`
        })
        return
      }
      let step = 1
      try {
        const res = await merchantApi.getStep()
        step = Number(res?.step) || 1
      } catch (e) {
        step = 1
      }
      Taro.redirectTo({
        url: step === 4 ? AUDIT_PATH : APPLY_PATH
      })
    }
    bootstrap()
  }, [])

  return (
    <SpPage className='page-merchant-login' navbar={false}>
      <View style={{ paddingTop: '40%' }}>
        <SpLoading />
      </View>
    </SpPage>
  )
}

export default Login
