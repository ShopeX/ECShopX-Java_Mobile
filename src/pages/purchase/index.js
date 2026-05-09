/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useEffect } from 'react'
import { SpPage } from '@/components'

function PurchaseActivityListEntry() {
  const { params = {} } = useRouter()

  useEffect(() => {
    const query = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    const url = `/subpages/purchase/activity-list${query ? `?${query}` : ''}`
    Taro.redirectTo({ url })
  }, [params])

  return <SpPage loading title='企业购' />
}

PurchaseActivityListEntry.options = {
  addGlobalClass: true
}

export default PurchaseActivityListEntry
