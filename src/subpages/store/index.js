/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useRef } from 'react'
import Taro, {
  useShareAppMessage,
  useShareTimeline,
  useDidShow,
  getCurrentInstance
} from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { useSelector, useDispatch } from 'react-redux'
import { SG_ROUTER_PARAMS } from '@/consts'
import S from '@/spx'
import {
  SpFloatMenuItem,
  SpPage,
  SpSearch,
  SpSkuSelect,
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
  buildSharePath
} from '@/utils'
import { useImmer } from 'use-immer'
import { useNavigation } from '@/hooks'
import { useTranslation, $t } from '@/i18n'
import _toString from 'lodash/toString'
import HomeWgts from '@/pages/home/comps/home-wgts'
import { WgtsContext } from '@/pages/home/wgts/wgts-context'
import { updateShopCartCount } from '@/store/slices/cart'
import CompShopBrand from './comps/comp-shopbrand'
import Categorys from './categorys'
import CompTab from './comps/comp-tab'
import CompAddCart from './comps/comp-add-cart'
import './index.scss'

const MSpSkuSelect = React.memo(SpSkuSelect)

const initState = {
  wgts: [],
  showBackToTop: false,
  loading: true,
  isDefault: false,
  storeInfo: null,
  distributorId: 0,
  productSwitching: true,
  info: null,
  skuPanelOpen: false,
  selectType: 'picker',
  open: false,
  hideClose: true,
  /** 页面滚动超过 20px 时搜索条白底 */
  searchSolidBg: false,
  /** 自定义导航高度，沉浸式时用于顶起搜索/头图内容 */
  navbarHeight: 0,
  /** 切换到分类 Tab 时滚到吸顶区 */
  scrollIntoView: ''
}

function StoreIndex() {
  useTranslation()
  const [state, setState] = useImmer(initState)
  const { colorPrimary } = useSelector((state) => state.sys)
  const { shopCartCount } = useSelector((state) => state.cart)
  const { setNavigationBarTitle } = useNavigation()
  const $instance = getCurrentInstance() || {}
  const router = $instance?.router

  const {
    wgts,
    loading,
    isDefault,
    distributorId,
    productSwitching,
    storeInfo,
    info,
    skuPanelOpen,
    selectType,
    open,
    searchSolidBg,
    navbarHeight,
    scrollIntoView
  } = state

  const dispatch = useDispatch()
  const pageRef = useRef()
  const loginRef = useRef()

  useDidShow(() => {
    fetchWgts()
    salesmanShare()
  })

  // useEffect(() => {
  //   fetchWgts()
  //   init()
  // }, [])

  useEffect(() => {
    if (S.getAuthToken()) {
      fetchWgts()
      salesmanShare()
    }
  }, [S.getAuthToken()])

  useEffect(() => {
    if (skuPanelOpen || open) {
      pageRef.current.pageLock()
    } else {
      pageRef.current.pageUnLock()
    }
  }, [skuPanelOpen, open])

  const salesmanShare = async () => {
    let params = await parameter()

    if (params?.qr == 'Y') {
      let param = {
        promoter_user_id: params?.uid,
        promoter_shop_id: params?.dtid || params?.id
      }
      await api.salesman.salespersonBindusersalesperson(param)
      Taro.setStorageSync('salesmanUserinfo', param)
      console.log(param, '分享成功，业务员已存储3')
    }
  }

  const parameter = async () => {
    const storedData = Taro.getStorageSync(SG_ROUTER_PARAMS)
    // 检查是否返回了非空对象
    // if (storedData && typeof storedData === 'object' && Object.keys(storedData).length > 0) {
    //   return storedData
    // } else {
    const routeParams = await entryLaunch.getRouteParams()
    return routeParams && (routeParams.id || routeParams.dtid || routeParams.uid)
      ? routeParams
      : storedData

    // if (routeParams?.id || routeParams?.dtid || routeParams?.uid) {
    //   return routeParams
    // }else{
    //   return storedData
    // }
    // return routeParams
    // }
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
      const storeInfo = await api.shop.getShop({
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
        draft.storeInfo = pickBy(storeInfo, shopDoc.STORE_INFO)
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
      shop_id: valid_cart === undefined ? '' : valid_cart[0]?.shop_id || '', //下单
      cart_total_num: valid_cart === undefined ? '' : valid_cart[0]?.cart_total_num || '', //数量
      total_fee: valid_cart === undefined ? '' : valid_cart[0]?.total_fee || '', //实付金额
      discount_fee: valid_cart === undefined ? '' : valid_cart[0]?.discount_fee || '', //优惠金额
      storeDetails: valid_cart === undefined ? '' : valid_cart[0] || {}
    }
    dispatch(updateShopCartCount(shopCats))
  }

  useShareAppMessage((res) => {
    return getAppShareInfo()
  })

  useShareTimeline((res) => {
    return getAppShareInfo()
  })

  const tabbarSwitching = (val) => {
    setState((draft) => {
      draft.productSwitching = val
      // 进入分类：滚到 Tab 吸顶，避免头图占屏显得「下面很怪」
      draft.scrollIntoView = val ? '' : 'store-index-tabs'
    })
  }

  const addPurchases = async (id) => {
    let data
    Taro.showLoading({
      title: $t('17670153.f013ea')
    })
    const { dtid } = await parameter()
    const itemDetail = await api.item.detail(id, {
      showError: false,
      distributor_id: dtid
    })
    Taro.hideLoading()
    data = pickBy(itemDetail, doc.goods.GOODS_INFO)
    setState((draft) => {
      draft.info = {
        ...data
      }
    })
    // 获取商品详情的接口
    setState((draft) => {
      draft.skuPanelOpen = true
      draft.selectType = 'addcart'
    })
  }

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

  const onAddToCart = async ({ itemId }) => {
    Taro.showLoading()
    try {
      const itemDetail = await api.item.detail(itemId, {
        showError: false,
        distributor_id: distributorId
      })
      Taro.hideLoading()
      setState((draft) => {
        draft.info = pickBy(itemDetail, doc.goods.GOODS_INFO)
        draft.skuPanelOpen = true
        draft.selectType = 'addcart'
      })
    } catch (e) {
      Taro.hideLoading({
        success: () => {
          showToast(e.message)
        }
      })
    }
  }

  // const settlement = () => {
  //   const { type = 'distributor' } = router?.params
  //   const { shop_id, is_delivery, is_ziti, shop_name, address, lat, lng, hour, mobile } =
  //     shopCartCount.storeDetails
  //   const query = {
  //     cart_type: 'cart',
  //     type,
  //     shop_id,
  //     is_delivery,
  //     is_ziti,
  //     name: shop_name,
  //     store_address: address,
  //     lat,
  //     lng,
  //     hour,
  //     phone: mobile,
  //     //购物车默认是0     0:普通商品  1:跨境商品
  //     // goodType: current == 0 ? 'normal' : 'cross'
  //     goodType: 'normal'
  //   }
  //   Taro.navigateTo({
  //     url: `/pages/cart/espier-checkout?${qs.stringify(query)}`
  //   })
  // }

  //显示弹框
  const popFrame = () => {
    if (!S.getAuthToken()) {
      loginRef.current?.handleToLogin()
      return
    }
    if (shopCartCount.storeDetails?.list?.length > 0) {
      setState((draft) => {
        draft.open = true
      })
    } else {
      showToast($t('17670153.a590f1'))
    }
  }

  let searchComp = wgts.find((wgt) => wgt.name == 'search')
  const pageData = wgts.find((wgt) => wgt.name == 'page')
  let filterWgts = []
  if (searchComp && searchComp.config.fixTop) {
    filterWgts = wgts.filter((wgt) => wgt.name !== 'search')
  } else {
    filterWgts = wgts
    searchComp = null
  }

  // 分类双栏面板高度：视口 - 吸顶偏移 - Tab 条 - 底部结算栏
  const { windowWidth, windowHeight } = Taro.getWindowInfo()
  const px = (design) => (design * windowWidth) / 750
  const searchBarH = searchComp ? px(120) : 0
  const stickyTop = (navbarHeight || 0) + searchBarH
  const tabsH = px(98)
  const footerH = px(160)
  const categoryPanelHeight = Math.max(
    px(720),
    Math.floor(windowHeight - stickyTop - tabsH - footerH)
  )

  return (
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
          <SpImage src='icon-huiyuanzhongxin.svg' mode='widthFix' width={40} height={40} className='member-icon' />
        </SpFloatMenuItem>
          <SpFloatMenuItem
            onClick={() => {
              Taro.navigateTo({ url: '/pages/cart/espier-index' })
            }}
          >
            <SpImage src='icon-gouwuche.svg' mode='widthFix' width={40} height={40} className='cart-icon' />
          </SpFloatMenuItem>

        </>
      }
      renderFooter={<CompTab popFrame={popFrame} />}
    >
      <ScrollView
        scrollY
        className='page-store-index__scroll'
        style={{ height: '100%' }}
        scrollIntoView={scrollIntoView}
        scrollWithAnimation
        onScroll={(e) => {
          const st = e?.detail?.scrollTop ?? 0
          setState((draft) => {
            draft.searchSolidBg = st > 15
          })
        }}
      >
        {searchComp && (
          <View
            className={classNames('page-store-index__search', {
              'page-store-index__search--solid': searchSolidBg
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

        <View className='page-store-index__header'>
          {/* widthFix：按原图比例完整展示，高度随图片自适应 */}
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

        {productSwitching && wgts.length > 0 ? (
          <WgtsContext.Provider
            value={{
              onAddToCart
            }}
          >
            <HomeWgts wgts={filterWgts} dtid={distributorId} />
          </WgtsContext.Provider>
        ) : (
          <Categorys
            addPurchases={addPurchases}
            dtid={distributorId}
            panelHeight={categoryPanelHeight}
          />
        )}
        {productSwitching && (
          <View className='sp-page__powered-by w-full'>
            <SpPoweredBy />
          </View>
        )}
      </ScrollView>

      {/* 弹层必须放在 ScrollView 外，否则 fixed 会被滚动容器困住，压不过底部结算栏 */}
      <MSpSkuSelect
        open={skuPanelOpen}
        type={selectType}
        info={info}
        onClose={() => {
          setState((draft) => {
            draft.skuPanelOpen = false
          })
        }}
        onChange={(skuText, curItem) => {
          setState((draft) => {
            draft.skuText = skuText
            draft.curItem = curItem
          })
        }}
      />

      <CompAddCart
        open={open}
        onMaskCloses={() =>
          setState((draft) => {
            draft.open = false
          })
        }
        parameter={parameter}
      />

      <SpLogin ref={loginRef} />
    </SpPage>
  )
}

export default StoreIndex
