/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 兼容旧路径 / 太阳码：商品详情已迁至分包 subpages/item/espier-detail
 */
import { useEffect } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import qs from 'qs'

export default function ItemDetailRedirect() {
  useEffect(() => {
    const params = { ...(getCurrentInstance()?.router?.params || {}) }
    // Taro 会带上多余的路由字段，转发前去掉
    delete params.$taroTimestamp
    const query = qs.stringify(params)
    Taro.redirectTo({
      url: `/subpages/item/espier-detail${query ? `?${query}` : ''}`
    })
  }, [])
  return null
}
