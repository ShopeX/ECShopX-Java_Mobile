/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, ScrollView } from '@tarojs/components'
import { withTranslation } from 'react-i18next'
import { $t } from '@/i18n'
import { withPager, withBackToTop } from '@/hocs'
import { BackToTop, Loading, SpNote, GoodsItem, SpNavBar, SpCheckboxNew } from '@/components'
// import { AtCountdown } from 'taro-ui'
import { connect } from 'react-redux'
import api from '@/api'
import { pickBy, hasNavbar, getDistributorId } from '@/utils'
import './plusprice.scss'

// colors slice 初始值是 { current: {} }，主题接口失败/未就绪时直接取 colors.data[0] 会抛错导致整页白屏
const COLOR_FALLBACK = {
  primary: '#d42f29',
  marketing: '#fba629',
  accent: '#2e3030'
}

class CartPluspriceList extends Component {
  $instance = getCurrentInstance() || {}
  constructor(props) {
    super(props)

    this.state = {
      ...this.state,
      query: null,
      last_seconds: 1759242,
      timer: null,
      list: []
    }
  }

  componentDidMount() {
    this.syncNavTitle()
    this.nextPage()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.i18n?.language !== this.props.i18n?.language) {
      this.syncNavTitle()
    }
  }

  syncNavTitle = () => {
    Taro.setNavigationBarTitle({ title: $t('447b1443.72494f') })
  }

  handleClickItem(item) {
    const { distributor_id } = item
    const dtid = distributor_id ? distributor_id : getDistributorId()
    Taro.navigateTo({
      url: `/subpages/item/espier-detail?id=${item.item_id}&dtid=${dtid}`
    })
  }
  handleSelectGoods = (item, checked) => {
    // 换购商品单选：勾选某项时其余项取消；再次点击已勾选项即取消勾选
    const new_list = this.state.list.map((v) => {
      if (v.item_id == item.item_id) {
        return { ...v, is_checked: !!checked }
      }
      return checked ? { ...v, is_checked: false } : v
    })
    this.setState({
      list: new_list
    })
  }

  async handleClickConfirm(type) {
    const { list } = this.state
    if (!list.length) return
    const selected = list.filter((v) => v.is_checked)
    // 取消勾选后点「确定」与「不使用换购」同义：清掉已选的换购商品
    const isSkip = type == 'cancel' || !selected.length
    const marketing_id =
      selected[0]?.marketing_id ||
      list[0]?.marketing_id ||
      this.$instance?.router?.params?.marketing_id
    if (!marketing_id) return
    const query = {
      item_id: isSkip ? 0 : selected[0].item_id,
      marketing_id
    }
    await api.cart.selectedPlusitem(query)
    Taro.showToast({
      title: $t('447b1443.53eff7'),
      icon: 'none'
    })
    if (isSkip) {
      this.setState({ list: list.map((v) => ({ ...v, is_checked: false })) })
    }
    setTimeout(() => {
      Taro.navigateBack()
    }, 300)
  }

  async fetch(params) {
    const { page_no: page, page_size: pageSize } = params
    const query = {
      marketing_id: this.$instance?.router?.params.marketing_id,
      page,
      pageSize
    }

    const { list, total_count: total } = await api.promotion.getpluspriceList(query)
    const nList = pickBy(list, {
      img: 'pics[0]',
      item_id: 'item_id',
      title: 'itemName',
      desc: 'item_spec_desc',
      distributor_id: 'distributor_id',
      marketing_id: 'marketing_id',
      // price: ({ price }) => (price / 100).toFixed(2),
      price: ({ plus_price }) => (plus_price / 100).toFixed(2),
      market_price: ({ market_price }) => (market_price / 100).toFixed(2),
      is_checked: 'is_checked'
    })

    this.setState({
      list: [...this.state.list, ...nList]
    })
    return {
      total
    }
  }

  render() {
    const { colors } = this.props
    const themeColor = colors?.data?.[0] || COLOR_FALLBACK
    const { list, showBackToTop, scrollTop, page } = this.state
    return (
      <View className='cart-page-plusprice' style={`background: ${themeColor.primary}`}>
        {hasNavbar && <SpNavBar title={$t('447b1443.72494f')} />}
        <ScrollView
          className='cart-page-plusprice-goods__scroll'
          scrollY
          scrollTop={scrollTop}
          scrollWithAnimation
          onScroll={this.handleScroll}
          onScrollToLower={this.nextPage}
        >
          {list && list.length > 0 && (
            <View className='cart-page-plusprice-goods__list cart-page-plusprice-goods__type-list'>
              {list.map((item) => {
                return (
                  <View key={item.item_id} className='goods-list__item'>
                    <View className='item-check'>
                      <SpCheckboxNew
                        checked={item.is_checked}
                        onChange={this.handleSelectGoods.bind(this, item)}
                      ></SpCheckboxNew>
                    </View>
                    <View className='item-goodsItem'>
                      <GoodsItem
                        key={item.item_id}
                        info={item}
                        showFav={false}
                        onClick={this.handleClickItem.bind(this, item)}
                      ></GoodsItem>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {page.isLoading ? <Loading>{$t('f1d3181c.bd0271')}</Loading> : null}
          {!page.isLoading && !page.hasNext && !list.length && (
            <SpNote img='trades_empty.png'>{$t('f1d3181c.ba1de9')}</SpNote>
          )}
        </ScrollView>
        <View className='cart-page-plusprice-goods__footer'>
          <View className='footer-list'>
            <View
              className='footer-item no-use'
              style={`background: ${themeColor.accent}`}
              onClick={this.handleClickConfirm.bind(this, 'cancel')}
            >
              {$t('447b1443.f6389e')}
            </View>
            <View
              className='footer-item'
              style={`background: ${themeColor.primary}`}
              onClick={this.handleClickConfirm.bind(this, 'confirm')}
            >
              {$t('b232790d.38cf16')}
            </View>
          </View>
        </View>
        <BackToTop show={showBackToTop} onClick={this.scrollBackToTop} />
      </View>
    )
  }
}

export default connect(({ colors }) => ({
  colors: colors.current
}))(withTranslation()(withPager(withBackToTop(CartPluspriceList))))
