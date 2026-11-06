/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import { SpImage, SpLogin } from '@/components'
import { classNames, linkPage } from '@/utils'
import { useLogin } from '@/hooks'
import api from '@/api'
import { AtIcon } from 'taro-ui'
import { useTranslation, $t } from '@/i18n'
import { getGlobalBaseStyle } from '../helper'
import './index.scss'

/** 默认图标：仅在装修未上传图片时兜底 */
const DEFAULT_ICON_BY_ID = {
  orderWaitPay: 'fv_order_daifukuan.png',
  orderWaitSend: 'fv_order_daifahuo.png',
  orderWaitReceive: 'fv_order_daishouhuo.png',
  orderWaitEvaluate: 'pingjia.png',
  orderAfterSale: 'fv_order_shouhou.png',
  orderAll: 'fv_order_daifukuan.png',
  zitiOrder: 'fv_order_daishouhuo.png'
}

/** 角标字段：按配置的页面 id / 自定义链接推断 */
const BADGE_KEY_BY_ID = {
  orderWaitPay: 'waitPayNum',
  orderWaitSend: 'waitSendNum',
  orderWaitReceive: 'waitRecevieNum',
  orderWaitEvaluate: 'waitEvaluateNum',
  orderAfterSale: 'afterSalesNum',
  zitiOrder: 'zitiNum'
}

const BADGE_KEY_BY_STATUS = {
  '5': 'waitPayNum',
  '6': 'waitSendNum',
  '1': 'waitRecevieNum',
  '7': 'waitEvaluateNum'
}

function resolveBadgeKey(item = {}) {
  if (item.id && BADGE_KEY_BY_ID[item.id]) {
    return BADGE_KEY_BY_ID[item.id]
  }
  const url = item.linkUrl || item.link || ''
  if (/after-sale/i.test(url)) {
    return 'afterSalesNum'
  }
  const matched = String(url).match(/[?&]status=(\d+)/)
  if (matched) {
    return BADGE_KEY_BY_STATUS[matched[1]] || null
  }
  return null
}

function resolveItemIcon(item = {}) {
  return item.imgUrl || DEFAULT_ICON_BY_ID[item.id] || ''
}

function hasLink(item = {}) {
  return !!(item.linkPage || item.linkUrl || item.linkType == 1)
}

export default function WgtOrderNavigation(props) {
  useTranslation()
  const { info, id } = props
  const { isLogin } = useLogin()
  const [counts, setCounts] = React.useState({
    waitPayNum: 0,
    waitSendNum: 0,
    waitRecevieNum: 0,
    afterSalesNum: 0,
    waitEvaluateNum: 0,
    zitiNum: 0
  })

  // 从 params 中获取配置和数据，兼容两种数据结构
  const params = info?.params || info || {}
  const base = params.base || {}
  const data = Array.isArray(params.data) ? params.data : []

  const outerStyle = useMemo(() => getGlobalBaseStyle(base.outerMargin || {}), [base.outerMargin])

  useEffect(() => {
    if (isLogin) {
      getMemberCenterData()
    }
  }, [isLogin])

  const getMemberCenterData = async () => {
    try {
      const res = await api.trade.getCount()
      const {
        aftersales,
        normal_notpay_notdelivery,
        normal_payed_daifahuo,
        normal_payed_daishouhuo,
        normal_payed_daiziti,
        normal_not_rate
      } = res || {}
      setCounts({
        waitPayNum: normal_notpay_notdelivery ?? 0,
        waitSendNum: normal_payed_daifahuo ?? 0,
        waitRecevieNum: normal_payed_daishouhuo ?? 0,
        afterSalesNum: aftersales ?? 0,
        zitiNum: normal_payed_daiziti ?? 0,
        waitEvaluateNum: normal_not_rate ?? 0
      })
    } catch (e) {
      // ignore
    }
  }

  const handleItemClick = (item) => {
    if (!hasLink(item)) return
    linkPage(item)
  }

  if (!info || data.length === 0) return null

  return (
    <View
      className={classNames('wgt wgt-order-navigation')}
      style={{ ...outerStyle }}
      id={`wgt-order-navigation-${id || ''}`}
    >
      {base.title && (
        <View className='wgt-order-navigation-head' style={{ color: base.titleColor }}>
          <Text className='wgt-order-navigation-title'>{base.title}</Text>
          <View
            className='wgt-order-navigation-morelink'
            onClick={() => linkPage({ linkType: 0, linkPage: 'link', id: 'orderAll' })}
          >
            <Text>{$t('e21efe54.dbb4d8')}</Text>
            <AtIcon value='chevron-right' size={14} color={base.moreBtn?.color} />
          </View>
        </View>
      )}
      <View className='wgt-order-navigation-bd'>
        {data.map((item, idx) => {
          const badgeKey = resolveBadgeKey(item)
          const badgeCount = badgeKey ? counts[badgeKey] : 0
          const icon = resolveItemIcon(item)
          return (
            <SpLogin onChange={() => handleItemClick(item)} key={`wgt-order-item__${idx}`}>
              <View className='wgt-order-navigation-item'>
                <View className='wgt-order-navigation-wrapper'>
                  <View className='wgt-order-navigation-bg'>
                    <SpImage
                      src={icon}
                      className={
                        item.imgUrl ? 'wgt-order-navigation-icon' : 'wgt-order-navigation-icon-mr'
                      }
                    />
                  </View>
                  {badgeCount > 0 && (
                    <View className='wgt-order-navigation-badge'>
                      <Text>{badgeCount > 999 ? '999+' : badgeCount}</Text>
                    </View>
                  )}
                </View>
                <Text className='wgt-order-navigation-label'>{item.content}</Text>
              </View>
            </SpLogin>
          )
        })}
      </View>
    </View>
  )
}
