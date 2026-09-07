/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useTranslation, $t } from '@/i18n'
import { showToast } from '@/utils'
import './index.scss'

const POINT_MORE_PATH = '/subpages/pointshop/list'

const formatPoint = (point) => {
  if (isNaN(point) || point <= 0) return 0
  return point.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const ActiveTotalControl = (props) => {
  useTranslation()
  const { point, cost_value } = props.userInfo || {}

  const handleGetMore = () => {
    try {
      Taro.navigateTo({ url: POINT_MORE_PATH })
    } catch (e) {
      showToast($t('a6e0e06e.26825e'))
    }
  }

  return (
    <View className='sp-active-control'>
      <View className='sp-active-control__title'>
        <Text>{$t('a6e0e06e.89438c')}</Text>
        <Text className='sp-active-control__title-score'>{formatPoint(point)}</Text>
      </View>
      <View className='sp-active-control__title-btn' onClick={handleGetMore}>
        <Text className='sp-active-control__title-btn-text'>{$t('a6e0e06e.f42a8f')}</Text>
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
