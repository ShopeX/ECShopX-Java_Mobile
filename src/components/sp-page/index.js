/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  memo,
  forwardRef,
  useCallback
} from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Taro, {
  useRouter,
  useDidShow,
  useDidHide,
  usePageScroll,
  getCurrentInstance
} from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useImmer } from 'use-immer'
import { SpFloatMenuItem, SpNote, SpLoading, SpPoweredBy } from '@/components'
import { useThemsColor, useLogin } from '@/hooks'
import CookieConsent from '@/components/cookie-consent'
import S from '@/spx'
import {
  TAB_PAGES,
  TABBAR_PATH,
  DEFAULT_NAVIGATE_HEIGHT,
  DEFAULT_FOOTER_HEIGHT,
  DEFAULT_SAFE_AREA_HEIGHT
} from '@/consts'
import {
  classNames,
  styleNames,
  isWeixin,
  isAlipay,
  isWeb,
  isIphoneX,
  VERSION_SHUYUN
} from '@/utils'
import context from '@/hooks/usePageContext'
import { setShowGuideConsultModal } from '@/store/slices/shop'
import ConsultModal from '@/subpages/store/comps/consult-modal'
import SpAiAssistantFab from '@/components/sp-ai-assistant-fab'
import CustomNavigationHeader from './header'
import './index.scss'

const FLOAT_MOVE_THRESHOLD = 5
const FLOAT_EDGE_PAD = 8
const FLOAT_BOTTOM_DESIGN = 350

const designToPx = (designPx, windowWidth) => (designPx * windowWidth) / 750

/** 浮动菜单独立组件：拖拽 state 不拖累整页 SpPage 重渲染 */
const SpPageFloat = memo(function SpPageFloat({
  renderFloat,
  scrollToTopBtn,
  showToTop,
  onScrollToTop,
  customNavigation,
  gNavbarH,
  isTabBarPage,
  hasFooter,
  footerHeight,
  pageInstanceRef
}) {
  const [floatBottom, setFloatBottom] = useState(() => {
    try {
      return designToPx(FLOAT_BOTTOM_DESIGN, Taro.getWindowInfo().windowWidth)
    } catch (e) {
      return 175
    }
  })
  const floatBottomRef = useRef(floatBottom)
  const floatHeightRef = useRef(120)
  const floatSuppressTapRef = useRef(false)
  const rafRef = useRef(0)
  const boundsCacheRef = useRef(null)
  const floatDragRef = useRef({
    active: false,
    moved: false,
    startY: 0,
    origBottom: 0,
    minBottom: 0,
    maxBottom: Infinity
  })

  useEffect(() => {
    // footer / 导航变化后失效缓存，下次拖拽再量
    boundsCacheRef.current = null
  }, [customNavigation, gNavbarH, isTabBarPage, hasFooter, footerHeight])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [])

  const calcFloatTopReserved = useCallback(() => {
    return customNavigation && gNavbarH > 0 ? gNavbarH + FLOAT_EDGE_PAD : FLOAT_EDGE_PAD
  }, [customNavigation, gNavbarH])

  const calcFloatBottomReserved = useCallback(() => {
    const { windowWidth, safeAreaInsets } = Taro.getWindowInfo()
    const safeBottom = safeAreaInsets?.bottom || 0
    if (hasFooter) {
      const designH =
        Math.max(footerHeight || DEFAULT_FOOTER_HEIGHT, 160) +
        (isIphoneX() ? DEFAULT_SAFE_AREA_HEIGHT : 0)
      return designToPx(designH, windowWidth) + FLOAT_EDGE_PAD
    }
    if (isTabBarPage) {
      return 50 + safeBottom + FLOAT_EDGE_PAD
    }
    return FLOAT_EDGE_PAD + safeBottom
  }, [hasFooter, footerHeight, isTabBarPage])

  const paintedBottomRef = useRef(floatBottom)

  const applyFloatBottom = useCallback((next) => {
    if (next === paintedBottomRef.current) return
    floatBottomRef.current = next
    paintedBottomRef.current = next
    setFloatBottom(next)
  }, [])

  const scheduleFloatBottom = useCallback((next) => {
    floatBottomRef.current = next
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const v = floatBottomRef.current
      if (v === paintedBottomRef.current) return
      paintedBottomRef.current = v
      setFloatBottom(v)
    })
  }, [])

  const onScrollToTopClick = useCallback(() => {
    if (floatSuppressTapRef.current) return
    onScrollToTop && onScrollToTop()
    Taro.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  }, [onScrollToTop])

  const onFloatTouchStart = useCallback(
    (e) => {
      const t = e.touches?.[0]
      if (!t) return
      const { windowHeight } = Taro.getWindowInfo()
      const cached = boundsCacheRef.current
      const minBottom = cached?.minBottom ?? calcFloatBottomReserved()
      const maxBottom =
        cached?.maxBottom ??
        Math.max(minBottom, windowHeight - calcFloatTopReserved() - floatHeightRef.current)
      floatDragRef.current = {
        active: true,
        moved: false,
        startY: t.clientY,
        origBottom: floatBottomRef.current,
        minBottom,
        maxBottom
      }

      // 有缓存则跳过测量，降低每次按下的查询开销
      if (cached) return

      // 用 SpPage 实例作查询作用域，才能同时量到 float 与同级 footer
      let query = Taro.createSelectorQuery()
      try {
        const scope = pageInstanceRef?.current
        if (scope) {
          query = Taro.createSelectorQuery().in(scope)
        }
      } catch (err) {
        query = Taro.createSelectorQuery()
      }
      query
        .select('#sp-page-float')
        .boundingClientRect()
        .select('#sp-page-footer')
        .boundingClientRect()
        .select('.sp-page__footer')
        .boundingClientRect()
        .exec((res) => {
          const floatRect = res?.[0]
          const footerRect =
            res?.[1]?.height > 0 ? res[1] : res?.[2]?.height > 0 ? res[2] : null
          if (floatRect?.height) {
            floatHeightRef.current = floatRect.height
          }
          const wh = Taro.getWindowInfo().windowHeight
          const topReserved = calcFloatTopReserved()
          let nextMin = calcFloatBottomReserved()
          if (footerRect && typeof footerRect.top === 'number') {
            nextMin = Math.max(nextMin, wh - footerRect.top + FLOAT_EDGE_PAD)
          }
          const nextMax = Math.max(
            nextMin,
            wh - topReserved - (floatHeightRef.current || 120)
          )
          boundsCacheRef.current = { minBottom: nextMin, maxBottom: nextMax }
          floatDragRef.current.minBottom = nextMin
          floatDragRef.current.maxBottom = nextMax
          const cur = floatBottomRef.current
          const clamped = Math.min(nextMax, Math.max(nextMin, cur))
          if (clamped !== cur) {
            applyFloatBottom(clamped)
          }
        })
    },
    [applyFloatBottom, calcFloatBottomReserved, calcFloatTopReserved, pageInstanceRef]
  )

  const onFloatTouchMove = useCallback(
    (e) => {
      const drag = floatDragRef.current
      if (!drag.active) return
      const t = e.touches?.[0]
      if (!t) return
      const dy = t.clientY - drag.startY
      if (Math.abs(dy) > FLOAT_MOVE_THRESHOLD) {
        drag.moved = true
      }
      const next = Math.min(
        drag.maxBottom,
        Math.max(drag.minBottom, drag.origBottom - dy)
      )
      scheduleFloatBottom(next)
    },
    [scheduleFloatBottom]
  )

  const onFloatTouchEnd = useCallback(() => {
    const drag = floatDragRef.current
    if (!drag.active) return
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    const v = floatBottomRef.current
    if (v !== paintedBottomRef.current) {
      paintedBottomRef.current = v
      setFloatBottom(v)
    }
    if (drag.moved) {
      floatSuppressTapRef.current = true
      setTimeout(() => {
        floatSuppressTapRef.current = false
      }, 400)
    }
    drag.active = false
    drag.moved = false
  }, [])

  const onFloatClickCapture = useCallback((e) => {
    if (!floatSuppressTapRef.current) return
    e.stopPropagation?.()
    e.preventDefault?.()
  }, [])

  return (
    <View
      id='sp-page-float'
      className='float-container'
      style={styleNames({
        bottom: `${floatBottom}px`
      })}
      catchMove
      onTouchStart={onFloatTouchStart}
      onTouchMove={onFloatTouchMove}
      onTouchEnd={onFloatTouchEnd}
      onTouchCancel={onFloatTouchEnd}
      onClickCapture={onFloatClickCapture}
    >
      {renderFloat}
      {scrollToTopBtn && showToTop && (
        <SpFloatMenuItem onClick={onScrollToTopClick}>
          <Text className='iconfont icon-zhiding'></Text>
        </SpFloatMenuItem>
      )}
    </View>
  )
})

const initialState = {
  bodyHeight: 0,
  btnReturn: false,
  btnHome: false,
  customNavigation: false,
  cusCurrentPage: 0,
  gNavbarH: 0,
  gStatusBarHeight: 0,
  height: 0,
  isTabBarPage: true,
  ipx: false,
  lock: false,
  lockStyle: {},
  menuWidth: 0,
  mantle: false,
  navigationLSpace: 0,
  navigationRSpace: 0,
  pageBackground: {},
  pageTheme: {},
  showLeftContainer: false,
  windowHeight: 0,
  scrollTop: 0,
  statusBarBgColor: null,
  statusBarBgColorSourceId: null // 仅由设置过颜色的挂件 sourceId 清除，避免多挂件冲突
}

const SpPage = memo(
  forwardRef((props, ref) => {
    const router = useRouter()
    const instanceRef = useRef(null)
    const [state, setState] = useImmer(initialState)
    const wrapRef = useRef(null)
    const scrollTopRef = useRef(0)
    const dispatch = useDispatch()
    const setStatusBarBgColorFromSticky = useCallback((color, sourceId) => {
      setState((draft) => {
        if (color != null) {
          if (draft.statusBarBgColor === color && draft.statusBarBgColorSourceId === sourceId)
            return
          draft.statusBarBgColor = color
          draft.statusBarBgColorSourceId = sourceId
        } else if (draft.statusBarBgColorSourceId === sourceId) {
          draft.statusBarBgColor = null
          draft.statusBarBgColorSourceId = null
        }
      })
    }, [])
    const sys = useSelector((state) => state.sys)
    const { lang } = useSelector((state) => state.user)
    const { showGuideConsultModal, salespersonInfo } = useSelector((state) => state.shop)
    const isRTL = lang === 'ar'
    const [showToTop, setShowToTop] = useState(false)
    const [isPageVisible, setIsPageVisible] = useState(true) // 页面是否显示
    const { appName } = sys
    const { themeColor } = useThemsColor()
    const { login } = useLogin()

    useEffect(() => {
      if (state.lock) {
        // 保存当前滚动位置
        const currentScrollTop = scrollTopRef.current || 0

        setState((draft) => {
          draft.lockStyle = {
            overflow: 'hidden'
          }
        })

        // 设置滚动位置，防止回到顶部
        setTimeout(() => {
          Taro.pageScrollTo({
            scrollTop: currentScrollTop,
            duration: 0
          })
        }, 0)
      } else {
        setState((draft) => {
          draft.lockStyle = {
            'overflow-y': 'auto'
          }
        })
      }
    }, [state.lock])

    // 企微导购弹框：无导购二维码时关闭状态，避免一直为 true
    useEffect(() => {
      if (
        showGuideConsultModal &&
        !salespersonInfo?.work_qrcode &&
        !salespersonInfo?.work_qrcode_configid
      ) {
        dispatch(setShowGuideConsultModal(false))
      }
    }, [showGuideConsultModal, salespersonInfo, dispatch])

    useEffect(() => {
      if (!isPageVisible) return
      instanceRef.current = getCurrentInstance()
      const pages = Taro.getCurrentPages()
      const navigationStyle = instanceRef.current?.page?.config?.navigationStyle

      let _gNavbarH = 0 // 导航栏高度
      let _gStatusBarHeight = 0 // 状态栏高度
      let _menuWidth = 0
      let _navigationLSpace = 0 // 导航栏左间距
      let _navigationRSpace = 0 // 导航栏右间距
      const { screenHeight, windowWidth, windowHeight } = Taro.getWindowInfo()
      const [absolutePath] = router?.path.split('?')
      const forceShowBack = String(router?.params?.showBack || '') === '1'
      // 小程序/支付宝：按页面 config 是否 custom；H5：有 pageConfig 或 immersive 时也使用自定义顶栏以支持相同顶部样式
      const custom_navigation =
        isWeixin || isAlipay
          ? navigationStyle === 'custom'
          : isWeb && !!(props.pageConfig || props.immersive)
      const _btnReturn = pages.length > 1 && (!TAB_PAGES.includes(absolutePath) || forceShowBack)
      const _btnHome = pages.length == 1 && !TAB_PAGES.includes(absolutePath)
      if (isWeixin || isAlipay) {
        const menuButton = Taro.getMenuButtonBoundingClientRect()
        _gNavbarH = Math.floor(menuButton.bottom + (props.navigateHeight - menuButton.height) / 2) // 导航栏高度
        _gStatusBarHeight = Math.floor(
          menuButton.top - (props.navigateHeight - menuButton.height) / 2
        ) // 状态栏高度
        _menuWidth = menuButton.width
        _navigationLSpace = windowWidth - menuButton.right
        _navigationRSpace = menuButton.width + (windowWidth - menuButton.right)
      } else if (isWeb && custom_navigation) {
        // H5 下使用自定义顶栏时给默认高度，使 pageConfig/immersive 样式生效
        _gNavbarH = props.navigateHeight || DEFAULT_NAVIGATE_HEIGHT
        _gStatusBarHeight = 0
      }
      setState((draft) => {
        draft.bodyHeight = windowHeight
        draft.btnReturn = _btnReturn
        draft.btnHome = _btnHome && props.btnHomeEnable
        draft.customNavigation = custom_navigation
        draft.cusCurrentPage = pages.length
        draft.ipx = isIphoneX()
        draft.gNavbarH = _gNavbarH
        draft.gStatusBarHeight = _gStatusBarHeight
        draft.height =
          !props.immersive && custom_navigation ? screenHeight - _gNavbarH : screenHeight
        draft.menuWidth = _menuWidth
        draft.navigationLSpace = _navigationLSpace
        draft.navigationRSpace = _navigationRSpace
        draft.pageTheme = themeColor()
      })

      const _height = props.renderFooter
        ? Taro.pxTransform(props.footerHeight + (isIphoneX() ? DEFAULT_SAFE_AREA_HEIGHT : 0))
        : Taro.pxTransform(0)

      props.onReady({
        gNavbarH: _gNavbarH,
        height: !props.immersive
          ? `calc(${windowHeight - _gNavbarH}px - ${_height})`
          : `calc(${windowHeight}px - ${_height})`,
        menuWidth: _menuWidth,
        footerHeight: _height
      })
    }, [props.immersive, props.pageConfig, isPageVisible])

    useEffect(() => {
      const {
        referrerInfo: { appId: fromAppId }
      } = Taro.getLaunchOptionsSync()

      if (fromAppId && !S?.getAuthToken() && VERSION_SHUYUN) {
        //数云：第三方小程序跳来需要免登
        login(fromAppId)
      }
    }, [])

    useEffect(() => {
      if (props.pageConfig) {
        const { pageBackgroundColor, pageBackgroundImage, navigateBackgroundColor } =
          props.pageConfig
        let _pageBackground = {
          'background-image': `url(${pageBackgroundImage})`,
          'background-color': pageBackgroundColor,
          'background-size': '100% 100%',
          'background-position': 'center'
        }

        setState((draft) => {
          draft.pageBackground = _pageBackground
        })

        if (isAlipay) {
          Taro.setNavigationBar &&
            Taro.setNavigationBar({
              backgroundColor: navigateBackgroundColor
            })
        }
      }
    }, [props.pageConfig])

    useDidShow(() => {
      setIsPageVisible(true) // 页面显示时设置为true
      const instance = getCurrentInstance()
      if (!instance?.router) return
      const { page, router } = instance
      const fidx = Object.values(TABBAR_PATH()).findIndex((v) => v == router?.path?.split('?')[0])
      const isTabBarPage = fidx > -1
      setState((draft) => {
        draft.showLeftContainer = !['/subpages/guide/index', '/pages/index'].includes(
          `/${page?.route ?? ''}`
        )
        draft.isTabBarPage = isTabBarPage
      })

      // 导购货架分包路由，隐藏所有分享入口
      if (router?.path.indexOf('/subpages/guide') > -1) {
        Taro.hideShareMenu({
          menus: ['shareAppMessage', 'shareTimeline']
        })
      }
    })

    useDidHide(() => {
      console.log('useDidHide🚀')
      setIsPageVisible(false) // 页面隐藏时设置为false
    })

    usePageScroll((res) => {
      if (!state.lock) {
        scrollTopRef.current = res.scrollTop
        setState((draft) => {
          draft.scrollTop = res.scrollTop
        })
      }
      if (res.scrollTop > 20) {
        setState((draft) => {
          draft.mantle = true
        })
      } else {
        setState((draft) => {
          draft.mantle = false
        })
      }

      if (res.scrollTop > 300) {
        setShowToTop(true)
      } else {
        setShowToTop(false)
      }
      props.onScroll && props.onScroll(res)
    })

    useImperativeHandle(ref, () => ({
      pageLock: () => {
        setState((draft) => {
          draft.lock = true
        })
      },
      pageUnLock: () => {
        setState((draft) => {
          draft.lock = false
        })
      },
      // 当页面单独处理滚动事件时，调用此函数
      handlePageScroll: (res) => {
        setState((draft) => {
          draft.scrollTop = res.scrollTop
        })
        if (res.scrollTop > 20) {
          setState((draft) => {
            draft.mantle = true
          })
        } else {
          setState((draft) => {
            draft.mantle = false
          })
        }
        if (res.scrollTop > 300) {
          setShowToTop(true)
        } else {
          setShowToTop(false)
        }
      }
    }))

    return (
      <View
        className={classNames('sp-page', props.className, { 'rtl-layout': isRTL })}
        style={styleNames({ ...state.pageTheme, ...state.pageBackground, ...state.lockStyle })}
        ref={wrapRef}
        key={lang}
      >
        {/* 没有页面自动义头部配置样式，自动生成自定义导航 */}
        {state.customNavigation && (
          <CustomNavigationHeader
            pageConfig={props.pageConfig}
            title={props.title}
            appName={appName}
            renderNavigation={props.renderNavigation}
            fixedTopContainer={props.fixedTopContainer}
            immersive={props.immersive}
            navigateMantle={props.navigateMantle}
            navigateBackgroundColor={props.navigateBackgroundColor}
            gNavbarH={state.gNavbarH}
            gStatusBarHeight={state.gStatusBarHeight}
            menuWidth={state.menuWidth}
            navigationLSpace={state.navigationLSpace}
            btnReturn={state.btnReturn}
            btnHome={state.btnHome}
            mantle={state.mantle}
            nearbyText={props.nearbyText}
            onSearchConfirm={props.onSearchConfirm}
            navigationRSpace={state.navigationRSpace}
            showNavitionLeft={props.showNavitionLeft}
            statusBarBgColor={state.statusBarBgColor}
            immersiveScrollRevealBgColor={
              props.immersive && props.pageConfig?.immersiveScrollBgColor && state.scrollTop >= 50
                ? props.pageConfig.immersiveScrollBgColor
                : null
            }
          />
        )}
        {props.isDefault &&
          (props.renderDefault || <SpNote img={props.defaultImg} title={props.defaultMsg} isUrl />)}

        {!props.isDefault && (
          <View
            className='sp-page__body'
            style={styleNames({
              'padding-top': `${!props.immersive && state.customNavigation ? state.gNavbarH : 0}px`,
              'padding-bottom': props.renderFooter
                ? Taro.pxTransform(
                    props.footerHeight + (isIphoneX() ? DEFAULT_SAFE_AREA_HEIGHT : 0)
                  )
                : 0
            })}
          >
            <View className='sp-page__body-content'>
              {!props.loading && (
                <View className='sp-page__body-children'>
                  <context.Provider
                    value={{
                      scrollTop: state.scrollTop,
                      setStatusBarBgColorFromSticky
                    }}
                  >
                    {props.children}
                  </context.Provider>
                </View>
              )}
              {props.loading && (
                <View className='sp-page__loading'>
                  <SpLoading />
                </View>
              )}
              {/* If you remove or alter Shopex brand identifiers, you must obtain a branding removal license from Shopex.  Contact us at:  http://www.shopex.cn to purchase a branding removal license. */}
              {props.showpoweredBy && (
                <View className='sp-page__powered-by w-full'>
                  <SpPoweredBy />
                </View>
              )}
            </View>
          </View>
        )}
        {props.renderFooter && (
          <View
            id='sp-page-footer'
            key={lang}
            className='sp-page__footer'
            style={styleNames({
              'height': props.renderFooter
                ? `${Taro.pxTransform(
                    props.footerHeight + (isIphoneX() ? DEFAULT_SAFE_AREA_HEIGHT : 0)
                  )}`
                : 0
            })}
          >
            <context.Provider value={{}}>{props.renderFooter}</context.Provider>
          </View>
        )}
        {/* 浮动：独立组件承载拖拽 state，避免整页重渲染 */}
        {!props.isDefault && (
          <SpPageFloat
            renderFloat={props.renderFloat}
            scrollToTopBtn={props.scrollToTopBtn}
            showToTop={showToTop}
            onScrollToTop={props.onScrollToTop}
            customNavigation={state.customNavigation}
            gNavbarH={state.gNavbarH}
            isTabBarPage={state.isTabBarPage}
            hasFooter={!!props.renderFooter}
            footerHeight={props.footerHeight}
            pageInstanceRef={instanceRef}
          />
        )}
        <CookieConsent />
        {/* 全局企微导购联系弹框（与 FloatSalesperson 一致，如热区/分类页点击企微导购服务时弹出） */}
        {showGuideConsultModal && salespersonInfo?.work_qrcode && (
          <ConsultModal
            visible={showGuideConsultModal}
            type='2'
            data={{
              qrcodeUrl: salespersonInfo.work_qrcode,
              salespersonName: salespersonInfo.salesperson_name,
              salespersonAvatar: salespersonInfo.salesperson_avatar,
              bgAvatarUrl: salespersonInfo.bg_avatar_url
            }}
            onClose={() => dispatch(setShowGuideConsultModal(false))}
          />
        )}

        <SpAiAssistantFab />
      </View>
    )
  })
)

SpPage.defaultProps = {
  onReady: () => {},
  btnHomeEnable: true,
  className: '',
  children: null,
  defaultMsg: '',
  defaultImg: 'empty_data.png',
  footerHeight: DEFAULT_FOOTER_HEIGHT,
  fixedTopContainer: null,
  isDefault: false,
  isSticky: false, // 是否粘性吸顶
  immersive: false, // 沉浸式导航
  navigateMantle: false, // 页面向下滚动，沉浸式导航开启蒙层背景色
  navigationLeftBlockWidthFull: false,
  navigateBackgroundColor: '#fff', // 导航背景色
  navigateHeight: DEFAULT_NAVIGATE_HEIGHT,
  onClickLeftIcon: null,
  pageConfig: null,
  renderDefault: null,
  renderNavigation: null,
  scrollToTopBtn: false,
  showNavitionLeft: true,
  title: '', // 页面导航标题
  renderFooter: null,
  renderFloat: null,
  showpoweredBy: true,
  onScrollToTop: () => {},
  nearbyText: '',
  onSearchConfirm: null
}

export default SpPage
