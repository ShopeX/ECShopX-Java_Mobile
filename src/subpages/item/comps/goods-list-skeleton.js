/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import { View } from '@tarojs/components'
import { classNames } from '@/utils'
import './goods-list-skeleton.scss'

/**
 * 商品列表骨架屏。
 * 复用 .goods-list / .left-container / .right-container 的列布局，
 * 保证骨架和真实卡片左右对齐、中缝一致。
 */
function GoodsListSkeleton({ count = 6, className }) {
  const half = Math.ceil(count / 2)
  const renderColumn = (size, prefix) =>
    Array.from({ length: size }).map((_, idx) => (
      <View className='goods-item-wrap' key={`goods-skeleton__${prefix}${idx}`}>
        <View className='goods-skeleton'>
          <View className='goods-skeleton__img' />
          <View className='goods-skeleton__bd'>
            <View className='goods-skeleton__line goods-skeleton__line--title' />
            <View className='goods-skeleton__line goods-skeleton__line--title goods-skeleton__line--short' />
            <View className='goods-skeleton__line goods-skeleton__line--price' />
          </View>
        </View>
      </View>
    ))

  return (
    <View className={classNames('goods-list', 'goods-list--skeleton', className)}>
      <View className='left-container'>{renderColumn(half, 'l')}</View>
      <View className='right-container'>{renderColumn(count - half, 'r')}</View>
    </View>
  )
}

GoodsListSkeleton.options = {
  addGlobalClass: true
}

export default React.memo(GoodsListSkeleton)
