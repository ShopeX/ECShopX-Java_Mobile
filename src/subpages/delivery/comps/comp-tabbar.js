/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro from '@tarojs/taro'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AtTabBar } from 'taro-ui'
import { getCurrentRoute, isWeb } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import './comp-tabbar.scss'

function CompTabbar(props) {
  const { i18n } = useTranslation()
  const TABBAR_LIST = useMemo(
    () => [
      {
        title: $t('dc7a114e.db1c89'),
        iconType: 'dianpushouye',
        url: '/subpages/delivery/index'
      },
      {
        title: $t('dc7a114e.041759'),
        iconType: 'dianpufenlei',
        url: '/subpages/delivery/my'
      }
    ],
    [i18n.language]
  )
  const { colorPrimary } = useSelector((state) => state.sys)

  const tabList = TABBAR_LIST.map((item) => {
    return {
      title: item.title,
      name: item.title,
      iconType: item.iconType,
      selectedIconType: `${item.iconType}-fill`,
      iconPrefixClass: 'iconfont icon',
      url: item.url,
      text: item?.text ? item.text : null
    }
  })

  let currentIndex = 0
  const pages = Taro.getCurrentPages()
  if (pages.length > 0) {
    let currentPage = pages[pages.length - 1].route
    currentPage = isWeb ? currentPage.split('?')[0] : `/${currentPage}`
    currentIndex = TABBAR_LIST.findIndex((tab) => {
      return tab.url == currentPage
    })
  }

  console.log('comp-tabbar currentIndex:', currentIndex)

  const handleTabbarClick = async (index) => {
    const tabItem = tabList[index]
    const { path } = getCurrentRoute()
    if (path != tabItem.url) {
      Taro.redirectTo({ url: `${tabItem.url}` })
    }
  }

  return (
    <AtTabBar
      fixed
      className='comp-tabbar'
      iconSize='20'
      selectedColor='#4980FF'
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