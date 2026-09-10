/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, ScrollView } from '@tarojs/components'
import { withTranslation } from 'react-i18next'
import { $t } from '@/i18n'
import { withPager, withBackToTop } from '@/hocs'
import { BackToTop, Loading, GoodsItem, SpNavBar, SpNote } from '@/components'
import './item-guess.scss'

@withPager
@withBackToTop
class ItemGuess extends Component {
  constructor(props) {
    super(props)

    this.state = {
      ...this.state,
      list: []
    }
  }

  componentDidMount() {
    this.nextPage()
  }

  async fetch() {
    // 规则推荐依赖主商品匹配，本页无主商品上下文，不再调用旧 likeList
    this.setState({ list: [] })
    return { total: 0 }
  }

  handleClickItem = (item) => {
    const url = `/subpages/item/espier-detail?id=${item.item_id}&dtid=${item.distributor_id}`
    Taro.navigateTo({
      url
    })
  }

  render() {
    const { list, showBackToTop, scrollTop, page } = this.state

    return (
      <View className='page-goods-list page-goods-guess'>
        <View className='goods-list__toolbar'>
          <SpNavBar leftIconType='chevron-left' fixed='true' />
        </View>

        <ScrollView
          className='goods-list__scroll'
          scrollY
          scrollTop={scrollTop}
          scrollWithAnimation
          onScroll={this.handleScroll}
          onScrollToLower={this.nextPage}
        >
          <View className='goods-list'>
            {list.map((item) => (
              <View className='goods-list__item' key={item.item_id}>
                <GoodsItem key={item.item_id} info={item} onClick={this.handleClickItem.bind(this, item)} />
              </View>
            ))}
          </View>
          {page.isLoading && <Loading />}
          {!page.isLoading && !page.hasNext && !list.length && (
            <SpNote img='trades_empty.png'>{$t('d664a513.9223a7')}</SpNote>
          )}
        </ScrollView>

        <BackToTop show={showBackToTop} onClick={this.scrollBackToTop} />
      </View>
    )
  }
}

export default withTranslation()(ItemGuess)
