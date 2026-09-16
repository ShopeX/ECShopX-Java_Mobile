/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { View, Text } from '@tarojs/components'
import { useTranslation, $t } from '@/i18n'
import './index.scss'

const formatPoint = (point) => {
  if (isNaN(point) || point <= 0) return 0
  return point.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const ActiveTotalControl = (props) => {
  useTranslation()
  const { userInfo, isLogin = false, onLogin } = props
  const { point, cost_value } = userInfo || {}

  const handleLogin = () => {
    onLogin && onLogin()
  }

  if (!isLogin) {
    return (
      <View className='sp-active-control sp-active-control--guest'>
        <View className='sp-active-control__guest-main'>
          <View className='sp-active-control__title'>
            <Text>{$t('a6e0e06e.89438c')}</Text>
            <Text className='sp-active-control__title-score is-guest'>
              {$t('a6e0e06e.guest_score')}
            </Text>
          </View>
          <View className='sp-active-control__desc'>
            <Text>{$t('a6e0e06e.3b39a8')}</Text>
            <Text className='sp-active-control__desc-num'>{cost_value ?? '--'}</Text>
            <Text>{$t('a6e0e06e.9f68a8')}</Text>
          </View>
        </View>
        <View className='sp-active-control__title-btn' onClick={handleLogin}>
          <Text className='sp-active-control__title-btn-text'>{$t('a6e0e06e.go_login')}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='sp-active-control'>
      <View className='sp-active-control__title'>
        <Text>{$t('a6e0e06e.89438c')}</Text>
        <Text className='sp-active-control__title-score'>{formatPoint(point)}</Text>
      </View>
      <View className='sp-active-control__desc'>
        <Text>{$t('a6e0e06e.3b39a8')}</Text>
        <Text className='sp-active-control__desc-num'>{cost_value}</Text>
        <Text>{$t('a6e0e06e.9f68a8')}</Text>
      </View>
    </View>
  )
}

export default ActiveTotalControl
