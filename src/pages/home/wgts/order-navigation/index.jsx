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

const KEY_TO_ID = {
  waitPayNum: 'orderWaitPay',
  waitSendNum: 'orderWaitSend',
  waitRecevieNum: 'orderWaitReceive',
  waitEvaluateNum: 'orderWaitEvaluate',
  afterSalesNum: 'orderAfterSale',
  zitiNum: 'zitiOrder'
}

const ID_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_ID).map(([k, v]) => [v, k]))

const TEMPLATE_4_KEYS = ['waitPayNum', 'waitRecevieNum', 'waitEvaluateNum', 'afterSalesNum']
const TEMPLATE_5_KEYS = [
  'waitPayNum',
  'waitSendNum',
  'waitRecevieNum',
  'waitEvaluateNum',
  'afterSalesNum'
]

const DEFAULT_ICON_BY_KEY = {
  waitPayNum: DEFAULT_ICON_BY_ID.orderWaitPay,
  waitSendNum: DEFAULT_ICON_BY_ID.orderWaitSend,
  waitRecevieNum: DEFAULT_ICON_BY_ID.orderWaitReceive,
  waitEvaluateNum: DEFAULT_ICON_BY_ID.orderWaitEvaluate,
  afterSalesNum: DEFAULT_ICON_BY_ID.orderAfterSale,
  zitiNum: DEFAULT_ICON_BY_ID.zitiOrder
}

/** 角标字段：按 key / 配置的页面 id / 自定义链接推断 */
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

function inferKeyFromContent(content) {
  const text = String(content || '').trim()
  if (!text) return ''
  if (/待支付|待付款/.test(text)) return 'waitPayNum'
  if (/待发货/.test(text)) return 'waitSendNum'
  if (/待收货/.test(text)) return 'waitRecevieNum'
  if (/待评价/.test(text)) return 'waitEvaluateNum'
  if (/售后/.test(text)) return 'afterSalesNum'
  return ''
}

function hasConfiguredLink(item = {}) {
  if (item.linkType == 1 && item.linkUrl) return true
  return !!(item.linkPage && item.id)
}

/** 旧装修数据可能只有 content/imgUrl，用 key 或下标补全 linkPage.id */
function normalizeNavItem(item = {}, index = 0, total = 1) {
  const keys = total >= 5 ? TEMPLATE_5_KEYS : TEMPLATE_4_KEYS
  const indexKey = keys[index] || ''
  const key =
    item.key || ID_TO_KEY[item.id] || inferKeyFromContent(item.content) || indexKey || ''
  const id = item.id || KEY_TO_ID[key] || ''
  const merged = { ...item, key, id }

  if (!hasConfiguredLink(item) && id) {
    merged.linkType = 0
    merged.linkPage = 'link'
    merged.id = id
  }
  return merged
}

function resolveBadgeKey(item = {}) {
  if (item.key) return item.key
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
  return (
    item.imgUrl ||
    DEFAULT_ICON_BY_ID[item.id] ||
    DEFAULT_ICON_BY_KEY[item.key] ||
    ''
  )
}

function hasLink(item = {}) {
  if (item.linkType == 1 && item.linkUrl) return true
  if (item.linkPage && item.id) return true
  if (item.key && KEY_TO_ID[item.key]) return true
  return !!(item.linkUrl || item.link)
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
  const rawData = Array.isArray(params.data) ? params.data : []
  const data = useMemo(
    () => rawData.map((item, index) => normalizeNavItem(item, index, rawData.length)),
    [rawData]
  )

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
