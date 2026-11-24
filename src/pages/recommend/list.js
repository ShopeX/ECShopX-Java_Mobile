/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import { SpSearchInput, SpScrollView, SpRecommendItem, SpTabbar, SpPage } from '@/components'
import { useImmer } from 'use-immer'
import api from '@/api'
import { classNames, pickBy } from '@/utils'
import doc from '@/doc'
import S from '@/spx'
import { useTranslation, $t } from '@/i18n'

import './list.scss'

const ALL_CATEGORY_KEY = '35994bc0.a01449'
const ALL_PROVINCE_KEY = '35994bc0.435853'

const initialState = {
  leftList: [],
  rightList: [],
  footerHeight: 0,
  keywords: '',
  columns: [],
  columnIndex: 0,
  provinces: [],
  provinceIndex: 0
}

// 地区树数据量较大，同一应用会话内只拉取一次
let provinceCache = null
const loadProvinces = async () => {
  if (provinceCache) return provinceCache
  const res = await api.member.areaList()
  provinceCache = (Array.isArray(res) ? res : [])
    .filter((item) => item && item.label)
    .map((item) => ({ label: item.label }))
  return provinceCache
}

function RecommendList() {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  const {
    leftList,
    rightList,
    footerHeight,
    keywords,
    columns,
    columnIndex,
    provinces,
    provinceIndex
  } = state
  const scrollRef = useRef()

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('35994bc0.c75625') })
  }, [i18n.language])

  useEffect(() => {
    let alive = true
    const initFilterOptions = async () => {
      try {
        const [columnRes, nextProvinces] = await Promise.all([
          api.article.columnList({ category_type: 'bring' }),
          loadProvinces()
        ])
        if (!alive) return
        const nextColumns = (Array.isArray(columnRes) ? columnRes : []).filter(
          (item) => item && item.category_id
        )
        setState((draft) => {
          draft.columns = nextColumns
          draft.provinces = nextProvinces
        })
      } catch (e) {
        // 筛选数据加载失败不影响列表展示
        console.error('init recommend filter options:', e)
      }
    }
    initFilterOptions()
    return () => {
      alive = false
    }
  }, [])

  // 一级类目：接口返回的顶层类目 + 「全部类目」
  const categoryOptions = useMemo(
    () => [
      { value: '', label: $t(ALL_CATEGORY_KEY) },
      ...columns.map((item) => ({ value: item.category_id, label: item.category_name }))
    ],
    [columns, i18n.language]
  )

  // 省级单选：地区树顶层 + 「全部地区」
  const provinceOptions = useMemo(
    () => [
      { value: '', label: $t(ALL_PROVINCE_KEY) },
      ...provinces.map((item) => ({ value: item.label, label: item.label }))
    ],
    [provinces, i18n.language]
  )

  const fetch = async ({ pageIndex, pageSize }) => {
    const queryParams = {
      article_type: 'bring',
      page: pageIndex,
      pageSize
    }
    if (keywords) {
      queryParams.title = keywords
    }
    const categoryId = categoryOptions[columnIndex]?.value
    if (categoryId) {
      queryParams.category_id = categoryId
    }
    const province = provinceOptions[provinceIndex]?.value
    if (province) {
      queryParams.province = province
    }
    const { list, total_count: total } = S?.getAuthToken()
      ? await api.article.authList(queryParams)
      : await api.article.list(queryParams)

    const n_list = pickBy(list, doc.article.ARTICLE_ITEM)
    const resLeftList = n_list.filter((item, index) => {
      if (index % 2 == 0) {
        return item
      }
    })
    const resRightList = n_list.filter((item, index) => {
      if (index % 2 == 1) {
        return item
      }
    })

    setState((draft) => {
      draft.leftList[pageIndex - 1] = resLeftList
      draft.rightList[pageIndex - 1] = resRightList
    })

    return {
      total
    }
  }

  // 筛选条件变化后清空列表并重新从第一页加载
  const reloadList = () => {
    setState((draft) => {
      draft.leftList = []
      draft.rightList = []
    })
    scrollRef.current?.reset()
  }

  const handleColumnChange = (e) => {
    const nextIndex = Number(e.detail.value)
    if (nextIndex === columnIndex) return
    setState((draft) => {
      draft.columnIndex = nextIndex
    })
    reloadList()
  }

  const handleProvinceChange = (e) => {
    const nextIndex = Number(e.detail.value)
    if (nextIndex === provinceIndex) return
    setState((draft) => {
      draft.provinceIndex = nextIndex
    })
    reloadList()
  }

  const handleColumnClear = () => {
    if (columnIndex === 0) return
    setState((draft) => {
      draft.columnIndex = 0
    })
    reloadList()
  }

  const handleProvinceClear = () => {
    if (provinceIndex === 0) return
    setState((draft) => {
      draft.provinceIndex = 0
    })
    reloadList()
  }

  const handleKeywordsConfirm = (val) => {
    const nextKeywords = typeof val === 'string' ? val : ''
    if (nextKeywords === keywords) return
    setState((draft) => {
      draft.keywords = nextKeywords
    })
    reloadList()
  }

  const handleClickItem = ({ itemId }) => {
    Taro.navigateTo({
      url: `/pages/recommend/detail?id=${itemId}`
    })
  }

  return (
    <SpPage
      className='page-recommend-list'
      renderFooter={<SpTabbar height={footerHeight} />}
      onReady={({ footerHeight: height }) => {
        setState((draft) => {
          draft.footerHeight = height
        })
      }}
    >
      <View className='search-container'>
        <SpSearchInput placeholder={$t('35994bc0.e5f71f')} onConfirm={handleKeywordsConfirm} />
      </View>
      <View className='filter-container'>
        <View
          className={classNames('filter-item', {
            'filter-item-active': columnIndex > 0
          })}
        >
          <Picker
            className='filter-item-picker'
            mode='selector'
            range={categoryOptions}
            rangeKey='label'
            value={columnIndex}
            onChange={handleColumnChange}
          >
            <View className='filter-item-label'>
              <Text className='filter-item-text'>{categoryOptions[columnIndex]?.label}</Text>
              {columnIndex === 0 && <View className='filter-item-icon' />}
            </View>
          </Picker>
          {columnIndex > 0 && (
            <View className='filter-item-clear' onClick={handleColumnClear}>
              <Text className='iconfont icon-close' />
            </View>
          )}
        </View>
        <View
          className={classNames('filter-item', {
            'filter-item-active': provinceIndex > 0
          })}
        >
          <Picker
            className='filter-item-picker'
            mode='selector'
            range={provinceOptions}
            rangeKey='label'
            value={provinceIndex}
            onChange={handleProvinceChange}
          >
            <View className='filter-item-label'>
              <Text className='filter-item-text'>{provinceOptions[provinceIndex]?.label}</Text>
              {provinceIndex === 0 && <View className='filter-item-icon' />}
            </View>
          </Picker>
          {provinceIndex > 0 && (
            <View className='filter-item-clear' onClick={handleProvinceClear}>
              <Text className='iconfont icon-close' />
            </View>
          )}
        </View>
      </View>
      <ScrollView className='list-scroll-container' scrollY>
        <SpScrollView ref={scrollRef} fetch={fetch}>
          <View className='article-list'>
            <View className='left-container'>
              {leftList.map((gitem) => {
                return gitem.map((item, index) => (
                  <View className='article-item-wrap' key={`article-item-l__${index}`}>
                    <SpRecommendItem info={item} onClick={handleClickItem.bind(this, item)} />
                  </View>
                ))
              })}
            </View>
            <View className='right-container'>
              {rightList.map((gitem, index) => {
                return gitem.map((item, index) => (
                  <View className='article-item-wrap' key={`article-item-r__${index}`}>
                    <SpRecommendItem info={item} onClick={handleClickItem.bind(this, item)} />
                  </View>
                ))
              })}
            </View>
          </View>
        </SpScrollView>
      </ScrollView>
    </SpPage>
  )
}

export default RecommendList
