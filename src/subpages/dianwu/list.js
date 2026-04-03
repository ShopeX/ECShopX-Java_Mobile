/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useRef } from 'react'
import { useImmer } from 'use-immer'
import Taro, { getCurrentInstance, useDidShow } from '@tarojs/taro'
import { AtButton } from 'taro-ui'
import * as dianwuApi from '@/api/dianwu'
import doc from '@/subpages/doc'
import { View } from '@tarojs/components'
import { SpPage, SpScrollView, SpPrice, SpSearchInput } from '@/components'
import { classNames, pickBy, showToast } from '@/utils'
import { useTranslation, $t, ti, i18n } from '@/i18n'
import { useNavigation } from '@/hooks'
import CompGoods from './comps/comp-goods'
import CompTabbar from './comps/comp-tabbar'
import './list.scss'

const initialState = {
  keywords: '',
  list: [],
  cartList: []
}

function DianWuList() {
  useTranslation()
  const [state, setState] = useImmer(initialState)
  const { keywords, list, cartList } = state
  const goodsRef = useRef()
  const $instance = getCurrentInstance() || {}
  const { distributor_id } = $instance?.router?.params
  const { setNavigationBarTitle } = useNavigation()

  useEffect(() => {
    const syncTitle = () => setNavigationBarTitle($t('3ca07631.437974'))
    syncTitle()
    i18n.on('languageChanged', syncTitle)
    return () => i18n.off('languageChanged', syncTitle)
  }, [setNavigationBarTitle])

  useDidShow(() => {
    getCashierList()
  })

  useEffect(() => {
    goodsRef.current?.reset?.()
  }, [keywords])

  const fetch = async ({ pageIndex, pageSize }) => {
    let params = {
      page: pageIndex,
      pageSize,
      distributor_id
    }
    if (keywords) {
      params = {
        ...params,
        keywords
      }
    }
    Taro.showLoading({ title: '' })
    const { list: _list, total_count } = await dianwuApi.goodsItems(params)
    Taro.hideLoading()

    setState((draft) => {
      draft.list[pageIndex - 1] = pickBy(_list, doc.dianwu.GOODS_ITEM)
    })

    const pageLen = Array.isArray(_list) ? _list.length : 0
    let total = Number(total_count)
    if (!Number.isFinite(total) || total < 0) {
      total = pageLen < pageSize ? (pageIndex - 1) * pageSize + pageLen : pageIndex * pageSize + 1
    } else if (pageLen < pageSize) {
      total = Math.min(total, (pageIndex - 1) * pageSize + pageLen)
    }
    return { total }
  }

  const handleAddToCart = async ({ itemId }) => {
    await dianwuApi.addToCart({
      item_id: itemId,
      num: 1,
      distributor_id
    })
    getCashierList()
    showToast($t('8cac8565.edd566'))
  }

  const getCashierList = async () => {
    const { valid_cart } = await dianwuApi.getCartDataList({
      distributor_id
    })
    setState((draft) => {
      draft.cartList = pickBy(valid_cart, doc.dianwu.CART_GOODS_ITEM)
    })
  }

  return (
    <SpPage
      className='page-dianwu-list'
      footerHeight={202}
      scrollToTopBtn
      renderFooter={
        <View>
          <View className='footer-wrap'>
            <View className='total-info'>
              <SpPrice value={cartList[0]?.totalPrice || 0} size={38} />
              <View className='txt'>{ti('8cac8565.9d9062', [cartList[0]?.totalNum || 0])}</View>
            </View>
            <View
              className='btn-confirm'
              onClick={() => {
                Taro.navigateTo({
                  url: `/subpages/dianwu/cashier?distributor_id=${distributor_id}`
                })
              }}
            >
              {$t('8cac8565.2443e2')}
            </View>
          </View>
          <CompTabbar />
        </View>
      }
    >
      <View className='search-block'>
        <SpSearchInput
          placeholder={$t('8cac8565.367cc1')}
          onConfirm={(val) => {
            setState((draft) => {
              draft.keywords = val
            })
          }}
        />
      </View>
      <SpScrollView className='item-list-scroll' auto={false} ref={goodsRef} fetch={fetch}>
        {list.map((items, idx) => {
          return items.map((item, sidx) => (
            <View
              className={classNames('item-wrap', { 'item-disabled': item.store == 0 })}
              key={`item-wrap__${idx}_${sidx}`}
            >
              <CompGoods info={item}>
                {item.store > 0 && (
                  <AtButton
                    className='btn-add-cart'
                    circle
                    onClick={handleAddToCart.bind(this, item)}
                  >
                    {$t('8cac8565.cd2240')}
                  </AtButton>
                )}
              </CompGoods>
            </View>
          ))
        })}
      </SpScrollView>
    </SpPage>
  )
}

DianWuList.options = {
  addGlobalClass: true
}

export default DianWuList
