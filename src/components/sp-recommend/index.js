/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { SpImage } from '@/components'
import { $t } from '@/i18n'
import { classNames, pickBy, getCurrencySymbol, isWeb } from '@/utils'
import doc from '@/doc'
import './index.scss'

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return n.toFixed(2)
}

export default class SpRecommend extends Component {
  static options = {
    addGlobalClass: true
  }

  static defaultProps = {
    info: [],
    showAdd: false,
    onAdd: null,
    title: '',
    /** 列数：详情 3 列，购物车 2 列；结算页用 layout=scroll */
    columns: 3,
    /** grid：网格；scroll：横向滑动（结算页 Figma 26:426） */
    layout: 'grid'
  }

  handleAdd = (goods, e) => {
    e?.stopPropagation?.()
    const { onAdd } = this.props
    if (typeof onAdd === 'function') {
      onAdd(goods)
    }
  }

  handleClickItem = (goods) => {
    const itemId = goods?.itemId || goods?.item_id
    if (!itemId) return
    const query = [`id=${itemId}`]
    const dtid = goods?.distributorId ?? goods?.distributor_id
    if (dtid !== undefined && dtid !== null && dtid !== '') {
      query.push(`dtid=${dtid}`)
    }
    Taro.navigateTo({
      url: `/subpages/item/espier-detail?${query.join('&')}`
    })
  }

  renderPrice = (goods) => {
    const price = Number(goods?.price) || 0
    const memberPrice = Number(goods?.memberPrice)
    const marketPrice = Number(goods?.marketPrice)
    const hasMemberPrice = memberPrice > 0 && memberPrice < price
    const symbol = getCurrencySymbol() || '¥'

    if (hasMemberPrice) {
      return (
        <View className='sp-recommend__price-block'>
          <View className='sp-recommend__member-row'>
            <View className='sp-recommend__member-tag'>
              <Text className='sp-recommend__member-tag-text'>{$t('d59e9e9d.8fdd6f')}</Text>
            </View>
            <View className='sp-recommend__sale-price'>
              <Text className='sp-recommend__currency'>{symbol} </Text>
              <Text className='sp-recommend__amount'>{formatMoney(memberPrice)}</Text>
            </View>
          </View>
          <Text className='sp-recommend__non-member'>
            {`非会员价${symbol}${formatMoney(price)}`}
          </Text>
        </View>
      )
    }

    return (
      <View className='sp-recommend__price-block'>
        <View className='sp-recommend__sale-price'>
          <Text className='sp-recommend__currency'>{symbol} </Text>
          <Text className='sp-recommend__amount'>{formatMoney(price)}</Text>
        </View>
        {marketPrice > 0 && marketPrice > price && (
          <Text className='sp-recommend__market'>{`${symbol} ${formatMoney(marketPrice)}`}</Text>
        )}
      </View>
    )
  }

  renderCard = (goodsItem, index) => {
    const { showAdd } = this.props
    const soldOut = Number(goodsItem?.store) <= 0
    return (
      <View
        className='sp-recommend__card'
        key={`sp-recommend-card__${goodsItem.itemId || index}`}
        onClick={this.handleClickItem.bind(this, goodsItem)}
      >
        <View className='sp-recommend__image-wrap'>
          <SpImage
            className='sp-recommend__image'
            src={goodsItem.pic}
            mode='aspectFill'
            style={{ width: '100%', height: '100%' }}
          />
          {soldOut ? (
            <View className='sp-recommend__soldout-mask'>
              <View className='sp-recommend__soldout-text'>
                <Text>{$t('8a5d1351.b12876')}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <View className='sp-recommend__body'>
          <View className='sp-recommend__info'>
            <Text className='sp-recommend__name'>{goodsItem.itemName}</Text>
            {this.renderPrice(goodsItem)}
          </View>
          {showAdd && !soldOut ? (
            <View
              className='sp-recommend__add-btn'
              onClick={this.handleAdd.bind(this, goodsItem)}
            >
              <Text className='sp-recommend__add-btn-text'>+ 加购</Text>
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  render() {
    const { info, className, title, columns, layout } = this.props
    const source = (info || []).filter((item) => {
      const pic = item?.pics
      if (!pic) return false
      if (Array.isArray(pic)) return pic.length > 0 && !!pic[0]
      return true
    })
    if (source.length === 0) {
      return null
    }
    const goods = pickBy(source, doc.goods.ITEM_LIST_GOODS).map((item, index) => ({
      ...item,
      matchedMainItemId: source[index]?.matched_main_item_id,
      raw: source[index]
    }))
    const isScroll = layout === 'scroll'
    const cols = Number(columns) === 2 ? 2 : 3

    return (
      <View
        className={classNames(
          'sp-recommend',
          isScroll ? 'sp-recommend--scroll' : `sp-recommend--cols-${cols}`,
          className
        )}
      >
        <View className='sp-recommend__inner'>
          <Text className='sp-recommend__title'>{title || '为你推荐'}</Text>
          {isScroll ? (
            // H5：用 View + touch-action:pan-x，避免横向区抢走竖向滚动
            // 小程序：ScrollView 去掉 enhanced，减少嵌套滚动抢手势
            isWeb ? (
              <View className='sp-recommend__scroll'>
                <View className='sp-recommend__scroll-row'>
                  {goods.map((goodsItem, index) => this.renderCard(goodsItem, index))}
                </View>
              </View>
            ) : (
              <ScrollView
                className='sp-recommend__scroll'
                scrollX
                enableFlex
                bounces={false}
                showScrollbar={false}
                enhanced={false}
              >
                <View className='sp-recommend__scroll-row'>
                  {goods.map((goodsItem, index) => this.renderCard(goodsItem, index))}
                </View>
              </ScrollView>
            )
          ) : (
            <View className='sp-recommend__grid'>
              {goods.map((goodsItem, index) => this.renderCard(goodsItem, index))}
            </View>
          )}
        </View>
      </View>
    )
  }
}
