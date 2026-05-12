/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useSelector } from 'react-redux'
import './index.scss'
import SpImage from '../sp-image'
import SpSearch from '../sp-search'

/** 非装修接口：固定占位与跳转逻辑，视觉见 sp-purchase-enterprise-bar__search 样式（对齐企业购稿） */
const DEFAULT_SEARCH_INFO = {
  base: {},
  config: {
    placeholder: '搜索',
    fixTop: false
  }
}

/**
 * 企业购「当前企业」抬头（活动列表、内购首页等复用）
 * @param {string} [props.label='当前企业']
 * @param {string} props.name 企业名称
 * @param {boolean} [props.showMore=true] 是否显示「更多活动」
 * @param {boolean} [props.showSearch=false] 是否显示默认样式搜索条（不读店铺装修接口）
 * @param {React.ReactNode} [props.rightExtra] 右侧自定义内容（如详情页提示文案）；传入时不再展示「更多活动」
 */
function SpPurchaseEnterpriseBar(props) {
  const { label = '当前企业', showMore = true, showSearch = false, rightExtra } = props
  const { curEnterpriseName } = useSelector((state) => state.purchase)

  return (
    <View className='sp-purchase-enterprise-bar'>
      <View className='sp-purchase-enterprise-bar__row'>
        <View className='sp-purchase-enterprise-bar__left'>
          <Text className='sp-purchase-enterprise-bar__label'>{label}</Text>
          <Text className='sp-purchase-enterprise-bar__name'>{curEnterpriseName || '—'}</Text>
        </View>
        {rightExtra != null && rightExtra !== false ? (
          <View className='sp-purchase-enterprise-bar__right-extra'>{rightExtra}</View>
        ) : (
          showMore && (
            <View
              className='sp-purchase-enterprise-bar__more'
              onClick={() => {
                Taro.reLaunch({ url: '/subpages/purchase/activity-list' })
              }}
            >
              <Text className='sp-purchase-enterprise-bar__more-text'>更多活动</Text>
              <SpImage
                src='fv_chevron_right.png'
                width={36}
                height={36}
                className='sp-purchase-enterprise-bar__more-icon'
                mode='widthFix'
              />
            </View>
          )
        )}
      </View>
      {showSearch && (
        <View className='sp-purchase-enterprise-bar__search'>
          <SpSearch info={DEFAULT_SEARCH_INFO} />
        </View>
      )}
    </View>
  )
}

SpPurchaseEnterpriseBar.options = {
  addGlobalClass: true
}

export default SpPurchaseEnterpriseBar
