/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import Taro, {
  getCurrentInstance,
  useDidShow,
  usePageScroll,
  usePullDownRefresh,
  useReachBottom,
  useShareAppMessage
} from '@tarojs/taro'
import { View, Text, Button, Image, Input } from '@tarojs/components'
import { AtTabBar } from 'taro-ui'
import { useImmer } from 'use-immer'
import { Loading, SpNote, SpPage, SpImage } from '@/components'
import S from '@/spx'
import api from '@/api'
import throttle from 'lodash/throttle'
import { $t, ti, useTranslation } from '@/i18n'
import { getCurrentRoute, pickBy, entryLaunch, log } from '@/utils'
import './shop-home.scss'

// 底部 tab 基础路径（每次重新拼 featuredshop，避免重复刷新时参数越拼越长）
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
  info: {},
  localCurrent: 0,
  curFilterIdx: 0,
  list: [],
  tabList: buildTabList(''),
  userId: '',
  // 商品总数
  goods_total: 0,
  // 搜索参数
  params: {
    keywords: '',
    shop_user_id: '',
    goodsSort: ''
  },
  // 是否聚焦
  isFocus: false,
  // 是否显示搜索
  showSearch: false,
  // 搜索关键词
  keywords: '',
  // 价格排序, true为升 false为降
  sort: true,
  // 是否加载
  isLoading: false,
  // 状态栏高度
  statusBarHeight: 44,
  paddindTop: 0,
  // 是否首页
  isHome: false,
  page: { ...initialPage }
}

function DistributionShopHome() {
  // 页面文案用 $t 取值，切语言时需重渲染
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  // 异步/事件回调里读最新 state，避免闭包拿到旧值
  const stateRef = useRef(state)
  stateRef.current = state
  // 分页状态同步副本：setState 是异步的，翻页判断必须读同步值
  const pageRef = useRef({ ...initialPage })
  // 小店主人 user_id：setState 后立即生效，避免翻页请求早于状态更新
  const userIdRef = useRef('')

  const {
    tabList,
    localCurrent,
    info,
    sort,
    list,
    goods_total: goodsTotal,
    params,
    page,
    showSearch,
    keywords,
    curFilterIdx,
    isFocus,
    paddindTop
  } = state

  const syncPage = () => {
    setState((draft) => {
      draft.page = { ...pageRef.current }
    })
  }

  // 导航栏标题（SpPage 走自定义导航时无效，保留以兼容原生导航与语言切换）
  const syncShopNavTitle = () => {
    const { info: shopInfo } = stateRef.current
    const isCurrentPage = getCurrentInstance()?.router?.path.indexOf('distribution/shop-home') !== -1
    if (isCurrentPage && (shopInfo.shop_name || shopInfo.username)) {
      Taro.setNavigationBarTitle({
        title: shopInfo.shop_name || ti('a569438d.2b0a44', [shopInfo.username])
      })
    }
  }

  // 获取设备信息
  const init = async () => {
    const pages = Taro.getCurrentPages()
    const isHomePage = pages[pages.length - 2]
    const { statusBarHeight: barHeight = 44 } = await Taro.getSystemInfo()
    setState((draft) => {
      draft.statusBarHeight = barHeight
      draft.isHome = !isHomePage
    })
  }

  // 获取小店信息
  const getShopInfo = async () => {
    // 当前登录用户
    const { userId } = Taro.getStorageSync('userinfo')
    // uid（分享携带的用户id）
    // featuredshop（店铺精选id）
    const { uid, featuredshop } = await entryLaunch.getRouteParams()

    const param = {
      user_id: uid || featuredshop || userId
    }
    userIdRef.current = param.user_id

    const res = await api.distribution.info(param)
    const {
      shop_name,
      brief,
      shop_pic = '',
      username = '',
      headimgurl,
      is_valid,
      nickname = '',
      mobile = '',
      banner_img = '',
      share_title = '',
      headquarters_logo = '',
      applets_share_img = '',
      isOpenPromoterInformation = true
    } = res
    if (!is_valid) {
      Taro.reLaunch({
        url: '/pages/index'
      })
    }

    setState((draft) => {
      draft.info = {
        username: nickname || username || mobile,
        headimgurl: isOpenPromoterInformation ? headimgurl : headquarters_logo,
        shop_name,
        brief,
        is_valid,
        shop_pic: isOpenPromoterInformation ? shop_pic : banner_img,
        share_title,
        applets_share_img
      }
      draft.tabList = buildTabList(param.user_id)
      draft.userId = param.user_id
    })
    syncShopNavTitle()

    setTimeout(() => {
      resetGet()
    })
  }

  // 获取小店商品列表
  const fetchList = async ({ page_no: pageNo, page_size: pageSize }) => {
    const { params: curParams } = stateRef.current
    const query = {
      page: pageNo,
      pageSize,
      ...curParams,
      shop_user_id: userIdRef.current || stateRef.current.userId
    }

    const { list: resList, total_count: total, goods_total = 0 } = await api.distribution.getShopGoods(
      query
    )

    const nList = pickBy(resList, {
      img: 'pics[0]',
      item_id: 'item_id',
      title: 'itemName',
      distributor_id: 'distributor_id',
      type: 'type',
      isOutSale: ({ store }) => !store || store <= 0,
      price: ({ price }) => (price / 100).toFixed(2),
      member_price: ({ member_price }) => (member_price / 100).toFixed(2),
      market_price: ({ market_price }) => (market_price / 100).toFixed(2),
      desc: 'brief'
    })

    setState((draft) => {
      draft.list = [...draft.list, ...nList]
      draft.goods_total = goods_total
    })

    // 停止刷新
    Taro.stopPullDownRefresh()

    return {
      total
    }
  }

  // 加载指定页（分页状态用 ref 同步维护，避免 setState 异步导致重复请求/错页）
  const loadPage = async (curPage) => {
    pageRef.current.isLoading = true
    syncPage()

    const { total } = await fetchList({ page_no: curPage, page_size: pageRef.current.page_size })

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

  // 触底加载下一页
  const nextPage = () => {
    if (!pageRef.current.hasNext || pageRef.current.isLoading) return
    loadPage(pageRef.current.page_no + 1)
  }

  // 重新获取
  const resetGet = () => {
    pageRef.current = { ...pageRef.current, page_no: 0, total: 0, hasNext: true, isLoading: false }
    setState((draft) => {
      draft.list = []
    })
    loadPage(1)
  }

  // 点击商品跳转
  const handleClickItem = (item) => {
    if (item.isOutSale) return false
    const userId = userIdRef.current || stateRef.current.userId
    const url = `/subpages/item/espier-detail?id=${item.item_id}&dtid=${item.distributor_id}&uid=${userId}`
    setTimeout(() => {
      Taro.navigateTo({
        url
      })
    })
  }

  // 切换tab
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

  // 防止点击穿透
  const handleDisable = (e) => {
    e.preventDefault && e.preventDefault()
    e.stopPropagation && e.stopPropagation()
  }

  // 显示搜索
  const handleShowSearch = (e) => {
    handleDisable(e)
    if (stateRef.current.showSearch) return
    setState((draft) => {
      draft.showSearch = true
    })
    // 延迟获取焦点
    setTimeout(() => {
      setState((draft) => {
        draft.isFocus = true
      })
    }, 300)
  }

  // 搜索输入框
  const searchInput = (data) => {
    const { value = '' } = data.detail || {}
    setState((draft) => {
      draft.keywords = value
    })
  }

  // 确认搜索
  const handleConfirm = () => {
    const { keywords } = stateRef.current
    const nextKeywords = String(keywords || '').trim()
    setState((draft) => {
      draft.params.keywords = nextKeywords
      draft.showSearch = false
      draft.isFocus = false
      draft.keywords = nextKeywords
    })
    resetGet()
  }

  // 清除搜索
  const handleClear = (e) => {
    e.preventDefault && e.preventDefault()
    e.stopPropagation && e.stopPropagation()
    setState((draft) => {
      draft.params.keywords = ''
      draft.keywords = ''
      draft.isFocus = false
      draft.showSearch = false
    })
    resetGet()
  }

  // 点击搜索蒙层
  const handleCloseSearch = (e = {}) => {
    e.preventDefault && e.preventDefault()
    e.stopPropagation && e.stopPropagation()
    setState((draft) => {
      draft.keywords = draft.params.keywords
      draft.showSearch = false
      draft.isFocus = false
    })
  }

  // 筛选切换
  const handleFilterChange = (filterInfo) => {
    const { type } = filterInfo
    const { curFilterIdx: curIdx, sort: curSort } = stateRef.current
    if (curIdx === type && type !== 2) return

    setState((draft) => {
      if (curIdx === type && type === 2) {
        draft.params.goodsSort = !curSort ? 3 : 2
      } else {
        draft.params.goodsSort = type === 0 ? '' : 1
      }
      draft.curFilterIdx = type
      draft.sort = curIdx === type && type === 2 ? !curSort : true
    })
    resetGet()
  }

  useEffect(() => {
    getShopInfo()
    init()
  }, [])

  useEffect(() => {
    syncShopNavTitle()
  }, [i18n.language])

  useDidShow(() => {
    handleCloseSearch()
  })

  usePullDownRefresh(() => {
    getShopInfo()
  })

  useReachBottom(() => {
    nextPage()
  })

  // 页面滚动：筛选头吸顶
  const handlePageScroll = useMemo(
    () =>
      throttle((res) => {
        const { statusBarHeight: barHeight } = stateRef.current
        const { scrollTop } = res
        const topOffset = barHeight + 40
        const query = Taro.createSelectorQuery()
        query
          .select('.filter')
          .boundingClientRect(({ top }) => {
            const { paddindTop: curPadding } = stateRef.current
            if (top <= topOffset && (curPadding < topOffset || curPadding > 0)) {
              const diffTop = Math.abs(top - topOffset)
              if (diffTop !== curPadding) {
                setState((draft) => {
                  draft.paddindTop = top > 0 ? diffTop : topOffset
                })
              }
            } else if (curPadding !== 0) {
              setState((draft) => {
                draft.paddindTop = 0
              })
            }
          })
          .exec()
      }, 100),
    []
  )

  usePageScroll(handlePageScroll)

  // 分享（页面为函数组件 + hooks，Taro 才能注入页面实例并执行回调）
  useShareAppMessage(() => {
    const { info: shopInfo, userId } = stateRef.current
    const title = shopInfo.shop_name || ti('a569438d.2b0a44', [shopInfo.username])

    log.debug(`/marketing/pages/distribution/shop-home?uid=${userId}`)
    return {
      title: shopInfo.share_title || title,
      imageUrl: shopInfo.applets_share_img || shopInfo.shop_pic,
      path: `/marketing/pages/distribution/shop-home?uid=${userId}`
    }
  })

  // 筛选选项
  const filterList = [
    {
      title: $t('a569438d.88e7de'),
      type: 0
    },
    {
      title: $t('a569438d.44e7eb'),
      type: 1
    },
    {
      title: $t('a569438d.0e9fd9'),
      type: 2
    }
  ]

  return (
    <SpPage
      className='page-distribution-shop'
      title={$t('a569438d.a9c0ec')}
      scrollToTopBtn
      renderFooter={
        <AtTabBar
          fixed
          tabList={tabList.map((item, index) => ({
            ...item,
            title: index === 0 ? $t('a569438d.b8286c') : $t('a569438d.d0771a')
          }))}
          onClick={handleClick}
          current={localCurrent}
        />
      }
    >
      <View className='shop-banner'>
        <View className='shop-def'>
          <Image
            mode='aspectFill'
            className='banner-img'
            src={info.shop_pic || `${process.env.APP_IMAGE_CDN}/black.png`}
          />
        </View>
        <View className='shop-info'>
          <View className='left'>
            <SpImage
              className='shopkeeper-avatar'
              src={info.headimgurl || 'shop.png'}
              mode='aspectFill'
            />
            <View className='shop-name-goods'>
              <View className='names'>
                {info.shop_name || ti('a569438d.2b0a44', [info.username])}
              </View>
              <View className='num'>
                {goodsTotal}
                <View className='text'>{$t('a569438d.777ba9')}</View>
              </View>
            </View>
          </View>
          <View className='right'>
            <Button className='share' open-type='share'>
              <View className='iconfont icon-share'></View>
              <View className='text'>{$t('a569438d.586b7c')}</View>
            </Button>
          </View>
        </View>
      </View>
      <View
        className='filter'
        style={`padding-top: ${paddindTop}px; transition: padding ${
          paddindTop > 20 ? paddindTop * 3.5 : 300
        }ms linear;`}
      >
        <View className='filterMain'>
          {filterList.map((item) => (
            <View
              className={`filterItem ${curFilterIdx === item.type && 'active'}`}
              key={item.type}
              onClick={() => handleFilterChange(item)}
            >
              {item.title}
              {item.type === 2 && <View className={`sort ${sort ? 'down' : 'up'}`}></View>}
            </View>
          ))}

          <View className={`searchContent ${showSearch && 'unfold'}`} onClick={handleShowSearch}>
            <View className='iconfont icon-search'>
              <Text className='txt'>{params.keywords}</Text>
            </View>
            {showSearch && (
              <View className='inputContent'>
                <Input
                  className='keywords'
                  value={keywords}
                  focus={isFocus}
                  placeholder={$t('a569438d.69a024')}
                  confirmType='search'
                  onConfirm={handleConfirm}
                  onBlur={handleCloseSearch}
                  onInput={searchInput}
                />
                <View
                  className={`at-icon at-icon-close-circle ${keywords.length > 0 && 'show'}`}
                  onClick={handleClear}
                ></View>
              </View>
            )}
          </View>
        </View>
      </View>
      <View className='main'>
        {list.map((item) => (
          <View key={item.item_id} className='goodItem' onClick={() => handleClickItem(item)}>
            <View className={`content ${item.isOutSale && 'disable'}`}>
              <View className='imgContent'>
                <Image src={item.img} className='goodImg' lazyLoad />
                <View className='outSale'></View>
              </View>
              <View className='info'>
                <View className='goodName'>{item.title}</View>
                <View className='price'>
                  <Text className='symbol'>¥</Text>
                  {item.price}
                </View>
              </View>
            </View>
          </View>
        ))}
        {page.isLoading ? (
          <Loading className='loadingContent'>{$t('a569438d.bd0271')}</Loading>
        ) : null}
        {!page.isLoading && !page.hasNext && list.length <= 0 && (
          <SpNote className='empty' img='trades_empty.png'>
            {$t('a569438d.ba1de9')}
          </SpNote>
        )}
      </View>
    </SpPage>
  )
}

export default DistributionShopHome
