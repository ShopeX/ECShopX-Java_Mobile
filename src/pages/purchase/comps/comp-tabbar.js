/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useEffect, useState, memo } from 'react'
import { View, Image } from '@tarojs/components'
import { useSelector } from 'react-redux'
import { AtTabBar } from 'taro-ui'
import { classNames, entryLaunch, getCurrentRoute, getDistributorId, isWeb } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import './comp-tabbar.scss'

const TABBAR_LIST = [
  {
    titleKey: 'f321c16f.36c6f5',
    iconType: 'dianpushouye',
    url: '/subpages/purchase/activity-list'
  },
  {
    titleKey: 'f321c16f.2e1148',
    key: 'identity',
    iconType: 'dianpushangpinlist',
    url: '/subpages/purchase/select-identity',
    text: true
  },
  {
    titleKey: 'f321c16f.07b181',
    iconType: 'dianpufenlei',
    url: '/subpages/purchase/member?from=purchase_home'
  }
]

function CompTabbar(props) {
  useTranslation()
  const { colorPrimary } = useSelector((state) => state.sys)

  const [currentIndex, setCurrentIndex] = useState(0)

  let tabbarList = JSON.parse(JSON.stringify(TABBAR_LIST))

  const tabList = tabbarList.map((item) => {
    const title = $t(item.titleKey)
    return {
      title,
      name: title,
      iconType: item.iconType,
      selectedIconType: `${item.iconType}-fill`,
      iconPrefixClass: 'iconfont icon',
      url: item.url
    }
  })

  useDidShow(() => {
    changeIndex()
  })

  useEffect(() => {
    changeIndex()
  }, [])

  const changeIndex = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 0) {
      let currentPage = pages[pages.length - 1].route
      currentPage = isWeb ? currentPage.split('?')[0] : `/${currentPage.split('?')[0]}`
      const _currentIndex = tabbarList.findIndex((tab) => {
        return tab.url.split('?')[0] == currentPage
      })
      if (_currentIndex != -1) {
        setCurrentIndex(_currentIndex)
      }
    }
  }

  console.log('comp-tabbar currentIndex:', currentIndex)

  const handleTabbarClick = async (index) => {
    const tabItem = tabList[index]
    const { path } = getCurrentRoute()
    if (path != tabItem.url) {
      let url = `${tabItem.url}`
      Taro.reLaunch({ url })
    }
  }

  return (
    <AtTabBar
      className='comp-tabbar'
      fixed
      iconSize='20'
      selectedColor={colorPrimary}
      tabList={tabList}
      onClick={handleTabbarClick}
      current={currentIndex}
    />
  )
}

CompTabbar.options = {
  addGlobalClass: true
}

export default CompTabbar