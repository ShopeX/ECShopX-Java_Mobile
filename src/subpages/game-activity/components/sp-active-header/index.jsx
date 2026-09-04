/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { SpImage } from '@/components'
import { useTranslation, $t } from '@/i18n'
import { showToast } from '@/utils'
import './index.scss'

const POINT_MORE_PATH = '/subpages/pointshop/list'

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
        <Text className='sp-active-control__title-score'>{point || 0}</Text>
      </View>
      <View className='sp-active-control__title-btn' onClick={handleGetMore}>
        <SpImage
          className='sp-active-control__title-btn-img'
          src={`${process.env.APP_IMAGE_CDN}/fv_activity_get_more_btn.png`}
          mode='cover'
        />
      </View>
      <View className='sp-active-control__desc'>
        <Text>{$t('a6e0e06e.3b39a8')}</Text>
        <Text style={{ marginLeft: '6rpx' }}>{cost_value}</Text>
        <Text>{$t('a6e0e06e.9f68a8')}</Text>
      </View>
    </View>
  )
}

export default ActiveTotalControl
