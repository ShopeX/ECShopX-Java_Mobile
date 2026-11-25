/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useRef, useMemo } from 'react'
import { useImmer } from 'use-immer'
import Taro, { useDidHide, useDidShow, useRouter } from '@tarojs/taro'
import { View, ScrollView } from '@tarojs/components'
import { SpPage, SpScrollView, SpSearchBar } from '@/components'
import { SpTagBar } from '@/subpages/components'
import api from '@/api'
import doc from '@/doc'
import { pickBy } from '@/utils'
import { useTranslation, $t, i18n } from '@/i18n'
import { useNavigation } from '@/hooks'
import CompTradeItem from './comps/comp-tradeitem'
import CompTrackDetail from './comps/comp-track-detail'
import './list.scss'

const initialState = {
  typeVal: '0',
  status: '0',
  orderId: '',
  searchOrderId: '',
  tradeList: [],
  refresherTriggered: false,
  trackDetailList: [],
  openTrackDetail: false,
  info: null
}
function TradeList(props) {
  useTranslation()
  const { setNavigationBarTitle } = useNavigation()
  const [state, setState] = useImmer(initialState)
  const {
    status,
    tradeList,
    refresherTriggered,
    trackDetailList,
    openTrackDetail,
    info,
    orderId,
    searchOrderId
  } = state
  const tradeRef = useRef()
  const router = useRouter()
  // 有状态变更时先打标，等列表再次显示再刷新，避免后台清空导致回顶/手势异常
  const needRefreshRef = useRef(false)
  const isListVisibleRef = useRef(true)
  const isFirstShow = useRef(true)

  // ECX-11068：隐藏「部分发货」Tab；status=6（PAYED）本身已含 PARTAIL，无需另请求
  const tradeStatus = useMemo(
    () => [
      { tag_name: $t('2800cb77.dbb4d8'), value: '0' },
      { tag_name: $t('2800cb77.9246fe'), value: '5' },
      { tag_name: $t('403c9269.d8476e'), value: '6' },
      { tag_name: $t('2800cb77.4933ca'), value: '1' },
      { tag_name: $t('2800cb77.a48b28'), value: '7', is_rate: 0 }
    ],
    [i18n.language]
  )

  useEffect(() => {
    const syncTitle = () => setNavigationBarTitle($t('cea61a53.07166e'))
    syncTitle()
    i18n.on('languageChanged', syncTitle)
    return () => i18n.off('languageChanged', syncTitle)
  }, [setNavigationBarTitle])

  const reloadList = () => {
    setState((draft) => {
      draft.tradeList = []
    })
    tradeRef.current?.reset()
  }

  const markNeedRefresh = () => {
    needRefreshRef.current = true
    // 列表正在前台时（少见）立刻刷；后台只打标，等 useDidShow
    if (isListVisibleRef.current && !isFirstShow.current) {
      needRefreshRef.current = false
      reloadList()
    }
  }

  useDidShow(() => {
    isListVisibleRef.current = true
    if (isFirstShow.current) {
      isFirstShow.current = false
      return
    }
    if (needRefreshRef.current) {
      needRefreshRef.current = false
      reloadList()
    }
  })

  useDidHide(() => {
    isListVisibleRef.current = false
  })

  useEffect(() => {
    const { status: rawStatus = 0 } = router?.params
    // 旧链接 status=8（部分发货）归一到待发货
    const nextStatus = String(rawStatus) === '8' ? '6' : rawStatus
    setState((draft) => {
      draft.status = nextStatus
    })

    Taro.eventCenter.on('onEventOrderStatusChange', markNeedRefresh)
    Taro.eventCenter.on('onEventInvoiceStatusChange', markNeedRefresh)

    return () => {
      Taro.eventCenter.off('onEventOrderStatusChange', markNeedRefresh)
      Taro.eventCenter.off('onEventInvoiceStatusChange', markNeedRefresh)
    }
  }, [])

  useEffect(() => {
    setState((draft) => {
      draft.tradeList = []
    })
    tradeRef.current.reset()
  }, [status, searchOrderId])

  const fetch = async ({ pageIndex, pageSize }) => {
    const { is_rate } = tradeStatus.find((item) => item.value == status)
    const params = {
      page: pageIndex,
      pageSize,
      order_type: 'normal',
      status,
      is_rate
    }
    // ECX-11399：按订单号精确搜索
    if (searchOrderId) {
      params.order_id = searchOrderId
    }

    const {
      list,
      pager: { count: total },
      rate_status
    } = await api.trade.list(params)
    const tempList = pickBy(list, doc.trade.TRADE_ITEM)
    // console.log('tempList:', tempList)
    setState((draft) => {
      draft.tradeList = [...tradeList, ...tempList]
      draft.refresherTriggered = false
    })
    return { total }
  }

  const onChangeTradeState = (e) => {
    setState((draft) => {
      draft.status = tradeStatus[e].value
    })
  }

  const onSearchChange = (val) => {
    setState((draft) => {
      draft.orderId = val
    })
  }

  const onSearchClear = () => {
    setState((draft) => {
      draft.orderId = ''
      draft.searchOrderId = ''
    })
  }

  const onSearchConfirm = (val) => {
    const keyword = String(val || '').trim()
    // 搜索时切到「全部」，避免当前 Tab 的状态条件把命中的订单过滤掉
    const needSwitchTab = !!keyword && status !== '0'
    setState((draft) => {
      draft.orderId = keyword
      draft.searchOrderId = keyword
      if (needSwitchTab) {
        draft.status = '0'
      }
    })
    // 关键词与 Tab 都没变时上面的 effect 不会触发，这里手动重拉
    if (keyword === searchOrderId && !needSwitchTab) {
      tradeRef.current?.reset()
    }
  }

  const onRefresherRefresh = () => {
    setState((draft) => {
      draft.refresherTriggered = true
      draft.tradeList = []
    })

    tradeRef.current.reset()
  }

  return (
    <SpPage scrollToTopBtn className='page-trade-list'>
      <View className='search-bar-container'>
        <SpSearchBar
          keyword={orderId}
          placeholder={$t('b1e93f22.e9e836')}
          showDailog={false}
          onChange={onSearchChange}
          onClear={onSearchClear}
          onCancel={onSearchClear}
          onConfirm={onSearchConfirm}
        />
      </View>
      <SpTagBar list={tradeStatus} value={status} onChange={onChangeTradeState} />
      <ScrollView
        className='list-scroll-container'
        scrollY
        refresherEnabled
        refresherBackground='#f5f5f7'
        refresherTriggered={refresherTriggered}
        onRefresherRefresh={onRefresherRefresh}
      >
        <SpScrollView
          className='trade-list-scroll'
          auto={false}
          ref={tradeRef}
          fetch={fetch}
          emptyMsg={$t('2800cb77.082a19')}
        >
          {tradeList.map((item, index) => (
            <View className='trade-item-wrap' key={item.orderId || index}>
              <CompTradeItem
                info={item}
                onClick={async (_info) => {
                  const { orderId } = _info
                  const res = await api.trade.getTrackerpull({ order_id: orderId })
                  setState((v) => {
                    v.openTrackDetail = true
                    v.trackDetailList = res
                    v.info = _info
                  })
                }}
              />
            </View>
          ))}
        </SpScrollView>
      </ScrollView>
      <CompTrackDetail
        selfDeliveryOperatorName={info?.selfDeliveryOperatorName}
        selfDeliveryOperatorMobile={info?.selfDeliveryOperatorMobile}
        trackDetailList={trackDetailList}
        isOpened={openTrackDetail}
        onClose={() => {
          setState((draft) => {
            draft.openTrackDetail = false
          })
        }}
      />
    </SpPage>
  )
}

TradeList.options = {
  addGlobalClass: true
}

export default TradeList
