/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { useSelector, useDispatch } from 'react-redux'
import { SG_ROUTER_PARAMS, DEFAULT_SAFE_AREA_HEIGHT } from '@/consts'
import S from '@/spx'
import {
  SpFloatMenuItem,
  SpPage,
  SpSearch,
  SpLogin,
  SpPoweredBy,
  SpImage
} from '@/components'
import api from '@/api'
import doc from '@/doc'
import * as shopDoc from '@/doc/shop'
import {
  getDistributorId,
  classNames,
  entryLaunch,
  pickBy,
  log,
  showToast,
  buildSharePath,
  isIphoneX
} from '@/utils'
import { useImmer } from 'use-immer'
import { useTranslation, $t } from '@/i18n'
import HomeWgts from '@/pages/home/comps/home-wgts'
import { WgtsContext } from '@/pages/home/wgts/wgts-context'
import { updateShopCartCount } from '@/store/slices/cart'
import CompShopBrand from './comps/comp-shopbrand'
import Categorys from './categorys'
import CompTab from './comps/comp-tab'
import StoreFloatLayers from './comps/store-float-layers'
import './index.scss'

const initState = {
  wgts: [],
  showBackToTop: false,
  loading: true,
  isDefault: false,
  storeInfo: null,
  distributorId: 0,
  productSwitching: true,
  /** 页面滚动超过 20px 时搜索条白底 */
  searchSolidBg: false,
  /** 自定义导航高度，沉浸式时用于顶起搜索/头图内容 */
  navbarHeight: 0
}

function StoreIndex() {
  useTranslation()
  const [state, setState] = useImmer(initState)
  const { shopCartCount } = useSelector((state) => state.cart)

  const {
    wgts,
    loading,
    isDefault,
    distributorId,
    productSwitching,
    storeInfo,
    searchSolidBg,
    navbarHeight
  } = state

  const dispatch = useDispatch()
  const pageRef = useRef()
  const loginRef = useRef()
  const floatLayersRef = useRef()

  useDidShow(() => {
    fetchWgts()
  })

  useEffect(() => {
    if (S.getAuthToken()) {
      fetchWgts()
    }
  }, [S.getAuthToken()])

  const parameter = async () => {
    const storedData = Taro.getStorageSync(SG_ROUTER_PARAMS)
    const routeParams = await entryLaunch.getRouteParams()
    return routeParams && (routeParams.id || routeParams.dtid || routeParams.uid)
      ? routeParams
      : storedData
  }

  const fetchWgts = async () => {
    const { id, dtid, uid } = await parameter()

    const distributor_id = getDistributorId(id || dtid || uid)
    const { status } = await api.distribution.merchantIsvaild({
      distributor_id
    })

    if (!status) {
      setState((draft) => {
        draft.isDefault = true
      })
      return
    } else {
      const storeInfoRes = await api.shop.getShop({
        distributor_id,
        show_score: 1,
        show_marketing_activity: 1
      })
      const { config } = await api.shop.getStoreShopTemplate({
        distributor_id
      })
      setState((draft) => {
        draft.wgts = config
        draft.distributorId = distributor_id
        draft.storeInfo = pickBy(storeInfoRes, shopDoc.STORE_INFO)
        draft.loading = false
      })
      await shopping(distributor_id)
    }
  }

  const shopping = async (distributor_id) => {
    let params = {
      distributor_id,
      shop_type: 'distributor'
    }
    const { valid_cart } = await api.cart.get(params)
    let shopCats = {
      shop_id: valid_cart === undefined ? '' : valid_cart[0]?.shop_id || '',
      cart_total_num: valid_cart === undefined ? '' : valid_cart[0]?.cart_total_num || '',
      total_fee: valid_cart === undefined ? '' : valid_cart[0]?.total_fee || '',
      discount_fee: valid_cart === undefined ? '' : valid_cart[0]?.discount_fee || '',
      storeDetails: valid_cart === undefined ? '' : valid_cart[0] || {}
    }
    dispatch(updateShopCartCount(shopCats))
  }

  useShareAppMessage(() => {
    return getAppShareInfo()
  })

  useShareTimeline(() => {
    return getAppShareInfo()
  })

  const tabbarSwitching = useCallback(
    (val) => {
      setState((draft) => {
        draft.productSwitching = val
      })
    },
    [setState]
  )

  /** 只调弹层组件，不 setState 门店页，避免 ScrollView 回顶 */
  const addPurchases = useCallback(async (id) => {
    const { dtid } = await parameter()
    const itemDetail = await api.item.detail(id, {
      showError: false,
      distributor_id: dtid
    })
    floatLayersRef.current?.openSku({ ...pickBy(itemDetail, doc.goods.GOODS_INFO) }, 'addcart')
  }, [])

  const getAppShareInfo = async () => {
    const data = await parameter()
    const dtid = data.id || data.dtid
    const query = {
      dtid
    }
    const path = buildSharePath('poster_store_index', query)
    log.debug(`share path: ${path}`)
    return {
      title: storeInfo?.name,
      imageUrl: storeInfo?.logo,
      path
    }
  }

  const onAddToCart = useCallback(async ({ itemId }) => {
    Taro.showLoading()
    try {
      const itemDetail = await api.item.detail(itemId, {
        showError: false,
        distributor_id: distributorId
      })
      Taro.hideLoading()
      floatLayersRef.current?.openSku(pickBy(itemDetail, doc.goods.GOODS_INFO), 'addcart')
    } catch (e) {
      Taro.hideLoading({
        success: () => {
          showToast(e.message)
        }
      })
    }
  }, [distributorId])

  //显示弹框
  const popFrame = () => {
    if (!S.getAuthToken()) {
      loginRef.current?.handleToLogin()
      return
    }
    if (shopCartCount.storeDetails?.list?.length > 0) {
      floatLayersRef.current?.openCart()
    } else {
      showToast($t('17670153.a590f1'))
    }
  }

  const searchComp = useMemo(() => {
    const comp = wgts.find((wgt) => wgt.name == 'search')
    if (comp && comp.config.fixTop) return comp
    return null
  }, [wgts])

  const pageData = useMemo(() => wgts.find((wgt) => wgt.name == 'page'), [wgts])

  const filterWgts = useMemo(() => {
    if (searchComp) {
      return wgts.filter((wgt) => wgt.name !== 'search')
    }
    return wgts
  }, [wgts, searchComp])

  // 分类双栏面板：定高 = 视口 - 吸顶偏移 - Tab 条 - 底部结算栏（与 SpPage 预留的 footer 高度一致）
  const { windowWidth, windowHeight } = Taro.getWindowInfo()
  const px = (design) => (design * windowWidth) / 750
  const searchBarH = searchComp ? px(120) : 0
  const stickyTop = (navbarHeight || 0) + searchBarH
  const tabsH = px(98)
  const footerH = px(160) + (isIphoneX() ? px(DEFAULT_SAFE_AREA_HEIGHT) : 0)
  const categoryPanelHeight = Math.max(
    px(720),
    Math.floor(windowHeight - footerH - stickyTop - tabsH)
  )

  /** 头图 + 店铺信息卡（商品 / 商品分类 两个 Tab 共用） */
  const renderHeader = () => (
    <View className='page-store-index__header'>
      {storeInfo?.banner ? (
        <SpImage
          className='page-store-index__banner'
          src={storeInfo.banner}
          mode='widthFix'
          width={750}
        />
      ) : (
        <View
          className='page-store-index__banner page-store-index__banner--empty'
          style={navbarHeight ? { paddingTop: `${navbarHeight}px` } : undefined}
        />
      )}
      <CompShopBrand storeInfo={storeInfo} dtid={distributorId} />
    </View>
  )

  /** 首页/全部/分类 切换条（sticky：吸顶位置扣除导航 + 搜索条） */
  const renderTabs = () => (
    <View
      id='store-index-tabs'
      className='page-store-index__tabs'
      style={{
        background: pageData?.base?.pageBackgroundColor || '#fff',
        top: `${stickyTop}px`
      }}
    >
      <Text
        className={classNames('page-store-index__tab', {
          'page-store-index__tab--active': productSwitching
        })}
        onClick={() => tabbarSwitching(true)}
      >
        {$t('17670153.db1c89')}
      </Text>
      <Text
        className={classNames('page-store-index__tab', {
          'page-store-index__tab--active': !productSwitching
        })}
        onClick={() => tabbarSwitching(false)}
      >
        {$t('17670153.c3ece5')}
      </Text>
    </View>
  )

  return (
    <>
      <SpPage
        className='page-store-index'
        isDefault={isDefault}
        defaultMsg={$t('17670153.03b176')}
        loading={loading}
        scrollToTopBtn
        ref={pageRef}
        showpoweredBy={false}
        immersive
        pageConfig={{
          ...(pageData?.base || {}),
          // 未滚动时导航透明，让店铺 banner 顶到屏幕顶部
          navigateBackgroundColor: searchSolidBg
            ? pageData?.base?.navigateBackgroundColor || '#fff'
            : 'transparent'
        }}
        onReady={({ gNavbarH }) => {
          setState((draft) => {
            draft.navbarHeight = gNavbarH || 0
          })
        }}
        renderFloat={
          <>
            <SpFloatMenuItem
              onClick={() => {
                Taro.navigateTo({ url: '/subpages/member/index' })
              }}
            >
              <SpImage
                src='icon-huiyuanzhongxin.svg'
                mode='widthFix'
                width={40}
                height={40}
                className='member-icon'
              />
            </SpFloatMenuItem>
            <SpFloatMenuItem
              onClick={() => {
                Taro.navigateTo({ url: '/pages/cart/espier-index' })
              }}
            >
              <SpImage
                src='icon-gouwuche.svg'
                mode='widthFix'
                width={40}
                height={40}
                className='cart-icon'
              />
            </SpFloatMenuItem>
          </>
        }
        renderFooter={<CompTab popFrame={popFrame} />}
      >
        {/* 搜索条：fixed 定位，两个 Tab 下都可见 */}
        {searchComp && (
          <View
            className={classNames('page-store-index__search', {
              'page-store-index__search--solid': searchSolidBg || !productSwitching
            })}
            style={navbarHeight ? { top: `${navbarHeight}px` } : undefined}
          >
            <SpSearch
              info={searchComp}
              onClick={() => {
                Taro.navigateTo({
                  url: `/subpages/store/item-list?dtid=${distributorId}`
                })
              }}
            />
          </View>
        )}

        {productSwitching ? (
          <ScrollView
            scrollY
            className='page-store-index__scroll'
            style={{ height: '100%' }}
            onScroll={(e) => {
              const st = e?.detail?.scrollTop ?? 0
              const nextSolid = st > 15
              setState((draft) => {
                if (draft.searchSolidBg !== nextSolid) {
                  draft.searchSolidBg = nextSolid
                }
              })
            }}
          >
            {renderHeader()}

            {renderTabs()}

            {filterWgts.length > 0 && (
              <WgtsContext.Provider value={{ onAddToCart }}>
                <HomeWgts wgts={filterWgts} dtid={distributorId} />
              </WgtsContext.Provider>
            )}

            <View className='sp-page__powered-by w-full'>
              <SpPoweredBy />
            </View>
          </ScrollView>
        ) : (
          /*
           * 商品分类：头图/店铺卡 + 吸顶 tab + 定高双栏面板。
           * 页面滚动用 SpPage 自带的 body 容器（普通 div 的 overflow 滚动），
           * 不要再套一个 scroll-view：scroll-view 套 scroll-view 在真机上会抢 touchmove，
           * 导致面板里两个列表滑不动。
           */
          <View className='page-store-index__category'>
            {renderHeader()}

            {renderTabs()}

            <Categorys
              addPurchases={addPurchases}
              dtid={distributorId}
              panelHeight={categoryPanelHeight}
            />
          </View>
        )}

        {/* 弹层放 ScrollView 外 + 独立 state：压得过结算栏，且打开不触发门店页 setData */}
        <StoreFloatLayers ref={floatLayersRef} parameter={parameter} />
        <SpLogin ref={loginRef} />
      </SpPage>
    </>
  )
}

export default StoreIndex
