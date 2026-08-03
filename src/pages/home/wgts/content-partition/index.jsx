/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  useLayoutEffect,
  useCallback,
  useRef
} from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { classNames, pxToRpx, getElementRectBox, rpxToPx } from '@/utils'
import { usePageContext } from '@/hooks/usePageContext'
import throttle from 'lodash/throttle'
import { getGlobalBaseStyle } from '../helper'
import HomeWgts from '../../comps/home-wgts'
import ContentPartitionNavBar from '../comps/nav-bar'
import { WgtsContext } from '../wgts-context'
import './index.scss'

export default function WgtContentPartition(props) {
  const { info, id } = props
  const { immersive, navBarHeight, setScrollIntoView } = useContext(WgtsContext) || {}
  const { setStatusBarBgColorFromSticky, scrollTop } = usePageContext()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollView, setScrollView] = useState(``)
  const [children, setChildren] = useState([])
  const [contentMinHeight, setContentMinHeight] = useState(0)
  const isFirstRender = useRef(true)
  const navBarObserveId = `content-partition-nav-observe-${id}`
  // 从 params 中获取配置和数据，兼容两种数据结构
  const params = info?.params || info || {}
  const base = params.base || {}
  const data = params.data || {}
  const navList = data?.data || []
  const contentBoxId = `wgt-content-partition-content-${id}`

  // 初始化：找到第一个激活的导航项
  useEffect(() => {
    if (isFirstRender.current) {
      const activeIndex = navList.findIndex((item) => item.isActive)
      if (activeIndex >= 0) {
        setCurrentIndex(activeIndex)
        setChildren(navList[activeIndex]?.children || [])
      } else {
        setCurrentIndex(0)
        setChildren(navList[0]?.children || [])
      }
      isFirstRender.current = false
    }
  }, [navList])

  const calculateNavBarHeight = useMemo(() => {
    const outerMargin = base.outerMargin || {}
    const outerPaddingTop = outerMargin.paddedt || 0
    const outerPaddingBottom = outerMargin.paddedb || 0
    const navitemarea = base.navitemarea || {}
    const navAreaPaddingTop = navitemarea.paddedt || 0
    const navAreaPaddingBottom = navitemarea.paddedb || 0
    const navItemHeight = base.navitemheight
    const totalHeight =
      outerPaddingTop +
      outerPaddingBottom +
      navAreaPaddingTop +
      navAreaPaddingBottom +
      navItemHeight
    if (immersive) {
      return pxToRpx(navBarHeight) + totalHeight
    }
    return totalHeight
  }, [base, immersive, navBarHeight])

  const statusBarSourceId = useMemo(() => `content-partition-${id}`, [id])
  const prevTabIndexRef = useRef(currentIndex)
  const handleScrollUpdate = useCallback(async () => {
    if (!setStatusBarBgColorFromSticky) return
    const [triggerRect, sentinelRect] = await Promise.all([
      getElementRectBox(`#wgt-content-partition-sticky-trigger-${id}`).catch(() => null),
      getElementRectBox(`#wgt-content-partition-section-sentinel-${id}`).catch(() => null)
    ])
    const navBarPx = rpxToPx(calculateNavBarHeight)
    const inStickyZone = triggerRect != null && triggerRect.top <= navBarPx
    const stillOverContent = sentinelRect != null && sentinelRect.top > navBarPx
    if (inStickyZone && stillOverContent) {
      setStatusBarBgColorFromSticky(base.statusBarBgColor, statusBarSourceId)
    } else {
      setStatusBarBgColorFromSticky(null, statusBarSourceId)
    }
  }, [
    id,
    statusBarSourceId,
    base.statusBarBgColor,
    setStatusBarBgColorFromSticky,
    calculateNavBarHeight
  ])

  const throttledScrollUpdate = useMemo(
    () => throttle(handleScrollUpdate, 350),
    [handleScrollUpdate]
  )

  useLayoutEffect(() => {
    if (base.navSticky && base.statusBarBgColor) {
      throttledScrollUpdate()
      // 仅 tab 切换时：布局变化后 nextTick 再跑一次，用新布局判断颜色，避免「切换 tab 颜色没了」
      const tabChanged = prevTabIndexRef.current !== currentIndex
      prevTabIndexRef.current = currentIndex
      if (tabChanged) {
        Taro.nextTick(() => handleScrollUpdate())
      }
    } else {
      setStatusBarBgColorFromSticky?.(null, statusBarSourceId)
    }
  }, [
    scrollTop,
    base.navSticky,
    currentIndex,
    throttledScrollUpdate,
    base.statusBarBgColor,
    setStatusBarBgColorFromSticky,
    statusBarSourceId,
    handleScrollUpdate
  ])

  // 导航栏样式：直接传 React/Taro style 对象（camelCase），保证 sticky 生效
  // titleStyle=3 时 immersive 会被强制 false，top 用 0，贴在搜索栏下方
  const navStyle = useMemo(() => {
    const outer = getGlobalBaseStyle(base.outerMargin) || {}
    return {
      padding: outer.padding,
      backgroundColor: outer['background-color'] || outer.backgroundColor || '#ffffff',
      position: base.navSticky ? 'sticky' : 'relative',
      top: base.navSticky ? (immersive ? `${navBarHeight || 0}px` : 0) : 'auto',
      zIndex: base.navSticky ? 100 : undefined
    }
  }, [base.outerMargin, base.navSticky, navBarHeight, immersive])

  // 获取导航项区域样式（navitemarea）
  const navItemAreaStyle = useMemo(() => {
    const navitemarea = base.navitemarea || {}
    const area = getGlobalBaseStyle(navitemarea) || {}
    return {
      padding: area.padding,
      borderRadius: base.navitemradius ? Taro.pxTransform(base.navitemradius) : 0
    }
  }, [base.navitemarea, base.navitemradius])

  // 获取导航项样式
  const getNavItemStyle = (item, isActive) => {
    const textColor = isActive ? item.navitemactivecolor : item.navitemcolor

    return {
      height: Taro.pxTransform(base.navitemheight || 40),
      color: textColor,
      backgroundColor: isActive
        ? item.navitemactivebg || 'transparent'
        : item.navitembg || 'transparent',
      paddingLeft: Taro.pxTransform(base.navitemmargin || 0),
      paddingRight: Taro.pxTransform(base.navitemmargin || 0)
    }
  }

  // 处理导航项点击（对齐 master：nextTick 后设 scrollIntoView，id 随 index 变以触发滚动）
  const handleNavClick = (index) => {
    initContetn(index)
  }

  const handleScrollToUpper = () => {
    setScrollView('')
  }
  const handleScrollToLower = () => {
    setScrollView('')
  }

  const handleClickLeftImg = () => {
    setScrollView(`nav-item-0-${id}`)
  }
  const handleClickRightImg = () => {
    setScrollView(`nav-item-${navList.length - 1}-${id}`)
  }

  if (!info || !navList || navList.length === 0) {
    return null
  }

  const initContetn = (index) => {
    const viewIndex = index > 0 ? index - 1 : 0
    // H5：切换前锁住内容区高度，避免 ScrollView 因高度塌缩被顶回顶部
    if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
      const el = document.getElementById(contentBoxId)
      if (el?.offsetHeight) {
        setContentMinHeight(el.offsetHeight)
      }
    }
    setCurrentIndex(index)
    setChildren(navList[index]?.children || [])
    Taro.nextTick(() => {
      setScrollView(`nav-item-${viewIndex}-${id}`)
      if (process.env.TARO_ENV === 'h5') {
        // H5：走页面层手动测量滚动，锚点 id 随 index 变化即可触发
        setScrollIntoView?.(`wgt-content-partition-section-${index}-${id}`)
        setTimeout(() => {
          setContentMinHeight(0)
        }, 150)
      } else {
        // 小程序：0 高 absolute 锚点 scroll-into-view 经常无效；
        // 改为滚到有实际高度的挂件根节点，并先清空再设置以强制触发
        setScrollIntoView?.('')
        setTimeout(() => {
          setScrollIntoView?.(`wgt-content-partition-${id}`)
        }, 50)
      }
    })
  }

  return (
    <View
      className={classNames('wgt wgt-content-partition')}
      id={`wgt-content-partition-${id || ''}`}
    >
      <View
        id={`wgt-content-partition-sticky-trigger-${id}`}
        style={{ height: 0, overflow: 'hidden' }}
      />
      <View className='wgt-content-partition__container'>
        {/* 导航栏（吸顶时不要外包一层 View，以免破坏 sticky） */}
        <ContentPartitionNavBar
          navList={navList}
          currentIndex={currentIndex}
          onNavClick={handleNavClick}
          base={base}
          navStyle={navStyle}
          navItemAreaStyle={navItemAreaStyle}
          getNavItemStyle={getNavItemStyle}
          classNamePrefix='wgt-content-partition'
          id={id}
          observeId={base.navSticky && base.statusBarBgColor ? navBarObserveId : undefined}
          scrollIntoView={scrollView}
          handleScrollToUpper={handleScrollToUpper}
          handleScrollToLower={handleScrollToLower}
          handleClickLeftImg={handleClickLeftImg}
          handleClickRightImg={handleClickRightImg}
        />

        {/* 内容区域：绝对定位锚点（与 master 一致），不占文档流，避免切 tab 高度抖动 */}
        <View
          id={contentBoxId}
          className='wgt-content-partition__content'
          style={contentMinHeight ? { minHeight: `${contentMinHeight}px` } : undefined}
        >
          <View
            id={`wgt-content-partition-section-${currentIndex}-${id}`}
            className='wgt-content-partition__section-line'
            style={{ top: `-${calculateNavBarHeight}rpx` }}
          />
          {children.length > 0 && <HomeWgts wgts={children} />}
        </View>
      </View>
      <View id={`wgt-content-partition-section-sentinel-${id}`} />
    </View>
  )
}
