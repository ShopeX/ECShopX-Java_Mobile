/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro from '@tarojs/taro'
import React, { useEffect, useImperativeHandle, useRef } from 'react'
import { View } from '@tarojs/components'
import { SpNote, SpLoading } from '@/components'
import { usePage } from '@/hooks'

import { classNames, isWeixin, isAlipay, isWeb } from '@/utils'
import { useTranslation, $t } from '@/i18n'

import './index.scss'

function SpScrollView(props, ref) {
  useTranslation()
  const {
    className,
    children,
    fetch,
    auto = true,
    renderEmpty,
    renderSkeleton,
    style,
    pageSize = 10,
    onLoad = () => {},
    renderMore
  } = props
  const { page, getTotal, nextPage, resetPage } = usePage({
    fetch,
    auto,
    pageSize
  })
  const wrapRef = useRef(null)
  const vidRef = useRef(`sv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  const vid = vidRef.current
  // 观察器用 ref 读最新分页状态，避免 loading 切换时拆建 observer 干扰滚动
  const pageRef = useRef(page)
  const nextPageRef = useRef(nextPage)
  pageRef.current = page
  nextPageRef.current = nextPage

  useEffect(() => {
    let observer = null
    const tryNextPage = () => {
      const { hasMore, loading } = pageRef.current
      if (hasMore && !loading) {
        nextPageRef.current()
      }
    }

    if (isWeixin || isAlipay) {
      observer = Taro.createIntersectionObserver(Taro.getCurrentInstance()?.page, {
        observeAll: true
      })
      setTimeout(() => {
        observer.relativeToViewport({ bottom: 0 }).observe(`.scrollview-${vid}`, (res) => {
          if (res.intersectionRatio > 0) {
            tryNextPage()
          }
        })
      }, 0)
    }

    if (isWeb) {
      const el = document.querySelector(`.scrollview-${vid}`)
      if (el) {
        observer = new IntersectionObserver((res) => {
          if (res[0]?.isIntersecting) {
            tryNextPage()
          }
        })
        observer.observe(el)
      }
    }

    return () => {
      observer?.disconnect()
    }
  }, [vid])

  useEffect(() => {
    if (!page.hasMore) {
      onLoad()
    }
  }, [page.hasMore])

  useImperativeHandle(ref, () => ({
    reset: () => {
      resetPage()
    }
  }))

  // 仅首屏（尚无数据）用骨架；翻页走 footer 固定 loading，避免列表高度抖动把滚动带走
  const initialLoading = page.loading && getTotal() === 0
  const showSkeleton = !!renderSkeleton && initialLoading
  const isRenderProp = typeof children === 'function'
  const bodyContent = isRenderProp
    ? children({
        loading: page.loading,
        hasMore: page.hasMore,
        total: getTotal(),
        initialLoading,
        nextLoading: page.loading && getTotal() > 0
      })
    : showSkeleton
    ? renderSkeleton()
    : children

  return (
    <View className={classNames('sp-scrollview', className)} style={style} ref={wrapRef}>
      <View className='sp-scrollview-body'>{bodyContent}</View>
      {/* 固定 footer：翻页 loading / 空态 / 没有更多，保持 DOM 结构稳定 */}
      <View className='sp-scrollview-footer'>
        {!showSkeleton && page.hasMore && <SpLoading>{$t('eb9a3a24.bd0271')}</SpLoading>}
        {!page.hasMore &&
          getTotal() == 0 &&
          (renderEmpty ? (
            renderEmpty
          ) : (
            <SpNote img='empty_activity.png' title={$t('eb9a3a24.f1f45e')} />
          ))}
        {!page.loading &&
          !page.hasMore &&
          getTotal() > 0 &&
          (renderMore ? (
            renderMore()
          ) : (
            <SpNote className='no-more' title={$t('eb9a3a24.a25652')}></SpNote>
          ))}
      </View>
      <View className={classNames('scrollview-bottom', `scrollview-${vid}`)}></View>
    </View>
  )
}

SpScrollView.options = {
  addGlobalClass: true
}

export default React.memo(React.forwardRef(SpScrollView))
