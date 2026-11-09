/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, ScrollView, Text, Image } from '@tarojs/components'
import { Loading, SpNote, SpPage } from '@/components'
import { classNames, pickBy, getCurrentRoute } from '@/utils'
import { AtTabBar } from 'taro-ui'
import S from '@/spx'
import { useImmer } from 'use-immer'
import throttle from 'lodash/throttle'
import { $t, useTranslation } from '@/i18n'
import api from '@/api'
import './shop-category.scss'

const TAB_BASE_URLS = [
  '/marketing/pages/distribution/shop-home',
  '/marketing/pages/distribution/shop-category'
]

const buildTabList = (featuredshop) =>
  TAB_BASE_URLS.map((url, idx) => ({
    title: '',
    iconType: idx === 0 ? 'home' : 'category',
    iconPrefixClass: 'iconfont icon',
    url: featuredshop ? `${url}?featuredshop=${featuredshop}` : url,
    urlRedirect: true
  }))

const initialPage = { hasNext: true, isLoading: false, total: 0, page_no: 0, page_size: 10 }

const initialState = {
  currentIndex: 0,
  tabList: buildTabList(''),
  contentList: [],
  list: [],
  hasSeries: false,
  localCurrent: 1,
  defaultId: 0,
  query: {},
  scrollTop: null,
  showBackToTop: false,
  page: { ...initialPage }
}

function DistributionShopCategory() {
  // 页面文案用 $t 取值，切语言时需重渲染
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  // 异步/事件回调里读最新 state
  const stateRef = useRef(state)
  stateRef.current = state
  // 分页状态同步副本（setState 异步，翻页判断必须读同步值）
  const pageRef = useRef({ ...initialPage })

  const { list, tabList, localCurrent, contentList, currentIndex, hasSeries, scrollTop, page } =
    state

  const syncPage = () => {
    setState((draft) => {
      draft.page = { ...pageRef.current }
    })
  }

  const buildQueryBase = () => {
    const options = getCurrentInstance()?.router?.params || {}
    const { userId } = Taro.getStorageSync('userinfo')
    const distributionShopId = Taro.getStorageSync('distribution_shop_id')
    const shopUserId =
      options.featuredshop || options.uid || distributionShopId || userId || 0
    return { options, shopUserId }
  }

  const fetchInfo = async () => {
    const { options, shopUserId } = buildQueryBase()
    const { list: categoryList } = await api.distribution.getShopCategorylevel({
      category_level: 1,
      shop_user_id: shopUserId
    })
    const cate_id = categoryList[0] && categoryList[0].category_id
    const nList = pickBy(categoryList, {
      name: 'category_name',
      id: 'category_id'
    })
    setState((draft) => {
      draft.list = nList
      draft.defaultId = cate_id
      draft.hasSeries = false
      draft.tabList = buildTabList(options.featuredshop)
    })
    loadPage(1, cate_id)
  }

  const fetchList = async ({ page_no: pageNo, page_size: pageSize, categoryId }) => {
    const { query } = stateRef.current
    const { shopUserId } = buildQueryBase()
    const nextQuery = {
      ...query,
      category_id: categoryId,
      item_type: 'normal',
      page: pageNo,
      shop_user_id: shopUserId,
      pageSize
    }

    const { list: goodsList, total_count: total } =
      await api.distribution.getShopGoods(nextQuery)

    const nItem = pickBy(goodsList, {
      img: 'pics[0]',
      item_id: 'item_id',
      goods_id: 'goods_id',
      title: 'itemName',
      desc: 'brief',
      isOutSale: ({ store }) => !store || store <= 0,
      distributor_id: 'distributor_id',
      price: ({ price }) => (price / 100).toFixed(2),
      market_price: ({ market_price }) => (market_price / 100).toFixed(2)
    })

    setState((draft) => {
      draft.contentList = [...draft.contentList, ...nItem]
      draft.query = nextQuery
    })

    return { total }
  }

  // 加载指定页
  const loadPage = async (curPage, categoryId = stateRef.current.defaultId) => {
    pageRef.current.isLoading = true
    syncPage()

    const { total } = await fetchList({
      page_no: curPage,
      page_size: pageRef.current.page_size,
      categoryId
    })

    const { page_size: pageSize } = pageRef.current
    pageRef.current = {
      ...pageRef.current,
      total,
      page_no: curPage,
      isLoading: false,
      hasNext: !(!total || curPage >= Math.ceil(+total / pageSize))
    }
    syncPage()
  }

  const nextPage = () => {
    if (!pageRef.current.hasNext || pageRef.current.isLoading) return
    loadPage(pageRef.current.page_no + 1)
  }

  const resetGet = (categoryId) => {
    pageRef.current = { ...pageRef.current, page_no: 0, total: 0, hasNext: true, isLoading: false }
    setState((draft) => {
      draft.contentList = []
    })
    loadPage(1, categoryId)
  }

  const handleClickCategoryNav = (idx, value) => {
    if (pageRef.current.isLoading) return
    if (idx === stateRef.current.currentIndex) return

    setState((draft) => {
      draft.currentIndex = idx
      draft.defaultId = value.id
    })
    resetGet(value.id)
  }

  const handleClick = (current) => {
    const cur = stateRef.current.localCurrent
    if (cur === current) return

    const curTab = stateRef.current.tabList[current]
    const { url, urlRedirect } = curTab || {}
    const fullPath = getCurrentRoute(getCurrentInstance()?.router).fullPath.split('?')[0]
    if (url && fullPath !== url) {
      if (!urlRedirect || (url === '/subpages/member/index' && !S.getAuthToken())) {
        Taro.navigateTo({ url })
      } else {
        Taro.redirectTo({ url })
      }
    }
  }

  const handleClickItem = (item) => {
    if (item.isOutSale) return false
    const { shopUserId } = buildQueryBase()
    const { goods_id, distributor_id } = item
    let url = ''
    if (goods_id) {
      url = `/subpages/item/espier-detail?id=${goods_id || ''}&dtid=${distributor_id}&uid=${shopUserId}`
    }
    if (url) {
      Taro.navigateTo({
        url
      })
    }
  }

  // ScrollView 滚动（原来由 withBackToTop 提供，仅用于回到顶部状态）
  const handleScroll = useMemo(
    () =>
      throttle((e) => {
        const { scrollTop: top, scrollHeight } = e.detail
        const offset = 300
        if (scrollHeight < 600) return
        const { showBackToTop } = stateRef.current
        if (top > offset && !showBackToTop) {
          setState((draft) => {
            draft.showBackToTop = true
          })
        } else if (showBackToTop && top <= offset) {
          setState((draft) => {
            draft.showBackToTop = false
          })
        }
      }, 70),
    []
  )

  // 走原生导航栏：标题需显式设置，并随语言切换同步
  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('e6f782b6.d0771a') })
  }, [i18n.language])

  useEffect(() => {
    fetchInfo()
  }, [])

  const isHaveLeft = list.length > 0
  const displayTabList = tabList.map((item, index) => ({
    ...item,
    title: index === 0 ? $t('e6f782b6.b8286c') : $t('e6f782b6.d0771a')
  }))

  return (
    <SpPage
      className='page-category-index'
      renderFooter={
        <AtTabBar fixed tabList={displayTabList} onClick={handleClick} current={localCurrent} />
      }
    >
      <View
        className={`${hasSeries && tabList.length !== 0 ? 'category-comps' : 'category-comps-not'}`}
      >
        <View className='category-list'>
          {isHaveLeft > 0 && (
            <ScrollView className='category-list__nav' scrollY>
              <View className='category-nav'>
                {list.map((item, index) => (
                  <View
                    className={classNames(
                      'category-nav__content',
                      currentIndex == index ? 'category-nav__content-checked' : null
                    )}
                    key={`${item.name}${index}`}
                    onClick={() => handleClickCategoryNav(index, item)}
                  >
                    {item.hot && <Text className='hot-tag'></Text>}
                    {item.name}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {/*右*/}
          <View className={`shop-category__wrap ${!isHaveLeft && 'all'}`}>
            <ScrollView
              className='category-list__scroll'
              scrollY
              scrollTop={scrollTop}
              scrollWithAnimation
              onScroll={handleScroll}
              onScrollToLower={nextPage}
            >
              <View className='grid-goods'>
                {contentList.length > 0 &&
                  contentList.map((item) => (
                    <View
                      className={`goodItem ${item.isOutSale && 'outSale'}`}
                      key={item.item_id}
                      onClick={() => handleClickItem(item)}
                    >
                      <View className='left'>
                        <Image src={item.img} lazyLoad className='goodImg' />
                      </View>
                      <View className='right'>
                        <View className='goodName'>{item.title}</View>
                        <View className='goodPrice'>
                          <Text className='symbol'>¥</Text>
                          {item.price}
                        </View>
                      </View>
                    </View>
                  ))}
              </View>
              {page.isLoading ? <Loading>{$t('e6f782b6.bd0271')}</Loading> : null}
              {!page.isLoading && !page.hasNext && !contentList.length && (
                <SpNote img='trades_empty.png'>{$t('e6f782b6.ba1de9')}</SpNote>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </SpPage>
  )
}

export default DistributionShopCategory
