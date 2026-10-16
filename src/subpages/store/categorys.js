/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Image, ScrollView } from '@tarojs/components'
import { useImmer } from 'use-immer'
import { SpNote, SpLoading } from '@/components'
import api from '@/api'
import doc from '@/doc'
import { useDebounce, usePage } from '@/hooks'
import { pickBy, styleNames, showToast, classNames } from '@/utils'
import { useTranslation, $t, ti, i18n } from '@/i18n'
import CompFirstCategory from './comps/comp-first-category'
import CompSecondCategory from './comps/comp-second-category'
import CompThirdCategory from './comps/comp-third-category'
import GoodsItem from './comps/goods-item'
import './categorys.scss'

const initialState = {
  cusIndex: 1,
  keywords: '',
  allList: [],
  categoryFirstIndex: 0,
  categorySecondIndex: 0,
  categoryThirdIndex: 0,
  goodsSort: 0,
  seriesList: [],
  cat_id: undefined,
  is_main_category: false,
  secondList: [],
  thirdList: []
}

function StoreItemList(props) {
  useTranslation()
  const [state, setState] = useImmer(initialState)
  const {
    keywords,
    cusIndex,
    allList,
    goodsSort,
    seriesList,
    categoryFirstIndex,
    categorySecondIndex,
    categoryThirdIndex,
    cat_id,
    is_main_category,
    secondList,
    thirdList
  } = state

  const { addPurchases = () => {}, dtid, panelHeight } = props

  const fetch = useCallback(
    async ({ pageIndex, pageSize }) => {
      const params = {
        page: pageIndex,
        pageSize,
        keywords: keywords,
        approve_status: 'onsale,only_show',
        item_type: 'normal',
        is_point: 'false',
        distributor_id: dtid,
        goodsSort,
        v_store: cusIndex
      }
      if (is_main_category === true) {
        params.main_category = cat_id
      } else {
        params.category_id = cat_id
      }

      const { list: _list, total_count } = await api.item.search(params)
      const n_list = pickBy(_list, doc.goods.ITEM_LIST_GOODS)

      setState((draft) => {
        draft.allList = pageIndex == 1 ? n_list : [...draft.allList, ...n_list]
      })

      return { total: total_count }
    },
    [keywords, dtid, goodsSort, cusIndex, is_main_category, cat_id]
  )

  const { page, getTotal, nextPage, resetPage } = usePage({
    fetch,
    auto: false,
    pageSize: 10
  })

  useEffect(() => {
    getCategoryList()
  }, [])

  useEffect(() => {
    if (cat_id) {
      setState((draft) => {
        draft.allList = []
      })
      resetPage()
      changeList()
    }
  }, [cat_id, i18n.language])

  const getCategoryList = async () => {
    const res = await api.category.get({ distributor_id: dtid })
    const currentList = pickBy(res, {
      name: 'category_name',
      img: 'image_url',
      id: 'category_id',
      category_id: 'category_id',
      is_main_category: 'is_main_category',
      children: ({ children }) =>
        pickBy(children, {
          name: 'category_name',
          img: 'image_url',
          id: 'category_id',
          category_id: 'category_id',
          is_main_category: 'is_main_category',
          children: ({ children: children_ }) =>
            pickBy(children_, {
              name: 'category_name',
              img: 'image_url',
              id: 'category_id',
              is_main_category: 'is_main_category'
            })
        })
    })
    setState((draft) => {
      draft.seriesList = currentList
      draft.hasSeries = true
      draft.cat_id = currentList[0].id
      draft.is_main_category = currentList[0]?.is_main_category === true
    })
  }

  const handleClickStore = (item) => {
    const url = `/pages/indexStore?id=${item.distributor_info.distributor_id}`
    Taro.navigateTo({
      url
    })
  }

  const handleConfirm = async (val) => {
    console.log('handleConfirm', val)
    if (val) {
      Taro.navigateTo({
        url: `/subpages/item/list?keywords=${val}`
      })
    }
  }

  const onFirstCategoryClick = useDebounce((index) => {
    if (categoryFirstIndex == index) return
    setState((draft) => {
      draft.categoryFirstIndex = index
      draft.categorySecondIndex = 0
      draft.categoryThirdIndex = 0
      draft.allList = []
      draft.cat_id = seriesList[index]?.id
      draft.is_main_category = seriesList[index]?.is_main_category === true
    })
  }, 200)

  const onSecondCategoryClick = useDebounce((index) => {
    if (categorySecondIndex == index) return
    setState((draft) => {
      draft.categorySecondIndex = index
      draft.categoryThirdIndex = 0
      draft.allList = []
      draft.cat_id = index == 0 ? seriesList[categoryFirstIndex]?.id : secondList[index]?.id
      draft.is_main_category =
        index == 0
          ? seriesList[categoryFirstIndex]?.is_main_category === true
          : secondList[index]?.is_main_category === true
    })
  }, 200)

  const onThirdCategoryClick = useDebounce((index) => {
    if (categoryThirdIndex == index) return
    setState((draft) => {
      draft.categoryThirdIndex = index
      draft.allList = []
      draft.cat_id = index == 0 ? secondList[categorySecondIndex]?.id : thirdList[index]?.id
      draft.is_main_category =
        index == 0
          ? secondList[categorySecondIndex]?.is_main_category === true
          : thirdList[index]?.is_main_category === true
    })
  }, 200)

  const onScrollToLower = () => {
    if (page.hasMore && !page.loading) {
      nextPage()
    }
  }

  const shoppingCart = async (item, e) => {
    e.stopPropagation()
    let params = {
      item_id: item.itemId,
      num: 1,
      shop_type: 'distributor'
    }
    console.log('item44444ttttttt', item)
    if (item.cart_num >= Number(item.activity_store)) {
      return showToast(ti('a70522dc.21dd98', [item.activity_store]))
    }
    await api.purchase.addPurchaseCart(params)
    showToast($t('a70522dc.54fd8e'))
    // let changeList = JSON.parse(JSON.stringify(newList))
    // changeList.map(l=>{
    //   if(l.item_id == item.item_id){
    //     l.cart_num = Number(l.cart_num) + 1
    //   }
    // })
    // await setState((draft) => {
    //   draft.newList = changeList
    // })
  }

  const addPurchase = async (id) => {
    addPurchases(id)
  }

  const changeList = async () => {
    const _secondList = [
      {
        name: $t('a70522dc.a8b0c2'),
        img: '',
        id: ''
      },
      ...(seriesList[categoryFirstIndex]?.children || [])
    ]
    const _thirdList = _secondList[categorySecondIndex]?.children || []

    setState((draft) => {
      draft.secondList = _secondList
      draft.thirdList =
        _thirdList.length > 0
          ? [
              {
                name: $t('a70522dc.a8b0c2'),
                img: '',
                id: ''
              },
              ..._thirdList
            ]
          : []
    })
  }

  const panelStyle = panelHeight
    ? styleNames({ height: `${panelHeight}px` })
    : styleNames({ height: '70vh' })

  return (
    <View className='store-category' style={panelStyle}>
      <View className='store-category__nav'>
        <CompFirstCategory
          cusIndex={categoryFirstIndex}
          list={seriesList}
          onClick={onFirstCategoryClick}
        />
      </View>
      <View className='store-category__body'>
        <View catchMove className='store-category__side'>
          <CompSecondCategory
            cusIndex={categorySecondIndex}
            list={secondList}
            onClick={onSecondCategoryClick}
          />
        </View>
        <View className='store-category__main'>
          {thirdList.length > 0 && (
            <View className='store-category__filters'>
              <CompThirdCategory
                cusIndex={categoryThirdIndex}
                list={thirdList}
                onClick={onThirdCategoryClick}
                typeIndex={cusIndex}
              />
            </View>
          )}
          {/* catchMove：阻止外层门店 ScrollView 抢手势，保证右侧可滑 */}
          <View catchMove className='store-category__goods goods-list__type-list'>
            <ScrollView
              className='store-category__scroll'
              scrollY
              enhanced
              showScrollbar={false}
              lowerThreshold={80}
              onScrollToLower={onScrollToLower}
              style={{ height: '100%' }}
            >
              {allList.map((item, index) => (
                <View
                  className={classNames('store-category__goods-item', {
                    'store-category__goods-item--has-add': item.activity_store > 0
                  })}
                  key={`goods-item-l__${index}`}
                >
                  <GoodsItem
                    onStoreClick={handleClickStore}
                    onAddToCart={addPurchase}
                    hideStore
                    info={item}
                  />
                  {item.activity_store > 0 && (
                    <View
                      className='store-category__add'
                      onClick={(e) => shoppingCart(item, e)}
                    >
                      <Image
                        src='https://shangpai-pic.fn-mart.com/miniprograme/gwcsmall.png'
                        className='ckeck2'
                      />
                    </View>
                  )}
                </View>
              ))}
              <View className='store-category__footer'>
                {page.hasMore && <SpLoading>{$t('eb9a3a24.bd0271')}</SpLoading>}
                {!page.hasMore && getTotal() == 0 && (
                  <SpNote img='empty_activity.png' title={$t('eb9a3a24.f1f45e')} />
                )}
                {!page.loading && !page.hasMore && getTotal() > 0 && (
                  <SpNote className='no-more' title={$t('eb9a3a24.a25652')} />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  )
}

export default StoreItemList
