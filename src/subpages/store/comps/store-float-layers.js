/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 门店弹层独立状态：打开 SKU/购物车时不触发门店页 setState，
 * 避免微信小程序 ScrollView 被整页 setData 重置回顶。
 */
import React, { forwardRef, useImperativeHandle } from 'react'
import { View } from '@tarojs/components'
import { useImmer } from 'use-immer'
import { SpSkuSelect } from '@/components'
import { styleNames } from '@/utils'
import { useThemsColor } from '@/hooks'
import CompAddCart from './comp-add-cart'

const MSpSkuSelect = React.memo(SpSkuSelect)

const initialState = {
  skuPanelOpen: false,
  selectType: 'picker',
  info: null,
  cartOpen: false
}

const StoreFloatLayers = forwardRef(function StoreFloatLayers({ parameter }, ref) {
  const { themeColor } = useThemsColor()
  const [state, setState] = useImmer(initialState)
  const { skuPanelOpen, selectType, info, cartOpen } = state

  useImperativeHandle(ref, () => ({
    openSku: (goodsInfo, type = 'addcart') => {
      setState((draft) => {
        draft.info = goodsInfo
        draft.selectType = type
        draft.skuPanelOpen = true
      })
    },
    openCart: () => {
      setState((draft) => {
        draft.cartOpen = true
      })
    }
  }))

  // 独立自定义组件有样式隔离，需在根节点注入主题色，子树内 var(--color-primary) 才生效
  return (
    <View className='page-store-index__float-layers' style={styleNames(themeColor())}>
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
        open={cartOpen}
        onMaskCloses={() =>
          setState((draft) => {
            draft.cartOpen = false
          })
        }
        parameter={parameter}
      />
    </View>
  )
})

StoreFloatLayers.options = {
  addGlobalClass: true
}

export default StoreFloatLayers
