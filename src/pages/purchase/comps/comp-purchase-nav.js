/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import { SpImage } from '@/components'
import './comp-purchase-nav.scss'

function CompPurchaseNav(props) {
  const {
    title = '企业购',
    btnReturn = false,
    btnHome = false,
    onBack = () => {},
    onHome = () => {},
    navigationRSpace = 0
  } = props
  const showHome = btnHome || btnReturn

  return (
    <View className='comp-purchase-nav' style={{ paddingRight: `${navigationRSpace}px` }}>
      <View className='comp-purchase-nav__left'>
        {btnReturn && (
          <View className='comp-purchase-nav__icon-btn' onClick={onBack}>
            <SpImage src='fv_back.png' width={34} height={34} />
          </View>
        )}
        {showHome && (
          <View className='comp-purchase-nav__icon-btn' onClick={onHome}>
            <SpImage src='purcharehome.png' width={52} height={52} />
          </View>
        )}
        <Button className='comp-purchase-nav__service' openType='contact'>
          <SpImage src='purcharekefu.png' width={42} height={44} />
          <Text className='comp-purchase-nav__service-text'>客服</Text>
        </Button>
      </View>
      <Text className='comp-purchase-nav__title'>{title}</Text>
    </View>
  )
}

CompPurchaseNav.options = {
  addGlobalClass: true
}

export default CompPurchaseNav
